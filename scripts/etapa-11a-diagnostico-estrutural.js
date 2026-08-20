const fs = require('fs');
const crypto = require('crypto');

const BASE = 'assets/base_mestre.json';
const OUT_JSON =
  'scripts/data/etapa-11a-diagnostico-estrutural.json';
const OUT_TXT =
  'scripts/data/etapa-11a-diagnostico-estrutural.txt';

const HASH_OFICIAL =
  '214d87c16a3a1a18c9bd525c5474dff344fa78857762960084de51771262cbfb';

function sha256(path) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(path))
    .digest('hex');
}

function normalize(s = '') {
  return String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

function getHymns(root) {
  if (Array.isArray(root)) return root;
  if (Array.isArray(root.himnos)) return root.himnos;
  if (Array.isArray(root.hinos)) return root.hinos;

  const found = [];

  function walk(v) {
    if (!v || typeof v !== 'object') return;

    if (
      !Array.isArray(v) &&
      typeof v.id === 'string' &&
      (
        typeof v.letra === 'string' ||
        typeof v.lyrics === 'string'
      )
    ) {
      found.push(v);
    }

    for (const x of Object.values(v)) {
      if (x && typeof x === 'object') walk(x);
    }
  }

  walk(root);
  return found;
}

function textOf(h) {
  return String(h.letra ?? h.lyrics ?? '');
}

function titleOf(h) {
  return String(h.titulo ?? h.title ?? '');
}

function idOf(h) {
  return String(h.id ?? '');
}

function editionOf(h) {
  const id = idOf(h).toUpperCase();

  if (id.startsWith('GT-')) return 'GT';
  if (id.startsWith('SION-')) return 'SION';

  return String(
    h.hinario ??
    h.hymnal ??
    h.edicion ??
    h.edition ??
    ''
  ).toUpperCase();
}

function numberOf(h) {
  const id = idOf(h);
  const m = id.match(/(\d+)$/);

  if (m) return Number(m[1]);

  return Number(
    h.numero ??
    h.number ??
    h.n ??
    0
  );
}

function snippet(text, pos, radius = 180) {
  if (pos < 0) return '';

  const start = Math.max(0, pos - radius);
  const end = Math.min(text.length, pos + radius);

  return text
    .slice(start, end)
    .replace(/\n/g, ' | ');
}

const beforeHash = sha256(BASE);

console.log('============================================');
console.log(' AUDITORIA HINÁRIA - ETAPA 11A');
console.log(' DIAGNÓSTICO ESTRUTURAL DAS LETRAS');
console.log(' SOMENTE LEITURA');
console.log('============================================');
console.log();

console.log('============================================');
console.log(' 1. CONTROLE');
console.log('============================================');
console.log('HASH ATUAL:  ', beforeHash);
console.log('HASH OFICIAL:', HASH_OFICIAL);
console.log(
  'HASH:',
  beforeHash === HASH_OFICIAL ? 'OK' : 'DIVERGENTE'
);

if (beforeHash !== HASH_OFICIAL) {
  throw new Error(
    'ABORTADO: hash da Base Mestre diferente do hash oficial pós-10Q.'
  );
}

const root = JSON.parse(fs.readFileSync(BASE, 'utf8'));
const hymns = getHymns(root);

console.log('TOTAL DE HINOS:', hymns.length);

if (hymns.length !== 718) {
  throw new Error(
    `ABORTADO: esperado 718 hinos, encontrados ${hymns.length}.`
  );
}

const byId = new Map(
  hymns.map(h => [idOf(h).toUpperCase(), h])
);

const witnesses = [
  'GT-052',
  'GT-100',
  'GT-188'
];

console.log();
console.log('============================================');
console.log(' 2. CASOS-TESTEMUNHA');
console.log('============================================');

const witnessReport = [];

for (const id of witnesses) {
  const h = byId.get(id);
  if (!h) {
    console.log(id, '-> NÃO LOCALIZADO');
    continue;
  }

  const letra = textOf(h);

  const info = {
    id,
    titulo: titleOf(h),
    tamanho: letra.length,
    possuiMarcadorCoro:
      /\bCORO\b\s*:?/i.test(letra),
    ocorrenciasCoro:
      (letra.match(/\bCORO\b\s*:?/gi) || []).length,
    inicio: letra.slice(0, 600)
  };

  witnessReport.push(info);

  console.log();
  console.log(id, '|', info.titulo);
  console.log('TAMANHO:', info.tamanho);
  console.log(
    'MARCADOR CORO:',
    info.possuiMarcadorCoro ? 'SIM' : 'NÃO'
  );
  console.log(
    'OCORRÊNCIAS "CORO":',
    info.ocorrenciasCoro
  );
  console.log(
    'INÍCIO:',
    info.inicio.replace(/\n/g, ' | ')
  );
}

console.log();
console.log('============================================');
console.log(' 3. VARREDURA DE MARCADORES DE CORO');
console.log('============================================');

const chorusMarkers = [];

for (const h of hymns) {
  const letra = textOf(h);
  const matches = [...letra.matchAll(/\bCORO\b\s*:?/gi)];

  if (matches.length) {
    chorusMarkers.push({
      id: idOf(h),
      numero: numberOf(h),
      edicao: editionOf(h),
      titulo: titleOf(h),
      quantidade: matches.length
    });
  }
}

console.log(
  'HINOS COM MARCADOR EXPLÍCITO CORO:',
  chorusMarkers.length
);

const multipleChorusMarkers =
  chorusMarkers.filter(x => x.quantidade > 1);

console.log(
  'HINOS COM MAIS DE UM MARCADOR CORO:',
  multipleChorusMarkers.length
);

for (const x of multipleChorusMarkers.slice(0, 50)) {
  console.log(
    '-',
    x.id,
    '|',
    x.titulo,
    '| CORO x',
    x.quantidade
  );
}

console.log();
console.log('============================================');
console.log(' 4. FRAGMENTOS / LINHAS SUSPEITAS');
console.log('============================================');

const fragmentCandidates = [];

for (const h of hymns) {
  const letra = textOf(h);

  const lines = letra
    .split(/\r?\n/)
    .map(x => x.trim())
    .filter(Boolean);

  lines.forEach((line, index) => {
    const normalized = line.replace(/\s+/g, ' ');

    const isolatedLetter =
      /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]:?$/.test(normalized);

    const tinyFragment =
      normalized.length <= 3 &&
      !/^\d+[.)]?$/.test(normalized) &&
      !/^CORO:?$/i.test(normalized);

    const punctuationFragment =
      /^[,;:.!?]+$/.test(normalized);

    if (
      isolatedLetter ||
      tinyFragment ||
      punctuationFragment
    ) {
      fragmentCandidates.push({
        id: idOf(h),
        titulo: titleOf(h),
        linha: index + 1,
        texto: normalized,
        contexto: lines
          .slice(
            Math.max(0, index - 2),
            Math.min(lines.length, index + 3)
          )
          .join(' | ')
      });
    }
  });
}

console.log(
  'FRAGMENTOS SUSPEITOS ENCONTRADOS:',
  fragmentCandidates.length
);

for (const x of fragmentCandidates.slice(0, 80)) {
  console.log(
    '-',
    x.id,
    '|',
    x.titulo,
    '| linha',
    x.linha,
    '|',
    JSON.stringify(x.texto)
  );
  console.log('  ', x.contexto);
}

console.log();
console.log('============================================');
console.log(' 5. BLOCOS EXCESSIVAMENTE LONGOS');
console.log('============================================');

const longBlocks = [];

for (const h of hymns) {
  const letra = textOf(h);

  const blocks = letra
    .split(/\n\s*\n/)
    .map(x => x.trim())
    .filter(Boolean);

  blocks.forEach((block, index) => {
    const words = block
      .split(/\s+/)
      .filter(Boolean);

    if (words.length >= 90) {
      longBlocks.push({
        id: idOf(h),
        titulo: titleOf(h),
        bloco: index + 1,
        palavras: words.length,
        inicio: block.slice(0, 250)
      });
    }
  });
}

console.log(
  'BLOCOS >= 90 PALAVRAS:',
  longBlocks.length
);

for (const x of longBlocks.slice(0, 80)) {
  console.log(
    '-',
    x.id,
    '|',
    x.titulo,
    '| bloco',
    x.bloco,
    '|',
    x.palavras,
    'palavras'
  );
}

console.log();
console.log('============================================');
console.log(' 6. COMPARAÇÃO GT / SIÓN POR TÍTULO');
console.log('============================================');

const titleGroups = new Map();

for (const h of hymns) {
  const key = normalize(titleOf(h));
  if (!key) continue;

  if (!titleGroups.has(key)) {
    titleGroups.set(key, []);
  }

  titleGroups.get(key).push(h);
}

const pairDifferences = [];

for (const [key, group] of titleGroups.entries()) {
  const gt = group.filter(
    h => editionOf(h) === 'GT'
  );

  const sion = group.filter(
    h => editionOf(h) === 'SION'
  );

  if (!gt.length || !sion.length) continue;

  for (const a of gt) {
    for (const b of sion) {
      const ta = textOf(a);
      const tb = textOf(b);

      const coroA =
        /\bCORO\b\s*:?/i.test(ta);

      const coroB =
        /\bCORO\b\s*:?/i.test(tb);

      if (coroA !== coroB) {
        pairDifferences.push({
          tituloNormalizado: key,
          gt: idOf(a),
          gtTitulo: titleOf(a),
          gtCoro: coroA,
          sion: idOf(b),
          sionTitulo: titleOf(b),
          sionCoro: coroB
        });
      }
    }
  }
}

console.log(
  'PARES COM DIFERENÇA DE MARCADOR CORO:',
  pairDifferences.length
);

for (const x of pairDifferences.slice(0, 100)) {
  console.log(
    '-',
    x.gt,
    '<->',
    x.sion,
    '|',
    x.gtTitulo,
    '| GT CORO:',
    x.gtCoro ? 'SIM' : 'NÃO',
    '| SIÓN CORO:',
    x.sionCoro ? 'SIM' : 'NÃO'
  );
}

console.log();
console.log('============================================');
console.log(' 7. INVESTIGAÇÃO ESPECÍFICA GT-052');
console.log('============================================');

const gt52 = byId.get('GT-052');

if (gt52) {
  const letra = textOf(gt52);

  const needle = 'Es Cristo la Roca';
  const pos = letra.indexOf(needle);

  console.log('TÍTULO:', titleOf(gt52));
  console.log(
    'MARCADOR CORO:',
    /\bCORO\b\s*:?/i.test(letra)
      ? 'SIM'
      : 'NÃO'
  );
  console.log(
    `"${needle}" LOCALIZADO:`,
    pos >= 0 ? 'SIM' : 'NÃO'
  );
  console.log('CONTEXTO:');
  console.log(snippet(letra, pos, 350));
}

console.log();
console.log('============================================');
console.log(' 8. INVESTIGAÇÃO ESPECÍFICA GT-100');
console.log('============================================');

const gt100 = byId.get('GT-100');

if (gt100) {
  const letra = textOf(gt100);
  const pos = letra.search(/\bCORO\b\s*:?/i);

  console.log('TÍTULO:', titleOf(gt100));
  console.log(
    'MARCADOR CORO:',
    pos >= 0 ? 'SIM' : 'NÃO'
  );
  console.log('CONTEXTO:');
  console.log(snippet(letra, pos, 350));
}

console.log();
console.log('============================================');
console.log(' 9. INVESTIGAÇÃO ESPECÍFICA GT-188');
console.log('============================================');

const gt188 = byId.get('GT-188');

if (gt188) {
  const letra = textOf(gt188);

  const needles = [
    'Son sostén y',
    'guía',
    'a:'
  ];

  console.log('TÍTULO:', titleOf(gt188));
  console.log(
    'MARCADOR CORO:',
    /\bCORO\b\s*:?/i.test(letra)
      ? 'SIM'
      : 'NÃO'
  );

  for (const needle of needles) {
    const pos = letra.indexOf(needle);

    console.log(
      `"${needle}" LOCALIZADO:`,
      pos >= 0 ? 'SIM' : 'NÃO'
    );

    if (pos >= 0) {
      console.log(
        snippet(letra, pos, 250)
      );
    }
  }
}

const report = {
  etapa: '11A',
  hash: beforeHash,
  totalHinos: hymns.length,
  casosTestemunha: witnessReport,
  estatisticas: {
    hinosComMarcadorCoro:
      chorusMarkers.length,
    multiplosMarcadoresCoro:
      multipleChorusMarkers.length,
    fragmentosSuspeitos:
      fragmentCandidates.length,
    blocosLongos:
      longBlocks.length,
    paresComDiferencaDeCoro:
      pairDifferences.length
  },
  multiplosMarcadoresCoro:
    multipleChorusMarkers,
  fragmentosSuspeitos:
    fragmentCandidates,
  blocosLongos:
    longBlocks,
  paresComDiferencaDeCoro:
    pairDifferences
};

fs.mkdirSync('scripts/data', {
  recursive: true
});

fs.writeFileSync(
  OUT_JSON,
  JSON.stringify(report, null, 2)
);

const summary = [
  'AUDITORIA HINÁRIA - ETAPA 11A',
  '',
  `HASH: ${beforeHash}`,
  `TOTAL: ${hymns.length}`,
  `HINOS COM CORO: ${chorusMarkers.length}`,
  `MÚLTIPLOS COROS: ${multipleChorusMarkers.length}`,
  `FRAGMENTOS SUSPEITOS: ${fragmentCandidates.length}`,
  `BLOCOS LONGOS: ${longBlocks.length}`,
  `PARES GT/SIÓN COM DIFERENÇA DE CORO: ${pairDifferences.length}`,
  '',
  'BASE MESTRE ALTERADA: NÃO'
].join('\n');

fs.writeFileSync(
  OUT_TXT,
  summary + '\n'
);

const afterHash = sha256(BASE);

console.log();
console.log('============================================');
console.log(' 10. CONTROLE DE IMUTABILIDADE');
console.log('============================================');
console.log('HASH ANTES: ', beforeHash);
console.log('HASH DEPOIS:', afterHash);
console.log(
  'BASE ALTERADA:',
  beforeHash === afterHash ? 'NÃO' : 'SIM'
);

if (beforeHash !== afterHash) {
  throw new Error(
    'ERRO CRÍTICO: a Etapa 11A alterou a Base Mestre.'
  );
}

console.log();
console.log('============================================');
console.log(' ETAPA 11A CONCLUÍDA');
console.log(' DIAGNÓSTICO ESTRUTURAL GERADO');
console.log(' NENHUMA CORREÇÃO APLICADA');
console.log('============================================');
