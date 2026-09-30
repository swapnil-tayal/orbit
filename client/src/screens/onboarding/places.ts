export interface Place {
  name: string;
  country: string;
  province: string;
  lat: number;
  lng: number;
  tz: string;
  pop: number;
}

let cache: Promise<Place[]> | null = null;

export function loadPlaces(): Promise<Place[]> {
  if (!cache) {
    cache = import("city-timezones").then((m) => {
      const mod = (m as unknown as { cityMapping?: unknown; default?: { cityMapping?: unknown } });
      const raw = (mod.cityMapping ?? mod.default?.cityMapping ?? []) as Array<{ city: string; city_ascii: string; lat: number; lng: number; pop: number; country: string; province: string; timezone: string }>;
      return raw
        .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng) && c.timezone)
        .map((c) => ({ name: c.city, country: c.country, province: c.province ?? "", lat: c.lat, lng: c.lng, tz: c.timezone, pop: c.pop ?? 0 }));
    });
  }
  return cache;
}

export function searchPlaces(list: Place[], query: string, limit = 6): Place[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const starts: Place[] = [];
  const contains: Place[] = [];
  for (const p of list) {
    const n = p.name.toLowerCase();
    if (n.startsWith(q)) starts.push(p);
    else if (n.includes(q)) contains.push(p);
  }
  const byPop = (a: Place, b: Place) => b.pop - a.pop;
  return [...starts.sort(byPop), ...contains.sort(byPop)].slice(0, limit);
}

const TZ_ALIASES: Record<string, string> = {
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Asia/Rangoon": "Asia/Yangon",
  "Asia/Dacca": "Asia/Dhaka",
  "Asia/Macao": "Asia/Macau",
  "Asia/Ulan_Bator": "Asia/Ulaanbaatar",
  "Europe/Kiev": "Europe/Kyiv",
  "America/Buenos_Aires": "America/Argentina/Buenos_Aires",
  "America/Indianapolis": "America/Indiana/Indianapolis",
  "Africa/Asmera": "Africa/Asmara",
  "Atlantic/Faeroe": "Atlantic/Faroe",
  "Pacific/Ponape": "Pacific/Pohnpei",
  "Pacific/Truk": "Pacific/Chuuk",
};

export function guessFromTimezone(list: Place[]): Place | null {
  let tz = "";
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return null;
  }
  if (!tz) return null;
  const candidates = new Set([tz, TZ_ALIASES[tz] ?? tz]);
  for (const [legacy, modern] of Object.entries(TZ_ALIASES)) if (modern === tz) candidates.add(legacy);
  let best: Place | null = null;
  for (const p of list) if (candidates.has(p.tz) && (!best || p.pop > best.pop)) best = p;
  return best;
}

export function nearestPlace(list: Place[], lat: number, lng: number): Place | null {
  let best: Place | null = null;
  let bestD = Infinity;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  for (const p of list) {
    const dLat = p.lat - lat;
    const dLng = (p.lng - lng) * cosLat;
    const d = dLat * dLat + dLng * dLng;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

export function formatLocalTime(tz: string | null, date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz ?? undefined }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
  }
}
