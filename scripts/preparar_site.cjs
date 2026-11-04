// Publica somente o site, com versão de cache derivada do conteúdo.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
// Também protege quem prepara a publicação localmente, fora do workflow.
execFileSync(process.execPath, ['--test', 'tests/site.test.cjs'], { cwd: root, stdio: 'inherit' });
const out = path.join(root, '_site');
if (fs.existsSync(out)) throw new Error('A pasta _site já existe. Use uma pasta de trabalho limpa para preparar outra publicação.');
const htmlPath = path.join(root, 'site/index.html');
let html = fs.readFileSync(htmlPath, 'utf8');
const hash = crypto.createHash('sha256').update(html);
for (const [, file] of html.matchAll(/(?:src|href)="((?:js|css|dados)\/[^"?]+)\?v=[^"]+"/g)) {
  hash.update(file).update(fs.readFileSync(path.join(root, 'site', file)));
}
const version = hash.digest('hex').slice(0, 16);
fs.mkdirSync(path.join(out, 'site'), { recursive: true });
for (const dir of ['js', 'css', 'dados']) fs.cpSync(path.join(root, 'site', dir), path.join(out, 'site', dir), { recursive: true });
html = html.replace(/\?v=[^" ]+/g, '?v=' + version);
fs.writeFileSync(path.join(out, 'site/index.html'), html);
fs.copyFileSync(path.join(root, 'index.html'), path.join(out, 'index.html'));
fs.writeFileSync(path.join(out, '.nojekyll'), '');
console.log('Site preparado em _site, versão ' + version);
