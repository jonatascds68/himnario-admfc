import { kv } from '../lib/storage';

const K_FAV = 'admfc_favorites';
const K_RECENT = 'admfc_recents';
const K_PLAYLIST = 'admfc_playlist';

async function readList(key: string): Promise<string[]> {
  const raw = await kv.get(key);
  if (!raw) return [];
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v : []; } catch { return []; }
}
async function writeList(key: string, arr: string[]) { await kv.set(key, JSON.stringify(arr)); }

export const favorites = {
  list: () => readList(K_FAV),
  has: async (id: string) => (await readList(K_FAV)).includes(id),
  toggle: async (id: string) => {
    const arr = await readList(K_FAV);
    const idx = arr.indexOf(id);
    if (idx >= 0) arr.splice(idx, 1); else arr.unshift(id);
    await writeList(K_FAV, arr);
    return arr.includes(id);
  },
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
