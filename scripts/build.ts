import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const templatePath = resolve(import.meta.dirname!, '../template.html');
const templateContent = readFileSync(templatePath, 'utf-8');

await Bun.build({
  entrypoints: ['src/index.ts'],
  outdir: 'dist',
  target: 'node',
  format: 'esm',
  define: {
    TEMPLATE_HTML: JSON.stringify(templateContent),
  },
  banner: '#!/usr/bin/env node',
});

console.log('Build complete: dist/index.js');
