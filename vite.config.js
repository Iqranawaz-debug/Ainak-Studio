import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// React for components, Tailwind for styling
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
