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
export type MediaProvenanceType =
  | 'propio'
  | 'autorizado'
  | 'dominio_publico'
  | 'enlace_externo'
  | 'desconocido';

export interface MediaProvenance {
  fuente?: string | null;
  tipo?: MediaProvenanceType | null;
  autorizado?: boolean;
  notas?: string | null;
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
audio_external_url?: string | null;
cifra_autorizada?: boolean;
cifra_procedencia?: MediaProvenance | null;
audio_autorizado?: boolean;
audio_procedencia?: MediaProvenance | null;
}
interface LocalDb { hymns: Hymn[]; categories: { id: string; name: string }[]; }

export interface AdminHymnChange {
  id: string;
  hymn_id: string;
  himnario: Himnario;
  numero: number;
  titulo: string;
  action: 'update';
  changed_fields: string[];
  before: Partial<Hymn>;
  after: Partial<Hymn>;
  created_at: string;
  status: 'pending';
}

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
const ADMIN_CHANGES_KEY = 'admfc_admin_changes_v1';
const DB_DATA_VERSION_KEY = 'admfc_local_db_data_version';
const DB_DATA_VERSION = '7';

/*
 * ADMFC 7AA.44 — revisão da atualização remota de conteúdo.
 * Independente da versão estrutural da base local.
 */
const CONTENT_REVISION_KEY = 'admfc_content_revision_v1';

/*
 * ADMFC 7AA.44 — última revisão GERADA pelo administrador.
 * Não confundir com CONTENT_REVISION_KEY, que pertence ao
 * aparelho que recebe e aplica atualizações.
 */
const PUBLISHED_CONTENT_REVISION_KEY =
  'admfc_published_content_revision_v1';

const ADMIN_EMAIL = 'jonatascds68@gmail.com';
const ADMIN_PASSWORD_HASH = 'edf29432fb85857e36c029fffe09af9b1e02b1474dcc7b384fed25a121645900';

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

function consolidateAdminChanges(
  items: AdminHymnChange[]
): AdminHymnChange[] {
  const result: AdminHymnChange[] = [];

  /*
   * Registros antigos eram adicionados com unshift(),
   * portanto a fila está normalmente do mais novo
   * para o mais antigo.
   *
   * Reconstruímos cronologicamente para obter
   * somente o estado líquido pendente.
   */
  const chronological = [...items].reverse();

  for (const item of chronological) {
    let existing = result.find(
      current =>
        current.hymn_id === item.hymn_id &&
        current.action === 'update'
    );

    if (!existing) {
      result.push({
        ...item,
        changed_fields: [...item.changed_fields],
        before: { ...item.before },
        after: { ...item.after },
      });

      continue;
    }

    for (const field of item.changed_fields) {
      if (!existing.changed_fields.includes(field)) {
        existing.changed_fields.push(field);

        (existing.before as any)[field] =
          (item.before as any)?.[field];
      }

      (existing.after as any)[field] =
        (item.after as any)?.[field];

      if (
        sameValue(
          (existing.before as any)[field],
          (existing.after as any)[field]
        )
      ) {
        existing.changed_fields =
          existing.changed_fields.filter(
            currentField => currentField !== field
          );

        delete (existing.before as any)[field];
        delete (existing.after as any)[field];
      }
    }

    existing.himnario = item.himnario;
    existing.numero = item.numero;
    existing.titulo = item.titulo;
    existing.created_at = item.created_at;
  }

  /*
   * A ordem pública da fila continua:
   * alteração mais recente primeiro.
   */
  return result
    .filter(item => item.changed_fields.length > 0)
    .reverse();
}

async function loadAdminChanges(): Promise<AdminHymnChange[]> {
  const raw = await kv.get(ADMIN_CHANGES_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    /*
     * ADMFC 7AA.20:
     * normalização SOMENTE EM LEITURA.
     *
     * Nenhuma alteração é persistida no AsyncStorage
     * nesta etapa.
     */
    return consolidateAdminChanges(parsed);
  } catch {
    return [];
  }
}

async function saveAdminChanges(changes: AdminHymnChange[]) {
  await kv.set(ADMIN_CHANGES_KEY, JSON.stringify(changes));
}

function sameValue(a: any, b: any) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

async function registerHymnUpdate(
  before: Hymn,
  after: Hymn,
  payload: Partial<Hymn>
) {
  const changedFields = Object.keys(payload).filter(
    key => !sameValue(
      (before as any)[key],
      (after as any)[key]
    )
  );

  if (!changedFields.length) return;

  const changes = await loadAdminChanges();

  /*
   * ADMFC 7AA:
   * A fila administrativa representa o estado líquido pendente
   * de sincronização, e não um histórico de todas as edições locais.
   *
   * Para cada campo do mesmo hino:
   * - preserva o primeiro BEFORE ainda pendente;
   * - atualiza o AFTER para o valor mais recente;
   * - se AFTER voltar a ser igual ao BEFORE original,
   *   a pendência daquele campo desaparece.
   */

  let existing = changes.find(
    item =>
      item.hymn_id === after.id &&
      item.action === 'update'
  );

  if (!existing) {
    const beforeValues: Partial<Hymn> = {};
    const afterValues: Partial<Hymn> = {};

    for (const key of changedFields) {
      (beforeValues as any)[key] = (before as any)[key];
      (afterValues as any)[key] = (after as any)[key];
    }

    changes.unshift({
      id: `change-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      hymn_id: after.id,
      himnario: after.himnario,
      numero: after.numero,
      titulo: after.titulo,
      action: 'update',
      changed_fields: changedFields,
      before: beforeValues,
      after: afterValues,
      created_at: new Date().toISOString(),
      status: 'pending',
    });

    await saveAdminChanges(changes);
    return;
  }

  for (const key of changedFields) {
    /*
     * Se este campo ainda não fazia parte da pendência,
     * o estado imediatamente anterior passa a ser seu
     * BEFORE original.
     */
    if (!existing.changed_fields.includes(key)) {
      existing.changed_fields.push(key);
      (existing.before as any)[key] = (before as any)[key];
    }

    (existing.after as any)[key] = (after as any)[key];

    /*
     * Se o valor atual voltou ao BEFORE original,
     * não existe mais alteração líquida nesse campo.
     */
    if (
      sameValue(
        (existing.before as any)[key],
        (existing.after as any)[key]
      )
    ) {
      existing.changed_fields =
        existing.changed_fields.filter(field => field !== key);

      delete (existing.before as any)[key];
      delete (existing.after as any)[key];
    }
  }

  /*
   * Mantém os metadados visuais correspondentes
   * ao estado mais recente do hino.
   */
  existing.himnario = after.himnario;
  existing.numero = after.numero;
  existing.titulo = after.titulo;
  existing.created_at = new Date().toISOString();

  /*
   * Se todos os campos retornaram ao estado original,
   * remove completamente a pendência.
   */
  if (!existing.changed_fields.length) {
    const remaining = changes.filter(
      item => item.id !== existing!.id
    );

    await saveAdminChanges(remaining);
    return;
  }

  await saveAdminChanges(changes);
}

function keyToName(k?: 'gt'|'sion') { return k === 'gt' ? 'Gloria y Triunfo' : k === 'sion' ? 'Himnos de Sión' : undefined; }
function nameToKey(n?: string) { return n === 'Gloria y Triunfo' ? 'gt' : 'sion'; }
function requireAuth() { if (!sessionToken) throw new Error('No autorizado'); }

async function sha256(value: string): Promise<string> {
  const Crypto = await import('expo-crypto');
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    value
  );
}


/*
 * ADMFC 7AA.44 — motor seguro de atualização de conteúdo.
 *
 * Este motor aplica correções oficiais sobre a base local sem tocar
 * em favoritos, recentes, playlist ou preferências do usuário.
 *
 * Identidade:
 * - hymn_id identifica permanentemente o hino.
 * - id nunca pode ser alterado remotamente.
 * - audio_local pertence ao aparelho e nunca pode ser alterado remotamente.
 */

export interface ContentPatch {
  hymn_id: string;
  fields: Partial<Hymn>;
}

export interface ContentPatchPackage {
  schema_version: 'admfc-content-patch-1';
  revision: number;
  patches: ContentPatch[];
}

const REMOTE_HYMN_FIELDS = new Set<keyof Hymn>([
  'himnario',
  'numero',
  'titulo',
  'letra',
  'bloques',
  'numero_equivalente',
  'himnario_equivalente',
  'estado',
  'fuente',
  'observacion',
  'categorias',
  'has_lyrics',
  'tom',
  'cifra',
  'cifra_bloques',
  'cifra_url',
  'audio_url',
  'audio_external_url',
  'cifra_autorizada',
  'cifra_procedencia',
  'audio_autorizado',
  'audio_procedencia',
]);


/*
 * ADMFC 7AA.44 — converte alterações administrativas consolidadas
 * em pacote oficial de distribuição.
 *
 * Somente os campos presentes em changed_fields são publicados.
 * Dados administrativos como before, status e created_at não fazem
 * parte do pacote recebido pelos usuários.
 */
export function adminChangesToContentPackage(
  changes: AdminHymnChange[],
  revision: number
): ContentPatchPackage {
  if (!Number.isInteger(revision) || revision < 1) {
    throw new Error('Revisión de contenido inválida');
  }

  const patches: ContentPatch[] = changes.map(change => {
    if (
      !change ||
      change.action !== 'update' ||
      typeof change.hymn_id !== 'string' ||
      !change.hymn_id.trim() ||
      !Array.isArray(change.changed_fields)
    ) {
      throw new Error('Cambio administrativo inválido');
    }

    const fields: Partial<Hymn> = {};

    for (const field of change.changed_fields) {
      if (
        field === 'id' ||
        field === 'audio_local' ||
        !REMOTE_HYMN_FIELDS.has(field as keyof Hymn)
      ) {
        throw new Error(
          `Campo no publicable: ${field}`
        );
      }

      if (!Object.prototype.hasOwnProperty.call(change.after, field)) {
        throw new Error(
          `Valor final ausente para: ${field}`
        );
      }

      (fields as any)[field] = (change.after as any)[field];
    }

    return {
      hymn_id: change.hymn_id,
      fields,
    };
  });

  return {
    schema_version: 'admfc-content-patch-1',
    revision,
    patches,
  };
}

export async function getContentRevision(): Promise<number> {
  const raw = await kv.get(CONTENT_REVISION_KEY);
  const revision = Number(raw);

  return Number.isInteger(revision) && revision >= 0
    ? revision
    : 0;
}

export async function applyContentPatchPackage(
  pkg: ContentPatchPackage
) {
  if (
    !pkg ||
    pkg.schema_version !== 'admfc-content-patch-1' ||
    !Number.isInteger(pkg.revision) ||
    pkg.revision < 1 ||
    !Array.isArray(pkg.patches)
  ) {
    throw new Error('Paquete de actualización inválido');
  }

  const currentRevision = await getContentRevision();

  /*
   * Revisões são monotônicas:
   * - pacote já aplicado: não reaplica;
   * - pacote antigo: não provoca regressão.
   */
  if (pkg.revision <= currentRevision) {
    return {
      ok: true,
      revision: currentRevision,
      applied_patches: 0,
      skipped: true,
    };
  }

  const db = await loadDb();

  /*
   * Trabalhamos sobre uma cópia profunda.
   * Nada é persistido enquanto o pacote inteiro não for validado.
   */
  const nextDb = JSON.parse(JSON.stringify(db)) as LocalDb;

  for (const patch of pkg.patches) {
    if (
      !patch ||
      typeof patch.hymn_id !== 'string' ||
      !patch.hymn_id.trim() ||
      !patch.fields ||
      typeof patch.fields !== 'object' ||
      Array.isArray(patch.fields)
    ) {
      throw new Error('Corrección de himno inválida');
    }

    const hymn = nextDb.hymns.find(h => h.id === patch.hymn_id);

    if (!hymn) {
      throw new Error(`Himno desconocido: ${patch.hymn_id}`);
    }

    for (const [field, value] of Object.entries(patch.fields)) {
      if (
        field === 'id' ||
        field === 'audio_local' ||
        !REMOTE_HYMN_FIELDS.has(field as keyof Hymn)
      ) {
        throw new Error(
          `Campo remoto no permitido: ${field}`
        );
      }

      (hymn as any)[field] = value;
    }

    /*
     * A identidade permanente deve continuar intacta.
     */
    if (hymn.id !== patch.hymn_id) {
      throw new Error(
        `Identidad de himno alterada: ${patch.hymn_id}`
      );
    }
  }

  /*
   * Um único save depois da validação completa.
   */
  await saveDb(nextDb);

  /*
   * A revisão só é registrada DEPOIS que a nova base foi salva.
   * Um pacote inválido nunca avança a revisão local.
   */
  await kv.set(CONTENT_REVISION_KEY, String(pkg.revision));

  return {
    ok: true,
    revision: pkg.revision,
    applied_patches: pkg.patches.length,
    skipped: false,
  };
}

export const api = {
  // ADMFC 7AA.44: entrada pública do motor de atualização de conteúdo.
  applyContentUpdates: async (pkg: ContentPatchPackage) =>
    applyContentPatchPackage(pkg),

  getContentRevision: async () =>
    getContentRevision(),

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

  // Administración local protegida por credencial fija.
  // La contraseña nunca se almacena en texto plano.
  login: async (email:string,password:string) => {
    if (!email || !password) throw new Error('Ingrese email y contraseña');

    const normalizedEmail = email.trim().toLowerCase();

    const passwordHash = await sha256(password);

    if (
      normalizedEmail !== ADMIN_EMAIL ||
      passwordHash !== ADMIN_PASSWORD_HASH
    ) {
      throw new Error('Credenciales incorrectas');
    }

    adminSession.set(`local-${Date.now()}`);
    return {
      access_token: adminSession.get(),
      local: true
    };
  },
  me: async () => {
    requireAuth();
    return { email: ADMIN_EMAIL, local: true };
  },
  logout: async () => { adminSession.clear(); },
  isAuth: async () => !!adminSession.get(),

  createHymn: async (payload:Partial<Hymn>) => { requireAuth(); const db=await loadDb(); const h={...payload,id:payload.id||`LOCAL-${Date.now()}`} as Hymn; db.hymns.push(h); await saveDb(db); return h; },
  updateHymn: async (id:string,payload:Partial<Hymn>) => {
    requireAuth();

    const db = await loadDb();
    const i = db.hymns.findIndex(h => h.id === id);

    if (i < 0) {
      throw new Error('Himno no encontrado');
    }

    const before = JSON.parse(JSON.stringify(db.hymns[i])) as Hymn;

    /*
     * ADMFC 7AA.35C:
     * O editor envia um payload completo do formulário.
     * Para a fila administrativa, porém, interessam somente
     * os campos cujo valor realmente mudou.
     */
    const effectivePayload = Object.fromEntries(
      Object.entries(payload).filter(
        ([key, value]) =>
          !sameValue(
            (before as any)[key],
            value
          )
      )
    ) as Partial<Hymn>;

    db.hymns[i] = {
      ...db.hymns[i],
      ...effectivePayload,
      id,
    };

    const updated = db.hymns[i];

    if (
      updated.numero_equivalente != null &&
      updated.himnario_equivalente
    ) {
      const target = db.hymns.find(
        h =>
          h.himnario === updated.himnario_equivalente &&
          h.numero === updated.numero_equivalente
      );

      if (target) {
        const sharedKeys: (keyof Hymn)[] = [
          'tom',
          'cifra',
          'cifra_bloques',
          'cifra_url',
          'audio_url',
          'audio_local',
          'audio_external_url',
          'cifra_autorizada',
          'audio_autorizado',
        ];

        for (const key of sharedKeys) {
          if (
            Object.prototype.hasOwnProperty.call(
              effectivePayload,
              key
            )
          ) {
            (target as any)[key] =
              (effectivePayload as any)[key];
          }
        }
      }
    }

    await saveDb(db);
    await registerHymnUpdate(
      before,
      updated,
      effectivePayload
    );
    return updated;
  },

  listAdminChanges: async () => {
    requireAuth();
    const items = await loadAdminChanges();

    return {
      items,
      count: items.length,
    };
  },

  adminChangesCount: async () => {
    requireAuth();
    const items = await loadAdminChanges();
    return items.length;
  },

  exportContentUpdates: async () => {
    requireAuth();

    const items = await loadAdminChanges();

    if (!items.length) {
      throw new Error('No hay correcciones pendientes para publicar');
    }

    const raw = await kv.get(PUBLISHED_CONTENT_REVISION_KEY);
    const storedRevision = Number(raw);

    const currentRevision =
      Number.isInteger(storedRevision) && storedRevision >= 0
        ? storedRevision
        : 0;

    const nextRevision = currentRevision + 1;

    /*
     * Gerar o pacote NÃO avança ainda o contador.
     * A revisão só deverá ser confirmada depois que a
     * publicação efetivamente for concluída.
     */
    return adminChangesToContentPackage(
      items,
      nextRevision
    );
  },

  confirmContentPublished: async (revision: number) => {
    requireAuth();

    if (!Number.isInteger(revision) || revision < 1) {
      throw new Error('Revisión publicada inválida');
    }

    const raw = await kv.get(PUBLISHED_CONTENT_REVISION_KEY);
    const storedRevision = Number(raw);

    const currentRevision =
      Number.isInteger(storedRevision) && storedRevision >= 0
        ? storedRevision
        : 0;

    if (revision <= currentRevision) {
      return {
        ok: true,
        revision: currentRevision,
        already_confirmed: true,
      };
    }

    /*
     * Não permitimos saltos acidentais de revisão.
     */
    if (revision !== currentRevision + 1) {
      throw new Error(
        `Secuencia de revisión inválida: ${currentRevision} -> ${revision}`
      );
    }

    await kv.set(
      PUBLISHED_CONTENT_REVISION_KEY,
      String(revision)
    );

    return {
      ok: true,
      revision,
      already_confirmed: false,
    };
  },

  exportAdminChanges: async () => {
    requireAuth();

    const items = await loadAdminChanges();

    return {
      schema_version: 'admfc-admin-changes-1',
      release: 'ADMFC_INDEPENDIENTE_1.0',
      exported_at: new Date().toISOString(),
      total_changes: items.length,
      changes: items,
    };
  },

  clearAdminChanges: async () => {
    requireAuth();
    await saveAdminChanges([]);
    return { ok: true };
  },

  removeAdminChange: async (changeId: string) => {
    requireAuth();

    const items = await loadAdminChanges();
    const exists = items.some(item => item.id === changeId);

    if (!exists) {
      throw new Error('Alteración administrativa no encontrada');
    }

    const remaining = items.filter(item => item.id !== changeId);
    await saveAdminChanges(remaining);

    return {
      ok: true,
      removed_id: changeId,
      count: remaining.length,
    };
  },

  deleteHymn: async (id:string) => { requireAuth(); const db=await loadDb(); db.hymns=db.hymns.filter(h=>h.id!==id); await saveDb(db); return {ok:true}; },
  setEquivalence: async (
    id:string,
    himnario:'gt'|'sion',
    numero:number
  ) => {
    requireAuth();

    const db = await loadDb();

    const h = db.hymns.find(x => x.id === id);
    const target = db.hymns.find(
      x =>
        x.himnario === keyToName(himnario) &&
        x.numero === numero
    );

    if (!h || !target) {
      throw new Error('Himno no encontrado');
    }

    h.numero_equivalente = target.numero;
    h.himnario_equivalente = target.himnario;

    target.numero_equivalente = h.numero;
    target.himnario_equivalente = h.himnario;

    const sharedKeys: (keyof Hymn)[] = [
      'tom',
      'cifra',
      'cifra_bloques',
      'cifra_url',
      'audio_url',
      'audio_local',
      'audio_external_url',
      'cifra_procedencia',
      'audio_procedencia',
      'cifra_autorizada',
      'audio_autorizado',
    ];

    for (const key of sharedKeys) {
      const sourceValue = (h as any)[key];
      const targetValue = (target as any)[key];

      const chosen =
        sourceValue !== undefined &&
        sourceValue !== null &&
        sourceValue !== ''
          ? sourceValue
          : targetValue;

      if (chosen !== undefined) {
        (h as any)[key] = chosen;
        (target as any)[key] = chosen;
      }
    }

    await saveDb(db);

    return {
      hymn: h,
    };
  },
  removeEquivalence: async (id:string) => { requireAuth(); const db=await loadDb(); const h=db.hymns.find(x=>x.id===id); if(!h) throw new Error('Himno no encontrado'); const oldN=h.numero_equivalente, oldH=h.himnario_equivalente; h.numero_equivalente=null; h.himnario_equivalente=null; const target=db.hymns.find(x=>x.himnario===oldH&&x.numero===oldN); if(target&&target.numero_equivalente===h.numero){target.numero_equivalente=null;target.himnario_equivalente=null;} await saveDb(db); return {hymn:h}; },
  /*
   * ADMFC 7AA.41:
   * O backup representa o estado administrativo completo:
   * base local + categorias + correções pendentes.
   */
  exportBackup: async () => {
    requireAuth();

    const db = await loadDb();
    const adminChanges = await loadAdminChanges();

    return {
      schema_version: 'local-2',
      release: 'ADMFC_INDEPENDIENTE_1.0',
      total: db.hymns.length,
      himnos: db.hymns,
      categories: db.categories,
      admin_changes: adminChanges,
    };
  },

  restoreBackup: async (p: any) => {
    requireAuth();

    const hymns = (p.himnos || p.hymns || []) as Hymn[];

    if (!Array.isArray(hymns) || !hymns.length) {
      throw new Error('Backup inválido');
    }

    const categories =
      p.categories || p.categorias || [];

    if (!Array.isArray(categories)) {
      throw new Error('Categorías inválidas en el backup');
    }

    /*
     * Backups local-2 restauram a fila administrativa.
     * Backups antigos não possuíam essa informação;
     * nesse caso a fila é zerada para não misturar
     * correções de estados diferentes da base.
     */
    let adminChanges: AdminHymnChange[] = [];

    if (Array.isArray(p.admin_changes)) {
      adminChanges = consolidateAdminChanges(
        p.admin_changes as AdminHymnChange[]
      );
    }

    await saveDb({
      hymns,
      categories,
    });

    await saveAdminChanges(adminChanges);

    return {
      restored_hymns: hymns.length,
      restored_categories: categories.length,
      restored_changes: adminChanges.length,
    };
  },
  // ADMFC 7AA.43: API legada de importação CSV/XLSX removida.
};

export interface Section { kind:'verse'|'chorus'; index?:number; text:string; }
export function getSections(hymn:{bloques?:Bloque[]|null;letra?:string}):Section[]{ if(hymn.bloques?.length) return hymn.bloques.map(b=>({kind:b.tipo==='coro'?'chorus':'verse',index:b.numero??undefined,text:b.texto||''})); return parseLetra(hymn.letra||''); }
export function parseLetra(letra:string):Section[]{ if(!letra)return[]; const lines=letra.replace(/\r\n/g,'\n').split('\n'); const out:Section[]=[]; let current:Section|null=null; const push=()=>{if(current&&current.text.trim())out.push(current);current=null}; for(const raw of lines){const line=raw.trimEnd(),trimmed=line.trim(),m=/^(\d+)\.?$/.exec(trimmed),chorus=/^\s*CORO\s*:?\s*$/i.test(trimmed); if(m){push();current={kind:'verse',index:parseInt(m[1],10),text:''};}else if(chorus){push();current={kind:'chorus',text:''};}else if(trimmed===''){if(current)current.text+='\n';}else{if(!current)current={kind:'verse',text:''};current.text+=(current.text?'\n':'')+line;}} push(); return out; }
