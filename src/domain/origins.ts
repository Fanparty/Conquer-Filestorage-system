/**
 * Whether a page's address may upload: listed exactly, or matching a pattern with * (for staging
 * and previews, e.g. https://*.vercel.app). The permit is the real check; this only keeps other
 * sites' pages from calling us from a browser.
 */
export function originAllowed(origin: string, list = process.env.FILES_ALLOWED_ORIGINS || ''): boolean {
  if (!origin) return false;
  return list.split(',').map((o) => o.trim()).filter(Boolean).some((entry) => {
    if (!entry.includes('*')) return entry === origin;
    const pattern = new RegExp(`^${entry.split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[a-z0-9-]+')}$`, 'i');
    return pattern.test(origin);
  });
}
