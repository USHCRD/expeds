import { kv } from '@vercel/kv';
import { listHouseBills119, getCosponsorCount } from '@/lib/congress';

function isEightThirtyETNow(): boolean {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  });
  const parts = fmt.formatToParts(new Date());
  const hh = parts.find(p => p.type === 'hour')?.value ?? '00';
  const mm = parts.find(p => p.type === 'minute')?.value ?? '00';
  return hh === '08' && mm === '30';
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const ret: R[] = [];
  let i = 0;
  while (i < items.length) {
    const slice = items.slice(i, i + limit);
    const out = await Promise.all(slice.map(fn));
    ret.push(...out);
    i += limit;
  }
  return ret;
}

export async function GET() {
  if (!isEightThirtyETNow()) {
    return Response.json({ skipped: true, reason: 'Not 08:30 ET' });
  }

  const lastRunIso = await kv.get<string>('house:supermajority:lastRun');
  const nowIso = new Date().toISOString();

  let bills: Awaited<ReturnType<typeof listHouseBills119>>['bills'] = [];
  let offset = 0;

  if (!lastRunIso) {
    for (;;) {
      const { bills: pageBills, next } = await listHouseBills119({ limit: 250, offset });
      bills = bills.concat(pageBills);
      if (!next) break;
      offset += 250;
    }
  } else {
    const { bills: pageBills } = await listHouseBills119({
      limit: 250, offset: 0,
      fromDateTime: lastRunIso,
      toDateTime: nowIso
    });
    bills = pageBills;
  }

  const enriched = await mapLimit(bills, 20, async (b) => {
    const count = await getCosponsorCount(b.congress, b.type, b.number);
    return { ...b, cosponsorsCount: count };
  });

  const supermajority = enriched
    .filter(b => (b.originChamber === 'House') && (b.cosponsorsCount >= 290))
    .map(b => ({
      billNumber: `${b.type}.${b.number}`,
      title: b.title,
      cosponsors: b.cosponsorsCount,
      statusText: b.latestAction?.text ?? '',
      statusDate: b.latestAction?.actionDate ?? '',
      apiUrl: b.url
    }));

  await kv.set('house:supermajority:current', supermajority);
  await kv.set('house:supermajority:lastRun', nowIso);

  return Response.json({ ok: true, count: supermajority.length });
}
