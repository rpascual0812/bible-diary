import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const isMobileBuild = process.env.MOBILE_BUILD === 'true';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      ...(isMobileBuild ? [viteSingleFile()] : []),
    ],
    build: isMobileBuild
      ? {
          cssCodeSplit: false,
          assetsInlineLimit: 100000000,
        }
      : undefined,
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || ""),
      'process.env.PAYMONGO_PUBLIC_KEY': JSON.stringify(env.PAYMONGO_PUBLIC_KEY || process.env.PAYMONGO_PUBLIC_KEY || ""),
      'process.env.VITE_BANK_NAME': JSON.stringify(env.VITE_BANK_NAME || process.env.VITE_BANK_NAME || ""),
      'process.env.VITE_BANK_ACCOUNT_NAME': JSON.stringify(env.VITE_BANK_ACCOUNT_NAME || process.env.VITE_BANK_ACCOUNT_NAME || ""),
      'process.env.VITE_BANK_ACCOUNT_NUMBER': JSON.stringify(env.VITE_BANK_ACCOUNT_NUMBER || process.env.VITE_BANK_ACCOUNT_NUMBER || ""),
      'process.env.VITE_GCASH_NUMBER': JSON.stringify(env.VITE_GCASH_NUMBER || process.env.VITE_GCASH_NUMBER || ""),
      'process.env.VITE_GCASH_NAME': JSON.stringify(env.VITE_GCASH_NAME || process.env.VITE_GCASH_NAME || ""),
      'process.env.VITE_BIBLE_API_URL': JSON.stringify(env.VITE_BIBLE_API_URL || process.env.VITE_BIBLE_API_URL || ""),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true'
        ? null
        : { ignored: ['**/android/**', '**/ios/**', '**/.expo/**'] },
      fs: {
        strict: true,
        deny: ['android', 'ios'],
      },
    },
  };
});
