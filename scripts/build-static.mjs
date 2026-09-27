import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'dist');
const files = [
  'index.html', 'favicon.svg', 'favicon.ico', 'favicon-32.png', 'css/chat.css',
  'js/chat.js', 'js/chat-draw.js', 'js/conversation-title.js',
  'js/animation-engine.js', 'js/card-renderer.js', 'js/cards-data.js',
  'js/cards-knowledge.js',
];

rmSync(output, { recursive: true, force: true });
for (const relative of files) {
  const destination = join(output, relative);
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(join(root, relative), destination, { recursive: true });
}

for (const relative of files.filter(file => file.endsWith('.js'))) {
  const source = readFileSync(join(output, relative), 'utf8');
  const imports = source.matchAll(/(?:from\s+|import\s*\()\s*['"](\.[^'"]+)['"]/g);
  for (const [, specifier] of imports) {
    const dependency = resolve(dirname(join(output, relative)), specifier.split('?')[0]);
    if (!existsSync(dependency)) throw new Error(`Missing static module: ${specifier} imported by ${relative}`);
  }
}

console.log(`Built static frontend in ${output}`);
