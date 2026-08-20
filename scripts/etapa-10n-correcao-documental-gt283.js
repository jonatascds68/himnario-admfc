const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const BASE = 'assets/base_mestre.json';

const BACKUP =
  'assets/base_mestre.bak-etapa-10n-gt283.json';

const OUT_JSON =
  'scripts/data/etapa-10n-correcao-documental-gt283.json';

const OUT_TXT =
  'scripts/data/etapa-10n-correcao-documental-gt283.txt';

const TEMP =
  'assets/base_mestre.tmp-etapa-10n.json';

const HASH_ESPERADO =
  '48cd4be20055aa9243a0a2223aef36376186dfd202f72ca4a4666015c44445a5';

const ATUAL =
  'tierra mis Allí';

const CORRETO =
  'tierra más allá';

function hashFile(file) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(file))
    .digest('hex');
}

function walk(obj, callback, caminho = 'root') {
  if (Array.isArray(obj)) {
    obj.forEach((item, i) =>
      walk(item, callback, `${caminho}[${i}]`)
    );
    return;
  }

  if (obj && typeof obj === 'object') {
    callback(obj, caminho);

    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === 'object') {
        walk(value, callback, `${caminho}.${key}`);
      }
    }
  }
}

function identificar(obj) {
  const hinario = String(
    obj.hinario ??
    obj.hymnal ??
    obj.colecao ??
    obj.collection ??
    ''
  ).toUpperCase();

  const numero = Number(
    obj.numero ??
    obj.number ??
    obj.num ??
    obj.n ??
    NaN
  );

  if (
    (hinario.includes('GLORIA') ||
     hinario === 'GT' ||
     hinario.includes('TRIUNFO')) &&
    numero === 283
  ) {
    return true;
  }

  const id = String(
    obj.id ??
    obj.codigo ??
    obj.code ??
    ''
  ).toUpperCase();

  return (
    id === 'GT-283' ||
    id === 'GT283' ||
    id === 'GT_283'
  );
}

function contarRegistros(obj) {
  let total = 0;

  walk(obj, item => {
    const numero =
      item.numero ??
      item.number ??
      item.num;

    const titulo =
      item.titulo ??
      item.title;

    if (
      numero !== undefined &&
      titulo !== undefined
    ) {
      total++;
    }
  });

  return total;
}

function contarTexto(obj, termo) {
  let total = 0;

  walk(obj, item => {
    for (const value of Object.values(item)) {
      if (typeof value !== 'string') continue;

      let pos = 0;

      while (true) {
        const idx = value.indexOf(termo, pos);
        if (idx === -1) break;

        total++;
        pos = idx + termo.length;
      }
    }
  });

  return total;
}

const log = [];

function out(text = '') {
  console.log(text);
  log.push(text);
}

out('============================================');
out(' AUDITORIA HINÁRIA - ETAPA 10N');
out(' CORREÇÃO DOCUMENTAL GT-283');
out(' EVIDÊNCIA VISUAL CONFIRMADA');
out('============================================');
out();

if (!fs.existsSync(BASE)) {
  throw new Error(`Base não encontrada: ${BASE}`);
}

const hashAntes = hashFile(BASE);

out('============================================');
out(' 1. PRÉ-CHECAGEM');
out('============================================');
out(`HASH ATUAL:    ${hashAntes}`);
out(`HASH ESPERADO: ${HASH_ESPERADO}`);

if (hashAntes !== HASH_ESPERADO) {
  throw new Error(
    'HASH DIVERGENTE. OPERAÇÃO CANCELADA.'
  );
}

out('HASH INICIAL: OK');
out();

const rawOriginal = fs.readFileSync(BASE, 'utf8');

let data;

try {
  data = JSON.parse(rawOriginal);
} catch {
  throw new Error('BASE MESTRE NÃO É JSON VÁLIDO.');
}

const totalAntes = contarRegistros(data);

out(`REGISTROS HINÁRIOS DETECTADOS: ${totalAntes}`);

if (totalAntes !== 718) {
  throw new Error(
    `TOTAL INESPERADO DE HINOS: ${totalAntes}`
  );
}

out('TOTAL DE HINOS: OK (718)');
out();

let gt283 = null;
let gt283Path = null;

walk(data, (obj, caminho) => {
  if (!gt283 && identificar(obj)) {
    gt283 = obj;
    gt283Path = caminho;
  }
});

if (!gt283) {
  throw new Error(
    'GT-283 NÃO FOI LOCALIZADO. OPERAÇÃO CANCELADA.'
  );
}

out('============================================');
out(' 2. REGISTRO ALVO');
out('============================================');
out(`CAMINHO: ${gt283Path}`);
out(
  `TÍTULO: ${
    gt283.titulo ??
    gt283.title ??
    'EN LA MAÑANA'
  }`
);
out('REGISTRO: LOCALIZADO');
out();

let ocorrenciasNoRegistro = 0;
let camposAlvo = [];

for (const [key, value] of Object.entries(gt283)) {
  if (typeof value !== 'string') continue;

  const count =
    value.split(ATUAL).length - 1;

  if (count > 0) {
    ocorrenciasNoRegistro += count;
    camposAlvo.push({
      campo: key,
      ocorrencias: count
    });
  }
}

out('============================================');
out(' 3. VALIDAÇÃO DOCUMENTAL');
out('============================================');
out('FONTE: evidência visual independente');
out('HINO: GT-283 — EN LA MAÑANA');
out(`TEXTO ATUAL:   "${ATUAL}"`);
out(`TEXTO CORRETO: "${CORRETO}"`);
out(
  `OCORRÊNCIAS NO GT-283: ${ocorrenciasNoRegistro}`
);

if (ocorrenciasNoRegistro !== 1) {
  throw new Error(
    'A CORREÇÃO NÃO POSSUI EXATAMENTE 1 OCORRÊNCIA NO GT-283.'
  );
}

out(
  `CAMPO: ${camposAlvo.map(x => x.campo).join(', ')}`
);
out('VALIDAÇÃO: OK');
out();

const ocorrenciasGlobais =
  contarTexto(data, ATUAL);

out(
  `OCORRÊNCIAS GLOBAIS DO TEXTO ANTIGO: ${ocorrenciasGlobais}`
);

if (ocorrenciasGlobais !== 1) {
  throw new Error(
    'O TEXTO ANTIGO APARECE FORA DO ESCOPO ESPERADO.'
  );
}

out('ESCOPO GLOBAL: OK');
out();

out('============================================');
out(' 4. BACKUP');
out('============================================');

fs.copyFileSync(BASE, BACKUP);

const hashBackup = hashFile(BACKUP);

out(`BACKUP: ${BACKUP}`);
out(`HASH BACKUP: ${hashBackup}`);

if (hashBackup !== hashAntes) {
  throw new Error(
    'BACKUP NÃO É IDÊNTICO À BASE ORIGINAL.'
  );
}

out('BACKUP: ÍNTEGRO');
out();

out('============================================');
out(' 5. APLICAÇÃO EM MEMÓRIA');
out('============================================');

let substituicoes = 0;

for (const [key, value] of Object.entries(gt283)) {
  if (typeof value !== 'string') continue;

  const count =
    value.split(ATUAL).length - 1;

  if (count === 0) continue;

  gt283[key] = value.split(ATUAL).join(CORRETO);
  substituicoes += count;

  out(
    `${key}: "${ATUAL}" -> "${CORRETO}" | ${count} substituição`
  );
}

if (substituicoes !== 1) {
  throw new Error(
    `NÚMERO INESPERADO DE SUBSTITUIÇÕES: ${substituicoes}`
  );
}

out('APLICAÇÃO EM MEMÓRIA: OK');
out();

const antigoRestante =
  contarTexto(data, ATUAL);

if (antigoRestante !== 0) {
  throw new Error(
    'TEXTO ANTIGO AINDA PRESENTE APÓS A CORREÇÃO.'
  );
}

const totalDepoisMemoria =
  contarRegistros(data);

if (totalDepoisMemoria !== 718) {
  throw new Error(
    'QUANTIDADE DE HINOS FOI ALTERADA EM MEMÓRIA.'
  );
}

out();
out('PÓS-VALIDAÇÃO EM MEMÓRIA: OK');
out('TOTAL DE HINOS: 718');
out();

out('============================================');
out(' 6. PROTEÇÃO DOS CASOS BLOQUEADOS');
out('============================================');

let gt041 = null;
let gt042 = null;

walk(data, obj => {
  const numero = Number(
    obj.numero ??
    obj.number ??
    obj.num ??
    NaN
  );

  const titulo = String(
    obj.titulo ??
    obj.title ??
    ''
  ).toUpperCase();

  if (
    titulo.includes('HAY UN PRECIOSO MANANTIAL')
  ) {
    if (numero === 41) gt041 = obj;
    if (numero === 42) gt042 = obj;
  }
});

out(`GT-041 PRESENTE: ${gt041 ? 'SIM' : 'NÃO'}`);
out(`GT-042 PRESENTE: ${gt042 ? 'SIM' : 'NÃO'}`);
out('GT-041/GT-042: NENHUMA CORREÇÃO APLICADA');
out('STATUS: CONTINUAM BLOQUEADOS DOCUMENTALMENTE');
out();

out('============================================');
out(' 7. ARQUIVO TEMPORÁRIO');
out('============================================');

const novoJson =
  JSON.stringify(data, null, 2) + '\n';

fs.writeFileSync(TEMP, novoJson, 'utf8');

try {
  JSON.parse(fs.readFileSync(TEMP, 'utf8'));
} catch {
  fs.unlinkSync(TEMP);
  throw new Error(
    'ARQUIVO TEMPORÁRIO GERADO É INVÁLIDO.'
  );
}

const hashTemp = hashFile(TEMP);

out(`TEMP: ${TEMP}`);
out(`HASH TEMP: ${hashTemp}`);
out('JSON TEMPORÁRIO: VÁLIDO');
out();

out('============================================');
out(' 8. ESCRITA ATÔMICA');
out('============================================');

fs.renameSync(TEMP, BASE);

const hashDepois = hashFile(BASE);

out('BASE MESTRE: SUBSTITUÍDA PELO TEMPORÁRIO');
out(`HASH ANTES:  ${hashAntes}`);
out(`HASH DEPOIS: ${hashDepois}`);

if (hashDepois === hashAntes) {
  throw new Error(
    'HASH NÃO MUDOU APÓS A CORREÇÃO.'
  );
}

out();

const dataFinal =
  JSON.parse(fs.readFileSync(BASE, 'utf8'));

const totalFinal =
  contarRegistros(dataFinal);

const antigoFinal =
  contarTexto(dataFinal, ATUAL);

const corretoFinal =
  contarTexto(dataFinal, CORRETO);

out('============================================');
out(' 9. AUDITORIA PÓS-GRAVAÇÃO');
out('============================================');
out(`TOTAL DE HINOS: ${totalFinal}`);
out(`"${ATUAL}" -> ${antigoFinal}`);
out(`"${CORRETO}" -> ${corretoFinal}`);

if (totalFinal !== 718) {
  throw new Error(
    'AUDITORIA FINAL: TOTAL DE HINOS INCORRETO.'
  );
}

if (antigoFinal !== 0) {
  throw new Error(
    'AUDITORIA FINAL: TEXTO ANTIGO AINDA EXISTE.'
  );
}

if (corretoFinal < 1) {
  throw new Error(
    'AUDITORIA FINAL: TEXTO CORRETO NÃO FOI ENCONTRADO.'
  );
}

out('AUDITORIA PÓS-GRAVAÇÃO: OK');
out();

const resultado = {
  etapa: '10N',
  tipo: 'CORRECAO_DOCUMENTAL_CONFIRMADA',
  alvo: 'GT-283',
  titulo: 'EN LA MAÑANA',
  evidencia: 'visual_independente',
  alteracao: {
    antes: ATUAL,
    depois: CORRETO,
    substituicoes
  },
  total_hinos: totalFinal,
  gt041_gt042_alterados: false,
  hash_anterior: hashAntes,
  hash_novo: hashDepois,
  backup: BACKUP,
  hash_backup: hashBackup,
  status: 'APROVADO'
};

fs.writeFileSync(
  OUT_JSON,
  JSON.stringify(resultado, null, 2) + '\n',
  'utf8'
);

out('============================================');
out(' 10. RESULTADO FINAL');
out('============================================');
out('GT-283: CORRIGIDO DOCUMENTALMENTE');
out(`ANTES:  "${ATUAL}"`);
out(`DEPOIS: "${CORRETO}"`);
out('CORREÇÕES APLICADAS: 1');
out('TOTAL DE HINOS: 718 — PRESERVADO');
out('GT-041/GT-042: NÃO ALTERADOS');
out('GT-041/GT-042: CONTINUAM PENDENTES');
out(`BACKUP: ${BACKUP}`);
out(`NOVO HASH OFICIAL: ${hashDepois}`);
out();

out('============================================');
out(' ETAPA 10N CONCLUÍDA COM SUCESSO');
out(' GT-283 RESOLVIDO');
out(' 1 CORREÇÃO DOCUMENTAL APLICADA');
out(' GT-041/GT-042 PRESERVADOS');
out('============================================');

fs.writeFileSync(
  OUT_TXT,
  log.join('\n') + '\n',
  'utf8'
);
