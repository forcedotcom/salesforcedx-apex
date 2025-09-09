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

  console.log('✅ Snapshots updated successfully!');
  console.log('📝 Review the updated snapshot files and commit them if the changes are expected.');
  console.log('📁 Snapshots are located in: test/tests/__snapshots__/');

  // Copy snapshots from lib/ to test/tests/__snapshots__/ since lib/ is ignored by git
  const fs = require('fs');
  const libSnapshotDir = path.resolve(__dirname, '..', 'lib', 'test', 'tests', '__snapshots__');
  const srcSnapshotDir = path.resolve(__dirname, '..', 'test', 'tests', '__snapshots__');

  if (fs.existsSync(libSnapshotDir)) {
    if (!fs.existsSync(srcSnapshotDir)) {
      fs.mkdirSync(srcSnapshotDir, { recursive: true });
    }

    const files = fs.readdirSync(libSnapshotDir);
    for (const file of files) {
      if (file.endsWith('.snap')) {
        fs.copyFileSync(
          path.join(libSnapshotDir, file),
          path.join(srcSnapshotDir, file)
        );
        console.log(`📋 Copied snapshot: ${file}`);
      }
    }
  }

} catch (error) {
  console.error('❌ Failed to update snapshots:', error.message);
  process.exit(1);
}
