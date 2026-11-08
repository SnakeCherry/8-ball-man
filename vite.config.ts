import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

/** Where scripts/whisper_server.py is reachable from this machine (an SSH tunnel to the Spark by default). */
const ASR_URL = process.env.ASR_URL ?? 'http://127.0.0.1:8765'
/** Qwen on the Spark, through the same kind of SSH tunnel. The API key stays here, server side, from .env.local. */
const LLM_URL = process.env.LLM_URL ?? 'http://127.0.0.1:8800'
/** Piper text-to-speech on the Spark (scripts/tts_server.py). */
const TTS_URL = process.env.TTS_URL ?? 'http://127.0.0.1:8766'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const llmKey = process.env.LLM_API_KEY ?? env.LLM_API_KEY
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        // the browser only ever talks to this dev server; it forwards to the Spark through SSH tunnels
        '/api/asr': { target: ASR_URL, changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/asr/, ''), timeout: 8000 },
        '/api/tts': { target: TTS_URL, changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/tts/, ''), timeout: 10000 },
        '/api/llm': {
          target: LLM_URL,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/llm/, ''),
          timeout: 30000,
          headers: llmKey ? { Authorization: `Bearer ${llmKey}` } : {},
        },
      },
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  }
})
