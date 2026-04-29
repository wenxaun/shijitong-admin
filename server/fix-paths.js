const fs = require('fs');
const path = require('path');

function fixPaths(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      fixPaths(fullPath);
    } else if (file.name.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      content = content.replace(/require\(['"]@\/([^'"]+)['"]\)/g, "require('./$1')");
      fs.writeFileSync(fullPath, content, 'utf8');
    }
  }
}

fixPaths('./dist');
console.log('路径替换完成');
