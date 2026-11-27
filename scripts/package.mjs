import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, lstat } from 'node:fs/promises';
import { resolve } from 'node:path';
import JSZip from 'jszip';

const root = resolve(import.meta.dirname, '..');
const allowed = /^(?:(?:api|backend|config|database|public|scripts|src|supabase|tests)\/|docs\/(?:SETUP|ARCHITECTURE)\.md$|(?:\.env\.example|\.gitignore|bun\.lock|package\.json|README\.md|server\.ts|tsconfig\.json|vercel\.json|vite\.config\.ts|index\.html)$)/;
const blocked = /(?:^|\/)(?:node_modules|dist|build|coverage|release|\.git|\.cache|\.aistudio)(?:\/|$)|\.(?:zip|log|dump|backup|pem|key)$/i;
const listing = execFileSync('git', ['ls-files','-co','--exclude-standard','-z'], {cwd:root,encoding:'utf8'});
const files = [...new Set(listing.split('\0'))].filter(file => allowed.test(file) && !blocked.test(file) &&
  (!/(?:^|\/)\.env/i.test(file) || file.endsWith('/.env.example') || file === '.env.example')).sort();
const zip = new JSZip();
for (const file of files) {
  const source = resolve(root,file);
  const stat = await lstat(source);
  if (!stat.isFile()) throw new Error('Arquivo não regular: '+file);
  zip.file('BVH FINAL/'+file,await readFile(source));
}
const bytes = await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'});
const verified = await JSZip.loadAsync(bytes,{checkCRC32:true});
const entries = Object.values(verified.files).filter(file=>!file.dir).map(file=>file.name).sort();
if (JSON.stringify(entries) !== JSON.stringify(files.map(file=>'BVH FINAL/'+file))) throw new Error('Manifesto divergente.');
await mkdir(resolve(root,'release'),{recursive:true});
await writeFile(resolve(root,'release/bv-creative-hub.zip'),bytes);
await writeFile(resolve(root,'release/bv-creative-hub-manifest.txt'),entries.join('\n')+'\n');
console.log(`Pacote verificado: ${entries.length} arquivos, ${bytes.length} bytes.`);
