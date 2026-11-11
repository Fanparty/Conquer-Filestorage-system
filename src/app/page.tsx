import { logout } from '@/app/actions';
import { requireAdmin } from '@/lib/auth';
import { activity, overview } from '@/domain/dashboard';
import { MAX_FILES, TYPE_WORDS } from '@/domain/limits';
import { PRIVATE } from '@/domain/storage';

export const dynamic = 'force-dynamic';

const TYPE_LABEL: Record<string, string> = {
  PURCHASE_ORDER: 'Purchase orders', CLIENT_REQUEST: 'Tickets (Client Requests)', TICKET: 'Service tickets', QUOTATION: 'Quotations', OPPORTUNITY: 'Deals',
};
const ACTION_LABEL: Record<string, [string, string]> = {
  UPLOADED: ['Uploaded', 'green'], LINK: ['Download link', 'blue'], DELETED: ['Removed', 'grey'], REJECTED: ['Refused', 'amber'], SHARED: ['Shared', 'blue'], UNSHARED: ['Unshared', 'grey'],
};
const VIA: Record<string, string> = { CRM: 'CRM', PORTAL: 'Customer Portal', CSP: 'CSP' };
const size = (n: number) => (n >= 1024 ** 3 ? `${(n / 1024 ** 3).toFixed(2)} GB` : n >= 1024 ** 2 ? `${(n / 1024 ** 2).toFixed(0)} MB` : `${Math.round(n / 1024)} KB`);
const ago = (d: Date) => {
  const m = Math.round((Date.now() - d.getTime()) / 60e3);
  return m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

/**
 * Conquer Files home (owner, 2026-11-11, agreed from the mockup): is it healthy, how much storage is
 * left, what came in or was refused, and finding a file. Admins only.
 */
export default async function Home({ searchParams }: { searchParams: Promise<{ action?: string; q?: string }> }) {
  const admin = await requireAdmin();
  const { action = '', q = '' } = await searchParams;
  const [o, events] = await Promise.all([overview(), activity({ action, q })]);
  const pct = o.store && o.store.limit ? Math.round((o.store.used / o.store.limit) * 100) : null;
  const viaTotal = o.byVia.reduce((n, v) => n + v.count, 0) || 1;

  return (
    <main className="page stack">
      <header className="top">
        <div><h1>Conquer Files</h1><p className="muted">The platform&apos;s shared file service. Documents from the CRM, the Customer Portal and the CSP.</p></div>
        <div className="row wrap">
          <span className="pill green">● Running</span>
          <span className="pill grey">Storage: UploadThing{PRIVATE ? '' : ' (free plan)'}</span>
          {!PRIVATE && <span className="pill amber" title="Free plan: links do not expire">Links: public, unguessable</span>}
          <span className="muted small">{admin.email}</span>
          <form action={logout}><button className="btn link">Sign out</button></form>
        </div>
      </header>

      <section className="tiles">
        <div className="tile"><span className="tl">Files stored</span><b>{o.files.toLocaleString('en-IN')}</b><span className="ts">+{o.filesThisWeek} this week</span></div>
        <div className="tile"><span className="tl">Storage used</span>
          {o.store ? <><b>{size(o.store.used)} <small>of {size(o.store.limit)}</small></b><span className="meter"><i style={{ width: `${Math.min(100, pct || 0)}%` }} /></span><span className="ts">{pct}% of the plan</span></>
            : <><b>—</b><span className="ts">Storage did not answer</span></>}
        </div>
        <div className="tile"><span className="tl">Uploads today</span><b>{o.uploadsToday}</b><span className="ts">{o.todayByType.map((t) => `${t.count} ${(TYPE_LABEL[t.type] || t.type).toLowerCase()}`).join(' · ') || 'None yet'}</span></div>
        <div className={`tile${o.refusedWeek ? ' warn' : ''}`}><span className="tl">Refused this week</span><b>{o.refusedWeek}</b><span className="ts">{o.refusedTooBig} over 10 MB · {o.refusedFake} other</span></div>
      </section>

      <section className="grid2">
        <div className="card stack">
          <h2>By app and record</h2>
          <table className="mini"><thead><tr><th>Where</th><th className="r">Files</th><th className="r">Size</th></tr></thead>
            <tbody>{o.byRecord.length ? o.byRecord.map((r) => (
              <tr key={`${r.app}-${r.type}`}><td>{r.app} · {TYPE_LABEL[r.type] || r.type}</td><td className="r">{r.count}</td><td className="r">{size(r.bytes)}</td></tr>
            )) : <tr><td colSpan={3} className="muted">No files yet.</td></tr>}</tbody>
          </table>
          {o.byVia.length > 0 && <p className="muted small">Uploaded through: {o.byVia.map((v) => `${VIA[v.via] || v.via} ${Math.round((v.count / viaTotal) * 100)}%`).join(' · ')}</p>}
        </div>
        <div className="card stack">
          <h2>Rules in force</h2>
          <dl className="kv">
            <dt>File types</dt><dd>{TYPE_WORDS}</dd>
            <dt>Size</dt><dd>Up to 10 MB a file, {MAX_FILES} files at a time</dd>
            <dt>Viewing</dt><dd>Download only, no preview</dd>
            <dt>Check</dt><dd>First bytes must match the type; anything else is deleted</dd>
            <dt>Apps</dt><dd className="row wrap">{o.callers.map((c) => (
              <span key={c.caller} className={`pill ${c.set ? (c.lastAt ? 'green' : 'grey') : 'amber'}`}>
                {VIA[c.caller]} · {c.set ? (c.lastAt ? `used ${ago(c.lastAt)}` : 'not used yet') : 'token not set'}
              </span>
            ))}</dd>
          </dl>
        </div>
      </section>

      <section className="card stack">
        <form className="row wrap" method="get">
          <h2 className="grow0">Recent activity</h2>
          <div className="seg">
            {[['', 'All'], ['UPLOADED', 'Uploads'], ['LINK', 'Downloads'], ['DELETED', 'Removed'], ['REJECTED', 'Refused']].map(([v, l]) => (
              <a key={v || 'all'} href={`/?${new URLSearchParams({ ...(v ? { action: v } : {}), ...(q ? { q } : {}) })}`} className={action === v ? 'on' : ''}>{l}</a>
            ))}
          </div>
          {action && <input type="hidden" name="action" value={action} />}
          <input className="search" name="q" defaultValue={q} placeholder="File, ticket, PO or person" aria-label="Search activity" />
        </form>
        <div className="tablewrap"><table>
          <thead><tr><th>When</th><th>What</th><th>File</th><th>Record</th><th>By</th></tr></thead>
          <tbody>{events.length ? events.map((e) => {
            const [label, tone] = ACTION_LABEL[e.action] || [e.action, 'grey'];
            return (
              <tr key={e.id}>
                <td className="muted nowrap">{ago(e.createdAt)}</td>
                <td><span className={`pill ${tone}`}>{label}</span></td>
                <td>{e.file?.name || (e.detail?.split(':')[0] ?? '—')}</td>
                <td>{e.file ? `${e.file.ownerApp} · ${e.file.ownerLabel || `${TYPE_LABEL[e.file.ownerType] || e.file.ownerType} ${e.file.ownerId}`}` : '—'}</td>
                <td className="muted">{[e.byName, VIA[e.byApp] || e.byApp].filter(Boolean).join(' · ')}{e.detail && e.action !== 'UPLOADED' ? ` · ${e.action === 'REJECTED' ? e.detail.split(': ').slice(1).join(': ') : `"${e.detail}"`}` : ''}</td>
              </tr>
            );
          }) : <tr><td colSpan={5} className="muted">Nothing yet.</td></tr>}</tbody>
        </table></div>
      </section>
    </main>
  );
}
