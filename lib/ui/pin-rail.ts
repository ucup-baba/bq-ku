export const KUNCI_PIN = 'bq_rail_pin';

export function bacaPin(s: Pick<Storage, 'getItem'> | null): boolean {
  try { return s?.getItem(KUNCI_PIN) === '1'; } catch { return false; }
}

export function simpanPin(s: Pick<Storage, 'setItem'> | null, v: boolean): void {
  try { s?.setItem(KUNCI_PIN, v ? '1' : '0'); } catch { /* storage diblokir — abaikan */ }
}

export function storageAman(): Storage | null {
  try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; }
}
