import { NextRequest, NextResponse } from 'next/server';

const TOODLEDO_API_BASE = 'https://api.toodledo.com';
const CREDS_PATH = process.env.TOODLEDO_CREDS_PATH || '/Users/henry_notabot/clawd/toodledo_credentials.json';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/* ═══════════════════════════════════════════════════════
   In-memory cache: keyed by "year:includeRecurring"
   ═══════════════════════════════════════════════════════ */
interface CacheEntry {
  data: HistoricResponse;
  ts: number;
}
const cache = new Map<string, CacheEntry>();

/* ═══════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════ */
interface ToodledoTask {
  id: number;
  title?: string;
  completed: number;
  added: number;
  folder: number;
  tag?: string;
  priority: number;
  repeat?: string;
  duedate?: number;
}

interface MonthlyBreakdown {
  month: number;
  count: number;
  avgDaysToClose: number;
}

interface FolderBreakdown {
  name: string;
  count: number;
}

interface YearlyTotal {
  year: number;
  count: number;
  monthly: number[]; // 12 elements for sparkline
}

interface HistoricResponse {
  year: number;
  totalCompleted: number;
  monthlyBreakdown: MonthlyBreakdown[];
  priorityBreakdown: Record<string, number>;
  folderBreakdown: FolderBreakdown[];
  dayOfWeekBreakdown: number[]; // [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
  yearlyTotals: YearlyTotal[];
}

/* ═══════════════════════════════════════════════════════
   Toodledo helpers (reused from main tasks route)
   ═══════════════════════════════════════════════════════ */
async function getCredentials() {
  const fs = await import('fs');
  const data = fs.readFileSync(CREDS_PATH, 'utf8');
  return JSON.parse(data);
}

async function refreshToken(creds: { refresh_token: string; client_id: string; client_secret: string }) {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: creds.refresh_token,
  });
  const auth = Buffer.from(`${creds.client_id}:${creds.client_secret}`).toString('base64');
  const res = await fetch(`${TOODLEDO_API_BASE}/3/account/token.php`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const tokens = await res.json();
  const fs = await import('fs');
  const updatedCreds = { ...creds, ...tokens };
  fs.writeFileSync(CREDS_PATH, JSON.stringify(updatedCreds, null, 2));
  return tokens.access_token;
}

async function getAccessToken(): Promise<string> {
  const creds = await getCredentials();
  let accessToken = creds.access_token;
  const tokenAge = Date.now() / 1000 - (creds.token_time || 0);
  if (tokenAge > 3600) {
    try {
      accessToken = await refreshToken(creds);
    } catch {
      // Token might still be valid
    }
  }
  return accessToken;
}

async function toodledoFetch(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Toodledo API error: ${res.status}`);
  const data = await res.json();
  if (data.errorCode) throw new Error(`Toodledo error ${data.errorCode}: ${data.errorDesc}`);
  return data;
}

/* ═══════════════════════════════════════════════════════
   Fetch ALL completed tasks for a given year with pagination
   ═══════════════════════════════════════════════════════ */
async function fetchAllCompletedForYear(accessToken: string, year: number): Promise<ToodledoTask[]> {
  const after = Math.floor(new Date(year, 0, 1).getTime() / 1000);
  const before = Math.floor(new Date(year + 1, 0, 1).getTime() / 1000);
  const allTasks: ToodledoTask[] = [];
  let start = 0;
  const num = 1000;

  while (true) {
    const url = `${TOODLEDO_API_BASE}/3/tasks/get.php?access_token=${accessToken}&fields=tag,folder,priority,duedate,added,repeat&comp=1&after=${after}&before=${before}&start=${start}&num=${num}`;
    const raw = await toodledoFetch(url) as (ToodledoTask | { num: number; total: number })[];

    // First element is metadata: { num: N, total: T }
    let tasks: ToodledoTask[];
    let total = 0;
    if (raw.length > 0 && 'num' in raw[0] && 'total' in raw[0]) {
      const meta = raw[0] as { num: number; total: number };
      total = meta.total;
      tasks = raw.slice(1) as ToodledoTask[];
    } else {
      tasks = raw as ToodledoTask[];
    }

    const valid = tasks.filter(t => t && t.completed && t.completed > 0);
    allTasks.push(...valid);

    // If we got fewer than num, or we've fetched all, stop
    if (tasks.length < num || allTasks.length >= total) break;
    start += num;
  }

  return allTasks;
}

/* ═══════════════════════════════════════════════════════
   Fetch folder map
   ═══════════════════════════════════════════════════════ */
async function fetchFolderMap(accessToken: string): Promise<Record<number, string>> {
  const foldersRaw = await toodledoFetch(
    `${TOODLEDO_API_BASE}/3/folders/get.php?f=json&access_token=${accessToken}`
  ) as { id: number; name: string }[];
  const map: Record<number, string> = {};
  for (const f of foldersRaw) {
    if (f && f.id) map[f.id] = f.name;
  }
  return map;
}

/* ═══════════════════════════════════════════════════════
   Aggregate tasks into response format
   ═══════════════════════════════════════════════════════ */
function aggregateTasks(
  tasks: ToodledoTask[],
  year: number,
  folderMap: Record<number, string>,
  includeRecurring: boolean,
  yearlyTotals: YearlyTotal[]
): HistoricResponse {
  // Filter recurring if needed
  const filtered = includeRecurring
    ? tasks
    : tasks.filter(t => !t.repeat || t.repeat === '' || t.repeat === 'None');

  // Monthly breakdown
  const monthlyMap: Record<number, { count: number; totalDays: number }> = {};
  for (let m = 1; m <= 12; m++) monthlyMap[m] = { count: 0, totalDays: 0 };

  // Priority breakdown
  const priorityMap: Record<string, number> = { '0': 0, '1': 0, '2': 0, '3': 0 };

  // Folder breakdown
  const folderCounts: Record<string, number> = {};

  // Day of week: [Sun=0, Mon=1, ..., Sat=6]
  const dayOfWeek = [0, 0, 0, 0, 0, 0, 0];

  for (const t of filtered) {
    const completedDate = new Date(t.completed * 1000);
    const month = completedDate.getMonth() + 1; // 1-12
    const dow = completedDate.getDay(); // 0=Sun

    // Monthly
    monthlyMap[month].count++;
    if (t.added && t.added > 0) {
      let daysToClose = (t.completed - t.added) / 86400;
      if (daysToClose < 0) daysToClose = 0;
      if (daysToClose > 365) daysToClose = 365; // cap outliers
      monthlyMap[month].totalDays += daysToClose;
    }

    // Priority
    const pKey = String(t.priority || 0);
    priorityMap[pKey] = (priorityMap[pKey] || 0) + 1;

    // Folder
    const folderName = folderMap[t.folder] || 'Unfiled';
    folderCounts[folderName] = (folderCounts[folderName] || 0) + 1;

    // Day of week
    dayOfWeek[dow]++;
  }

  // Build monthly breakdown
  const monthlyBreakdown: MonthlyBreakdown[] = [];
  for (let m = 1; m <= 12; m++) {
    const { count, totalDays } = monthlyMap[m];
    monthlyBreakdown.push({
      month: m,
      count,
      avgDaysToClose: count > 0 ? Math.round((totalDays / count) * 10) / 10 : 0,
    });
  }

  // Build folder breakdown (sorted, top 6 + Other)
  const sortedFolders = Object.entries(folderCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const topFolders = sortedFolders.slice(0, 6);
  const otherCount = sortedFolders.slice(6).reduce((sum, f) => sum + f.count, 0);
  const folderBreakdown = [...topFolders];
  if (otherCount > 0) folderBreakdown.push({ name: 'Other', count: otherCount });

  return {
    year,
    totalCompleted: filtered.length,
    monthlyBreakdown,
    priorityBreakdown: priorityMap,
    folderBreakdown,
    dayOfWeekBreakdown: dayOfWeek,
    yearlyTotals,
  };
}

/* ═══════════════════════════════════════════════════════
   GET /api/tasks/historic?year=2024&includeRecurring=false
   ═══════════════════════════════════════════════════════ */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10);
    const includeRecurring = searchParams.get('includeRecurring') === 'true';

    // Cache key
    const cacheKey = `${year}:${includeRecurring}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return NextResponse.json(cached.data, {
        headers: { 'X-Cache': 'HIT', 'Cache-Control': 'public, max-age=3600' },
      });
    }

    const accessToken = await getAccessToken();
    const folderMap = await fetchFolderMap(accessToken);

    // Fetch tasks for the requested year
    const tasks = await fetchAllCompletedForYear(accessToken, year);

    // Fetch yearly totals for all years (2017-2026) for sparkline row
    // We do this smartly: cache all years, only fetch what we need
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = 2017; y <= currentYear; y++) years.push(y);

    const yearlyTotals: YearlyTotal[] = [];
    for (const y of years) {
      let yTasks: ToodledoTask[];
      if (y === year) {
        yTasks = tasks; // reuse already-fetched
      } else {
        // Check if we have a cached entry for this year (any recurring value)
        const altKey1 = `${y}:true`;
        const altKey2 = `${y}:false`;
        const altCached = cache.get(altKey1) || cache.get(altKey2);
        if (altCached && Date.now() - altCached.ts < CACHE_TTL_MS) {
          // Use cached yearly total — but we need the raw count before recurring filter
          // Just use what we have; the yearly totals are pre-filter always
          yearlyTotals.push(
            altCached.data.yearlyTotals.find(yt => yt.year === y) || { year: y, count: 0, monthly: new Array(12).fill(0) }
          );
          continue;
        }
        // Need to fetch this year
        yTasks = await fetchAllCompletedForYear(accessToken, y);
      }

      // Apply recurring filter for consistency
      const filteredYTasks = includeRecurring
        ? yTasks
        : yTasks.filter(t => !t.repeat || t.repeat === '' || t.repeat === 'None');

      // Monthly distribution for sparkline
      const monthly = new Array(12).fill(0);
      for (const t of filteredYTasks) {
        const m = new Date(t.completed * 1000).getMonth();
        monthly[m]++;
      }
      yearlyTotals.push({ year: y, count: filteredYTasks.length, monthly });
    }

    const result = aggregateTasks(tasks, year, folderMap, includeRecurring, yearlyTotals);

    // Cache the result
    cache.set(cacheKey, { data: result, ts: Date.now() });

    return NextResponse.json(result, {
      headers: { 'X-Cache': 'MISS', 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (error) {
    console.error('Historic API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
