import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// `base: './'` emits relative asset URLs, so the same build works at a domain
// root or under a sub-path (for example GitHub Pages project sites). All app
// state lives in the query string, so no server-side rewrites are needed.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
