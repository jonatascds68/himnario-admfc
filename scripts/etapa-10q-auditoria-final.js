const fs = require('fs');
const crypto = require('crypto');

const BASE = 'assets/base_mestre.json';

const OUT_JSON =
  'scripts/data/etapa-10q-auditoria-final.json';

const OUT_TXT =
  'scripts/data/etapa-10q-auditoria-final.txt';

const HASH_OFICIAL =
  '214d87c16a3a1a18c9bd525c5474dff344fa78857762960084de51771262cbfb';

function hashFile(file) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(file))
    .digest('hex');
}

function collectHymns(node, out = []) {
  if (!node || typeof node !== 'object') return out;

  if (
    typeof node.id === 'string' &&
    /^(GT|SION)-\d+$/i.test(node.id)
  ) {
    out.push(node);
  }

  if (Array.isArray(node)) {
    for (const x of node) collectHymns(x, out);
  } else {
    for (const v of Object.values(node)) {
      collectHymns(v, out);
    }
  }

  return out;
}

function getTitle(h) {
  return h?.titulo || h?.title || '';
}

function text(h) {
  return String(h?.letra || '');
}

const log = [];

function out(...args) {
  const line = args.join(' ');
  console.log(line);
  log.push(line);
}

out('============================================');
out(' AUDITORIA HINÁRIA - ETAPA 10Q');
out(' AUDITORIA FINAL DE ENCERRAMENTO');
out(' SOMENTE LEITURA');
out('============================================');

const hashAntes = hashFile(BASE);

out('');
out('============================================');
out(' 1. CONTROLE DE INTEGRIDADE');
out('============================================');
out('HASH ATUAL:  ', hashAntes);
out('HASH OFICIAL:', HASH_OFICIAL);

if (hashAntes !== HASH_OFICIAL) {
  throw new Error(
    'ABORTADO: hash da Base Mestre não corresponde ao hash oficial pós-10P.'
  );
}

out('HASH: OK');

let db;

try {
  db = JSON.parse(fs.readFileSync(BASE, 'utf8'));
  out('JSON: VÁLIDO');
} catch (e) {
  throw new Error('ABORTADO: Base Mestre não é JSON válido.');
}

const hymns = collectHymns(db);

out('TOTAL DE HINOS:', hymns.length);

if (hymns.length !== 718) {
  throw new Error(
    `ABORTADO: esperado 718 hinos; encontrados ${hymns.length}.`
  );
}

out('TOTAL: OK (718)');

const ids = hymns.map(h => h.id);
const uniqueIds = new Set(ids);

out('');
out('============================================');
out(' 2. IDENTIFICADORES');
out('============================================');
out('IDS TOTAIS:', ids.length);
out('IDS ÚNICOS:', uniqueIds.size);

if (uniqueIds.size !== 718) {
  const seen = new Set();
  const dup = [];

  for (const id of ids) {
    if (seen.has(id)) dup.push(id);
    seen.add(id);
  }

  throw new Error(
    'ABORTADO: IDs duplicados: ' +
    [...new Set(dup)].join(', ')
  );
}

out('IDS DUPLICADOS: ZERO — OK');

function find(id) {
  return hymns.find(h => h.id === id);
}

function requireHymn(id) {
  const h = find(id);

  if (!h) {
    throw new Error(`ABORTADO: ${id} não localizado.`);
  }

  return h;
}

/*
 * ==========================================================
 * 3. GT-041 / GT-042
 * ==========================================================
 */

out('');
out('============================================');
out(' 3. VALIDAÇÃO DOCUMENTAL GT-041 / GT-042');
out('============================================');

const gt41 = requireHymn('GT-041');
const gt42 = requireHymn('GT-042');

const gt41Coro = /CORO:/i.test(text(gt41));
const gt42Coro = /CORO:/i.test(text(gt42));

const gt41Lavame =
  /Lávame,\s*Señor Jesús/i.test(text(gt41));

const gt42Lavame =
  /Lávame,\s*Señor Jesús/i.test(text(gt42));

const gt41Start =
  /^1(?:\s|$)/.test(text(gt41).trim());

const gt42Start =
  /^1(?:\s|$)/.test(text(gt42).trim());

out(
  'GT-041:',
  getTitle(gt41),
  '| CORO:',
  gt41Coro ? 'SIM' : 'NÃO'
);

out(
  'GT-042:',
  getTitle(gt42),
  '| CORO:',
  gt42Coro ? 'SIM' : 'NÃO'
);

out(
  'GT-041 contém "Lávame, Señor Jesús":',
  gt41Lavame ? 'SIM' : 'NÃO'
);

out(
  'GT-042 contém "Lávame, Señor Jesús":',
  gt42Lavame ? 'SIM' : 'NÃO'
);

out(
  'GT-041 inicia na estrofe 1:',
  gt41Start ? 'SIM' : 'NÃO'
);

out(
  'GT-042 inicia na estrofe 1:',
  gt42Start ? 'SIM' : 'NÃO'
);

if (
  !gt41Coro ||
  gt42Coro ||
  !gt41Lavame ||
  gt42Lavame ||
  !gt41Start ||
  !gt42Start
) {
  throw new Error(
    'ABORTADO: GT-041/GT-042 não correspondem à resolução documental da 10P.'
  );
}

out('GT-041 / GT-042: OK');

/*
 * ==========================================================
 * 4. GT-283
 * ==========================================================
 */

out('');
out('============================================');
out(' 4. VALIDAÇÃO DOCUMENTAL GT-283');
out('============================================');

const gt283 = requireHymn('GT-283');

const old283 =
  (text(gt283).match(/tierra mis Allí/g) || []).length;

const new283 =
  (text(gt283).match(/tierra más allá/gi) || []).length;

out('GT-283:', getTitle(gt283));
out('"tierra mis Allí":', old283);
out('"tierra más allá":', new283);

if (old283 !== 0 || new283 < 1) {
  throw new Error(
    'ABORTADO: correção documental de GT-283 não está íntegra.'
  );
}

out('GT-283: OK');

/*
 * ==========================================================
 * 5. RESÍDUOS DAS 14 CORREÇÕES DA 10H
 * ==========================================================
 */

out('');
out('============================================');
out(' 5. VARREDURA DOS RESÍDUOS HISTÓRICOS');
out('============================================');

const fullText = hymns
  .map(h => text(h))
  .join('\n');

const residues = [
  'oid, .',
  'serIe',
  'serás . De',
  'referirIa',
  'buen .Jesús',
  'hazIo',
  'tierra mis Allí'
];

let residueTotal = 0;

for (const r of residues) {
  const count = fullText.split(r).length - 1;
  residueTotal += count;
  out(JSON.stringify(r), '->', count);
}

out('TOTAL DE RESÍDUOS:', residueTotal);

if (residueTotal !== 0) {
  throw new Error(
    'ABORTADO: resíduos históricos ainda encontrados.'
  );
}

out('RESÍDUOS: ZERO — OK');

/*
 * ==========================================================
 * 6. FALSOS POSITIVOS GT-182 / SION-079
 * ==========================================================
 */

out('');
out('============================================');
out(' 6. FALSOS POSITIVOS RESOLVIDOS');
out('============================================');

const gt182 = requireHymn('GT-182');
const sion79 = requireHymn('SION-079');

function structuralNumbers(s) {
  const matches =
    String(s || '').match(
      /(?:^|\n|\|\s*)(\d+)(?:[.)])?(?=\s|$)/g
    ) || [];

  return matches
    .map(x => {
      const m = x.match(/\d+/);
      return m ? Number(m[0]) : null;
    })
    .filter(Number.isFinite);
}

const nums182 = structuralNumbers(text(gt182));
const nums79 = structuralNumbers(text(sion79));

out(
  'GT-182 SEQUÊNCIA:',
  nums182.join(' -> ') || '(não detectada)'
);

out(
  'SION-079 SEQUÊNCIA:',
  nums79.join(' -> ') || '(não detectada)'
);

const expected = '1,2,3,4,5';

if (
  nums182.join(',') !== expected ||
  nums79.join(',') !== expected
) {
  throw new Error(
    'ABORTADO: GT-182/SION-079 voltaram a apresentar anomalia estrutural.'
  );
}

out('GT-182: OK');
out('SION-079: OK');

/*
 * ==========================================================
 * 7. SANIDADE DOS REGISTROS
 * ==========================================================
 */

out('');
out('============================================');
out(' 7. SANIDADE GLOBAL DOS REGISTROS');
out('============================================');

const emptyTitles = hymns.filter(
  h => !getTitle(h).trim()
);

const emptyLyrics = hymns.filter(
  h => !text(h).trim()
);

out('TÍTULOS VAZIOS:', emptyTitles.length);
out('LETRAS VAZIAS:', emptyLyrics.length);

if (emptyTitles.length) {
  out(
    'IDS COM TÍTULO VAZIO:',
    emptyTitles.map(h => h.id).join(', ')
  );
}

if (emptyLyrics.length) {
  out(
    'IDS COM LETRA VAZIA:',
    emptyLyrics.map(h => h.id).join(', ')
  );
}

/*
 * Não abortamos automaticamente por letra vazia aqui,
 * porque esta etapa deve diagnosticar sem inventar
 * correções editoriais novas.
 */

/*
 * ==========================================================
 * 8. HASH FINAL
 * ==========================================================
 */

const hashDepois = hashFile(BASE);

out('');
out('============================================');
out(' 8. CONTROLE DE IMUTABILIDADE');
out('============================================');
out('HASH ANTES: ', hashAntes);
out('HASH DEPOIS:', hashDepois);

if (hashAntes !== hashDepois) {
  throw new Error(
    'FALHA CRÍTICA: a auditoria de leitura alterou a Base Mestre.'
  );
}

out('BASE ALTERADA PELA 10Q: NÃO');

/*
 * ==========================================================
 * 9. RESULTADO
 * ==========================================================
 */

const status =
  emptyTitles.length === 0 &&
  emptyLyrics.length === 0
    ? 'APROVADO'
    : 'APROVADO_COM_PENDENCIAS_DE_SANIDADE';

const report = {
  etapa: '10Q',
  tipo: 'AUDITORIA_FINAL_DE_ENCERRAMENTO',
  status,

  hash_oficial: HASH_OFICIAL,
  hash_final: hashDepois,

  total_hinos: hymns.length,
  ids_unicos: uniqueIds.size,

  gt041: {
    titulo: getTitle(gt41),
    possui_coro: gt41Coro,
    possui_lavame: gt41Lavame,
    inicia_estrofe_1: gt41Start
  },

  gt042: {
    titulo: getTitle(gt42),
    possui_coro: gt42Coro,
    possui_lavame: gt42Lavame,
    inicia_estrofe_1: gt42Start
  },

  gt283: {
    titulo: getTitle(gt283),
    texto_antigo: old283,
    texto_corrigido: new283
  },

  residuos_historicos: residueTotal,

  falsos_positivos: {
    GT_182: nums182,
    SION_079: nums79
  },

  sanidade: {
    titulos_vazios: emptyTitles.map(h => h.id),
    letras_vazias: emptyLyrics.map(h => h.id)
  },

  base_alterada: false
};

fs.writeFileSync(
  OUT_JSON,
  JSON.stringify(report, null, 2) + '\n',
  'utf8'
);

out('');
out('============================================');
out(' 9. RESULTADO FINAL');
out('============================================');
out('STATUS:', status);
out('718 HINOS:', hymns.length === 718 ? 'OK' : 'FALHA');
out('IDS ÚNICOS:', uniqueIds.size === 718 ? 'OK' : 'FALHA');
out('GT-041 / GT-042: OK');
out('GT-283: OK');
out('14 CORREÇÕES DA 10H: PRESERVADAS');
out('RESÍDUOS HISTÓRICOS: ZERO');
out('GT-182 / SION-079: OK');
out('HASH FINAL:', hashDepois);

out('');
out('============================================');
out(' ETAPA 10Q CONCLUÍDA');
out(' AUDITORIA FINAL EXECUTADA');
out(' BASE MESTRE NÃO ALTERADA');
out('============================================');

fs.writeFileSync(
  OUT_TXT,
  log.join('\n') + '\n',
  'utf8'
);
