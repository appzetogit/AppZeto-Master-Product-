const fs = require('fs');
const content = fs.readFileSync('c:/Users/SHUBHAM/Desktop/AppZeto-Master-Product-/Frontend/src/modules/Food/components/user/DeliveryTrackingMap.jsx', 'utf8');

let openBraces = 0;
let openParens = 0;
let openBrackets = 0;

for (let i = 0; i < content.length; i++) {
    if (content[i] === '{') openBraces++;
    else if (content[i] === '}') openBraces--;
    else if (content[i] === '(') openParens++;
    else if (content[i] === ')') openParens--;
    else if (content[i] === '[') openBrackets++;
    else if (content[i] === ']') openBrackets--;
}

console.log({ openBraces, openParens, openBrackets });
