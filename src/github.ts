import { execSync } from 'node:child_process';
import type { Repo } from './aggregate.js';

export function getToken(): string {
  try {
    return execSync('gh auth token', { encoding: 'utf-8' }).trim();
  } catch {
    console.error(
      'Error: Could not get GitHub token. Make sure `gh` CLI is installed and authenticated (`gh auth login`).',
    );
    process.exit(1);
  }
}

export async function getUsername(token: string): Promise<string> {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: '{ viewer { login } }' }),
  });

  if (!res.ok) {
    console.error(`Error: GitHub API returned ${res.status}`);
    process.exit(1);
  }

  const json = (await res.json()) as { data: { viewer: { login: string } } };
  return json.data.viewer.login;
}

const REPOS_QUERY = `
query($login: String!, $after: String) {
  user(login: $login) {
    repositories(first: 100, after: $after, ownerAffiliations: OWNER, orderBy: {field: CREATED_AT, direction: ASC}) {
      pageInfo { hasNextPage endCursor }
      nodes {
        nameWithOwner
        createdAt
        isPrivate
        isArchived
        isFork
      }
    }
  }
}`;

export async function fetchRepos(
  token: string,
  username: string,
  acc: Repo[] = [],
  after: string | null = null,
): Promise<Repo[]> {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: REPOS_QUERY,
      variables: { login: username, after },
    }),
  });

  if (!res.ok) {
    console.error(`Error: GitHub API returned ${res.status}`);
    process.exit(1);
  }

  const json = (await res.json()) as {
    data: {
      user: {
        repositories: {
          pageInfo: { hasNextPage: boolean; endCursor: string };
          nodes: Repo[];
        };
      };
    };
    errors?: { message: string }[];
  };

  if (json.errors) {
    console.error(`Error: ${json.errors.map(e => e.message).join(', ')}`);
    process.exit(1);
  }

  const { nodes, pageInfo } = json.data.user.repositories;
  const repos = [...acc, ...nodes];

  if (!pageInfo.hasNextPage) return repos;
  return fetchRepos(token, username, repos, pageInfo.endCursor);
}
