import { spawn, execSync } from 'child_process';

console.log('🚀 Starting BorderGuard AI (SatyaShield) full-stack environment...\n');

// 1. Compile server TypeScript
console.log('📦 Compiling TypeScript server...');
try {
  execSync('npx tsc', { stdio: 'inherit' });
  console.log('✓ Server compilation complete.\n');
} catch (e) {
  console.error('❌ TypeScript compilation failed.');
  process.exit(1);
}

// 2. Start Backend Server
const server = spawn(process.execPath, ['dist-server/server/src/index.js'], {
  stdio: 'inherit'
});

// 3. Start Frontend Client Dev Server
const client = spawn('npm', ['run', '--prefix', 'client', 'dev'], {
  stdio: 'inherit',
  shell: true
});

const handleExit = () => {
  try {
    if (server && !server.killed) server.kill();
    if (client && !client.killed) client.kill();
  } catch {}
  process.exit(0);
};

process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);
