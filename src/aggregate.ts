export type Repo = {
  nameWithOwner: string;
  createdAt: string; // ISO 8601
  isPrivate: boolean;
  isArchived: boolean;
  isFork: boolean;
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
