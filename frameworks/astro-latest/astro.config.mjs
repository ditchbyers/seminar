import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

// Tailwind v4 – configured via CSS, no tailwind.config.* needed
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  vite: {
    plugins: [tailwindcss()],
  },
  server: { port: 4323 },
});
