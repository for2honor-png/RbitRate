'use strict';
require('dotenv').config({ path: require('node:path').join(__dirname, '../.env') });
const electron = require('electron');
console.log('electron keys:', Object.keys(electron).slice(0,10).join(', '));
console.log('app defined:', typeof electron.app);
process.exit(0);
