const { spawn } = require('child_process');
const { platform } = require('os');

// Start Next.js dev server
const devProcess = spawn('pnpm', ['next', 'dev'], {
  stdio: 'inherit',
  shell: true,
});

// Wait a bit for server to start, then open browser
setTimeout(() => {
  const url = 'http://localhost:3000/teaching-design/intent';
  const command = platform() === 'win32' ? 'start' : platform() === 'darwin' ? 'open' : 'xdg-open';
  
  spawn(command, [url], { shell: true, stdio: 'ignore' });
  console.log(`\n🎓 Opening Teaching Design at ${url}\n`);
}, 2000);

// Handle process termination
process.on('SIGINT', () => {
  devProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  devProcess.kill('SIGTERM');
  process.exit(0);
});
