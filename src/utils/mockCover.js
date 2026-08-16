// Deterministic placeholder album-art generator.
// Same title always returns the same gradient + initials, no external assets.

const stableHash = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) & 0xffff;
  }
  return h;
};

const initialsOf = (title) => {
  const words = title.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
};

export const mockCoverFor = (title = '') => {
  const t = title || 'Untitled';
  const h = stableHash(t);
  const hue1 = h % 360;
  const hue2 = (hue1 + 50 + ((h >> 5) % 110)) % 360;
  const initials = initialsOf(t);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue1}, 62%, 48%)"/><stop offset="1" stop-color="hsl(${hue2}, 68%, 26%)"/></linearGradient></defs><rect width="200" height="200" fill="url(#g)"/><circle cx="36" cy="164" r="64" fill="rgba(255,255,255,0.06)"/><circle cx="170" cy="44" r="40" fill="rgba(255,255,255,0.05)"/><text x="100" y="118" font-family="'DM Sans','Inter',sans-serif" font-size="74" font-weight="800" fill="rgba(255,255,255,0.92)" text-anchor="middle" letter-spacing="-2">${initials}</text></svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
