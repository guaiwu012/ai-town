module.exports = {
  parser: '@typescript-eslint/parser', plugins: ['@typescript-eslint'], extends: ['plugin:@typescript-eslint/recommended'],
  ignorePatterns: ['convex/_generated/**', 'src/editor/**', '**/*.test.ts'],
  parserOptions: { project: './tsconfig.json', ecmaVersion: 2018, sourceType: 'module' },
  rules: { '@typescript-eslint/no-explicit-any': 'off', '@typescript-eslint/explicit-function-return-type': 'off', '@typescript-eslint/no-unused-vars': ['warn', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }], '@typescript-eslint/no-non-null-assertion': 'off', 'no-var': 'off', 'prefer-const': 'off' },
};
