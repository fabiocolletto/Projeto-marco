// @ts-nocheck
import { sveltekit } from '@sveltejs/kit/vite';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
        plugins: [sveltekit()],
        resolve: {
                alias: {
                        '@tools': path.resolve('../..', 'tools')
                }
        },
        server: {
                fs: {
                        allow: [path.resolve('..'), path.resolve('../..')]
                }
        }
});
