import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
const config = defineConfig({
    build: {
        outDir: "../server/build",
        assetsDir: ".",
    },
    server: {
        proxy: {
            '/api': {
                target: `http://localhost:${process.env.ZENIN_PORT}`,
                changeOrigin: true,
                secure: false
            }
        }
    },
    plugins: [react()],
    resolve: {
        alias: {
            "@": resolve('./src'),
        }
    }
});

export default config;
