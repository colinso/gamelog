export function gameColor(title: string): [string, string] {
  let h = 0;
  for (const c of title) h = (h * 31 + c.charCodeAt(0)) & 0xfffffff;
  const hue = h % 360;
  return [`hsl(${hue},22%,11%)`, `hsl(${(hue + 50) % 360},30%,18%)`];
}

export function initials(title: string): string {
  return title.split(' ').filter(w => /[A-Za-z0-9]/.test(w[0])).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

export function fmt(n: number | null): string {
  if (n == null) return '—';
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

export function pct(hrsIn: number, ttb: number): number {
  if (!ttb) return 0;
  return Math.min(100, Math.round((hrsIn / ttb) * 100));
}
