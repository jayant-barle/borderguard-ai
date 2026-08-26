import { spawn } from 'child_process';
import path from 'path';

console.log('🚀 Starting BorderGuard AI (SatyaShield) full-stack environment...\n');

// 1. Build server TypeScript files
console.log('📦 Compiling TypeScript server...');
const tsc = spawn('npx', ['tsc'], { stdio: 'inherit', shell: true });

tsc.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ TypeScript compilation failed with code', code);
    process.exit(code || 1);
  }

  console.log('✓ Server compilation complete.\n');

  // 2. Start backend server
  const server = spawn('node', ['dist-server/server/src/index.js'], {
    stdio: 'inherit',
    shell: true
  });

  // 3. Start frontend Vite dev server
  const client = spawn('npm', ['run', '--prefix', 'client', 'dev'], {
    stdio: 'inherit',
    shell: true
  });

  const cleanup = () => {
    try {
      server.kill();
      client.kill();
    } catch {}
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);
});
