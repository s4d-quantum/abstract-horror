import path from 'node:path';
import { defineConfig, defineProject } from 'vitest/config';
import react from '@vitejs/plugin-react';

const rootNodeModules = path.resolve(__dirname, 'node_modules');

const frontendAlias = {
  '@': path.resolve(__dirname, 'client/src'),
  react: path.resolve(rootNodeModules, 'react'),
  'react-dom': path.resolve(rootNodeModules, 'react-dom'),
  'react/jsx-runtime': path.resolve(rootNodeModules, 'react/jsx-runtime.js'),
  'react-router-dom': path.resolve(rootNodeModules, 'react-router-dom'),
  'react-hot-toast': path.resolve(__dirname, 'client/node_modules/react-hot-toast'),
  '@tanstack/react-query': path.resolve(rootNodeModules, '@tanstack/react-query'),
};

export default defineConfig({
  plugins: [react()],
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: frontendAlias,
  },
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'html', 'lcov'],
      include: ['server/src/**/*.{js,ts}', 'client/src/**/*.{js,jsx,ts,tsx}'],
      exclude: ['**/*.d.ts', '**/node_modules/**'],
    },
    projects: [
      defineProject({
        test: {
          name: 'backend',
          include: ['tests/backend/**/*.test.{js,ts}'],
          environment: 'node',
          setupFiles: ['tests/backend/setup.ts'],
          exclude: ['tests/e2e/**'],
          fileParallelism: false,
          hookTimeout: 40000,
        },
      }),
      defineProject({
        resolve: {
          alias: frontendAlias,
        },
        test: {
          name: 'frontend',
          include: ['tests/frontend/**/*.test.{js,jsx,ts,tsx}'],
          environment: 'jsdom',
          setupFiles: ['tests/frontend/setup.ts'],
          exclude: ['tests/e2e/**'],
        },
      }),
    ],
  },
});
