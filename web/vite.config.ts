import { defineConfig } from 'vite'
import { resolve } from 'path';
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
const config = defineConfig({
    build: {
        outDir: "../server/build"
    },
    plugins: [react()],
    resolve: {
        alias: {
            "@fonts": resolve('./assets/fonts')
        }
    }
});

export default config;
