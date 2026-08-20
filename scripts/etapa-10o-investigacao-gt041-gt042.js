const fs = require('fs');
const crypto = require('crypto');

const BASE = 'assets/base_mestre.json';

const OUT_JSON =
  'scripts/data/etapa-10o-investigacao-gt041-gt042.json';

const OUT_TXT =
  'scripts/data/etapa-10o-investigacao-gt041-gt042.txt';

const HASH_OFICIAL =
  '8c6b5ae3d1dd4701a75602e2e9ff20ce13c4ce4c831f3d6a39e51e9affb80185';

function sha256(file) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(file))
    .digest('hex');
}

function normalize(s = '') {
  return String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function getNumber(h) {
  return Number(
    h.numero ??
    h.number ??
    h.num ??
    h.n ??
    NaN
  );
}

function getTitle(h) {
  return String(
    h.titulo ??
    h.title ??
    ''
  );
}

function getLyrics(h) {
  return String(
    h.letra ??
    h.lyrics ??
    h.texto ??
    h.text ??
    ''
  );
}

function getId(h) {
  return String(
    h.id ??
    h.codigo ??
    h.code ??
    ''
  );
}

function collect(node, out = []) {
  if (!node || typeof node !== 'object') return out;

  if (Array.isArray(node)) {
    for (const item of node) collect(item, out);
    return out;
  }

  const numero = getNumber(node);
  const titulo = getTitle(node);

  if (
    Number.isFinite(numero) &&
    titulo
  ) {
    out.push(node);
  }

  for (const value of Object.values(node)) {
    if (value && typeof value === 'object') {
      collect(value, out);
    }
  }

  return out;
}

function estrutural(text) {
  const matches = [];

  const re =
    /(?:^|\s|\|)(\d{1,2})(?:[.)])?(?=\s|\||$)/g;

  let m;

  while ((m = re.exec(text)) !== null) {
    matches.push(Number(m[1]));
  }

  return matches;
}

function countExact(text, term) {
  if (!term) return 0;
  return text.split(term).length - 1;
}

function compact(text, max = 1200) {
  const s = String(text)
    .replace(/\s+/g, ' ')
    .trim();

  return s.length <= max
    ? s
    : s.slice(0, max) + ' ...';
}

const hashAntes = sha256(BASE);

console.log('============================================');
console.log(' AUDITORIA HINÁRIA - ETAPA 10O');
console.log(' INVESTIGAÇÃO FINAL GT-041 / GT-042');
console.log(' SOMENTE LEITURA');
console.log('============================================');
console.log();

console.log('============================================');
console.log(' 1. CONTROLE');
console.log('============================================');
console.log(`HASH ATUAL:   ${hashAntes}`);
console.log(`HASH OFICIAL: ${HASH_OFICIAL}`);

if (hashAntes !== HASH_OFICIAL) {
  console.error('ERRO: HASH DA BASE DIVERGIU.');
  process.exit(1);
}

console.log('HASH: OK');

const root =
  JSON.parse(fs.readFileSync(BASE, 'utf8'));

const hymns = collect(root);

console.log(`REGISTROS DETECTADOS: ${hymns.length}`);

if (hymns.length !== 718) {
  console.error(
    `ERRO: esperado 718 hinos; encontrado ${hymns.length}.`
  );
  process.exit(1);
}

console.log('TOTAL: OK (718)');
console.log();

function isGT(h) {
  const id = getId(h).toUpperCase();

  if (id.startsWith('GT-')) return true;

  const source = String(
    h.hinario ??
    h.hymnal ??
    h.colecao ??
    h.collection ??
    ''
  ).toUpperCase();

  return (
    source === 'GT' ||
    source.includes('GLORIA') ||
    source.includes('TRIUNFO')
  );
}

const gt = hymns.filter(isGT);

function findGT(numero) {
  return gt.find(h => getNumber(h) === numero);
}

const faixa = [];

for (let n = 39; n <= 44; n++) {
  const h = findGT(n);

  faixa.push({
    numero: n,
    localizado: !!h,
    id: h ? getId(h) : null,
    titulo: h ? getTitle(h) : null,
    letra: h ? getLyrics(h) : null
  });
}

console.log('============================================');
console.log(' 2. VIZINHANÇA GT-039 A GT-044');
console.log('============================================');

for (const h of faixa) {
  console.log(
    `GT-${String(h.numero).padStart(3, '0')} | ` +
    `${h.localizado ? h.titulo : 'NÃO LOCALIZADO'}`
  );

  if (h.localizado) {
    console.log(
      `  ID: ${h.id || '(sem id explícito)'}`
    );
    console.log(
      `  TAMANHO LETRA: ${h.letra.length}`
    );
    console.log(
      `  NÚMEROS: ${estrutural(h.letra).join(' -> ') || '(nenhum)'}`
    );
    console.log(
      `  INÍCIO: ${compact(h.letra, 260)}`
    );
  }

  console.log();
}

const h41 = findGT(41);
const h42 = findGT(42);

if (!h41 || !h42) {
  console.error(
    'ERRO: GT-041 ou GT-042 não localizado.'
  );
  process.exit(1);
}

const l41 = getLyrics(h41);
const l42 = getLyrics(h42);

const titulo41 = getTitle(h41);
const titulo42 = getTitle(h42);

console.log('============================================');
console.log(' 3. COMPARAÇÃO GT-041 / GT-042');
console.log('============================================');

console.log(`GT-041 TÍTULO: ${titulo41}`);
console.log(`GT-042 TÍTULO: ${titulo42}`);

console.log(
  `TÍTULOS NORMALIZADOS IGUAIS: ${
    normalize(titulo41) === normalize(titulo42)
      ? 'SIM'
      : 'NÃO'
  }`
);

console.log(`GT-041 LETRA: ${JSON.stringify(l41)}`);
console.log(`GT-042 TAMANHO: ${l42.length}`);
console.log();

const tituloInterno =
  countExact(
    normalize(l42),
    normalize(titulo42)
  );

console.log(
  `TÍTULO REPETIDO DENTRO DE GT-042: ${tituloInterno}`
);

console.log(
  `GT-041 É APENAS "1": ${
    l41.trim() === '1' ? 'SIM' : 'NÃO'
  }`
);

console.log(
  `GT-042 NÚMEROS: ${
    estrutural(l42).join(' -> ') || '(nenhum)'
  }`
);

console.log();

const normTitle = normalize(titulo42);
const normLyrics = normalize(l42);

const idxNorm =
  normLyrics.indexOf(normTitle);

console.log('============================================');
console.log(' 4. FRONTEIRA INTERNA DE GT-042');
console.log('============================================');

if (idxNorm >= 0) {
  console.log(
    'TÍTULO DO HINO LOCALIZADO NOVAMENTE NO CORPO.'
  );
} else {
  console.log(
    'TÍTULO INTERNO NÃO LOCALIZADO POR NORMALIZAÇÃO.'
  );
}

const rawUpper = l42.toUpperCase();
const titleUpper = titulo42.toUpperCase();

const rawIndex =
  rawUpper.indexOf(titleUpper);

let primeiraParte = null;
let segundaParte = null;

if (rawIndex >= 0) {
  primeiraParte =
    l42.slice(0, rawIndex).trim();

  segundaParte =
    l42.slice(rawIndex + titulo42.length).trim();

  console.log();
  console.log('--- PARTE ANTES DO TÍTULO INTERNO ---');
  console.log(primeiraParte);
  console.log();

  console.log('--- PARTE DEPOIS DO TÍTULO INTERNO ---');
  console.log(segundaParte);
  console.log();

  console.log(
    `NÚMEROS PRIMEIRA PARTE: ${
      estrutural(primeiraParte).join(' -> ') ||
      '(nenhum)'
    }`
  );

  console.log(
    `NÚMEROS SEGUNDA PARTE: ${
      estrutural(segundaParte).join(' -> ') ||
      '(nenhum)'
    }`
  );
} else {
  console.log(
    'Não foi possível dividir usando o título bruto.'
  );
}

console.log();

console.log('============================================');
console.log(' 5. COMPARAÇÃO DAS DUAS CÓPIAS');
console.log('============================================');

let semelhancaEstrutural = null;

if (primeiraParte && segundaParte) {
  const p1 = normalize(primeiraParte);
  const p2 = normalize(segundaParte);

  const palavras1 =
    p1.split(' ').filter(Boolean);

  const palavras2 =
    p2.split(' ').filter(Boolean);

  const set1 = new Set(palavras1);
  const set2 = new Set(palavras2);

  let comum = 0;

  for (const p of set1) {
    if (set2.has(p)) comum++;
  }

  const universo =
    new Set([...set1, ...set2]).size;

  semelhancaEstrutural =
    universo
      ? Math.round((comum / universo) * 100)
      : 0;

  console.log(
    `SIMILARIDADE VOCABULAR APROX.: ${semelhancaEstrutural}%`
  );

  console.log(
    `PARTE 1 COMEÇA COM ESTROFE 1 EXPLÍCITA: ${
      estrutural(primeiraParte)[0] === 1
        ? 'SIM'
        : 'NÃO'
    }`
  );

  console.log(
    `PARTE 2 COMEÇA COM ESTROFE 1 EXPLÍCITA: ${
      estrutural(segundaParte)[0] === 1
        ? 'SIM'
        : 'NÃO'
    }`
  );
}

console.log();

console.log('============================================');
console.log(' 6. DIAGNÓSTICO TÉCNICO');
console.log('============================================');

const diagnostico = {
  gt041_apenas_marcador_1:
    l41.trim() === '1',

  mesmo_titulo:
    normalize(titulo41) === normalize(titulo42),

  titulo_repetido_no_gt042:
    tituloInterno >= 1,

  sequencia_gt042:
    estrutural(l42),

  erro_segmentacao:
    l41.trim() === '1' &&
    normalize(titulo41) === normalize(titulo42) &&
    tituloInterno >= 1,

  numeracao_editorial_confirmada:
    false
};

console.log(
  `GT-041 APENAS MARCADOR: ${
    diagnostico.gt041_apenas_marcador_1
      ? 'SIM'
      : 'NÃO'
  }`
);

console.log(
  `MESMO TÍTULO: ${
    diagnostico.mesmo_titulo ? 'SIM' : 'NÃO'
  }`
);

console.log(
  `ERRO DE SEGMENTAÇÃO: ${
    diagnostico.erro_segmentacao
      ? 'FORTEMENTE CONFIRMADO'
      : 'NÃO CONFIRMADO'
  }`
);

console.log(
  'NUMERAÇÃO EDITORIAL CORRETA: AINDA NÃO CONFIRMADA'
);

console.log();

console.log('============================================');
console.log(' 7. O QUE PRECISAMOS DA FONTE');
console.log('============================================');

console.log(
  'Precisamos visualizar na edição original a região'
);

console.log(
  'onde aparecem os hinos nº 40, 41, 42 e 43.'
);

console.log();

console.log(
  'A evidência necessária é apenas:'
);

console.log(
  '1. título correspondente ao número 41;'
);

console.log(
  '2. título correspondente ao número 42;'
);

console.log(
  '3. início da letra de ambos, se possível.'
);

console.log();

console.log(
  'NÃO É NECESSÁRIO RECONSTRUIR NENHUM TEXTO'
);

console.log(
  'ANTES DESSA CONFIRMAÇÃO DOCUMENTAL.'
);

const relatorio = {
  etapa: '10O',
  hash: hashAntes,
  total_hinos: hymns.length,
  faixa_39_44: faixa.map(h => ({
    numero: h.numero,
    localizado: h.localizado,
    id: h.id,
    titulo: h.titulo,
    tamanho_letra:
      h.letra ? h.letra.length : null,
    numeros:
      h.letra ? estrutural(h.letra) : []
  })),
  gt041: {
    titulo: titulo41,
    letra: l41,
    apenas_marcador_1:
      l41.trim() === '1'
  },
  gt042: {
    titulo: titulo42,
    tamanho_letra: l42.length,
    numeros: estrutural(l42),
    titulo_interno:
      tituloInterno,
    primeira_parte: primeiraParte,
    segunda_parte: segundaParte,
    semelhanca_vocabular:
      semelhancaEstrutural
  },
  diagnostico,
  decisao:
    'AGUARDAR_FONTE_ORIGINAL',
  alteracao_base: false
};

fs.writeFileSync(
  OUT_JSON,
  JSON.stringify(relatorio, null, 2) + '\n',
  'utf8'
);

const resumo = `
============================================
 AUDITORIA HINÁRIA - ETAPA 10O
 INVESTIGAÇÃO FINAL GT-041 / GT-042
============================================

HASH:
${hashAntes}

TOTAL DE HINOS:
${hymns.length}

GT-041:
Título: ${titulo41}
Letra: ${JSON.stringify(l41)}

GT-042:
Título: ${titulo42}
Tamanho: ${l42.length}
Números: ${estrutural(l42).join(' -> ')}

DIAGNÓSTICO:
Erro de segmentação:
${diagnostico.erro_segmentacao
  ? 'FORTEMENTE CONFIRMADO'
  : 'NÃO CONFIRMADO'}

Numeração editorial correta:
NÃO CONFIRMADA

DECISÃO:
AGUARDAR COTEJO COM A EDIÇÃO ORIGINAL.

Precisamos confirmar visualmente quais títulos
correspondem aos números 41 e 42.

NENHUMA ALTERAÇÃO FOI REALIZADA NA BASE.
`;

fs.writeFileSync(
  OUT_TXT,
  resumo.trimStart(),
  'utf8'
);

const hashDepois = sha256(BASE);

console.log();
console.log('============================================');
console.log(' 8. CONTROLE DE IMUTABILIDADE');
console.log('============================================');
console.log(`HASH ANTES:  ${hashAntes}`);
console.log(`HASH DEPOIS: ${hashDepois}`);

if (hashAntes !== hashDepois) {
  console.error(
    'ERRO CRÍTICO: A BASE FOI ALTERADA.'
  );
  process.exit(1);
}

console.log('BASE ALTERADA PELA 10O: NÃO');
console.log();

console.log('============================================');
console.log(' ETAPA 10O CONCLUÍDA');
console.log(' GT-041/GT-042 INVESTIGADOS');
console.log(' NENHUMA ALTERAÇÃO NA BASE');
console.log(' AGUARDANDO EVIDÊNCIA DOCUMENTAL');
console.log('============================================');
