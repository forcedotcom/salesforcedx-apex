#!/usr/bin/env node

/**
 * Script to update snapshots for the library change verification tests
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🔄 Updating snapshots for library change verification...');

try {
  // Set the environment variable to update snapshots
  process.env.CHAI_JEST_SNAPSHOT_UPDATE_ALL = 'true';

  // Run the snapshot tests
  execSync('npm test -- --grep "Snapshot Tests"', {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..')
  });

  // Copy snapshots from lib to source directory so they can be tracked by git
  const rootDir = path.resolve(__dirname, '..');
  execSync('mkdir -p test/tests/__snapshots__', { cwd: rootDir });
  execSync('cp lib/test/tests/__snapshots__/*.snap test/tests/__snapshots__/', { cwd: rootDir });

  console.log('✅ Snapshots updated successfully!');
  console.log('📝 Review the updated snapshot files and commit them if the changes are expected.');
  console.log('📁 Snapshots are located in: test/tests/__snapshots__/');

} catch (error) {
  console.error('❌ Failed to update snapshots:', error.message);
  process.exit(1);
}
