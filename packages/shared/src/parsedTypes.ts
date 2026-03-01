// Intermediate Normalzed Types

export type ParsedNodeType = 'FRAME' | 'TEXT' | 'COMPONENT' | 'INSTANCE' | 'VECTOR';

export interface ParsedStyle {
    // Layout
    display?: 'flex' | 'block';
    flexDirection?: 'row' | 'column';
    justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between';
    alignItems?: 'flex-start' | 'center' | 'flex-end';
    gap?: number;
    padding?: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };

    // Appearance
    backgroundColor?: string; // hex or rgba string
    borderColor?: string;
    borderWidth?: number;
    borderRadius?: number;
    opacity?: number;

    // Text specific
    color?: string;
    fontSize?: number;
    fontWeight?: number;
    fontFamily?: string;
    textAlign?: 'left' | 'center' | 'right' | 'justify';

    // Dimensions
    width?: number;
    height?: number;
}

export interface ParsedNode {
    id: string;
    name: string;
    type: ParsedNodeType;
    style: ParsedStyle;
    children: ParsedNode[];

    // Text specific
    text?: string;

    // Component specific
    componentId?: string;
}
