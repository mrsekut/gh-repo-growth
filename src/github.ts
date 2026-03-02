import { execSync } from 'node:child_process';
import type { Repo, RepoStarData } from './aggregate.js';

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
        stargazerCount
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

const STARGAZERS_QUERY = `
query($owner: String!, $name: String!, $after: String) {
  repository(owner: $owner, name: $name) {
    stargazers(first: 100, after: $after, orderBy: {field: STARRED_AT, direction: ASC}) {
      pageInfo { hasNextPage endCursor }
      edges {
        starredAt
      }
    }
  }
}`;

export async function fetchStargazers(
  token: string,
  owner: string,
  name: string,
  acc: string[] = [],
  after: string | null = null,
): Promise<string[]> {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: STARGAZERS_QUERY,
      variables: { owner, name, after },
    }),
  });

  if (!res.ok) {
    console.error(`Error: GitHub API returned ${res.status}`);
    process.exit(1);
  }

  const json = (await res.json()) as {
    data: {
      repository: {
        stargazers: {
          pageInfo: { hasNextPage: boolean; endCursor: string };
          edges: { starredAt: string }[];
        };
      };
    };
    errors?: { message: string }[];
  };

  if (json.errors) {
    console.error(`Error: ${json.errors.map(e => e.message).join(', ')}`);
    process.exit(1);
  }

  const { edges, pageInfo } = json.data.repository.stargazers;
  const timestamps = [...acc, ...edges.map(e => e.starredAt)];

  if (!pageInfo.hasNextPage) return timestamps;
  return fetchStargazers(token, owner, name, timestamps, pageInfo.endCursor);
}

export async function fetchRepoStars(
  token: string,
  repoSlugs: string[],
): Promise<RepoStarData[]> {
  const results: RepoStarData[] = [];
  for (const slug of repoSlugs) {
    const [owner, name] = slug.split('/');
    if (!owner || !name) {
      console.error(`Error: Invalid repo format "${slug}". Use owner/name.`);
      process.exit(1);
    }
    console.log(`Fetching stargazers for ${slug}...`);
    const timestamps = await fetchStargazers(token, owner, name);
    results.push({ nameWithOwner: slug, stars: timestamps.length, timestamps });
  }
  return results;
}
