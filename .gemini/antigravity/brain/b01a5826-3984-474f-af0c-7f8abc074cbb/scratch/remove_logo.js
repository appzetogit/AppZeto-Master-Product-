const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach( f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
};

const srcDir = path.resolve(process.cwd(), 'Frontend/src');
console.log('Searching for quickSpicyLogo in:', srcDir);

walk(srcDir, (filePath) => {
  if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('quickSpicyLogo')) {
      console.log('Cleaning logo in:', filePath);
      
      // Remove import line for the hardcoded logo
      content = content.replace(/import quickSpicyLogo from ["'].*quicky-spicy-logo\.png["'];?\n?/g, '');
      
      // Replace all usages of the variable with undefined
      // This will make src={logoUrl || quickSpicyLogo} become src={logoUrl || undefined}
      content = content.replace(/quickSpicyLogo/g, 'undefined');
      
      fs.writeFileSync(filePath, content, 'utf8');
    }
  }
});
