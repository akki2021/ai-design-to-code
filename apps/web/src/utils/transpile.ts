import * as Babel from '@babel/standalone';

/**
 * Transpiles JSX/TSX code into executable Javascript using Babel Standalone
 */
export const transpileCode = (code: string): string => {
    try {
        const output = Babel.transform(code, {
            presets: [['env', { modules: 'commonjs' }], 'react', 'typescript'],
            filename: 'component.tsx',
        });

        return output.code || '';
    } catch (error: any) {
        console.error('Babel Transpilation Error:', error);
        throw new Error(`Syntax Error: ${error.message || 'Failed to parse code'}`);
    }
};
