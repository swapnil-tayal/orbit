function profileSuffix(): string {
  const p = new URLSearchParams(window.location.search).get("profile");
  return p && /^[A-Za-z0-9_-]{1,16}$/.test(p) ? `.${p}` : "";
}

const LEGACY_KEY = `orbit.userId${profileSuffix()}`;
const TOKEN_KEY = `orbit.token${profileSuffix()}`;

export function devProfile(): string | null {
  const p = new URLSearchParams(window.location.search).get("profile");
  return p && /^[A-Za-z0-9_-]{1,16}$/.test(p) ? p : null;
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    return;
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    return;
  }
}

export function legacyUserId(): string | null {
  try {
    return localStorage.getItem(LEGACY_KEY);
  } catch {
    return null;
  }
}

export function clearLegacyUserId(): void {
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    return;
  }
}

export function readPref<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`orbit.${key}${profileSuffix()}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writePref(key: string, value: unknown): void {
  try {
    localStorage.setItem(`orbit.${key}${profileSuffix()}`, JSON.stringify(value));
  } catch {
    return;
  }
}
