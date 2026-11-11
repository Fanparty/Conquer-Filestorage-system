import { login } from '@/app/actions';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const { err } = await searchParams;
  return (
    <main className="center">
      <form action={login} className="card narrow stack">
        <div><h1>Conquer Files</h1><p className="muted">Admin sign-in. The CRM, the Customer Portal and the CSP use this service; people do not.</p></div>
        {err && <p role="alert" className="alert">{err}</p>}
        <label className="field">Email<input name="email" type="email" required autoComplete="username" /></label>
        <label className="field">Password<input name="password" type="password" required autoComplete="current-password" /></label>
        <button className="btn primary">Sign in</button>
      </form>
    </main>
  );
}
