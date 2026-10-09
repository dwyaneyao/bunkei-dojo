import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { isProgress, mergeProgress, type Mergeable } from './src/lib/merge.ts'

// Layout: exam-review/{content,userdata,web}. Content JSON is bundled via import.meta.glob;
// progress is saved to userdata/progress.json so it survives browser resets and Claude can read it.
// `vite --mode sandbox` runs a throwaway copy on port 5180 with its own userdata-sandbox/, for trying
// things out without touching the real learning record.
const APP = path.resolve(import.meta.dirname, '..')

/** Read a JSON file written by anyone (PowerShell adds a BOM). Missing → null; unreadable → throws. */
function readJson(file: string): unknown {
  if (!fs.existsSync(file)) return null
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''))
}

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function examServer(userdata: string): Plugin {
  const PROGRESS = path.join(userdata, 'progress.json')
  const BACKUP = path.join(userdata, 'backup')

  const send = (res: import('node:http').ServerResponse, status: number, body: string) => {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    res.end(body)
  }

  return {
    name: 'exam-review-server',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0]

        if (url === '/api/progress' && req.method === 'GET') {
          try {
            send(res, 200, JSON.stringify(readJson(PROGRESS)))
          } catch (e) {
            // Never pretend the file is empty: the app goes read-only instead of overwriting it.
            send(res, 500, JSON.stringify({ error: `progress.json 读不了：${e}` }))
          }
          return
        }

        if (url === '/api/progress' && req.method === 'PUT') {
          let body = ''
          req.setEncoding('utf8')
          req.on('data', (c) => (body += c))
          req.on('end', () => {
            try {
              const incoming = JSON.parse(body)
              if (!isProgress(incoming)) return send(res, 400, JSON.stringify({ error: 'not a progress record' }))
              let disk: unknown
              try {
                disk = readJson(PROGRESS)
              } catch (e) {
                return send(res, 409, JSON.stringify({ error: `progress.json 读不了，没有覆盖它：${e}` }))
              }
              // Merge with what is on disk, so a stale tab or an empty browser never wipes the record.
              const merged = isProgress(disk) ? mergeProgress(disk as Mergeable, incoming) : incoming
              fs.mkdirSync(userdata, { recursive: true })
              if (fs.existsSync(PROGRESS)) {
                // One backup per day (the first save of the day keeps yesterday's state), plus the last one.
                fs.mkdirSync(BACKUP, { recursive: true })
                const daily = path.join(BACKUP, `progress-${today()}.json`)
                if (!fs.existsSync(daily)) fs.copyFileSync(PROGRESS, daily)
                fs.copyFileSync(PROGRESS, PROGRESS + '.bak')
              }
              // Write to a temp file then rename, so a crash never leaves half a progress file.
              const tmp = PROGRESS + '.tmp'
              fs.writeFileSync(tmp, JSON.stringify(merged), 'utf8')
              fs.renameSync(tmp, PROGRESS)
              send(res, 200, JSON.stringify(merged))
            } catch (e) {
              send(res, 500, JSON.stringify({ error: String(e) }))
            }
          })
          return
        }
        next()
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const sandbox = mode === 'sandbox'
  return {
    // Relative asset paths, so the built site works under any sub-path (e.g. GitHub Pages /<repo>/).
    base: './',
    plugins: [react(), examServer(path.join(APP, sandbox ? 'userdata-sandbox' : 'userdata'))],
    server: { port: sandbox ? 5180 : 5179, strictPort: true, fs: { allow: [APP] } },
  }
})
