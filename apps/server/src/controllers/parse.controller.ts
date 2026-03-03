import { Request, Response, NextFunction } from 'express';
import { parseFigmaJson } from '@ai-design-to-code/parser';
import { generateReactComponent } from '@ai-design-to-code/ui-generator';

/**
 * Extract file_id and node_id from a Figma URL.
 */
function parseFigmaUrl(url: string): { fileId: string; nodeId: string | null } {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const fileId = pathParts[1];
    if (!fileId) {
        throw new Error('Could not extract file ID from the Figma URL.');
    }

    const nodeIdRaw = parsed.searchParams.get('node-id');
    const nodeId = nodeIdRaw ? nodeIdRaw.replace('-', ':') : null;

    return { fileId, nodeId };
}

export const parseFigmaData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const body = req.body;

        // ─── Auth check: user must be signed in via Figma OAuth ───
        const figmaToken = (req.session as any)?.figmaAccessToken;

        if (!figmaToken) {
            res.status(401).json({
                success: false,
                message: 'Not authenticated. Please sign in with Figma first.',
            });
            return;
        }

        if (!body.figmaUrl) {
            res.status(400).json({
                success: false,
                message: 'Missing figmaUrl in request body.',
            });
            return;
        }

        // ─── Fetch from Figma API using the user's OAuth token ───
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
                'Authorization': `Bearer ${figmaToken}`,
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
        let figmaJson: any;

        if (nodeId && apiData.nodes) {
            const nodeData = apiData.nodes[nodeId];
            if (!nodeData || !nodeData.document) {
                res.status(400).json({
                    success: false,
                    message: `Node "${nodeId}" was not found in the Figma file.`,
                });
                return;
            }
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
                message: 'Unexpected Figma API response format.',
            });
            return;
        }

        // 1. Parse
        const parsedNodes = parseFigmaJson(figmaJson);

        if (parsedNodes.length === 0) {
            res.status(400).json({
                success: false,
                message: 'Could not extract any nodes. Ensure the design contains Frames, Components, or Text layers.',
            });
            return;
        }

        // 2. Generate
        const generatedCode = generateReactComponent(parsedNodes, 'FigmaComponent');

        // 3. Return
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
