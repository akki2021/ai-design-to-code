import {
    FigmaNode,
    ParsedNode,
    ParsedNodeType,
    ParsedStyle,
    Paint,
} from '@ai-design-to-code/shared';

/**
 * Safely parse raw Figma JSON data into our intermediate representation 
 */
export function parseFigmaJson(data: any): ParsedNode[] {
    if (!data?.document?.children) {
        return [];
    }

    // Find parseable nodes (CANVAS pages contain frames; direct frames/components are passed through)
    let framesToParse: FigmaNode[] = [];

    const children = Array.isArray(data.document.children) ? data.document.children : [];
    for (const child of children) {
        if (child.type === 'CANVAS') {
            // Standard full-file response: drill into the page's children
            framesToParse = framesToParse.concat(child.children || []);
        } else if (child.type === 'FRAME' || child.type === 'COMPONENT' || child.type === 'INSTANCE' || child.type === 'GROUP') {
            // Single-node fetch: the node itself is a direct child of our virtual document root
            framesToParse.push(child);
        } else {
            // Fallback: push any other node type (TEXT, VECTOR, etc.)
            framesToParse.push(child);
        }
    }

    return framesToParse.map((node) => traverseNode(node)).filter(Boolean) as ParsedNode[];
}

function traverseNode(node: FigmaNode): ParsedNode | null {
    if (!node) return null;

    // Map type safely
    const parsedType = mapNodeType(node.type);
    if (!parsedType) {
        // If we don't care about this node type, we might still care about its children
        return null;
    }

    const parsedChildren = (node.children || [])
        .map(traverseNode)
        .filter((child): child is ParsedNode => child !== null);

    const style = extractStyles(node);

    const parsedNode: ParsedNode = {
        id: node.id || 'unknown_id',
        name: node.name || 'Unnamed Node',
        type: parsedType,
        style,
        children: parsedChildren,
    };

    if (parsedType === 'TEXT' && node.characters) {
        parsedNode.text = node.characters;
    }

    return parsedNode;
}

function mapNodeType(type: string): ParsedNodeType | null {
    switch (type) {
        case 'FRAME':
        case 'GROUP':
            return 'FRAME';
        case 'TEXT':
            return 'TEXT';
        case 'COMPONENT':
            return 'COMPONENT';
        case 'INSTANCE':
            return 'INSTANCE';
        case 'VECTOR':
        case 'RECTANGLE':
        case 'ELLIPSE':
        case 'LINE':
        case 'STAR':
        case 'REGULAR_POLYGON':
            return 'VECTOR';
        default:
            return null;
    }
}

function extractStyles(node: FigmaNode): ParsedStyle {
    const style: ParsedStyle = {};

    // Dimensions
    if (node.absoluteBoundingBox) {
        style.width = node.absoluteBoundingBox.width;
        style.height = node.absoluteBoundingBox.height;
    }

    // Layout Mode
    if (node.layoutMode === 'HORIZONTAL' || node.layoutMode === 'VERTICAL') {
        style.display = 'flex';
        style.flexDirection = node.layoutMode === 'HORIZONTAL' ? 'row' : 'column';

        // Align properties
        style.justifyContent = mapJustifyContent(node.primaryAxisAlignItems);
        style.alignItems = mapAlignItems(node.counterAxisAlignItems);

        // Spacing
        if (typeof node.itemSpacing === 'number') {
            style.gap = node.itemSpacing;
        }

        // Paddings
        style.padding = {
            top: node.paddingTop || 0,
            right: node.paddingRight || 0,
            bottom: node.paddingBottom || 0,
            left: node.paddingLeft || 0,
        };
    }

    // Background Colors / Fills
    if (node.fills && node.fills.length > 0) {
        const visibleFill = node.fills.find((f: Paint) => f.visible !== false && f.type === 'SOLID');
        if (visibleFill && visibleFill.color) {
            style.backgroundColor = colorToRgba(visibleFill.color, visibleFill.opacity);
        }
    }

    // Border Colors / Strokes
    if (node.strokes && node.strokes.length > 0) {
        const visibleStroke = node.strokes.find((s: Paint) => s.visible !== false && s.type === 'SOLID');
        if (visibleStroke && visibleStroke.color) {
            style.borderColor = colorToRgba(visibleStroke.color, visibleStroke.opacity);
            style.borderWidth = node.strokeWeight || 1;
        }
    }

    // Border Radius
    if (typeof node.cornerRadius === 'number') {
        style.borderRadius = node.cornerRadius;
    }

    // Opacity
    if (typeof node.opacity === 'number') {
        style.opacity = node.opacity;
    }

    // Text specific
    if (node.type === 'TEXT' && node.style) {
        if (node.style.fontFamily) style.fontFamily = node.style.fontFamily;
        if (typeof node.style.fontSize === 'number') style.fontSize = node.style.fontSize;
        if (typeof node.style.fontWeight === 'number') style.fontWeight = node.style.fontWeight;

        // Convert Figma text aligns to CSS
        const horizontalAlignMap: Record<string, 'left' | 'center' | 'right' | 'justify'> = {
            'LEFT': 'left',
            'CENTER': 'center',
            'RIGHT': 'right',
            'JUSTIFIED': 'justify',
        };
        if (node.style.textAlignHorizontal && horizontalAlignMap[node.style.textAlignHorizontal]) {
            style.textAlign = horizontalAlignMap[node.style.textAlignHorizontal];
        }

        // Figma stores text color in fills for Text nodes
        if (node.fills && node.fills.length > 0) {
            const visibleFill = node.fills.find((f: Paint) => f.visible !== false && f.type === 'SOLID');
            if (visibleFill && visibleFill.color) {
                style.color = colorToRgba(visibleFill.color, visibleFill.opacity);
                // Don't duplicate as background for text
                delete style.backgroundColor;
            }
        }
    }

    return style;
}

function colorToRgba(color: any, overrideOpacity?: number): string {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    let a = color.a !== undefined ? color.a : 1;

    if (overrideOpacity !== undefined) {
        a = a * overrideOpacity;
    }

    if (a === 1) {
        // Return hex string for opaque colors if possible, else rgba
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
}

function mapJustifyContent(align?: string): 'flex-start' | 'center' | 'flex-end' | 'space-between' | undefined {
    switch (align) {
        case 'MIN': return 'flex-start';
        case 'CENTER': return 'center';
        case 'MAX': return 'flex-end';
        case 'SPACE_BETWEEN': return 'space-between';
        default: return undefined;
    }
}

function mapAlignItems(align?: string): 'flex-start' | 'center' | 'flex-end' | undefined {
    switch (align) {
        case 'MIN': return 'flex-start';
        case 'CENTER': return 'center';
        case 'MAX': return 'flex-end';
        default: return undefined;
    }
}