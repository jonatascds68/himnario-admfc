import { kv, secureKv } from './storage';
import seed from '../../assets/base_mestre.json';

// HIMNARIO ADMFC — modo independiente/local-first.
// La lectura y edición de la base no dependen de ningún servidor Emergent.

let sessionToken: string | null = null;
export const adminSession = {
  set: (t: string) => { sessionToken = t; },
  get: () => sessionToken,
  clear: () => { sessionToken = null; },
};

export type Himnario = 'Gloria y Triunfo' | 'Himnos de Sión';
export interface Bloque { tipo: 'estrofa' | 'coro'; numero?: number | null; texto: string; }
export interface CifraSegmento {
  texto: string;
  acorde?: string | null;
}

export interface CifraLinea {
  segmentos: CifraSegmento[];
}

export interface CifraBloque {
  tipo: 'estrofa' | 'coro';
  numero?: number | null;
  lineas: CifraLinea[];
}
export interface Hymn {
  id: string; himnario: Himnario; numero: number; titulo: string; letra?: string;
  bloques?: Bloque[] | null; numero_equivalente?: number | null;
  himnario_equivalente?: string | null; estado?: string | null; fuente?: string | null;
observacion?: string | null;
categorias?: string[];
has_lyrics?: boolean;

tom?: string | null;
cifra?: string | null;
cifra_bloques?: CifraBloque[] | null;
cifra_url?: string | null;
audio_url?: string | null;
audio_local?: string | null;
cifra_autorizada?: boolean;
audio_autorizado?: boolean;
}
interface LocalDb { hymns: Hymn[]; categories: { id: string; name: string }[]; }

const DEFAULT_CATEGORIES = [
  "Actividad Cristiana",
  "Alabanza a Dios",
  "Amor y Gracia de Dios",
  "Año Nuevo",
  "Apertura de Cultos",
  "Ayuda de Dios en las Pruebas",
  "Bautismo en el Espíritu Santo",
  "Bautismo en las Aguas",
  "Bienvenidas",
  "Bodas",
  "Cena del Señor",
  "Cielo - Gloriosa Esperanza",
  "Consagración",
  "Coros",
  "Despedida",
  "Escuela Dominical",
  "Fe y Confianza",
  "Gozo y Paz de los Creyentes",
  "Iglesia",
  "Invitación",
  "Jesús Salvador y Amigo",
  "Navidad",
  "Oración - Culto",
  "Pascua",
  "Sagradas Escrituras",
  "Sanidad Divina",
  "Sangre, Redención, Salvación",
  "Segunda Venida",
  "Sufrimiento y Muerte de Jesús",
];

const DB_KEY = 'admfc_local_db_v1';
const DB_DATA_VERSION_KEY = 'admfc_local_db_data_version';
const DB_DATA_VERSION = '6';
const ADMIN_EMAIL_KEY = 'admfc_local_admin_email';
const ADMIN_PASS_KEY = 'admfc_local_admin_password';

function normalize(s: string) {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
async function loadDb(): Promise<LocalDb> {
  const raw = await kv.get(DB_KEY);
const dataVersion = await kv.get(DB_DATA_VERSION_KEY);
if (raw && dataVersion !== DB_DATA_VERSION) {
  try {
    const db = JSON.parse(raw) as LocalDb;
    const freshHymns = ((seed as any).himnos || []) as Hymn[];
    db.hymns = freshHymns;
    await saveDb(db);
    await kv.set(DB_DATA_VERSION_KEY, DB_DATA_VERSION);
    return db;
  } catch {}
}
  if (raw) {
    try {
      const db = JSON.parse(raw) as LocalDb;
      if (!Array.isArray(db.categories)) db.categories = [];
      let changed = false;
      for (const name of DEFAULT_CATEGORIES) {
        if (!db.categories.some(c => normalize(c.name) === normalize(name))) {
          db.categories.push({ id: `default-${normalize(name).replace(/[^a-z0-9]+/g, '-')}`, name });
          changed = true;
        }
      }
      if (changed) await saveDb(db);
      return db;
    } catch {}
  }
  const hymns = ((seed as any).himnos || []) as Hymn[];
  const db: LocalDb = {
    hymns,
    categories: DEFAULT_CATEGORIES.map((name, i) => ({ id: `default-${i + 1}`, name }))
  };
await saveDb(db); await kv.set(DB_DATA_VERSION_KEY, DB_DATA_VERSION); return db;
}
async function saveDb(db: LocalDb) { await kv.set(DB_KEY, JSON.stringify(db)); }
function keyToName(k?: 'gt'|'sion') { return k === 'gt' ? 'Gloria y Triunfo' : k === 'sion' ? 'Himnos de Sión' : undefined; }
function nameToKey(n?: string) { return n === 'Gloria y Triunfo' ? 'gt' : 'sion'; }
function requireAuth() { if (!sessionToken) throw new Error('No autorizado'); }

export const api = {
  listHymns: async (p: { himnario?: 'gt'|'sion'; q?: string; category?: string } = {}) => {
    const db = await loadDb(); let items = [...db.hymns]; const hn = keyToName(p.himnario);
    if (hn) items = items.filter(h => h.himnario === hn);
    if (p.category) items = items.filter(h => (h.categorias || []).includes(p.category!));
    if (p.q) { const q = normalize(p.q); items = items.filter(h => String(h.numero) === p.q!.trim() || normalize(h.titulo).includes(q) || normalize(h.letra || '').includes(q)); }
    items.sort((a,b) => a.himnario.localeCompare(b.himnario) || a.numero-b.numero);
    return { items, count: items.length };
  },
  getHymn: async (id: string) => { const h=(await loadDb()).hymns.find(x=>x.id===id); if(!h) throw new Error('Himno no encontrado'); return h; },
  getByNumber: async (himnario:'gt'|'sion', numero:number) => { const h=(await loadDb()).hymns.find(x=>x.himnario===keyToName(himnario)&&x.numero===numero); if(!h) throw new Error('Himno no encontrado'); return h; },
  listCategories: async () => { const db=await loadDb(); return { items: db.categories.map(c=>({...c,count:db.hymns.filter(h=>(h.categorias||[]).includes(c.name)).length})) }; },
  createCategory: async (name:string) => { requireAuth(); const db=await loadDb(); if(!db.categories.some(c=>normalize(c.name)===normalize(name))) db.categories.push({id:`cat-${Date.now()}`,name}); await saveDb(db); return {ok:true}; },
  renameCategory: async (id:string,name:string) => { requireAuth(); const db=await loadDb(); const c=db.categories.find(x=>x.id===id); if(!c) throw new Error('Categoría no encontrada'); const old=c.name; c.name=name; db.hymns.forEach(h=>{h.categorias=(h.categorias||[]).map(x=>x===old?name:x)}); await saveDb(db); return {ok:true}; },
  deleteCategory: async (id:string) => { requireAuth(); const db=await loadDb(); const c=db.categories.find(x=>x.id===id); if(c) db.hymns.forEach(h=>{h.categorias=(h.categorias||[]).filter(x=>x!==c.name)}); db.categories=db.categories.filter(x=>x.id!==id); await saveDb(db); return {ok:true}; },
  stats: async () => { const hs=(await loadDb()).hymns; return {total:hs.length,gt:hs.filter(h=>h.himnario==='Gloria y Triunfo').length,sion:hs.filter(h=>h.himnario==='Himnos de Sión').length,equivalences:hs.filter(h=>h.numero_equivalente!=null).length,with_lyrics:hs.filter(h=>(h.letra||'').trim()).length}; },

  // Administración local: en el primer acceso del dispositivo, las credenciales
  // introducidas quedan registradas en SecureStore. En accesos posteriores deben coincidir.
  login: async (email:string,password:string) => {
    if (!email || password.length < 6) throw new Error('Ingrese email y una contraseña de al menos 6 caracteres');
    const savedEmail=await secureKv.get(ADMIN_EMAIL_KEY), savedPass=await secureKv.get(ADMIN_PASS_KEY);
    if (!savedEmail && !savedPass) { await secureKv.set(ADMIN_EMAIL_KEY,email); await secureKv.set(ADMIN_PASS_KEY,password); }
    else if (savedEmail!==email || savedPass!==password) throw new Error('Credenciales incorrectas');
    adminSession.set(`local-${Date.now()}`); return {access_token:adminSession.get(),local:true};
  },
  me: async () => { requireAuth(); return {email:await secureKv.get(ADMIN_EMAIL_KEY),local:true}; },
  logout: async () => { adminSession.clear(); },
  isAuth: async () => !!adminSession.get(),

  createHymn: async (payload:Partial<Hymn>) => { requireAuth(); const db=await loadDb(); const h={...payload,id:payload.id||`LOCAL-${Date.now()}`} as Hymn; db.hymns.push(h); await saveDb(db); return h; },
  updateHymn: async (id:string,payload:Partial<Hymn>) => { requireAuth(); const db=await loadDb(); const i=db.hymns.findIndex(h=>h.id===id); if(i<0) throw new Error('Himno no encontrado'); db.hymns[i]={...db.hymns[i],...payload,id}; await saveDb(db); return db.hymns[i]; },
  deleteHymn: async (id:string) => { requireAuth(); const db=await loadDb(); db.hymns=db.hymns.filter(h=>h.id!==id); await saveDb(db); return {ok:true}; },
  setEquivalence: async (id:string,himnario:'gt'|'sion',numero:number) => { requireAuth(); const db=await loadDb(); const h=db.hymns.find(x=>x.id===id), target=db.hymns.find(x=>x.himnario===keyToName(himnario)&&x.numero===numero); if(!h||!target) throw new Error('Himno no encontrado'); h.numero_equivalente=target.numero; h.himnario_equivalente=target.himnario; target.numero_equivalente=h.numero; target.himnario_equivalente=h.himnario; await saveDb(db); return {hymn:h}; },
  removeEquivalence: async (id:string) => { requireAuth(); const db=await loadDb(); const h=db.hymns.find(x=>x.id===id); if(!h) throw new Error('Himno no encontrado'); const oldN=h.numero_equivalente, oldH=h.himnario_equivalente; h.numero_equivalente=null; h.himnario_equivalente=null; const target=db.hymns.find(x=>x.himnario===oldH&&x.numero===oldN); if(target&&target.numero_equivalente===h.numero){target.numero_equivalente=null;target.himnario_equivalente=null;} await saveDb(db); return {hymn:h}; },
  exportBackup: async () => { requireAuth(); const db=await loadDb(); return {schema_version:'local-1',release:'ADMFC_INDEPENDIENTE_1.0',total:db.hymns.length,himnos:db.hymns,categories:db.categories}; },
  restoreBackup: async (p:any) => { requireAuth(); const hymns=(p.himnos||p.hymns||[]) as Hymn[]; if(!Array.isArray(hymns)||!hymns.length) throw new Error('Backup inválido'); const categories=p.categories||p.categorias||[]; await saveDb({hymns,categories}); return {restored_hymns:hymns.length,restored_categories:categories.length}; },
  importFile: async () => { throw new Error('Importación CSV/XLSX no disponible en modo local. Use Restaurar backup (JSON).'); },
};

export interface Section { kind:'verse'|'chorus'; index?:number; text:string; }
export function getSections(hymn:{bloques?:Bloque[]|null;letra?:string}):Section[]{ if(hymn.bloques?.length) return hymn.bloques.map(b=>({kind:b.tipo==='coro'?'chorus':'verse',index:b.numero??undefined,text:b.texto||''})); return parseLetra(hymn.letra||''); }
export function parseLetra(letra:string):Section[]{ if(!letra)return[]; const lines=letra.replace(/\r\n/g,'\n').split('\n'); const out:Section[]=[]; let current:Section|null=null; const push=()=>{if(current&&current.text.trim())out.push(current);current=null}; for(const raw of lines){const line=raw.trimEnd(),trimmed=line.trim(),m=/^(\d+)\.?$/.exec(trimmed),chorus=/^\s*CORO\s*:?\s*$/i.test(trimmed); if(m){push();current={kind:'verse',index:parseInt(m[1],10),text:''};}else if(chorus){push();current={kind:'chorus',text:''};}else if(trimmed===''){if(current)current.text+='\n';}else{if(!current)current={kind:'verse',text:''};current.text+=(current.text?'\n':'')+line;}} push(); return out; }
