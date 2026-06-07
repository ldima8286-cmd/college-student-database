import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/college-student-database/', // важно! название репозитория
  server: {
    port: 3000
    // удаляем proxy — он не нужен для статики
  }
});