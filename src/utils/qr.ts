const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseCentralQr(data: string): string | null {
  const m = data.match(/^central:user:(.+)$/);
  return m && UUID_RE.test(m[1]) ? m[1] : null;
}