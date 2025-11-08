// Simple migration runner
const { spawn } = require('child_process');

console.log('Running OTA ticket batches migration...');

// Set environment variables
process.env.USE_DATABASE = 'true';
process.env.NODE_ENV = 'production';

const child = spawn('npx', ['typeorm-ts-node-commonjs', 'migration:run', '-d', 'src/config/database.ts'], {
  stdio: 'inherit',
  env: process.env
});

child.on('close', (code) => {
  console.log(`Migration completed with code ${code}`);
  process.exit(code);
});

child.on('error', (err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});