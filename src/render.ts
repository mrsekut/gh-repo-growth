import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AggregatedData, FilterOpts } from './aggregate.js';

// Injected at build time by scripts/build.ts
declare const TEMPLATE_HTML: string | undefined;

export function generateHtml(
  data: AggregatedData,
  username: string,
  opts: FilterOpts,
): string {
  const jsonData = JSON.stringify(
    data.entries.map(e => ({ m: e.month, n: e.count, c: e.cumulative })),
  );

  const subtitle = [
    username,
    ...(!opts.includeForks ? ['forks excluded'] : []),
    ...(opts.excludePrivate ? ['private excluded'] : []),
    ...(opts.excludeArchived ? ['archived excluded'] : []),
    'cumulative repositories by creation date',
  ].join(' - ');

  const today = new Date().toISOString().slice(0, 10);

  return getTemplate()
    .replace('{{DATA}}', jsonData)
    .replace(/\{\{USERNAME\}\}/g, username)
    .replace('{{SUBTITLE}}', subtitle)
    .replace('{{GENERATED_DATE}}', today);
}

function getTemplate(): string {
  if (typeof TEMPLATE_HTML === 'string') return TEMPLATE_HTML;
  // Fallback for dev: bun run src/index.ts
  return readFileSync(
    resolve(import.meta.dirname!, '../template.html'),
    'utf-8',
  );
}
