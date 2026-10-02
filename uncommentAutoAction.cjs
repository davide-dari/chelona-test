const fs = require('fs');
const filePath = '/Users/davidedari/Documents/Progetti/app/chelona/src/services/chelonaEngine.ts';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Uncomment all `// autoAction:`
code = code.replace(/\/\/\s*\/\/\s*autoAction:/g, 'autoAction:');
code = code.replace(/\/\/\s*autoAction:/g, 'autoAction:');

fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully uncommented autoActions');
