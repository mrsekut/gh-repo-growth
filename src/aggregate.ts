export type Repo = {
  nameWithOwner: string;
  createdAt: string; // ISO 8601
  isPrivate: boolean;
  isArchived: boolean;
  isFork: boolean;
};

export type MonthlyEntry = {
  month: string; // "YYYY-MM"
  count: number; // repos created in this month
  cumulative: number; // running total
};

export type AggregatedData = {
  entries: MonthlyEntry[];
  total: number;
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
  const monthMap = new Map<string, number>();

  for (const repo of repos) {
    const month = repo.createdAt.slice(0, 7); // "YYYY-MM"
    monthMap.set(month, (monthMap.get(month) ?? 0) + 1);
  }

  const sortedMonths = [...monthMap.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );

  let cumulative = 0;
  const entries: MonthlyEntry[] = sortedMonths.map(([month, count]) => {
    cumulative += count;
    return { month, count, cumulative };
  });

  return { entries, total: cumulative };
}
