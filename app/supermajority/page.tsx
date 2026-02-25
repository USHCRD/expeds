import { kv } from '@vercel/kv';

type SuperBill = {
  billNumber: string;
  title: string;
  cosponsors: number;
  statusText: string;
  statusDate: string;
  apiUrl: string;
};

export const revalidate = 300; // Revalidate every 5 minutes

export default async function Page() {
  const list = (await kv.get<SuperBill[]>('house:supermajority:current')) ?? [];

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold mb-4">
        House Bills with ≥ 290 Cosponsors (119th)
      </h1>
      <p className="text-gray-600 mb-6">
        Updated daily at 8:30am ET.
      </p>

      {list.length === 0 ? (
        <div className="rounded border p-4 bg-yellow-50">
          <p>No qualifying bills yet. Check back after the daily refresh.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {list.map((b) => (
            <li key={b.billNumber} className="border rounded p-4">
              <div className="flex justify-between">
                <div>
                  <div className="font-medium">{b.billNumber}</div>
                  <div className="text-gray-700">{b.title}</div>
                </div>
                <div className="text-sm text-gray-600">
                  <span className="inline-block px-2 py-1 rounded bg-blue-50 border">
                    {b.cosponsors} cosponsors
                  </span>
                </div>
              </div>

              <div className="mt-2 text-sm text-gray-600">
                Status: {b.statusText} {b.statusDate ? `(${b.statusDate})` : ''}
              </div>

              <div className="mt-2 text-sm">
                <a
                  className="text-blue-600 hover:underline"
                  href={b.apiUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Congress.gov API detail
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
