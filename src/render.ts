import type { AggregatedData, FilterOpts } from './aggregate.js';

// Injected at build time by scripts/build.ts
declare const TEMPLATE_HTML: string;

export function generateHtml(
  data: AggregatedData,
  username: string,
  opts: FilterOpts,
): string {
  const jsonData = JSON.stringify(
    data.entries.map(e => ({ m: e.month, n: e.count, c: e.cumulative })),
  );

  const subtitleParts: string[] = [username];
  if (!opts.includeForks) subtitleParts.push('forks excluded');
  if (opts.excludePrivate) subtitleParts.push('private excluded');
  if (opts.excludeArchived) subtitleParts.push('archived excluded');
  subtitleParts.push('cumulative repositories by creation date');
  const subtitle = subtitleParts.join(' - ');

  const today = new Date().toISOString().slice(0, 10);

  return TEMPLATE_HTML.replace('{{DATA}}', jsonData)
    .replace(/\{\{USERNAME\}\}/g, username)
    .replace('{{SUBTITLE}}', subtitle)
    .replace('{{GENERATED_DATE}}', today);
}
