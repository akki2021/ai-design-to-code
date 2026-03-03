// Raw Figma JSON Types (simplified for our needs)

export type FigmaNodeType =
    | 'DOCUMENT'
    | 'CANVAS'
    | 'FRAME'
    | 'GROUP'
    | 'VECTOR'
    | 'BOOLEAN_OPERATION'
    | 'STAR'
    | 'LINE'
    | 'ELLIPSE'
    | 'REGULAR_POLYGON'
    | 'RECTANGLE'
    | 'TEXT'
    | 'SLICE'
    | 'COMPONENT'
    | 'INSTANCE';

export interface Color {
    r: number;
    g: number;
    b: number;
    a: number;
}

export interface Paint {
    type: string;
    visible?: boolean;
    opacity?: number;
    color?: Color;
}

export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface TypeStyle {
    fontFamily?: string;
    fontWeight?: number;
    fontSize?: number;
    textAlignHorizontal?: 'LEFT' | 'RIGHT' | 'CENTER' | 'JUSTIFIED';
    textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
    letterSpacing?: number;
    lineHeightPx?: number;
}

export interface FigmaNode {
    id: string;
    name: string;
    type: FigmaNodeType;
    children?: FigmaNode[];

    // Layout
    layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
    primaryAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
    counterAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX';
    itemSpacing?: number;
    paddingLeft?: number;
    paddingRight?: number;
    paddingTop?: number;
    paddingBottom?: number;

    // Styling
    fills?: Paint[];
    strokes?: Paint[];
    strokeWeight?: number;
    cornerRadius?: number;
    opacity?: number;
    absoluteBoundingBox?: BoundingBox;

    // Text specific
    characters?: string;
    style?: TypeStyle;
}

export interface FigmaDocument {
    document: FigmaNode;
    components?: Record<string, any>;
    componentSets?: Record<string, any>;
    schemaVersion: 0;
    name: string;
    lastModified: string;
    version: string;
}
