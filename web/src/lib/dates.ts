export function getBeirutDayBounds() {
  const now = new Date();
  const todayBeirut = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Beirut' }); // "2026-05-03"

  // Dynamically resolve the current Beirut UTC offset (handles EET vs EEST)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Beirut',
    timeZoneName: 'shortOffset',
    hour: 'numeric',
  }).formatToParts(now);
  const tzName = parts.find(p => p.type === 'timeZoneName')?.value ?? 'GMT+3'; // e.g. "GMT+3"
  const sign = tzName.includes('-') ? '-' : '+';
  const raw = tzName.replace(/GMT[+-]?/, '') || '0';
  const [h, m = '0'] = raw.split(':');
  const offset = `${sign}${h.padStart(2, '0')}:${m.padStart(2, '0')}`;

  const [y, mo, d] = todayBeirut.split('-').map(Number);
  const tomorrowISO = new Date(Date.UTC(y, mo - 1, d + 1)).toISOString().slice(0, 10);
  const in8DaysISO  = new Date(Date.UTC(y, mo - 1, d + 8)).toISOString().slice(0, 10);

  return {
    todayDateStr:    todayBeirut,
    todayStart:      `${todayBeirut}T00:00:00${offset}`,
    tomorrowStart:   `${tomorrowISO}T00:00:00${offset}`,
    in8DaysStart:    `${in8DaysISO}T00:00:00${offset}`,
  };
}

export function fmtBeirut(date: string | Date, opts: Intl.DateTimeFormatOptions = {}): string {
  return new Date(date).toLocaleString('en-US', { timeZone: 'Asia/Beirut', ...opts });
}
