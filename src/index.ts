import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import {
  filterRepos,
  aggregate,
  aggregateStars,
  summarizeRepoStars,
  type FilterOpts,
  type StarAggregatedData,
  type RepoStarSummary,
} from './aggregate.js';
import { getToken, getUsername, fetchRepos, fetchRepoStars } from './github.js';
import { generateHtml } from './render.js';

async function main() {
  const args = parseCli();

  const token = getToken();

  const repoOnly = args.repo.length > 0 && !args.user;
  const username = args.user ?? (repoOnly ? '' : await getUsername(token));

  let starData: StarAggregatedData | undefined;
  let starSummary: RepoStarSummary[] = [];

  // --repo: fetch detailed star timeline for specific repos
  if (args.repo.length > 0) {
    console.log(`Fetching star history for ${args.repo.length} repo(s)...`);
    const repoStars = await fetchRepoStars(token, args.repo);
    starData = aggregateStars(repoStars, { since: args.since });
  }

  if (username) {
    console.log(`Fetching repositories for ${username}...`);
    const repos = await fetchRepos(token, username);
    console.log(`Found ${repos.length} repositories`);

    const filterOpts: FilterOpts = {
      includeForks: args['include-forks'] ?? false,
      excludePrivate: args['exclude-private'] ?? false,
      excludeArchived: args['exclude-archived'] ?? false,
    };

    const filtered = filterRepos(repos, filterOpts);
    console.log(`${filtered.length} repositories after filtering`);

    if (filtered.length === 0 && args.repo.length === 0) {
      console.error('Error: No repositories to visualize after filtering.');
      process.exit(1);
    }

    const data = filtered.length > 0 ? aggregate(filtered) : undefined;

    // Star summary from already-fetched repo data (no extra API calls)
    starSummary = summarizeRepoStars(filtered);

    const html = generateHtml(
      data,
      username,
      filterOpts,
      starSummary,
      starData,
    );
    const output = args.output ?? 'repo_growth.html';
    writeFileSync(output, html);
    console.log(
      `Generated ${output}${data ? ` (${data.total} repos)` : ''}${starData ? ` (${starData.total} stars tracked)` : ''}`,
    );
  } else {
    // --repo only, no username
    const html = generateHtml(
      undefined,
      '',
      { includeForks: false, excludePrivate: false, excludeArchived: false },
      starSummary,
      starData,
    );
    const output = args.output ?? 'repo_growth.html';
    writeFileSync(output, html);
    console.log(
      `Generated ${output}${starData ? ` (${starData.total} stars tracked)` : ''}`,
    );
  }
}

main().catch(err => {
  console.error('Error:', err instanceof Error ? err.message : err);
  process.exit(1);
});

function parseCli() {
  const { values } = parseArgs({
    options: {
      user: { type: 'string', short: 'u' },
      output: { type: 'string', short: 'o' },
      'include-forks': { type: 'boolean', default: false },
      'exclude-private': { type: 'boolean', default: false },
      'exclude-archived': { type: 'boolean', default: false },
      repo: { type: 'string', multiple: true, default: [] },
      since: { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false },
    },
    strict: true,
  });

  if (values.help) {
    console.log(`Usage: gh-repo-growth [options]

Options:
  -u, --user <username>    GitHub username (default: authenticated user)
  -o, --output <file>      Output HTML file (default: repo_growth.html)
      --include-forks      Include forked repositories
      --exclude-private    Exclude private repositories
      --exclude-archived   Exclude archived repositories
      --repo <owner/name>  Track star history for specific repo (repeatable)
      --since <YYYY-MM>    Start period for star data (used with --repo)
  -h, --help               Show this help message`);
    process.exit(0);
  }

  const dateRe = /^\d{4}-\d{2}$/;
  if (values.since && !dateRe.test(values.since)) {
    console.error('Error: --since must be in YYYY-MM format');
    process.exit(1);
  }

  return values;
}
