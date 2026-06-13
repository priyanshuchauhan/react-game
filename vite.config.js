import { defineConfig } from 'vite'

// Use BASE_URL env var when provided (useful for CI), otherwise default to repo path
// Replace '/react-game/' if you rename the repo.
export default defineConfig({
  base: process.env.BASE_URL || '/react-game/',
})
