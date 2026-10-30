import js from '@eslint/js';
import ts from 'typescript-eslint';
export default ts.config({ ignores: ['dist/**', 'node_modules/**', 'test-results/**', 'playwright-report/**'] }, js.configs.recommended, ...ts.configs.strictTypeChecked, {
 files: ['**/*.ts'], rules: { '@typescript-eslint/restrict-template-expressions': ['error', {allowNumber:true,allowBoolean:true}], '@typescript-eslint/no-non-null-assertion':'off', '@typescript-eslint/no-confusing-void-expression':'off' }, languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } }
}, { files: ['**/*.js'], ...ts.configs.disableTypeChecked }, {
 files: ['src/engines/**'], rules: {
 'no-restricted-globals': ['error', 'window', 'document', 'navigator', 'Date', 'localStorage', 'fetch'],
 'no-restricted-properties': ['error', { object: 'Math', property: 'random' }]
 }
});
