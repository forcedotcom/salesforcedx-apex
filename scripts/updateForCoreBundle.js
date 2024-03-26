const fs = require('fs');
const path = require('path');

// Function to update package.json
function updatePackageJson() {
  const packagePath = './package.json';

  fs.readFile(packagePath, 'utf8', (err, data) => {
    if (err) {
      console.error(`Error reading package.json: ${err}`);
      return;
    }

    try {
      const packageJson = JSON.parse(data);

      // Update package name if necessary
      if (packageJson.name && packageJson.name === '@salesforce/apex-node') {
        packageJson.name = '@salesforce/apex-node-bundle';
      }

      // Remove 'prepare' scripts
      if (packageJson.scripts) {
        delete packageJson.scripts.prepare;
      }

      // Update @salesforce/core dependency
      if (packageJson?.dependencies["@salesforce/core"]) {
        packageJson.dependencies["@salesforce/core-bundle"] = packageJson.dependencies["@salesforce/core"]
        delete packageJson.dependencies["@salesforce/core"];
      }

      fs.writeFile(packagePath, JSON.stringify(packageJson, null, 2), 'utf8', (writeErr) => {
        if (writeErr) {
          console.error(`Error writing to package.json: ${writeErr}`);
        } else {
          console.log('package.json updated successfully.');
        }
      });
    } catch (parseErr) {
      console.error(`Error parsing JSON in package.json: ${parseErr}`);
    }
  });
}

function updateCoreImports() {
  const dirs = ['./src', './test'];
  function replaceTextInFile(filePath) {
    const data = fs.readFileSync(filePath, 'utf8');
    let result = data.replace(
      /'@salesforce\/core'/g,
      "'@salesforce/core-bundle'"
    );
    result = result.replace(
      /'@salesforce\/core\/(.+)'/g,
      "'@salesforce/core-bundle'"
    );
    fs.writeFileSync(filePath, result, 'utf8');
  }
  function traverseDirectory(directory) {
    fs.readdirSync(directory).forEach((file) => {
      const fullPath = path.join(directory, file);
      if (fs.lstatSync(fullPath).isDirectory()) {
        traverseDirectory(fullPath);
      } else if (path.extname(fullPath) === '.ts') {
        replaceTextInFile(fullPath);
      }
    });
  }
  dirs.forEach((dir) => {
    traverseDirectory(dir);
  });
}

updatePackageJson();
updateCoreImports();
