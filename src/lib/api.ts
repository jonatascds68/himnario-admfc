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
  status: 'pending' | 'reviewed';
  reviewed_at?: string | null;
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

/*
 * ADMFC — snapshot da atualização preparada para publicação.
 *
 * Guarda exatamente quais correções e quais valores AFTER
 * pertencem ao pacote que foi gerado, permitindo confirmar
 * posteriormente sem apagar edições realizadas nesse intervalo.
 */
const PREPARED_CONTENT_PUBLICATION_KEY =
  'admfc_prepared_content_publication_v1';

/*
 * ADMFC — histórico permanente das revisões de conteúdo
 * efetivamente confirmadas como publicadas.
 *
 * Diferente de Cambios pendientes:
 * - não representa trabalho pendente;
 * - não participa do rebase;
 * - é somente auditoria administrativa;
 * - preserva o snapshot exato de cada publicação confirmada.
 */
const CONTENT_PUBLICATION_HISTORY_KEY =
  'admfc_content_publication_history_v1';

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
      /*
       * ADMFC — compatibilidade editorial com hinos legados.
       *
       * A Base Mestre histórica pode possuir somente `letra`.
       * Quando o administrador edita a estrutura, o editor trabalha
       * com `bloques`, mas o estado anterior ainda não possui esse
       * campo fisicamente.
       *
       * Para que a revisão administrativa mostre corretamente
       * ANTES / DESPUÉS por estrofa e coro, reconstruímos SOMENTE
       * o valor administrativo de before.bloques a partir da letra
       * original. A Base Mestre e o próprio hino não são alterados.
       */
      if (
        key === 'bloques' &&
        !Array.isArray(before.bloques)
      ) {
        (beforeValues as any)[key] = getSections(before).map(sec => ({
          tipo: sec.kind === 'chorus' ? 'coro' : 'estrofa',
          numero:
            sec.kind === 'verse'
              ? sec.index ?? null
              : null,
          texto: sec.text,
        }));
      } else {
        (beforeValues as any)[key] = (before as any)[key];
      }

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

      /*
       * ADMFC — o mesmo tratamento de compatibilidade é necessário
       * quando o hino já possui outra alteração administrativa pendente.
       *
       * Se `bloques` ainda não existia fisicamente no hino legado,
       * reconstruímos o BEFORE administrativo a partir da letra original.
       */
      if (
        key === 'bloques' &&
        !Array.isArray(before.bloques)
      ) {
        (existing.before as any)[key] = getSections(before).map(sec => ({
          tipo: sec.kind === 'chorus' ? 'coro' : 'estrofa',
          numero:
            sec.kind === 'verse'
              ? sec.index ?? null
              : null,
          texto: sec.text,
        }));
      } else {
        (existing.before as any)[key] = (before as any)[key];
      }
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
   * ADMFC — qualquer nova edição invalida a revisão anterior.
   *
   * Uma correção marcada como reviewed representa exatamente
   * o estado que foi conferido pelo administrador.
   * Se o hino sofrer nova alteração antes da publicação,
   * essa nova versão precisa obrigatoriamente ser revisada.
   */
  existing.status = 'pending';
  existing.reviewed_at = null;

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
    const db = await loadDb();

    /*
     * ADMFC — compatibilidade visual com pendências antigas.
     *
     * Algumas correções de estrutura foram registradas antes de
     * before.bloques passar a ser armazenado. Para a tela administrativa,
     * reconstruímos SOMENTE uma cópia visual do BEFORE a partir da
     * `letra` histórica do hino.
     *
     * A fila persistida, a Base Mestre e os pacotes de atualização
     * permanecem intocados.
     */
    const displayItems = items.map(item => {
      if (
        !item.changed_fields.includes('bloques') ||
        Array.isArray(item.before?.bloques)
      ) {
        return item;
      }

      const hymn = db.hymns.find(
        current => current.id === item.hymn_id
      );

      if (!hymn?.letra) {
        return item;
      }

      const legacyBlocks: Bloque[] = parseLetra(hymn.letra).map(sec => ({
        tipo:
          sec.kind === 'chorus'
            ? 'coro'
            : 'estrofa',
        numero:
          sec.kind === 'verse'
            ? sec.index ?? null
            : null,
        texto: sec.text,
      }));

      if (!legacyBlocks.length) {
        return item;
      }

      return {
        ...item,
        before: {
          ...item.before,
          bloques: legacyBlocks,
        },
      };
    });

    return {
      items: displayItems,
      count: displayItems.length,
    };
  },

  adminChangesCount: async () => {
    requireAuth();
    const items = await loadAdminChanges();
    return items.length;
  },

  exportContentUpdates: async () => {
    requireAuth();

    /*
     * ADMFC — somente uma publicação pode ficar preparada
     * por vez.
     *
     * Enquanto existir um snapshot aguardando confirmação,
     * não permitimos gerar outro pacote e sobrescrevê-lo.
     */
    const preparedRaw = await kv.get(
      PREPARED_CONTENT_PUBLICATION_KEY
    );

    if (preparedRaw) {
      try {
        const prepared = JSON.parse(preparedRaw);

        if (
          prepared &&
          Number.isInteger(prepared.revision) &&
          Array.isArray(prepared.changes)
        ) {
          throw new Error(
            `La revisión R${String(prepared.revision).padStart(6, '0')} ya está preparada y espera confirmación de publicación. Confírmela antes de generar otra actualización.`
          );
        }
      } catch (error: any) {
        /*
         * Se o JSON é válido e o erro é nosso bloqueio acima,
         * ele deve chegar à interface.
         */
        if (
          error?.message?.includes(
            'espera confirmación de publicación'
          )
        ) {
          throw error;
        }

        /*
         * Snapshot inválido/corrompido também não deve ser
         * sobrescrito silenciosamente.
         */
        throw new Error(
          'Existe una actualización preparada inválida. No se generará otra hasta resolver este estado.'
        );
      }
    }

    const items = await loadAdminChanges();

    if (!items.length) {
      throw new Error('No hay correcciones pendientes para publicar');
    }

    /*
     * Uma atualização oficial só pode ser gerada quando TODAS
     * as correções da fila tiverem sido revisadas.
     *
     * Isso impede publicar acidentalmente uma edição ainda
     * pendente de conferência.
     */
    const notReviewed = items.filter(
      item => item.status !== 'reviewed'
    );

    if (notReviewed.length) {
      throw new Error(
        `Hay ${notReviewed.length} corrección(es) todavía sin revisar. Revise todas antes de publicar.`
      );
    }

    const reviewedItems = items.filter(
      item => item.status === 'reviewed'
    );

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
     *
     * Entretanto, registramos exatamente o estado que entrou
     * nesse pacote. Assim, se algum hino for novamente editado
     * antes da confirmação, essa nova edição não será apagada.
     */
    const contentPackage = adminChangesToContentPackage(
      reviewedItems,
      nextRevision
    );

    await kv.set(
      PREPARED_CONTENT_PUBLICATION_KEY,
      JSON.stringify({
        revision: nextRevision,
        generated_at: new Date().toISOString(),
        changes: reviewedItems.map(item => ({
          id: item.id,
          hymn_id: item.hymn_id,
          changed_fields: [...item.changed_fields],
          after: { ...item.after },
        })),
      })
    );

    return contentPackage;
  },

  /*
   * ADMFC — informa à interface se existe uma atualização
   * já preparada e aguardando confirmação de publicação.
   *
   * Esta função é somente leitura: não altera revisão,
   * fila administrativa nem snapshot.
   */
  getPreparedContentPublication: async () => {
    requireAuth();

    const raw = await kv.get(
      PREPARED_CONTENT_PUBLICATION_KEY
    );

    if (!raw) {
      return null;
    }

    try {
      const prepared = JSON.parse(raw);

      if (
        !prepared ||
        !Number.isInteger(prepared.revision) ||
        !Array.isArray(prepared.changes)
      ) {
        return null;
      }

      return {
        revision: prepared.revision,
        generated_at:
          typeof prepared.generated_at === 'string'
            ? prepared.generated_at
            : null,
        total_changes: prepared.changes.length,
      };
    } catch {
      return null;
    }
  },

  getContentPublicationHistory: async () => {
    requireAuth();

    const raw = await kv.get(
      CONTENT_PUBLICATION_HISTORY_KEY
    );

    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        return [];
      }

      /*
       * Mais recente primeiro.
       * Retornamos cópia para que a tela administrativa
       * nunca altere acidentalmente o conteúdo persistido.
       */
      return [...parsed].sort(
        (a, b) =>
          Number(b?.revision || 0) -
          Number(a?.revision || 0)
      );
    } catch {
      return [];
    }
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

    /*
     * Recupera o snapshot correspondente ao pacote preparado.
     */
    const preparedRaw = await kv.get(
      PREPARED_CONTENT_PUBLICATION_KEY
    );

    if (!preparedRaw) {
      throw new Error(
        'No existe una actualización preparada para confirmar'
      );
    }

    let prepared: any;

    try {
      prepared = JSON.parse(preparedRaw);
    } catch {
      throw new Error(
        'La actualización preparada está dañada'
      );
    }

    if (
      !prepared ||
      prepared.revision !== revision ||
      !Array.isArray(prepared.changes)
    ) {
      throw new Error(
        'La actualización preparada no corresponde a esta revisión'
      );
    }

    const currentItems = await loadAdminChanges();

    /*
     * ADMFC — rebase campo a campo após publicação.
     *
     * O snapshot preparado representa exatamente o estado publicado.
     *
     * Para cada campo que entrou nessa revisão:
     *
     * 1. se o valor atual continua igual ao AFTER publicado,
     *    o campo foi totalmente publicado e sai da fila;
     *
     * 2. se o campo foi novamente alterado depois da geração,
     *    ele continua pendente, porém seu novo BEFORE passa a ser
     *    o AFTER que acabou de ser publicado;
     *
     * 3. campos que não pertenciam ao pacote preparado permanecem
     *    exatamente como estavam;
     *
     * 4. se nenhum campo continuar pendente, o registro inteiro sai.
     *
     * Exemplo:
     *
     * R000001 publica:
     *   titulo  A -> B
     *   bloques X -> Y
     *
     * Antes da confirmação, somente titulo muda novamente:
     *   titulo B -> C
     *
     * Depois da confirmação:
     *   titulo  B -> C continua pendente
     *   bloques desaparece da fila, pois Y já foi publicado.
     */
    const remainingItems: AdminHymnChange[] = [];

    for (const current of currentItems) {
      const published = prepared.changes.find(
        (candidate: any) =>
          candidate.id === current.id &&
          candidate.hymn_id === current.hymn_id
      );

      if (!published) {
        remainingItems.push(current);
        continue;
      }

      const nextChangedFields: string[] = [];
      const nextBefore: Partial<Hymn> = {};
      const nextAfter: Partial<Hymn> = {};

      for (const field of current.changed_fields) {
        const currentAfter = (current.after as any)?.[field];

        const wasPublished =
          Array.isArray(published.changed_fields) &&
          published.changed_fields.includes(field);

        /*
         * Este campo não fazia parte da revisão confirmada.
         * Portanto continua pendente sem qualquer rebase.
         */
        if (!wasPublished) {
          nextChangedFields.push(field);
          (nextBefore as any)[field] =
            (current.before as any)?.[field];
          (nextAfter as any)[field] = currentAfter;
          continue;
        }

        const publishedAfter =
          (published.after as any)?.[field];

        /*
         * O estado atual é exatamente o que foi publicado:
         * não existe mais diferença pendente neste campo.
         */
        if (sameValue(currentAfter, publishedAfter)) {
          continue;
        }

        /*
         * Houve nova edição depois da geração do pacote.
         * A revisão publicada passa a ser a nova base.
         */
        nextChangedFields.push(field);
        (nextBefore as any)[field] = publishedAfter;
        (nextAfter as any)[field] = currentAfter;
      }

      /*
       * Se todos os campos deste registro foram absorvidos pela
       * publicação, ele desaparece da fila administrativa.
       */
      if (!nextChangedFields.length) {
        continue;
      }

      remainingItems.push({
        ...current,
        changed_fields: nextChangedFields,
        before: nextBefore,
        after: nextAfter,

        /*
         * Uma alteração sobrevivente ao rebase é uma nova pendência
         * e precisa ser revisada novamente antes da próxima publicação.
         */
        status: 'pending',
        reviewed_at: null,
      });
    }

    /*
     * Primeiro preservamos a fila resultante.
     * Somente depois registramos a revisão como publicada.
     */
    await saveAdminChanges(remainingItems);

    await kv.set(
      PUBLISHED_CONTENT_REVISION_KEY,
      String(revision)
    );

    /*
     * A revisão já foi confirmada.
     * Agora preservamos permanentemente o snapshot que estava
     * preparado antes de removê-lo.
     */
    const historyRaw = await kv.get(
      CONTENT_PUBLICATION_HISTORY_KEY
    );

    let history: any[] = [];

    if (historyRaw) {
      try {
        const parsedHistory = JSON.parse(historyRaw);

        if (Array.isArray(parsedHistory)) {
          history = parsedHistory;
        }
      } catch {
        history = [];
      }
    }

    /*
     * Proteção contra duplicação caso uma confirmação seja
     * reexecutada por algum fluxo inesperado.
     */
    const alreadyInHistory = history.some(
      item => item?.revision === revision
    );

    if (!alreadyInHistory) {
      history.push({
        revision,
        generated_at:
          typeof prepared.generated_at === 'string'
            ? prepared.generated_at
            : null,
        published_at: new Date().toISOString(),

        changes: prepared.changes.map((change: any) => ({
          id: change.id,
          hymn_id: change.hymn_id,
          changed_fields: Array.isArray(change.changed_fields)
            ? [...change.changed_fields]
            : [],
          after:
            change.after && typeof change.after === 'object'
              ? { ...change.after }
              : {},
        })),
      });

      await kv.set(
        CONTENT_PUBLICATION_HISTORY_KEY,
        JSON.stringify(history)
      );
    }

    await kv.remove(
      PREPARED_CONTENT_PUBLICATION_KEY
    );

    return {
      ok: true,
      revision,
      already_confirmed: false,
      published_changes:
        currentItems.length - remainingItems.length,
      remaining_changes: remainingItems.length,
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

  /*
   * ADMFC — revisão administrativa.
   *
   * Revisar NÃO remove a correção da fila.
   * Apenas muda seu estado de pending -> reviewed.
   * A correção continuará preservada até a publicação.
   */
  markAdminChangeReviewed: async (changeId: string) => {
    requireAuth();

    const items = await loadAdminChanges();
    const item = items.find(current => current.id === changeId);

    if (!item) {
      throw new Error('Alteración administrativa no encontrada');
    }

    item.status = 'reviewed';
    item.reviewed_at = new Date().toISOString();

    await saveAdminChanges(items);

    return {
      ok: true,
      reviewed_id: changeId,
      status: item.status,
      reviewed_at: item.reviewed_at,
    };
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
   * ADMFC — backup administrativo completo.
   *
   * Preserva:
   * - base local;
   * - categorias;
   * - correções pendentes;
   * - histórico de publicações confirmadas;
   * - última revisão de conteúdo publicada.
   */
  exportBackup: async () => {
    requireAuth();

    const db = await loadDb();
    const adminChanges = await loadAdminChanges();

    const historyRaw = await kv.get(
      CONTENT_PUBLICATION_HISTORY_KEY
    );

    let publicationHistory: any[] = [];

    if (historyRaw) {
      try {
        const parsedHistory = JSON.parse(historyRaw);

        if (Array.isArray(parsedHistory)) {
          publicationHistory = parsedHistory;
        }
      } catch {
        publicationHistory = [];
      }
    }

    const revisionRaw = await kv.get(
      PUBLISHED_CONTENT_REVISION_KEY
    );

    const parsedRevision = Number(revisionRaw);

    const publishedContentRevision =
      Number.isInteger(parsedRevision) && parsedRevision >= 0
        ? parsedRevision
        : 0;

    return {
      schema_version: 'local-3',
      release: 'ADMFC_INDEPENDIENTE_1.0',
      total: db.hymns.length,
      himnos: db.hymns,
      categories: db.categories,
      admin_changes: adminChanges,
      publication_history: publicationHistory,
      published_content_revision: publishedContentRevision,
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
     * Backups local-2+ podem restaurar a fila administrativa.
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

    /*
     * ADMFC local-3 — estado de publicação.
     *
     * Em backups anteriores a local-3 esses campos não existem.
     * Nesse caso usamos estado vazio/zero, preservando
     * compatibilidade com os backups antigos.
     */
    const publicationHistory = Array.isArray(
      p.publication_history
    )
      ? p.publication_history
      : [];

    const parsedPublishedRevision = Number(
      p.published_content_revision
    );

    const publishedContentRevision =
      Number.isInteger(parsedPublishedRevision) &&
      parsedPublishedRevision >= 0
        ? parsedPublishedRevision
        : 0;

    await saveDb({
      hymns,
      categories,
    });

    await saveAdminChanges(adminChanges);

    await kv.set(
      CONTENT_PUBLICATION_HISTORY_KEY,
      JSON.stringify(publicationHistory)
    );

    await kv.set(
      PUBLISHED_CONTENT_REVISION_KEY,
      String(publishedContentRevision)
    );

    /*
     * Uma atualização apenas preparada não representa
     * conteúdo efetivamente publicado e não pertence ao backup.
     * Ao restaurar, removemos qualquer snapshot preparado
     * anteriormente no aparelho.
     */
    await kv.remove(
      PREPARED_CONTENT_PUBLICATION_KEY
    );

    return {
      restored_hymns: hymns.length,
      restored_categories: categories.length,
      restored_changes: adminChanges.length,
      restored_publications: publicationHistory.length,
      restored_revision: publishedContentRevision,
    };
  },
  // ADMFC 7AA.43: API legada de importação CSV/XLSX removida.
};

export interface Section { kind:'verse'|'chorus'; index?:number; text:string; }
export function getSections(hymn:{bloques?:Bloque[]|null;letra?:string}):Section[]{ if(hymn.bloques?.length) return hymn.bloques.map(b=>({kind:b.tipo==='coro'?'chorus':'verse',index:b.numero??undefined,text:b.texto||''})); return parseLetra(hymn.letra||''); }
export function parseLetra(letra:string):Section[]{ if(!letra)return[]; const lines=letra.replace(/\r\n/g,'\n').split('\n'); const out:Section[]=[]; let current:Section|null=null; const push=()=>{if(current&&current.text.trim())out.push(current);current=null}; for(const raw of lines){const line=raw.trimEnd(),trimmed=line.trim(),m=/^(\d+)\.?$/.exec(trimmed),chorus=/^\s*CORO\s*:?\s*$/i.test(trimmed); if(m){push();current={kind:'verse',index:parseInt(m[1],10),text:''};}else if(chorus){push();current={kind:'chorus',text:''};}else if(trimmed===''){if(current)current.text+='\n';}else{if(!current)current={kind:'verse',text:''};current.text+=(current.text?'\n':'')+line;}} push(); return out; }
