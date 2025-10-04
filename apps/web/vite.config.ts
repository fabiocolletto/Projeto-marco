import { sveltekit } from '@sveltejs/kit/vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';
import { defineConfig } from 'vite';

const widgetBuild = {
  lib: {
    entry: path.resolve('src', 'app-base-widget.ts'),
    name: 'AppBaseWidget',
    fileName: (format: string) => (format === 'es' ? 'app-base-widget.js' : 'app-base-widget.umd.js'),
    formats: ['es', 'umd'] as const
  },
  cssCodeSplit: false,
  rollupOptions: {
    output: {
      assetFileNames: (assetInfo: { name?: string }) => {
        if (assetInfo.name?.endsWith('.css')) {
          return 'app-base-widget.css';
        }

        return 'assets/[name]-[hash][extname]';
      }
    }
  }
} satisfies NonNullable<Parameters<typeof defineConfig>[0]>['build'];

export default defineConfig(({ mode }) => {
  const isWidgetBuild = mode === 'widget';

  return {
    plugins: isWidgetBuild
      ? [
          svelte({
            extensions: ['.svelte']
          })
        ]
      : [sveltekit()],
    resolve: {
      alias: {
        '@tools': path.resolve('../..', 'tools'),
        ...(isWidgetBuild
          ? {
              $lib: path.resolve('src/lib')
            }
          : {})
      }
    },
    server: {
      fs: {
        allow: [path.resolve('..'), path.resolve('../..')]
      }
    },
    build: isWidgetBuild
      ? {
          ...widgetBuild,
          emptyOutDir: true
        }
      : undefined
  };
});
