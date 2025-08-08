import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    server: {
        host: '0.0.0.0',
    },
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                planet: resolve(__dirname, 'planet.html'),
            },
        },
    },
});
