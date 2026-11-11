import { redirect } from 'next/navigation';
import { changePassword, logout } from '@/app/actions';
import { currentAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function PasswordPage({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const admin = await currentAdmin();
  if (!admin) redirect('/login');
  const { err } = await searchParams;
  return (
    <main className="center">
      <form action={changePassword} className="card narrow stack">
        <div>
          <h1>Choose your password</h1>
          <p className="muted">{admin.mustChangePassword ? 'The password you signed in with was given to you. Choose your own before going on.' : 'Change your password.'}</p>
        </div>
        {err && <p role="alert" className="alert">{err}</p>}
        <label className="field">Current password<input name="current" type="password" required autoComplete="current-password" /></label>
        <label className="field">New password<input name="next" type="password" required minLength={10} autoComplete="new-password" /><span className="hint">At least 10 characters, with letters and a digit.</span></label>
        <label className="field">New password again<input name="again" type="password" required minLength={10} autoComplete="new-password" /></label>
        <button className="btn primary">Save password</button>
      </form>
      <form action={logout}><button className="btn link">Sign out</button></form>
    </main>
  );
}
