import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type {
  AggregatedData,
  FilterOpts,
  RepoStarSummary,
  StarAggregatedData,
} from './aggregate.js';

// Injected at build time by scripts/build.ts
declare const TEMPLATE_HTML: string | undefined;

export function generateHtml(
  data: AggregatedData | undefined,
  username: string,
  opts: FilterOpts,
  starSummary: RepoStarSummary[],
  starData?: StarAggregatedData,
): string {
  const jsonData = data
    ? JSON.stringify(
        data.entries.map(e => ({ m: e.month, n: e.count, c: e.cumulative })),
      )
    : 'null';

  const subtitle = [
    username || 'Star History',
    ...(!opts.includeForks ? ['forks excluded'] : []),
    ...(opts.excludePrivate ? ['private excluded'] : []),
    ...(opts.excludeArchived ? ['archived excluded'] : []),
    ...(data ? ['cumulative repositories by creation date'] : []),
  ].join(' - ');

  const today = new Date().toISOString().slice(0, 10);

  const starDataJson = starData
    ? JSON.stringify(
        starData.entries.map(e => ({
          m: e.month,
          n: e.count,
          c: e.cumulative,
        })),
      )
    : 'null';

  const starSummaryJson =
    starSummary.length > 0
      ? JSON.stringify(
          starSummary.map(r => ({ name: r.nameWithOwner, stars: r.stars })),
        )
      : 'null';

  const starReposJson = starData
    ? JSON.stringify(
        starData.repos.map(r => ({ name: r.nameWithOwner, stars: r.stars })),
      )
    : 'null';

  const totalStars = starSummary.reduce((sum, r) => sum + r.stars, 0);

  return getTemplate()
    .replace('{{DATA}}', jsonData)
    .replace(/\{\{USERNAME\}\}/g, username || 'Star History')
    .replace('{{SUBTITLE}}', subtitle)
    .replace('{{GENERATED_DATE}}', today)
    .replace('{{STAR_DATA}}', starDataJson)
    .replace('{{STAR_SUMMARY}}', starSummaryJson)
    .replace('{{STAR_REPOS}}', starReposJson)
    .replace('{{STAR_TOTAL}}', String(starData?.total ?? totalStars));
}

function getTemplate(): string {
  if (typeof TEMPLATE_HTML === 'string') return TEMPLATE_HTML;
  // Fallback for dev: bun run src/index.ts
  return readFileSync(
    resolve(import.meta.dirname!, '../template.html'),
    'utf-8',
  );
}
