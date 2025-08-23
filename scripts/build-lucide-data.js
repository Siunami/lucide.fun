// Node 18+
// Usage:
//   node scripts/build-lucide-data.js \
//     --src "/Users/matthewsiu/Desktop/lucide" \
//     --out "/Users/matthewsiu/Desktop/lucide.fun/lucide-data.json"

import fs from 'node:fs/promises';
import path from 'node:path';

const CATEGORY_ORDER = [
  'Accessibility','Accounts & access','Animals','Arrows','Brands','Buildings','Charts',
  'Communication','Connectivity','Cursors','Design','Coding & development','Devices','Emoji',
  'File icons','Finance','Food & beverage','Gaming','Home','Layout','Mail','Mathematics',
  'Medical','Multimedia','Nature','Navigation','Notification','People','Photography','Science',
  'Seasons','Security','Shapes','Shopping','Social','Sports','Sustainability','Text formatting',
  'Time & calendar','Tools','Transportation','Travel','Weather'
];

function parseArgs() {
  const out = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--src') out.src = argv[++i];
    else if (a === '--out') out.out = argv[++i];
  }
  if (!out.src || !out.out) {
    console.error('Required flags: --src <lucide-dir> --out <output-json>');
    process.exit(1);
  }
  return out;
}

async function readJSON(file) {
  const txt = await fs.readFile(file, 'utf8');
  return JSON.parse(txt);
}

async function loadCategories(srcDir) {
  const dir = path.join(srcDir, 'lucide', 'categories');
  const files = await fs.readdir(dir);
  const map = new Map(); // slug -> { slug, title, icon }
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const slug = f.slice(0, -5);
    const data = await readJSON(path.join(dir, f));
    map.set(slug, {
      slug,
      title: data.title || slug,
      icon: data.icon || null
    });
  }
  return map;
}

async function loadIcons(srcDir) {
  const dir = path.join(srcDir, 'lucide', 'icons');
  const files = await fs.readdir(dir);
  const icons = []; // { name, categories: [slug] }
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const name = f.slice(0, -5);
    const data = await readJSON(path.join(dir, f));
    const cats = Array.isArray(data.categories) ? data.categories : [];
    icons.push({ name, categories: cats });
  }
  return icons;
}

function sortByCategoryOrder(categories) {
  const orderIndex = new Map(CATEGORY_ORDER.map((t, i) => [t, i]));
  return categories.sort((a, b) => {
    const ai = orderIndex.has(a.title) ? orderIndex.get(a.title) : Number.MAX_SAFE_INTEGER;
    const bi = orderIndex.has(b.title) ? orderIndex.get(b.title) : Number.MAX_SAFE_INTEGER;
    if (ai !== bi) return ai - bi;
    return a.title.localeCompare(b.title);
  });
}

async function main() {
  const { src, out } = parseArgs();

  const catMap = await loadCategories(src); // slug -> {slug,title,icon}
  const icons = await loadIcons(src); // [{name,categories:[slug,...]}, ...]

  // Build category buckets
  const buckets = new Map(); // slug -> { slug, title, icon, icons: [] }
  for (const [slug, meta] of catMap) {
    buckets.set(slug, { slug, title: meta.title, icon: meta.icon, icons: [] });
  }

  // Assign icons to categories by slug as listed in icon JSON
  for (const it of icons) {
    for (const slug of it.categories) {
      if (!buckets.has(slug)) {
        // Create a fallback category if a slug exists on an icon but not in categories folder
        buckets.set(slug, { slug, title: slug, icon: null, icons: [] });
      }
      buckets.get(slug).icons.push(it.name);
    }
  }

  // Sort icons within each category
  for (const b of buckets.values()) {
    b.icons.sort((a, b) => a.localeCompare(b));
    b.count = b.icons.length;
  }

  // Stable sort categories by desired display order, then title
  const categories = sortByCategoryOrder([...buckets.values()]);

  // Build All
  const allSet = new Set();
  for (const it of icons) allSet.add(it.name);
  const all = [...allSet].sort((a, b) => a.localeCompare(b));

  const result = {
    generatedAt: new Date().toISOString(),
    total: all.length,
    categories,
    all
  };

  await fs.writeFile(out, JSON.stringify(result, null, 2), 'utf8');
  console.log(`Wrote ${out} with ${result.total} icons across ${categories.length} categories`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});