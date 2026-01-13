import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import typescript from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import vueParser from 'vue-eslint-parser'
import globals from 'globals'

export default [
  js.configs.recommended,
  {
    files: ['**/*.vue'],
    plugins: { vue },
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: typescriptParser,
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        // Nuxt auto-imports
        useRoute: 'readonly',
        useRouter: 'readonly',
        ref: 'readonly',
        computed: 'readonly',
        watch: 'readonly',
        onMounted: 'readonly',
        $fetch: 'readonly',
        defineProps: 'readonly',
        defineEmits: 'readonly',
      },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'no-unused-vars': 'warn', // Downgrade to warning
      'no-undef': 'off', // Auto-imports handled by Nuxt
    },
  },
  {
    files: ['**/*.ts'],
    plugins: { '@typescript-eslint': typescript },
    languageOptions: {
      parser: typescriptParser,
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'warn', // Downgrade to warning
    },
  },
  {
    ignores: ['.nuxt/**', 'node_modules/**', 'dist/**', '.output/**'],
  },
]
