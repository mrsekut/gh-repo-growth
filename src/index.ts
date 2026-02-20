import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { filterRepos, aggregate, type FilterOpts } from './aggregate.js';
import { getToken, getUsername, fetchRepos } from './github.js';
import { generateHtml } from './render.js';

async function main() {
  const args = parseCli();

  const token = getToken();

  const username = args.user ?? (await getUsername(token));
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

  if (filtered.length === 0) {
    console.error('Error: No repositories to visualize after filtering.');
    process.exit(1);
  }

  const data = aggregate(filtered);
  const html = generateHtml(data, username, filterOpts);

  const output = args.output ?? 'repo_growth.html';
  writeFileSync(output, html);
  console.log(`Generated ${output} (${data.total} repos)`);
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
  -h, --help               Show this help message`);
    process.exit(0);
  }

  return values;
}
