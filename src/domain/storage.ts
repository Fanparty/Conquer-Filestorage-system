import 'server-only';
import { UTApi } from 'uploadthing/server';
import { requireEnv } from '@/lib/env';

/**
 * Where the files are (owner, 2026-11-11): UploadThing for now. Everything else in the app goes
 * through this module, so moving to Vercel Blob later is a new driver here, not a rewrite.
 */
export const STORAGE = 'UPLOADTHING';

let api: UTApi | null = null;
const ut = () => (api ??= new UTApi({ token: requireEnv('UPLOADTHING_TOKEN') }));

/** Private files (a paid UploadThing plan): links that expire. Off on the free plan. */
export const PRIVATE = process.env.FILES_PRIVATE === 'true';

/**
 * The link the browser downloads from. Private: one that stops working after `seconds`. Public
 * (the free plan, owner 2026-11-11): the file's own unguessable address, given only after the
 * calling app has checked access.
 */
export async function downloadLink(key: string, url: string | null, seconds = 300): Promise<string> {
  if (PRIVATE || !url) {
    const { ufsUrl } = await ut().generateSignedURL(key, { expiresIn: seconds });
    return ufsUrl;
  }
  return url;
}

/** The file's first bytes, to check it is what its name says. */
export async function firstBytes(key: string, url: string | null, count = 8): Promise<Uint8Array> {
  const res = await fetch(await downloadLink(key, url, 60), { headers: { Range: `bytes=0-${count - 1}` } });
  if (!res.ok && res.status !== 206) throw new Error(`storage answered ${res.status}`);
  return new Uint8Array((await res.arrayBuffer()).slice(0, count));
}

/** Storage used and the plan's limit, in bytes (the home page's meter). */
export async function usage(): Promise<{ used: number; limit: number }> {
  const u = await ut().getUsageInfo();
  return { used: u.appTotalBytes, limit: u.limitBytes };
}

export async function remove(key: string): Promise<void> {
  await ut().deleteFiles(key);
}
