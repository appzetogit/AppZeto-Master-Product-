const fs = require('fs');
const files = [
    'src/modules/Food/components/delivery/DeliveryRouter.jsx',
    'src/modules/Food/components/admin/AdminRouter.jsx'
];

files.forEach(file => {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        // Replace path="/..." with path="..." but keep path="/" as is if it's the root
        content = content.replace(/path="\/([^"]+)"/g, 'path="$1"');
        fs.writeFileSync(file, content);
        console.log(`Successfully updated ${file}`);
    } else {
        console.log(`File not found: ${file}`);
    }
});
