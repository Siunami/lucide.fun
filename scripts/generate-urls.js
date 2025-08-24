// scripts/generate-urls.js
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'directory');
const DIST = path.join(ROOT, 'dist');

function slugify(s) {
  return s
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseFolderName(dirName) {
  // Flat mode: Expecting "author_icon name_project name" separated by "_"
  const parts = dirName.split('_');
  if (parts.length >= 3) {
    const author = parts[0].trim();
    const icon = parts[1].trim();
    const name = parts.slice(2).join('_').trim();
    return { author, icon, name };
  }
  // Fallbacks
  if (parts.length === 2) {
    const author = parts[0].trim();
    const name = parts[1].trim();
    return { author, icon: '', name };
  }
  return { author: '', icon: '', name: dirName.trim() };
}

// Nested mode project folder parser:
// Expecting "icon name_project name" or "icon_project name" separated by "_"
// If no "_", we only have a project name and no icon.
function parseProjectFolderName(dirName) {
  const parts = dirName.split('_');
  if (parts.length >= 2) {
    const icon = parts[0].trim();
    const name = parts.slice(1).join('_').trim();
    return { icon, name };
  }
  return { icon: '', name: dirName.trim() };
}

async function ensureEmptyDir(dir) {
  await fs.promises.rm(dir, { recursive: true, force: true });
  await fs.promises.mkdir(dir, { recursive: true });
}

async function copyDir(src, dest) {
  await fs.promises.mkdir(dest, { recursive: true });
  const dirents = await fs.promises.readdir(src, { withFileTypes: true });
  for (const d of dirents) {
    const s = path.join(src, d.name);
    const t = path.join(dest, d.name);
    if (d.isDirectory()) {
      await copyDir(s, t);
    } else if (d.isFile()) {
      await fs.promises.copyFile(s, t);
    }
  }
}

function stripMarkdown(md) {
  if (!md) return '';
  let s = md;

  // Remove code fences/blocks
  s = s.replace(/```[\s\S]*?```/g, ' ');
  // Inline code
  s = s.replace(/`([^`]+)`/g, '$1');
  // Images ![alt](url) -> alt
  s = s.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
  // Links [text](url) -> text
  s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Headings, emphasis, blockquotes
  s = s.replace(/^#+\s*/gm, '');
  s = s.replace(/^[>\s]*>\s?/gm, '');
  s = s.replace(/(\*{1,3}|_{1,3}|~{2})/g, '');
  // HTML tags
  s = s.replace(/<[^>]+>/g, ' ');
  // Collapse whitespace
  s = s.replace(/\r?\n/g, '\n');
  s = s.replace(/[ \t]+/g, ' ');
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

function firstParagraph(md) {
  if (!md) return '';
  const parts = md.split(/\n\s*\n/).map(x => x.trim()).filter(Boolean);
  return parts[0] || '';
}

async function readDescription(projectDirAbs) {
  const candidates = ['readme.md', 'README.md', 'Readme.md'];
  for (const f of candidates) {
    const p = path.join(projectDirAbs, f);
    try {
      const stat = await fs.promises.stat(p);
      if (stat.isFile()) {
        const raw = await fs.promises.readFile(p, 'utf8');
        return firstParagraph(stripMarkdown(raw));
      }
    } catch { /* ignore */ }
  }
  return '';
}

async function hasIndexHtml(dir) {
  try {
    const ix = path.join(dir, 'index.html');
    const st = await fs.promises.stat(ix);
    return st.isFile();
  } catch {
    return false;
  }
}

(async function main() {
  // Prepare dist/
  await ensureEmptyDir(DIST);

  // Copy root index.html into dist (simple static entry)
  const srcIndex = path.join(ROOT, 'index.html');
  try {
    await fs.promises.copyFile(srcIndex, path.join(DIST, 'index.html'));
  } catch (e) {
    console.warn('index.html missing at repo root; continuing without copying.');
  }

  // Copy lucide-data.json into dist
  const srcData = path.join(ROOT, 'lucide-data.json');
  try {
    await fs.promises.copyFile(srcData, path.join(DIST, 'lucide-data.json'));
  } catch (e) {
    console.warn('lucide-data.json missing at repo root; continuing without copying.');
  }

  // Copy authors.json into dist
  const srcAuthors = path.join(ROOT, 'authors.json');
  try {
    await fs.promises.copyFile(srcAuthors, path.join(DIST, 'authors.json'));
  } catch (e) {
    console.warn('authors.json missing at repo root; continuing without copying.');
  }

  // Copy client scripts needed by index.html
  try {
    const outScripts = path.join(DIST, 'scripts');
    await fs.promises.mkdir(outScripts, { recursive: true });
    await fs.promises.copyFile(
      path.join(ROOT, 'scripts', 'icon-ui.js'),
      path.join(outScripts, 'icon-ui.js')
    );
  } catch (e) {
    console.warn('scripts/icon-ui.js missing; continuing without copying.');
  }

  // Enumerate under directory/
  let entries = [];
  try {
    entries = await fs.promises.readdir(SRC_DIR, { withFileTypes: true });
  } catch (e) {
    console.error('Missing "directory/" folder.');
    process.exit(1);
  }

  const projects = [];
  for (const d of entries) {
    if (!d.isDirectory()) continue;

    const topAbs = path.join(SRC_DIR, d.name);

    // 1) Flat project directly in topAbs
    if (await hasIndexHtml(topAbs)) {
        const { author, icon, name } = parseFolderName(d.name);
        const projName = name || d.name;
        const authorName = author && author.trim() ? author : '';
  
        const authorSlug = authorName ? slugify(authorName) : '';
        const projSlug = slugify(projName);
        const outDir = authorSlug
          ? path.join(DIST, authorSlug, projSlug)
          : path.join(DIST, projSlug);
  
        await copyDir(topAbs, outDir);
        const description = await readDescription(topAbs);
  
        const base =
          process.env.BASE_URL
            ? process.env.BASE_URL.replace(/\/+$/, '')
            : '';
        const pathUrl = authorSlug ? `/${authorSlug}/${projSlug}/` : `/${projSlug}/`;
        const url = base ? `${base}${pathUrl}` : pathUrl;
  
        projects.push({
          author: authorName,
          icon,
          name: projName,
          url,
          description
        });
        continue;
    }

    // 2) Nested: treat this folder name as author, and scan subfolders for projects
    let subdirs = [];
    try {
      subdirs = await fs.promises.readdir(topAbs, { withFileTypes: true });
    } catch {
      subdirs = [];
    }

    for (const s of subdirs) {
      if (!s.isDirectory()) continue;
      const projectAbs = path.join(topAbs, s.name);
      if (!(await hasIndexHtml(projectAbs))) continue;

      const author = d.name.trim();
      const { icon, name } = parseProjectFolderName(s.name);
      const projName = name || s.name;

      const authorSlug = slugify(author);
      const projSlug = slugify(projName);
      const outDir = path.join(DIST, authorSlug, projSlug);

      await copyDir(projectAbs, outDir);
      const description = await readDescription(projectAbs);

      const base =
        process.env.BASE_URL
          ? process.env.BASE_URL.replace(/\/+$/, '')
          : '';
      const pathUrl = `/${authorSlug}/${projSlug}/`;
      const url = base ? `${base}${pathUrl}` : pathUrl;

      projects.push({
        author,
        icon,
        name: projName,
        url,
        description
      });
    }
  }

  // Sort by author then name for stability
  projects.sort((a, b) => {
    const aa = (a.author || '').toLocaleLowerCase();
    const bb = (b.author || '').toLocaleLowerCase();
    if (aa !== bb) return aa.localeCompare(bb, undefined, { sensitivity: 'base' });
    return (a.name || '').localeCompare((b.name || ''), undefined, { sensitivity: 'base' });
  });

  // Write urls.json into dist
  await fs.promises.writeFile(
    path.join(DIST, 'urls.json'),
    JSON.stringify(projects, null, 2) + '\n',
    'utf8'
  );

  console.log(`Built ${projects.length} project(s) into dist/ and wrote urls.json`);
})().catch(err => {
  console.error(err);
  process.exit(1);
});