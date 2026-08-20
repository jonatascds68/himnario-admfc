const fs = require('fs');
const crypto = require('crypto');

const BASE = 'assets/base_mestre.json';
const BACKUP = 'assets/base_mestre.bak-etapa-10p-gt041-gt042.json';
const TEMP = 'assets/base_mestre.tmp-etapa-10p.json';
const OUT_JSON = 'scripts/data/etapa-10p-correcao-gt041-gt042.json';

const HASH_ESPERADO =
  '8c6b5ae3d1dd4701a75602e2e9ff20ce13c4ce4c831f3d6a39e51e9affb80185';

function hashFile(file) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(file))
    .digest('hex');
}

function normalize(s) {
  return String(s || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

console.log('============================================');
console.log(' AUDITORIA HINÁRIA - ETAPA 10P');
console.log(' CORREÇÃO DOCUMENTAL GT-041 / GT-042');
console.log('============================================');

const hashAntes = hashFile(BASE);

console.log('\n1. PRÉ-CHECAGEM');
console.log('HASH ATUAL:   ', hashAntes);
console.log('HASH ESPERADO:', HASH_ESPERADO);

if (hashAntes !== HASH_ESPERADO) {
  throw new Error(
    'ABORTADO: hash da base diferente do esperado. Nenhuma alteração realizada.'
  );
}

const raw = fs.readFileSync(BASE, 'utf8');
const db = JSON.parse(raw);

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
    for (const v of Object.values(node)) collectHymns(v, out);
  }

  return out;
}

const hymns = collectHymns(db);

console.log('TOTAL DE HINOS:', hymns.length);

if (hymns.length !== 718) {
  throw new Error('ABORTADO: total de hinos diferente de 718.');
}

const gt41 = hymns.find(h => h.id === 'GT-041');
const gt42 = hymns.find(h => h.id === 'GT-042');

if (!gt41 || !gt42) {
  throw new Error('ABORTADO: GT-041 ou GT-042 não localizado.');
}

console.log('\n2. ESTADO ATUAL');
console.log('GT-041:', gt41.titulo || gt41.title);
console.log('LETRA GT-041:', JSON.stringify(gt41.letra));
console.log('GT-042:', gt42.titulo || gt42.title);
console.log('TAMANHO GT-042:', String(gt42.letra || '').length);

if (normalize(gt41.letra) !== '1') {
  throw new Error(
    'ABORTADO: GT-041 não contém somente o marcador "1".'
  );
}

const letra42 = String(gt42.letra || '');

/*
  FRONTEIRA DOCUMENTAL CONFIRMADA:

  A segunda versão legítima começa por:

  HAY UN PRECIOSO MANANTIAL
  1
  Hay un precioso manantial...

  Não usamos mais simplesmente a última ocorrência
  do título, pois isso produziu um corte incorreto.
*/

const fronteiraRegex =
  /HAY UN PRECIOSO MANANTIAL\s+1\s+Hay un precioso manantial/i;

const fronteiraMatch = fronteiraRegex.exec(letra42);

if (!fronteiraMatch) {
  throw new Error(
    'ABORTADO: fronteira exata GT-041/GT-042 não localizada.'
  );
}

const boundary = fronteiraMatch.index;

console.log(
  'FRONTEIRA DOCUMENTAL LOCALIZADA NO ÍNDICE:',
  boundary
);

const primeiraParte = letra42.slice(0, boundary).trim();

let segundaParte = letra42.slice(boundary).trim();

/*
  Removemos SOMENTE o cabeçalho editorial da segunda
  versão. O marcador "1" e o primeiro verso precisam
  permanecer.
*/

segundaParte = segundaParte
  .replace(/^HAY UN PRECIOSO MANANTIAL\s*/i, '')
  .trim();

if (!primeiraParte || !segundaParte) {
  throw new Error(
    'ABORTADO: não foi possível separar as duas versões.'
  );
}

/*
  Reconstrução do GT-041:
  o "1" já estava isolado no registro 41.
*/

const nova41 = `1\n${primeiraParte}`.trim();
const nova42 = segundaParte.trim();

console.log('\n3. SIMULAÇÃO DA SEPARAÇÃO');
console.log('GT-041 NOVO TAMANHO:', nova41.length);
console.log('GT-042 NOVO TAMANHO:', nova42.length);

console.log('\nINÍCIO GT-041:');
console.log(nova41.slice(0, 220));

console.log('\nINÍCIO GT-042:');
console.log(nova42.slice(0, 220));

/*
  Validações documentais fundamentais.
*/

if (!/CORO:/i.test(nova41)) {
  throw new Error(
    'ABORTADO: GT-041 reconstruído não contém CORO.'
  );
}

if (/CORO:/i.test(nova42)) {
  throw new Error(
    'ABORTADO: GT-042 reconstruído contém CORO inesperado.'
  );
}

if (!/Lávame,\s*Señor Jesús/i.test(nova41)) {
  throw new Error(
    'ABORTADO: coro documental não localizado no GT-041.'
  );
}

if (!/^1\b/.test(normalize(nova41))) {
  throw new Error(
    'ABORTADO: GT-041 não inicia corretamente na estrofe 1.'
  );
}

if (!/^1\b/.test(normalize(nova42))) {
  throw new Error(
    'ABORTADO: GT-042 não inicia corretamente na estrofe 1.'
  );
}

console.log('\n4. VALIDAÇÃO DOCUMENTAL');
console.log('GT-041 COM CORO: SIM');
console.log('GT-042 SEM CORO: SIM');
console.log('AMBOS INICIAM NA ESTROFE 1: SIM');
console.log('VALIDAÇÃO: OK');

/*
  Backup integral.
*/

fs.copyFileSync(BASE, BACKUP);

const hashBackup = hashFile(BACKUP);

if (hashBackup !== hashAntes) {
  throw new Error('ABORTADO: backup não corresponde à base original.');
}

console.log('\n5. BACKUP');
console.log('BACKUP:', BACKUP);
console.log('HASH BACKUP:', hashBackup);
console.log('BACKUP: ÍNTEGRO');

/*
  Aplicação somente após todas as validações.
*/

gt41.letra = nova41;
gt42.letra = nova42;

/*
  Preservamos título, número, id e demais metadados.
*/

const totalDepoisMemoria = collectHymns(db).length;

if (totalDepoisMemoria !== 718) {
  throw new Error(
    'ABORTADO: total de hinos mudou durante a correção.'
  );
}

console.log('\n6. APLICAÇÃO EM MEMÓRIA');
console.log('GT-041: RECONSTRUÍDO');
console.log('GT-042: SEPARADO');
console.log('TOTAL: 718 — PRESERVADO');

/*
  Escrita temporária.
*/

fs.writeFileSync(
  TEMP,
  JSON.stringify(db, null, 2) + '\n',
  'utf8'
);

JSON.parse(fs.readFileSync(TEMP, 'utf8'));

const hashTemp = hashFile(TEMP);

console.log('\n7. ARQUIVO TEMPORÁRIO');
console.log('TEMP:', TEMP);
console.log('HASH TEMP:', hashTemp);
console.log('JSON TEMPORÁRIO: VÁLIDO');

/*
  Escrita atômica.
*/

fs.renameSync(TEMP, BASE);

const hashDepois = hashFile(BASE);

console.log('\n8. ESCRITA ATÔMICA');
console.log('HASH ANTES: ', hashAntes);
console.log('HASH DEPOIS:', hashDepois);

/*
  Auditoria pós-gravação.
*/

const check = JSON.parse(fs.readFileSync(BASE, 'utf8'));
const checkHymns = collectHymns(check);

const c41 = checkHymns.find(h => h.id === 'GT-041');
const c42 = checkHymns.find(h => h.id === 'GT-042');

if (!c41 || !c42) {
  throw new Error('FALHA PÓS-GRAVAÇÃO: registros ausentes.');
}

if (!/CORO:/i.test(c41.letra)) {
  throw new Error('FALHA PÓS-GRAVAÇÃO: GT-041 sem coro.');
}

if (/CORO:/i.test(c42.letra)) {
  throw new Error('FALHA PÓS-GRAVAÇÃO: GT-042 recebeu coro.');
}

if (checkHymns.length !== 718) {
  throw new Error(
    'FALHA PÓS-GRAVAÇÃO: total diferente de 718.'
  );
}

console.log('\n9. AUDITORIA PÓS-GRAVAÇÃO');
console.log('GT-041 COM CORO: SIM');
console.log('GT-042 SEM CORO: SIM');
console.log('TOTAL DE HINOS:', checkHymns.length);
console.log('AUDITORIA: OK');

const report = {
  etapa: '10P',
  status: 'CONCLUIDA',
  evidencia: {
    tipo: 'documental_visual_e_fontes_independentes',
    decisao: 'GT-041 com coro; GT-042 sem coro'
  },
  gt041: {
    id: c41.id,
    titulo: c41.titulo || c41.title,
    possui_coro: /CORO:/i.test(c41.letra)
  },
  gt042: {
    id: c42.id,
    titulo: c42.titulo || c42.title,
    possui_coro: /CORO:/i.test(c42.letra)
  },
  total_hinos: checkHymns.length,
  hash_anterior: hashAntes,
  hash_novo: hashDepois,
  backup: BACKUP,
  hash_backup: hashBackup
};

fs.writeFileSync(
  OUT_JSON,
  JSON.stringify(report, null, 2) + '\n',
  'utf8'
);

console.log('\n============================================');
console.log(' ETAPA 10P CONCLUÍDA');
console.log(' GT-041: RESTAURADO COM CORO');
console.log(' GT-042: RESTAURADO SEM CORO');
console.log(' 718 HINOS PRESERVADOS');
console.log(' BACKUP PRESERVADO');
console.log(' NOVO HASH OFICIAL:', hashDepois);
console.log('============================================');
