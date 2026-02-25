const BASE = 'https://api.congress.gov/v3';

export type BillListItem = {
  congress: number;
  number: string;     // e.g., "302"
  type: string;       // e.g., "HR"
  originChamber: 'House' | 'Senate';
  title: string;
  latestAction?: { actionDate: string; text: string };
  url: string;        // deep link to bill detail
};

export async function listHouseBills119({
  limit = 250,
  offset = 0,
  fromDateTime,
  toDateTime
}: {
  limit?: number;
  offset?: number;
  fromDateTime?: string;
  toDateTime?: string;
}): Promise<{ bills: BillListItem[]; next?: string | null }> {
  const u = new URL(`${BASE}/bill`);
  u.searchParams.set('format', 'json');
  u.searchParams.set('congress', '119');
  u.searchParams.set('chamber', 'house');
  u.searchParams.set('type', 'hr');
  u.searchParams.set('limit', String(Math.min(limit, 250)));
  u.searchParams.set('offset', String(offset));
  if (fromDateTime) u.searchParams.set('fromDateTime', fromDateTime);
  if (toDateTime)   u.searchParams.set('toDateTime', toDateTime);
  u.searchParams.set('api_key', process.env.CONGRESS_API_KEY!);

  const res = await fetch(u, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Congress.gov list error ${res.status}`);
  const json = await res.json();

  const data = json.Data?.bills ?? json.bills ?? [];
  const next = json.Pagination?.next ?? json.pagination?.next ?? null;

  return { bills: data as BillListItem[], next };
}

export async function getCosponsorCount(congress: number, type: string, number: string): Promise<number> {
  const u = new URL(`${BASE}/bill/${congress}/${type.toLowerCase()}/${number}`);
  u.searchParams.set('format', 'json');
  u.searchParams.set('api_key', process.env.CONGRESS_API_KEY!);

  const res = await fetch(u, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Congress.gov detail error ${res.status}`);
  const json = await res.json();

  const bill = json.Data?.bill ?? json.bill ?? {};
  const arr = bill.cosponsors ?? bill.cosponsor ?? [];
  const countFromArray = Array.isArray(arr) ? arr.length : 0;
  const countField = bill.cosponsorsCount ?? bill.cosponsorCount ?? 0;

  return Math.max(countFromArray, countField);
}
