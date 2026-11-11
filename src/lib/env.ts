/** Read a required setting. Fails closed: there are no defaults for secrets. */
export function requireEnv(name: string, minLength = 1): string {
  const value = process.env[name];
  if (!value || value.length < minLength) {
    throw new Error(`${name} is not set${minLength > 1 ? ` (at least ${minLength} characters)` : ''}.`);
  }
  return value;
}
