const { spawnSync } = require('child_process');
const electronPath = require('electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const result = spawnSync(electronPath, ['.'], { env, stdio: 'inherit', cwd: process.cwd() });
process.exit(result.status ?? 0);
