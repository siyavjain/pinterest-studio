import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'node:fs'

// A tiny shared store on the dev server, so the phone and the web stay in sync: the board's
// pieces, comments, nodes and groups, and the concept card. Kept in a file next to the project
// (ignored by git). The file is the source of truth, read on every request, because the phone
// and the computer may be served by two dev servers. GET returns the latest copy; POST replaces it.
function sync(): Plugin {
  const FILE = '.studio-sync.json'
  type Doc = { rev: number; by: string; state: unknown }
  const read = (): Doc => {
    try {
      return JSON.parse(readFileSync(FILE, 'utf8'))
    } catch {
      return { rev: 0, by: '', state: null } // nothing saved yet
    }
  }
  return {
    name: 'studio-sync',
    configureServer(server) {
      server.middlewares.use('/api/sync', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-store')
        if (req.method === 'POST') {
          let body = ''
          req.on('data', (c) => (body += c))
          req.on('end', () => {
            try {
              const { by, state } = JSON.parse(body)
              const doc = { rev: read().rev + 1, by, state }
              writeFileSync(FILE, JSON.stringify(doc))
              res.end(JSON.stringify({ rev: doc.rev }))
            } catch {
              res.statusCode = 400
              res.end('{}')
            }
          })
          return
        }
        res.end(JSON.stringify(read()))
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), sync()],
})
