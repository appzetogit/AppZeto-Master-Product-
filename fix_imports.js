const fs = require('fs');
const path = require('path');

// All patterns to replace: [regex, replacement]
// Ordered from most specific (deepest) to least specific
const PATTERNS = [
  // ── Context imports (../../context/X  →  @food/context/X) ──────────────────
  [/from ["'](\.\.\/)+context\//g, 'from "@food/context/'],
  [/import\(["'](\.\.\/)+context\//g, 'import("@food/context/'],

  // ── Cross-module utils (with intermediate module folder) ────────────────────
  [/from ["'](\.\.\/)+(user|restaurant|admin|delivery|usermain)\/utils\//g, 'from "@food/utils/'],
  [/from ["'](\.\.\/)+(user|restaurant|admin|delivery|usermain)\/hooks\//g, 'from "@food/hooks/'],
  [/from ["'](\.\.\/)+(user|restaurant|admin|delivery|usermain)\/api\//g,   'from "@food/api/'],

  // ── Cross-module components ─────────────────────────────────────────────────
  [/from ["'](\.\.\/)+user\/components\//g,       'from "@food/components/user/'],
  [/from ["'](\.\.\/)+restaurant\/components\//g, 'from "@food/components/restaurant/'],
  [/from ["'](\.\.\/)+admin\/components\//g,      'from "@food/components/admin/'],
  [/from ["'](\.\.\/)+delivery\/components\//g,   'from "@food/components/delivery/'],
  [/from ["'](\.\.\/)+usermain\/components\//g,   'from "@food/components/usermain/'],

  // ── Cross-module pages ──────────────────────────────────────────────────────
  [/from ["'](\.\.\/)+user\/pages\//g,       'from "@food/pages/user/'],
  [/from ["'](\.\.\/)+restaurant\/pages\//g, 'from "@food/pages/restaurant/'],
  [/from ["'](\.\.\/)+admin\/pages\//g,      'from "@food/pages/admin/'],
  [/from ["'](\.\.\/)+delivery\/pages\//g,   'from "@food/pages/delivery/'],
  [/from ["'](\.\.\/)+usermain\/pages\//g,   'from "@food/pages/usermain/'],

  // ── Cross-module hooks / api / utils / store / constants ───────────────────
  [/from ["'](\.\.\/)+hooks\//g,     'from "@food/hooks/'],
  [/from ["'](\.\.\/)+api\//g,       'from "@food/api/'],
  [/from ["'](\.\.\/)+utils\//g,     'from "@food/utils/'],
  [/from ["'](\.\.\/)+store\//g,     'from "@food/store/'],
  [/from ["'](\.\.\/)+constants\//g, 'from "@food/constants/'],

  // ── Bare (no trailing slash) ────────────────────────────────────────────────
  [/from ["'](\.\.\/)+hooks["']/g,     'from "@food/hooks"'],
  [/from ["'](\.\.\/)+api["']/g,       'from "@food/api"'],
  [/from ["'](\.\.\/)+utils["']/g,     'from "@food/utils"'],
  [/from ["'](\.\.\/)+store["']/g,     'from "@food/store"'],
  [/from ["'](\.\.\/)+constants["']/g, 'from "@food/constants"'],

  // ── Lazy imports ────────────────────────────────────────────────────────────
  [/import\(["'](\.\.\/)+user\/components\//g,       'import("@food/components/user/'],
  [/import\(["'](\.\.\/)+restaurant\/components\//g, 'import("@food/components/restaurant/'],
  [/import\(["'](\.\.\/)+admin\/components\//g,      'import("@food/components/admin/'],
  [/import\(["'](\.\.\/)+delivery\/components\//g,   'import("@food/components/delivery/'],
  [/import\(["'](\.\.\/)+user\/pages\//g,            'import("@food/pages/user/'],
  [/import\(["'](\.\.\/)+restaurant\/pages\//g,      'import("@food/pages/restaurant/'],

  // ── Lib alias leftovers ─────────────────────────────────────────────────────
  [/@food\/lib\//g, '@food/'],
];

let totalFixed = 0;

function processFile(full) {
  let content;
  try { content = fs.readFileSync(full, 'utf8'); } catch(e) { return; }

  let changed = false;
  const lines = content.split('\n').map((l, i) => {
    const orig = l;
    for (const [pattern, replacement] of PATTERNS) {
      l = l.replace(pattern, replacement);
    }
    if (l !== orig) {
      changed = true;
      totalFixed++;
      console.log(`Fixed ${path.relative('./src', full)}:${i+1}`);
      console.log(`  - ${orig.trim()}`);
      console.log(`  + ${l.trim()}`);
    }
    return l;
  });

  if (changed) {
    fs.writeFileSync(full, lines.join('\n'), 'utf8');
  }
}

function walk(dir) {
  try {
    const entries = fs.readdirSync(dir, {withFileTypes: true});
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!['node_modules', '.git', 'dist'].includes(e.name)) walk(full);
      } else if (/\.(jsx?|tsx?)$/.test(e.name)) {
        processFile(full);
      }
    }
  } catch(e) { console.error('Walk error:', e.message); }
}

walk('./src/modules/Food');
console.log(`\nDone! Fixed ${totalFixed} lines.`);
