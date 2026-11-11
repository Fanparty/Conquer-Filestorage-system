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

/** A link that downloads the file and stops working after a few minutes. */
export async function downloadLink(key: string, seconds = 300): Promise<string> {
  const { ufsUrl } = await ut().generateSignedURL(key, { expiresIn: seconds });
  return ufsUrl;
}

/** The file's first bytes, to check it is what its name says. */
export async function firstBytes(key: string, count = 8): Promise<Uint8Array> {
  const res = await fetch(await downloadLink(key, 60), { headers: { Range: `bytes=0-${count - 1}` } });
  if (!res.ok && res.status !== 206) throw new Error(`storage answered ${res.status}`);
  return new Uint8Array((await res.arrayBuffer()).slice(0, count));
}

export async function remove(key: string): Promise<void> {
  await ut().deleteFiles(key);
}
