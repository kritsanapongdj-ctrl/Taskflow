import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'scripts/**', 'api/**', 'scratch/**']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        __firebase_config: 'readonly',
        __app_id: 'readonly',
        __initial_auth_token: 'readonly',
      },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^(React|Icon|_)' }],
      'no-useless-escape': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      // Reset-on-open modals, Firestore loading flags and the PixelAgents canvas loop rely on these patterns
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn'
    },
  },
])
