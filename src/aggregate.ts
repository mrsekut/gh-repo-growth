export type Repo = {
  nameWithOwner: string;
  createdAt: string; // ISO 8601
  isPrivate: boolean;
  isArchived: boolean;
  isFork: boolean;
  stargazerCount: number;
};

export type AggregatedData = {
  entries: MonthlyEntry[];
  total: number;
};

type MonthlyEntry = {
  month: string; // "YYYY-MM"
  count: number; // repos created in this month
  cumulative: number; // running total
};

export type FilterOpts = {
  includeForks: boolean;
  excludePrivate: boolean;
  excludeArchived: boolean;
};

export type StarFilterOpts = {
  since?: string | undefined; // "YYYY-MM"
};

export type StarEntry = {
  month: string; // "YYYY-MM"
  count: number; // stars gained this month
  cumulative: number;
};

export type RepoStarData = {
  nameWithOwner: string;
  stars: number; // total stars in the filtered period
  timestamps: string[]; // ISO 8601 dates
};

export type StarAggregatedData = {
  entries: StarEntry[];
  repos: RepoStarData[];
  total: number;
};

export type RepoStarSummary = {
  nameWithOwner: string;
  stars: number;
};

export function summarizeRepoStars(repos: Repo[]): RepoStarSummary[] {
  return repos
    .filter(r => r.stargazerCount > 0)
    .map(r => ({ nameWithOwner: r.nameWithOwner, stars: r.stargazerCount }))
    .sort((a, b) => b.stars - a.stars);
}

export function aggregateStars(
  repoStars: RepoStarData[],
  opts: StarFilterOpts,
): StarAggregatedData {
  // Collect all star timestamps across repos, filtered by since
  const allTimestamps: string[] = [];
  const filteredRepos: RepoStarData[] = [];

  for (const repo of repoStars) {
    const filtered = repo.timestamps.filter(ts => {
      const month = ts.slice(0, 7);
      if (opts.since && month < opts.since) return false;
      return true;
    });
    filteredRepos.push({
      nameWithOwner: repo.nameWithOwner,
      stars: filtered.length,
      timestamps: filtered,
    });
    allTimestamps.push(...filtered);
  }

  // Build month map
  const monthMap = new Map<string, number>();
  for (const ts of allTimestamps) {
    const month = ts.slice(0, 7);
    monthMap.set(month, (monthMap.get(month) ?? 0) + 1);
  }

  const sortedMonths = [...monthMap.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );

  const entries = sortedMonths.reduce<StarEntry[]>(
    (acc, [month, count]) => [
      ...acc,
      {
        month,
        count,
        cumulative: (acc.at(-1)?.cumulative ?? 0) + count,
      },
    ],
    [],
  );

  // Sort repos by star count descending
  const sortedRepos = filteredRepos
    .filter(r => r.stars > 0)
    .sort((a, b) => b.stars - a.stars);

  return {
    entries,
    repos: sortedRepos,
    total: entries.at(-1)?.cumulative ?? 0,
  };
}

export function filterRepos(repos: Repo[], opts: FilterOpts): Repo[] {
  return repos.filter(r => {
    if (!opts.includeForks && r.isFork) return false;
    if (opts.excludePrivate && r.isPrivate) return false;
    if (opts.excludeArchived && r.isArchived) return false;
    return true;
  });
}

export function aggregate(repos: Repo[]): AggregatedData {
  const monthMap = repos.reduce((acc, repo) => {
    const month = repo.createdAt.slice(0, 7); // "YYYY-MM"
    acc.set(month, (acc.get(month) ?? 0) + 1);
    return acc;
  }, new Map<string, number>());

  const sortedMonths = [...monthMap.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );

  const entries = sortedMonths.reduce<MonthlyEntry[]>(
    (acc, [month, count]) => [
      ...acc,
      {
        month,
        count,
        cumulative: (acc.at(-1)?.cumulative ?? 0) + count,
      },
    ],
    [],
  );

  return {
    entries,
    total: entries.at(-1)?.cumulative ?? 0,
  };
}
