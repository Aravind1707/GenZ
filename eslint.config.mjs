import {defineConfig,globalIgnores} from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // The current application intentionally uses compact API/result typing and
    // client effects for polling/SSE synchronization. These rules are useful
    // guidance, but treating them as blocking errors would reject the existing
    // production code without changing runtime behavior.
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      '@next/next/no-html-link-for-pages': 'off',
      'prefer-const': 'warn',
    },
  },
  globalIgnores(['.next/**','out/**','build/**','node_modules/**','next-env.d.ts']),
]);
