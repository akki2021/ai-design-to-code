import { ParsedNode, ParsedStyle } from '@ai-design-to-code/shared';

/**
 * Generate a complete React Component complete with imports and export.
 */
export function generateReactComponent(nodes: ParsedNode[], componentName = 'GeneratedComponent'): string {
    if (!nodes || nodes.length === 0) {
        return `export default function ${componentName}() { return null; }`;
    }

    const rootNode = nodes[0]; // Assuming the first node is the root container for the component
    const jsxContent = generateJsxString(rootNode, 2);

    return `import React from 'react';

export default function ${componentName}() {
  return (
${jsxContent}
  );
}
`;
}

/**
 * Generate JSX recursively.
 */
function generateJsxString(node: ParsedNode, indentLevel: number): string {
    const indent = ' '.repeat(indentLevel);
    const tailwindClasses = buildTailwindClasses(node.style);

    const classNameProp = tailwindClasses ? ` className="${tailwindClasses}"` : '';

    if (node.type === 'TEXT') {
        const textContent = node.text || '';
        // Determine HTML tag based on simple rules or keep it uniform with span/p
        const tag = node.style.fontWeight && node.style.fontWeight >= 700 ? 'h2' : 'p';
        return `${indent}<${tag}${classNameProp}>\n${indent}  ${escapeJsxText(textContent)}\n${indent}</${tag}>`;
    }

    if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE' || node.type === 'VECTOR') {
        const tag = 'div';

        if (!node.children || node.children.length === 0) {
            return `${indent}<${tag}${classNameProp} />`;
        }

        const childrenJsx = node.children
            .map(child => generateJsxString(child, indentLevel + 2))
            .join('\n');

        return `${indent}<${tag}${classNameProp}>\n${childrenJsx}\n${indent}</${tag}>`;
    }

    return `${indent}<!-- unknown node ${node.type} -->`;
}

/**
 * Converts ParsedStyle into a string of Tailwind classes
 */
function buildTailwindClasses(style: ParsedStyle): string {
    const classes: string[] = [];

    // Layout
    if (style.display === 'flex') {
        classes.push('flex');
        if (style.flexDirection === 'column') classes.push('flex-col');
        if (style.flexDirection === 'row') classes.push('flex-row');

        // Justify Content
        if (style.justifyContent === 'center') classes.push('justify-center');
        if (style.justifyContent === 'flex-start') classes.push('justify-start');
        if (style.justifyContent === 'flex-end') classes.push('justify-end');
        if (style.justifyContent === 'space-between') classes.push('justify-between');

        // Align Items
        if (style.alignItems === 'center') classes.push('items-center');
        if (style.alignItems === 'flex-start') classes.push('items-start');
        if (style.alignItems === 'flex-end') classes.push('items-end');

        // Gap (approximation: using Tailwind gap scale where 4 -> 1rem/16px)
        if (style.gap) {
            classes.push(`gap-[${style.gap}px]`);
        }
    }

    // Padding
    if (style.padding) {
        if (style.padding.top) classes.push(`pt-[${style.padding.top}px]`);
        if (style.padding.right) classes.push(`pr-[${style.padding.right}px]`);
        if (style.padding.bottom) classes.push(`pb-[${style.padding.bottom}px]`);
        if (style.padding.left) classes.push(`pl-[${style.padding.left}px]`);
    }

    // Dimensions
    if (style.width) classes.push(`w-[${style.width}px]`);
    if (style.height) classes.push(`h-[${style.height}px]`);

    // Appearance
    if (style.backgroundColor) {
        classes.push(`bg-[${style.backgroundColor}]`);
    }
    if (style.borderColor) {
        classes.push(`border-[${style.borderColor}]`);
    }
    if (style.borderWidth) {
        classes.push(`border-[${style.borderWidth}px]`);
    }
    if (style.borderRadius) {
        classes.push(`rounded-[${style.borderRadius}px]`);
    }
    if (style.opacity !== undefined && style.opacity < 1) {
        classes.push(`opacity-${Math.round(style.opacity * 100)}`); // e.g., opacity-50
    }

    // Text specific
    if (style.color) {
        classes.push(`text-[${style.color}]`);
    }
    if (style.fontSize) {
        classes.push(`text-[${style.fontSize}px]`);
    }
    if (style.fontWeight) {
        if (style.fontWeight === 400) classes.push('font-normal');
        else if (style.fontWeight === 500) classes.push('font-medium');
        else if (style.fontWeight === 600) classes.push('font-semibold');
        else if (style.fontWeight === 700) classes.push('font-bold');
        else classes.push(`font-[${style.fontWeight}]`);
    }
    if (style.textAlign) {
        classes.push(`text-${style.textAlign}`); // text-left, text-center, etc
    }

    return classes.join(' ');
}

/**
 * Escapes characters that break JSX.
 */
function escapeJsxText(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/{/g, '&#123;')
        .replace(/}/g, '&#125;');
}
