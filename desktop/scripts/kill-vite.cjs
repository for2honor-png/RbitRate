'use strict';
const { execSync } = require('child_process');

// Kill any lingering Electron process first (holds SQLite DB lock if previous session crashed)
try { execSync('taskkill /F /IM electron.exe', { stdio: 'ignore' }); } catch (_) {}

// Kill Vite ports AND the Electron order/mobile API servers so they release 3721/3722 on restart
[5173, 5174, 5175, 5176, 3721, 3722].forEach(port => {
  try {
    const result = execSync(
      `netstat -ano | findstr ":${port} " | findstr "LISTENING"`,
      { stdio: ['pipe', 'pipe', 'ignore'] }
    ).toString();
    const match = result.match(/\s+(\d+)\s*$/m);
    if (match) {
      try { execSync(`taskkill /PID ${match[1]} /F`, { stdio: 'ignore' }); } catch (_) {}
    }
  } catch (_) {}
});
