// Starts the API server (port 8787) and the Vite dev server (port 5173) together.
// Ctrl+C stops both.
import { spawn } from 'node:child_process';

const procs = [
  spawn('node', ['server/server.js'], { stdio: 'inherit', shell: true }),
  spawn('npx', ['vite'], { stdio: 'inherit', shell: true }),
];

function shutdown() {
  for (const p of procs) {
    try {
      p.kill('SIGTERM');
    } catch {}
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
for (const p of procs) {
  p.on('exit', (code) => {
    if (code !== null && code !== 0) shutdown();
  });
}
