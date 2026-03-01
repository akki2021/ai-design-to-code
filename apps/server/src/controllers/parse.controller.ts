import { Request, Response, NextFunction } from 'express';
import { parseFigmaJson } from '@ai-design-to-code/parser';
import { generateReactComponent } from '@ai-design-to-code/ui-generator';

/**
 * Extract file_id and node_id from a Figma URL.
 * Supports URLs like:
 *   https://www.figma.com/design/FILE_ID/Title?node-id=24-104
 *   https://www.figma.com/file/FILE_ID/Title?node-id=24-104
 */
function parseFigmaUrl(url: string): { fileId: string; nodeId: string | null } {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    // pathParts: ['design' or 'file', FILE_ID, 'Title']
    const fileId = pathParts[1];
    if (!fileId) {
        throw new Error('Could not extract file ID from the Figma URL.');
    }

    // node-id can be in query params
    const nodeIdRaw = parsed.searchParams.get('node-id');
    // Figma API expects node IDs with ":" separator, but URLs use "-"
    const nodeId = nodeIdRaw ? nodeIdRaw.replace('-', ':') : null;

    return { fileId, nodeId };
}

export const parseFigmaData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const body = req.body;
        let figmaJson: any;

        // ─── CASE 1: Figma URL provided → fetch from Figma API ───
        if (body.figmaUrl && body.figmaToken) {
            const { fileId, nodeId } = parseFigmaUrl(body.figmaUrl);

            let apiUrl: string;
            if (nodeId) {
                apiUrl = `https://api.figma.com/v1/files/${fileId}/nodes?ids=${encodeURIComponent(nodeId)}`;
            } else {
                apiUrl = `https://api.figma.com/v1/files/${fileId}`;
            }

            console.log(`[Figma API] Fetching: ${apiUrl}`);

            const apiResponse = await fetch(apiUrl, {
                headers: {
                    'X-Figma-Token': body.figmaToken,
                },
            });

            if (!apiResponse.ok) {
                const errorText = await apiResponse.text();
                res.status(apiResponse.status).json({
                    success: false,
                    message: `Figma API Error (${apiResponse.status}): ${errorText}`,
                });
                return;
            }

            const apiData = await apiResponse.json();

            // The /files/:id/nodes endpoint returns { nodes: { "nodeId": { document: {...} } } }
            // The /files/:id endpoint returns { document: {...} }
            if (nodeId && apiData.nodes) {
                const nodeData = apiData.nodes[nodeId];
                if (!nodeData || !nodeData.document) {
                    res.status(400).json({
                        success: false,
                        message: `Node "${nodeId}" was not found in the Figma file. Make sure you select a valid frame or component.`,
                    });
                    return;
                }
                // Wrap the single node's document into the expected { document: { children: [...] } } format
                figmaJson = {
                    document: {
                        id: 'virtual-root',
                        name: 'Virtual Root',
                        type: 'DOCUMENT',
                        children: [nodeData.document],
                    }
                };
            } else if (apiData.document) {
                figmaJson = apiData;
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Unexpected Figma API response format. Neither "nodes" nor "document" found.',
                });
                return;
            }
        }
        // ─── CASE 2: Raw Figma JSON provided directly ───
        else if (body.document) {
            figmaJson = body;
        } else {
            res.status(400).json({
                success: false,
                message: 'Invalid request. Provide either { figmaUrl, figmaToken } or raw Figma JSON with { document: ... }.',
            });
            return;
        }

        // 1. Parse raw Figma data into our internal schema
        const parsedNodes = parseFigmaJson(figmaJson);

        if (parsedNodes.length === 0) {
            res.status(400).json({
                success: false,
                message: 'Could not extract any standard nodes from the provided Figma document. Ensure the design contains Frames, Components, or Text layers.',
            });
            return;
        }

        // 2. Generate React + Tailwind JSX using the internal schema
        const generatedCode = generateReactComponent(parsedNodes, 'FigmaComponent');

        // 3. Return results
        res.status(200).json({
            success: true,
            data: {
                tree: parsedNodes,
                code: generatedCode,
            }
        });

    } catch (err) {
        next(err);
    }
};
