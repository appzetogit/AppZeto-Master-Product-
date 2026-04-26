const fs = require('fs');

const filePath = 'd:\\Appzeto Master Product\\Frontend\\src\\modules\\quickCommerce\\admin\\pages\\ContentManager.jsx';
const content = fs.readFileSync(filePath, 'utf8');
let balance = 0;
let lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    for (let char of line) {
        if (char === '{') balance++;
        if (char === '}') balance--;
    }
    if (i + 1 === 1177) {
        console.log(`Balance at line 1177: ${balance}`);
    }
}
