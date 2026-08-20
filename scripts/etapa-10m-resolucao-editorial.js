const fs = require('fs');
const crypto = require('crypto');

const BASE = 'assets/base_mestre.json';

const OUT_JSON =
  'scripts/data/etapa-10m-resolucao-editorial.json';

const OUT_TXT =
  'scripts/data/etapa-10m-resolucao-editorial.txt';

const HASH_OFICIAL =
  '48cd4be20055aa9243a0a2223aef36376186dfd202f72ca4a4666015c44445a5';

function sha256(file) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(file))
    .digest('hex');
}

const hashAntes = sha256(BASE);

if (hashAntes !== HASH_OFICIAL) {
  console.error('ERRO: HASH DA BASE NÃO CONFERE.');
  console.error('ESPERADO:', HASH_OFICIAL);
  console.error('ATUAL:   ', hashAntes);
  process.exit(1);
}

const root = JSON.parse(fs.readFileSync(BASE, 'utf8'));

function collect(node, out = []) {
  if (!node || typeof node !== 'object') return out;

  if (
    typeof node.id === 'string' &&
    typeof node.titulo === 'string' &&
    Object.prototype.hasOwnProperty.call(node, 'letra')
  ) {
    out.push(node);
  }

  if (Array.isArray(node)) {
    for (const x of node) collect(x, out);
  } else {
    for (const v of Object.values(node)) collect(v, out);
  }

  return out;
}

const hymns = collect(root);

function get(id) {
  return hymns.find(h => h.id === id);
}

const gt040 = get('GT-040');
const gt041 = get('GT-041');
const gt042 = get('GT-042');
const gt043 = get('GT-043');
const gt283 = get('GT-283');

if (!gt040 || !gt041 || !gt042 || !gt043 || !gt283) {
  console.error('ERRO: registros necessários não encontrados.');
  process.exit(1);
}

function count(text, term) {
  if (typeof text !== 'string') return 0;
  return text.split(term).length - 1;
}

function norm(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

function numbers(text) {
  return String(text || '')
    .split(/\n/)
    .map(x => x.trim())
    .map(x => {
      const m = x.match(/^(\d+)[.)]?\s*$/);
      return m ? Number(m[1]) : null;
    })
    .filter(x => x !== null);
}

const title = 'HAY UN PRECIOSO MANANTIAL';

const titleOccurrences =
  count(gt042.letra, title);

const markerPosition =
  gt042.letra.indexOf('\n' + title + '\n');

let primeiraParte = null;
let segundaParte = null;

if (markerPosition >= 0) {
  primeiraParte =
    gt042.letra.slice(0, markerPosition).trim();

  segundaParte =
    gt042.letra
      .slice(markerPosition + title.length + 2)
      .trim();
}

const gt041OnlyMarker =
  String(gt041.letra || '').trim() === '1';

const sameTitle =
  norm(gt041.titulo) === norm(gt042.titulo);

const duplicateBoundaryDetected =
  markerPosition >= 0;

const firstNumbers =
  primeiraParte ? numbers(primeiraParte) : [];

const secondNumbers =
  segundaParte ? numbers(segundaParte) : [];

const structuralEvidence =
  gt041OnlyMarker &&
  sameTitle &&
  duplicateBoundaryDetected;

const resultado = {
  etapa: '10M',
  hash_oficial: HASH_OFICIAL,
  total_hinos: hymns.length,

  gt283: {
    id: gt283.id,
    numero: gt283.numero,
    titulo: gt283.titulo,
    termo: 'tierra mis Allí',
    ocorrencias:
      count(gt283.letra, 'tierra mis Allí'),

    decisao:
      'MANTER_COMO_ESTA',

    status_editorial:
      'PENDENTE_COTEJO_DOCUMENTAL',

    justificativa:
      'Não existe evidência documental independente suficiente para substituir o texto sem inferência.'
  },

  gt041_gt042: {
    gt041: {
      numero: gt041.numero,
      titulo: gt041.titulo,
      letra: gt041.letra,
      somente_marcador_1: gt041OnlyMarker
    },

    gt042: {
      numero: gt042.numero,
      titulo: gt042.titulo,
      tamanho: String(gt042.letra || '').length,
      titulo_interno_ocorrencias: titleOccurrences,
      fronteira_duplicacao_detectada:
        duplicateBoundaryDetected
    },

    mesmo_titulo: sameTitle,

    primeira_parte: primeiraParte,
    segunda_parte: segundaParte,

    numeros_primeira_parte: firstNumbers,
    numeros_segunda_parte: secondNumbers,

    evidencia_estrutural_suficiente:
      structuralEvidence,

    diagnostico:
      structuralEvidence
        ? 'ERRO_IMPORTACAO_SEGMENTACAO'
        : 'INCONCLUSIVO',

    decisao:
      'NÃO_CORRIGIR_AUTOMATICAMENTE',

    motivo:
      'A duplicação está comprovada, mas a numeração editorial 41/42 não deve ser reconstruída sem confirmação documental independente.'
  },

  vizinhanca: {
    anterior: {
      id: gt040.id,
      numero: gt040.numero,
      titulo: gt040.titulo
    },

    atual_a: {
      id: gt041.id,
      numero: gt041.numero,
      titulo: gt041.titulo
    },

    atual_b: {
      id: gt042.id,
      numero: gt042.numero,
      titulo: gt042.titulo
    },

    posterior: {
      id: gt043.id,
      numero: gt043.numero,
      titulo: gt043.titulo
    }
  },

  fechamento: {
    correcoes_10h_preservadas: 14,

    falsos_positivos_resolvidos: [
      'GT-182',
      'SION-079'
    ],

    pendencias_documentais: [
      'GT-283',
      'GT-041/GT-042'
    ],

    base_alterada: false,

    recomendacao:
      'Encerrar a auditoria automática na próxima etapa e registrar estes dois casos como pendências documentais explícitas.'
  }
};

let txt = '';

function line(s = '') {
  txt += s + '\n';
}

line('============================================');
line(' AUDITORIA HINÁRIA - ETAPA 10M');
line(' RESOLUÇÃO EDITORIAL DOS CASOS FINAIS');
line(' SOMENTE LEITURA');
line('============================================');
line();

line('============================================');
line(' 1. CONTROLE');
line('============================================');
line(`HASH ATUAL:   ${hashAntes}`);
line(`HASH OFICIAL: ${HASH_OFICIAL}`);
line('HASH: OK');
line(`TOTAL DE HINOS: ${hymns.length}`);
line();

line('============================================');
line(' 2. GT-283 — EN LA MAÑANA');
line('============================================');
line(
  `TERMO SUSPEITO: "tierra mis Allí"`
);
line(
  `OCORRÊNCIAS: ${resultado.gt283.ocorrencias}`
);
line();
line('DECISÃO EDITORIAL: MANTER COMO ESTÁ');
line(
  'STATUS: PENDENTE DE COTEJO DOCUMENTAL'
);
line();
line(
  'JUSTIFICATIVA: não existe evidência independente'
);
line(
  'suficiente para substituir o texto sem inferência.'
);
line();

line('============================================');
line(' 3. GT-041 / GT-042');
line('============================================');

line(`GT-041: ${gt041.titulo}`);
line(`LETRA: ${JSON.stringify(gt041.letra)}`);
line(
  `SOMENTE MARCADOR "1": ${
    gt041OnlyMarker ? 'SIM' : 'NÃO'
  }`
);
line();

line(`GT-042: ${gt042.titulo}`);
line(
  `TAMANHO: ${String(gt042.letra || '').length}`
);
line(
  `TÍTULO INTERNO: ${titleOccurrences} ocorrência(s)`
);
line(
  `FRONTEIRA DE DUPLICAÇÃO: ${
    duplicateBoundaryDetected ? 'DETECTADA' : 'NÃO'
  }`
);
line();

line(
  `MESMO TÍTULO GT-041/GT-042: ${
    sameTitle ? 'SIM' : 'NÃO'
  }`
);
line();

line('--------------------------------------------');
line(' PRIMEIRA PARTE DETECTADA');
line('--------------------------------------------');
line(primeiraParte || '[NÃO DETECTADA]');
line();
line(
  `NÚMEROS: ${
    firstNumbers.length
      ? firstNumbers.join(' -> ')
      : '[nenhum marcador isolado]'
  }`
);
line();

line('--------------------------------------------');
line(' SEGUNDA PARTE DETECTADA');
line('--------------------------------------------');
line(segundaParte || '[NÃO DETECTADA]');
line();
line(
  `NÚMEROS: ${
    secondNumbers.length
      ? secondNumbers.join(' -> ')
      : '[nenhum marcador isolado]'
  }`
);
line();

line(
  `EVIDÊNCIA ESTRUTURAL SUFICIENTE: ${
    structuralEvidence ? 'SIM' : 'NÃO'
  }`
);

line(
  `DIAGNÓSTICO: ${
    resultado.gt041_gt042.diagnostico
  }`
);

line();
line(
  'DECISÃO: NÃO CORRIGIR AUTOMATICAMENTE.'
);
line(
  'A falha de segmentação está demonstrada, mas a'
);
line(
  'numeração editorial correta ainda depende da fonte.'
);
line();

line('============================================');
line(' 4. VIZINHANÇA');
line('============================================');
line(
  `${gt040.id} | ${gt040.numero} | ${gt040.titulo}`
);
line(
  `${gt041.id} | ${gt041.numero} | ${gt041.titulo}`
);
line(
  `${gt042.id} | ${gt042.numero} | ${gt042.titulo}`
);
line(
  `${gt043.id} | ${gt043.numero} | ${gt043.titulo}`
);
line();

line('============================================');
line(' 5. BALANÇO DA AUDITORIA');
line('============================================');
line('14 CORREÇÕES SEGURAS: APLICADAS E VALIDADAS');
line('GT-182: FALSO POSITIVO RESOLVIDO');
line('SION-079: FALSO POSITIVO RESOLVIDO');
line('GT-283: PENDÊNCIA DOCUMENTAL');
line('GT-041/042: PENDÊNCIA DOCUMENTAL/ESTRUTURAL');
line();

line(
  'NENHUMA OUTRA CORREÇÃO AUTOMÁTICA É RECOMENDADA'
);
line(
  'PARA ESTES CASOS SEM CONSULTA À EDIÇÃO ORIGINAL.'
);
line();

line('============================================');
line(' 6. RECOMENDAÇÃO');
line('============================================');
line(
  'ENCERRAR A AUDITORIA AUTOMÁTICA NA ETAPA 10N.'
);
line(
  'OS DOIS CASOS RESTANTES DEVEM SER REGISTRADOS'
);
line(
  'COMO PENDÊNCIAS DOCUMENTAIS, NÃO COMO ERROS'
);
line(
  'CORRIGIDOS POR INFERÊNCIA.'
);
line();

const hashDepois = sha256(BASE);

line('============================================');
line(' 7. CONTROLE DE IMUTABILIDADE');
line('============================================');
line(`HASH ANTES:  ${hashAntes}`);
line(`HASH DEPOIS: ${hashDepois}`);
line(
  `BASE ALTERADA PELA 10M: ${
    hashAntes === hashDepois ? 'NÃO' : 'SIM'
  }`
);
line();

if (hashAntes !== hashDepois) {
  console.error(
    'ERRO CRÍTICO: A BASE FOI ALTERADA.'
  );
  process.exit(1);
}

fs.writeFileSync(
  OUT_JSON,
  JSON.stringify(resultado, null, 2) + '\n'
);

fs.writeFileSync(OUT_TXT, txt);

console.log(txt);

console.log('============================================');
console.log(' ETAPA 10M CONCLUÍDA');
console.log(' 14 CORREÇÕES PRESERVADAS');
console.log(' 2 FALSOS POSITIVOS RESOLVIDOS');
console.log(' 2 PENDÊNCIAS DOCUMENTAIS REGISTRADAS');
console.log(' NENHUMA ALTERAÇÃO NA BASE');
console.log('============================================');
