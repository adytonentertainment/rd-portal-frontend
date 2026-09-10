/**
 * Parse a timestamp the API sent.
 *
 * The backend stamps times with `datetime.now().isoformat()`, which produces a
 * naive string — `2026-09-10T14:15:41.887504`, no zone, no Z. The server runs
 * in UTC, so that string means UTC. JavaScript disagrees: per the spec a
 * date-TIME string without a zone designator is interpreted as LOCAL time.
 *
 * So an admin in Madrid (UTC+2) read every server timestamp as two hours older
 * than it was. That silently turned a healthy upload into a stalled one — the
 * activity panel reported "nothing received for 120 minutes" the instant a
 * transfer began, because 120 minutes is exactly the offset.
 *
 * Anything already carrying a zone (Z or ±hh:mm) is left alone.
 */
const HAS_ZONE = /(?:Z|[+-]\d{2}:?\d{2})$/i;

export const parseServerTime = (iso) => {
  if (!iso) return null;
  const text = String(iso);
  const d = new Date(HAS_ZONE.test(text) ? text : `${text}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
};

export default parseServerTime;
