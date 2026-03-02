# gh-repo-growth

Visualize the growth of GitHub repositories over time as a self-contained HTML chart.

## Usage

```sh
bunx gh-repo-growth
```

This fetches your repositories via the GitHub GraphQL API and outputs `repo_growth.html`.

### Options

```
-u, --user <username>    GitHub username (default: authenticated user)
-o, --output <file>      Output HTML file (default: repo_growth.html)
    --include-forks      Include forked repositories
    --exclude-private    Exclude private repositories
    --exclude-archived   Exclude archived repositories
    --repo <owner/name>  Track star history for specific repo (repeatable)
    --since <YYYY-MM>    Start period for star data (used with --repo)
-h, --help               Show this help message
```

### Examples

```sh
# Visualize your own repos
bunx gh-repo-growth

# Visualize another user's public repos
bunx gh-repo-growth -u octocat

# Custom output path with filters
bunx gh-repo-growth -o growth.html --exclude-archived

# Track star history for specific repos
bunx gh-repo-growth --repo mrsekut/foo --repo mrsekut/bar

# Star history from a specific date
bunx gh-repo-growth --repo mrsekut/foo --since 2024-01
```

## Example

![Example output](https://gyazo.com/0050692a3ba6acbb1eb7210227093d00.png)

## Prerequisites

- **[GitHub CLI (`gh`)](https://cli.github.com/)** installed and authenticated (`gh auth login`)

The tool reads your GitHub token from `gh auth token`. No additional authentication setup is needed.

## Output

The generated HTML file is fully self-contained (only external dependency is Chart.js via CDN) and includes:

- Cumulative repository count line chart
- Monthly creation bar chart
- Yearly summary table
- Stats cards (total repos, most active month, first repo date, time span)
- Stars by repository table (from repo metadata, no extra API calls)
- Cumulative stars / monthly stars charts (when `--repo` is specified)

## License

MIT
