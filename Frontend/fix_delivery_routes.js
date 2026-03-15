const fs = require('fs');
const path = 'c:\\Users\\SHUBHAM\\Desktop\\AppZeto-Master-Product-\\Frontend\\src\\modules\\Food\\components\\delivery\\DeliveryRouter.jsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/path="\/([^"]+)"/g, 'path="$1"');
fs.writeFileSync(path, content);
console.log('Successfully updated DeliveryRouter.jsx');
