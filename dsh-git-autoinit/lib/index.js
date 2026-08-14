/**
 * dsh-git-autoinit — global git workspace auto-initialization.
 *
 * Host half only. On mount it scans every existing session working directory
 * AND every registered workspace path, then listens for `session/created` so
 * future sessions/workspaces are covered too. For each directory:
 *   - `git init` when it is not already inside a work tree (idempotent),
 *   - backfill a conservative `.gitignore` when one is missing (existing
 *     .gitignore files are never touched).
 *
 * This keeps the sidebar Git panel (e.g. dsh-better-sidebar) usable in any
 * workspace without manual `git init`.
 */
import { spawn } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const name = 'dsh-git-autoinit'

/** The conservative .gitignore content written only when none exists. */
const IGNORE_CONTENT = '# \u901a\u7528\u5ffd\u7565\uff08git-autoinit \u81ea\u52a8\u751f\u6210\uff09\nnode_modules/\n*.log\n.DS_Store\nThumbs.db\ndesktop.ini\n'

export function apply(ctx) {
  const state = new Map() // cwd -> { status, msg }
  const pending = new Map() // cwd -> Promise

  /** Run one git command in `cwd`; resolves instead of rejecting on failure. */
  function runGit(cwd, args) {
    return new Promise((resolve) => {
      let child
      try {
        child = spawn('git', ['-C', cwd, '--no-pager', '-c', 'color.ui=false', ...args], {
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
        })
      } catch (e) {
        resolve({ code: -1, out: '', err: String(e && e.message || e) })
        return
      }
      let out = ''
      let err = ''
      child.stdout.on('data', (d) => { out += d })
      child.stderr.on('data', (d) => { err += d })
      child.on('error', (e) => resolve({ code: -1, out, err: String(e && e.message || e) }))
      child.on('close', (code) => resolve({ code, out, err }))
    })
  }

  /** Write the conservative .gitignore only when the directory has none. */
  function writeIgnoreIfMissing(cwd) {
    const ignorePath = join(cwd, '.gitignore')
    if (existsSync(ignorePath)) return false
    try {
      writeFileSync(ignorePath, IGNORE_CONTENT, 'utf8')
      return true
    } catch (e) {
      console.error('[git-autoinit] write .gitignore failed:', String(e && e.message || e))
      return false
    }
  }

  /** Idempotently ensure one directory is a git repo (deduped, in-flight merged). */
  async function ensure(cwd) {
    if (!cwd || typeof cwd !== 'string') return
    if (state.has(cwd)) return
    if (pending.has(cwd)) return pending.get(cwd)
    const p = (async () => {
      try {
        const probe = await runGit(cwd, ['rev-parse', '--is-inside-work-tree'])
        if (probe.code === 0 && probe.out.trim() === 'true') {
          const wrote = writeIgnoreIfMissing(cwd)
          state.set(cwd, { status: 'repo', msg: wrote ? 'already repo + .gitignore' : 'already a git repository' })
          return
        }
        const init = await runGit(cwd, ['init'])
        if (init.code !== 0) {
          state.set(cwd, { status: 'failed', msg: (init.err || init.out || 'git init failed').trim().slice(0, 200) })
          return
        }
        const wrote = writeIgnoreIfMissing(cwd)
        state.set(cwd, { status: 'initialized', msg: wrote ? 'git init + .gitignore' : 'git init (no .gitignore)' })
      } catch (e) {
        state.set(cwd, { status: 'failed', msg: String(e && e.message || e).slice(0, 200) })
      } finally {
        pending.delete(cwd)
      }
    })()
    pending.set(cwd, p)
    return p
  }

  // Scan existing sessions (global reach — covers every live session's cwd).
  const sessions = ctx.get('sessions')
  if (sessions) {
    try {
      for (const session of sessions.list()) {
        const cwd = session && session.header ? session.header.cwd : undefined
        if (cwd) ensure(cwd)
      }
    } catch (e) {
      console.error('[git-autoinit] scan existing sessions failed:', String(e && e.message || e))
    }
  }

  // Scan existing registered workspaces (canonical paths, may outlive sessions).
  const workspaces = ctx.get('workspaceRegistry')
  if (workspaces) {
    try {
      for (const ws of workspaces.list()) {
        if (ws && ws.path) ensure(ws.path)
      }
    } catch (e) {
      console.error('[git-autoinit] scan existing workspaces failed:', String(e && e.message || e))
    }
  }

  // Future sessions (new conversations, new workspaces) are covered here.
  ctx.on('session/created', (session) => {
    const cwd = session && session.header ? session.header.cwd : undefined
    if (cwd) ensure(cwd)
  })
}
