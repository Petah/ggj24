module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: __dirname,
        sourceType: 'module',
    },
    plugins: [
        '@typescript-eslint/eslint-plugin',
    ],
    extends: [
        'plugin:@typescript-eslint/recommended',
    ],
    root: true,
    env: {
        node: true,
        jest: true,
    },
    ignorePatterns: ['.eslintrc.js'],
    rules: {
        '@typescript-eslint/member-delimiter-style': 'error',
        '@typescript-eslint/no-explicit-any': ['warn', { ignoreRestArgs: true }],
        '@typescript-eslint/ban-ts-comment': 'off',
        'arrow-parens': ['error', 'as-needed'],
        'quote-props': ['error', 'as-needed'],
        'sort-imports': ['error', { ignoreDeclarationSort: true }],
        'comma-dangle': ['error', 'always-multiline'],
        'arrow-body-style': 'off',
        indent: ['error', 4, {
            SwitchCase: 1,
            ignoredNodes: [
                `FunctionExpression > .params[decorators.length > 0]`,
                `FunctionExpression > .params > :matches(Decorator, :not(:first-child))`,
                `ClassBody.body > PropertyDefinition[decorators.length > 0] > .key`,
            ],
        }],
        'prefer-template': 'error',
        'quotes': ['error', 'single', { avoidEscape: true }],
        'object-shorthand': ['error', 'always'],
        'no-console': 'error',
        'function-paren-newline': ['error', 'consistent'],
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        "no-restricted-imports": "off",
        "@typescript-eslint/no-restricted-imports": ["error", { "patterns": ["src/*"] }],
        'semi': ['error', 'always'],
        'eqeqeq': ['warn', 'always'],
    }
};
