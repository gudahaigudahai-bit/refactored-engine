import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: env.DEEPSEEK_API_KEY ? {
          '/deepseek/chat': {
            target: 'https://api.deepseek.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/deepseek\/chat/, '/v1/chat/completions'),
            headers: {
              Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
              'Content-Type': 'application/json',
            },
          },
        } : undefined,
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.DEEPSEEK_API_KEY': JSON.stringify(env.DEEPSEEK_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
