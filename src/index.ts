import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import {
  filterRepos,
  aggregate,
  aggregateStars,
  type FilterOpts,
  type StarFilterOpts,
  type StarAggregatedData,
} from './aggregate.js';
import {
  getToken,
  getUsername,
  fetchRepos,
  fetchRepoStars,
  fetchUserStars,
} from './github.js';
import { generateHtml } from './render.js';

async function main() {
  const args = parseCli();

  const token = getToken();

  const hasStarOpts = args.repo.length > 0 || args.stars;
  const needsUser = !args.user && (hasStarOpts ? args.stars : true);

  const username =
    args.user ?? (needsUser || !hasStarOpts ? await getUsername(token) : '');

  // Star data
  let starData: StarAggregatedData | undefined;
  const starFilterOpts: StarFilterOpts = {
    since: args.since,
    until: args.until,
  };

  if (args.repo.length > 0 && !args.stars) {
    // --repo only: fetch specific repos' stars, skip repo growth
    console.log(`Fetching star history for ${args.repo.length} repo(s)...`);
    const repoStars = await fetchRepoStars(token, args.repo);
    starData = aggregateStars(repoStars, starFilterOpts);
  }

  // Fetch user repos if needed for growth chart or --stars
  let repos;
  let filtered;
  let data;

  if (username) {
    console.log(`Fetching repositories for ${username}...`);
    repos = await fetchRepos(token, username);
    console.log(`Found ${repos.length} repositories`);

    const filterOpts: FilterOpts = {
      includeForks: args['include-forks'] ?? false,
      excludePrivate: args['exclude-private'] ?? false,
      excludeArchived: args['exclude-archived'] ?? false,
    };

    filtered = filterRepos(repos, filterOpts);
    console.log(`${filtered.length} repositories after filtering`);

    if (filtered.length === 0 && !hasStarOpts) {
      console.error('Error: No repositories to visualize after filtering.');
      process.exit(1);
    }

    data = filtered.length > 0 ? aggregate(filtered) : undefined;

    if (args.stars) {
      const repoStars = await fetchUserStars(token, repos);
      // If --repo is also specified, merge them
      if (args.repo.length > 0) {
        const extraStars = await fetchRepoStars(token, args.repo);
        repoStars.push(
          ...extraStars.filter(
            e => !repoStars.some(r => r.nameWithOwner === e.nameWithOwner),
          ),
        );
      }
      starData = aggregateStars(repoStars, starFilterOpts);
    }

    const html = generateHtml(data, username, filterOpts, starData);
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
      {
        includeForks: false,
        excludePrivate: false,
        excludeArchived: false,
      },
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
      stars: { type: 'boolean', default: false },
      since: { type: 'string' },
      until: { type: 'string' },
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
      --stars              Track star history for all user repos
      --since <YYYY-MM>    Start period for star data
      --until <YYYY-MM>    End period for star data
  -h, --help               Show this help message`);
    process.exit(0);
  }

  // Validate date formats
  const dateRe = /^\d{4}-\d{2}$/;
  if (values.since && !dateRe.test(values.since)) {
    console.error('Error: --since must be in YYYY-MM format');
    process.exit(1);
  }
  if (values.until && !dateRe.test(values.until)) {
    console.error('Error: --until must be in YYYY-MM format');
    process.exit(1);
  }

  return values;
}
