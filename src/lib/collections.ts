import { kv } from '../lib/storage';
import { api } from './api';

const K_FAV = 'admfc_favorites';
const K_RECENT = 'admfc_recents';
const K_PLAYLIST = 'admfc_playlist';

async function readList(key: string): Promise<string[]> {
  const raw = await kv.get(key);
  if (!raw) return [];
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v : []; } catch { return []; }
}
async function writeList(key: string, arr: string[]) { await kv.set(key, JSON.stringify(arr)); }

/**
 * Equivalencias oficiales: nunca relacionar canciones solo por título.
 * Los favoritos antiguos se conservan y se amplían sin borrar entradas.
 */
async function equivalentId(id: string): Promise<string | null> {
  try {
    const hymn = await api.getHymn(id);
    if (hymn.numero_equivalente == null || !hymn.himnario_equivalente) return null;
    const collection = hymn.himnario_equivalente.toLowerCase().includes('gloria')
      ? 'gt'
      : hymn.himnario_equivalente.toLowerCase().includes('sión')
        ? 'sion'
        : null;
    if (!collection) return null;
    const match = await api.getByNumber(collection, hymn.numero_equivalente);
    return match.id !== id ? match.id : null;
  } catch {
    return null;
  }
}

let favoritesQueue: Promise<unknown> = Promise.resolve();
function serializeFavorites<T>(operation: () => Promise<T>): Promise<T> {
  const result = favoritesQueue.then(operation, operation);
  favoritesQueue = result.then(() => undefined, () => undefined);
  return result;
}

export const favorites = {
  list: () => readList(K_FAV),
  has: async (id: string) => {
    const ids = await readList(K_FAV);
    if (ids.includes(id)) return true;
    const equivalent = await equivalentId(id);
    return equivalent != null && ids.includes(equivalent);
  },
  toggle: (id: string) => serializeFavorites(async () => {
    const ids = await readList(K_FAV);
    const equivalent = await equivalentId(id);
    const pair = equivalent ? [id, equivalent] : [id];
    const selected = pair.some(key => ids.includes(key));
    const next = selected
      ? ids.filter(key => !pair.includes(key))
      : [...pair.filter(key => !ids.includes(key)), ...ids];
    await writeList(K_FAV, next);
    return !selected;
  }),
  /**
   * Migra favoritos anteriores de forma aditiva e idempotente.
   * No toca recientes ni listas de culto.
   */
  reconcile: () => serializeFavorites(async () => {
    const ids = await readList(K_FAV);
    const expanded = [...ids];
    for (const id of ids) {
      const equivalent = await equivalentId(id);
      if (equivalent && !expanded.includes(equivalent)) expanded.push(equivalent);
    }
    if (expanded.length !== ids.length) await writeList(K_FAV, expanded);
    return expanded;
  }),
};

export const recents = {
  list: () => readList(K_RECENT),
  push: async (id: string) => {
    const arr = await readList(K_RECENT);
    const filtered = arr.filter((x) => x !== id);
    filtered.unshift(id);
    await writeList(K_RECENT, filtered.slice(0, 25));
  },
  clear: () => writeList(K_RECENT, []),
};

export const playlist = {
  list: () => readList(K_PLAYLIST),
  set: (arr: string[]) => writeList(K_PLAYLIST, arr),
  add: async (id: string) => {
    const arr = await readList(K_PLAYLIST);
    if (!arr.includes(id)) arr.push(id);
    await writeList(K_PLAYLIST, arr);
  },
  remove: async (id: string) => {
    const arr = await readList(K_PLAYLIST);
    await writeList(K_PLAYLIST, arr.filter((x) => x !== id));
  },
  clear: () => writeList(K_PLAYLIST, []),
  move: async (from: number, to: number) => {
    const arr = await readList(K_PLAYLIST);
    if (from < 0 || from >= arr.length || to < 0 || to >= arr.length) return;
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    await writeList(K_PLAYLIST, arr);
  },
};
