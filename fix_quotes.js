const fs = require('fs');
const path = require('path');

function walk(dir) {
  const entries = fs.readdirSync(dir, {withFileTypes: true});
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!['node_modules','.git','dist'].includes(e.name)) walk(full);
    } else if (/\.(jsx?|tsx?)$/.test(e.name)) {
      let content;
      try { content = fs.readFileSync(full, 'utf8'); } catch(x) { continue; }

      // Fix mismatched quotes: from "@food/X'; → from "@food/X";
      let fixed = content
        .replace(/from "(@food\/[^"']+)';/g, 'from "$1";')
        .replace(/from '(@food\/[^"']+)";/g, "from '$1';");

      if (fixed !== content) {
        fs.writeFileSync(full, fixed, 'utf8');
        console.log('Fixed mismatched quotes in:', path.relative('./src', full));
      }
    }
  }
}
walk('./src/modules/Food');
console.log('Done!');
