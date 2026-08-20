const fs = require('fs');
const crypto = require('crypto');

const BASE = 'assets/base_mestre.json';

const HASH_OFICIAL =
  '214d87c16a3a1a18c9bd525c5474dff344fa78857762960084de51771262cbfb';

function sha256(file) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(file))
    .digest('hex');
}

function getHymns(root) {
  if (Array.isArray(root)) return root;
  if (Array.isArray(root.himnos)) return root.himnos;
  if (Array.isArray(root.hinos)) return root.hinos;

  const out = [];

  function walk(v) {
    if (!v || typeof v !== 'object') return;

    if (
      !Array.isArray(v) &&
      typeof v.id === 'string' &&
      (
        typeof v.letra === 'string' ||
        Array.isArray(v.bloques)
      )
    ) {
      out.push(v);
    }

    for (const x of Object.values(v)) {
      if (x && typeof x === 'object') walk(x);
    }
  }

  walk(root);
  return out;
}

function parseLetra(letra) {
  if (!letra) return [];

  const lines = letra
    .replace(/\r\n/g, '\n')
    .split('\n');

  const out = [];
  let current = null;

  const push = () => {
    if (current && current.text.trim()) {
      out.push(current);
    }
    current = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    const m = /^(\d+)\.?$/.exec(trimmed);

    const chorus =
      /^\s*CORO\s*:?\s*$/i.test(trimmed);

    if (m) {
      push();

      current = {
        kind: 'verse',
        index: parseInt(m[1], 10),
        text: ''
      };
    } else if (chorus) {
      push();

      current = {
        kind: 'chorus',
        text: ''
      };
    } else if (trimmed === '') {
      if (current) current.text += '\n';
    } else {
      if (!current) {
        current = {
          kind: 'verse',
          text: ''
        };
      }

      current.text +=
        (current.text ? '\n' : '') + line;
    }
  }

  push();

  return out;
}

function fromBloques(hymn) {
  if (!Array.isArray(hymn.bloques)) return [];

  return hymn.bloques.map(b => ({
    kind:
      b.tipo === 'coro'
        ? 'chorus'
        : 'verse',

    index:
      b.numero != null
        ? b.numero
        : undefined,

    text:
      b.texto || ''
  }));
}

function effectiveSections(hymn) {
  if (
    Array.isArray(hymn.bloques) &&
    hymn.bloques.length
  ) {
    return fromBloques(hymn);
  }

  return parseLetra(hymn.letra || '');
}

function describeSection(s, i) {
  const type =
    s.kind === 'chorus'
      ? 'CORO'
      : `ESTROFA ${s.index ?? '?'}`;

  const preview = String(s.text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 150);

  return `${i + 1}. ${type} | ${preview}`;
}

const hashBefore = sha256(BASE);

console.log('============================================');
console.log(' 1. INTEGRIDADE');
console.log('============================================');

console.log('HASH ATUAL:  ', hashBefore);
console.log('HASH OFICIAL:', HASH_OFICIAL);

if (hashBefore !== HASH_OFICIAL) {
  throw new Error(
    'ABORTADO: hash da base inesperado.'
  );
}

const root =
  JSON.parse(fs.readFileSync(BASE, 'utf8'));

const hymns = getHymns(root);

console.log('TOTAL:', hymns.length);

if (hymns.length !== 718) {
  throw new Error(
    `ABORTADO: esperados 718; encontrados ${hymns.length}.`
  );
}

const map = new Map(
  hymns.map(h => [
    String(h.id).toUpperCase(),
    h
  ])
);

const ids = [
  'GT-052',
  'GT-100',
  'GT-188'
];

console.log();
console.log('============================================');
console.log(' 2. COMPARAÇÃO INDIVIDUAL');
console.log('============================================');

for (const id of ids) {
  const h = map.get(id);

  console.log();
  console.log('############################################');
  console.log(id, '|', h?.titulo || 'NÃO LOCALIZADO');
  console.log('############################################');

  if (!h) continue;

  const letraSections =
    parseLetra(h.letra || '');

  const blockSections =
    fromBloques(h);

  const effective =
    effectiveSections(h);

  console.log();
  console.log(
    'TEM BLOCOS:',
    Array.isArray(h.bloques)
      ? `SIM (${h.bloques.length})`
      : 'NÃO'
  );

  console.log(
    'GETSECTIONS USARIA:',
    Array.isArray(h.bloques) &&
    h.bloques.length
      ? 'BLOCOS'
      : 'LETRA'
  );

  console.log();
  console.log('--- SEÇÕES GERADAS DA LETRA ---');

  letraSections.forEach((s, i) => {
    console.log(describeSection(s, i));
  });

  console.log();
  console.log('--- BLOCOS SALVOS NA BASE ---');

  if (!blockSections.length) {
    console.log('(nenhum)');
  } else {
    blockSections.forEach((s, i) => {
      console.log(describeSection(s, i));
    });
  }

  console.log();
  console.log('--- SEÇÕES EFETIVAMENTE USADAS ---');

  effective.forEach((s, i) => {
    console.log(describeSection(s, i));
  });

  console.log();
  console.log('--- DIAGNÓSTICO ---');

  const letraHasChorus =
    letraSections.some(
      s => s.kind === 'chorus'
    );

  const bloquesHasChorus =
    blockSections.some(
      s => s.kind === 'chorus'
    );

  const effectiveHasChorus =
    effective.some(
      s => s.kind === 'chorus'
    );

  console.log(
    'LETRA TEM CORO:',
    letraHasChorus ? 'SIM' : 'NÃO'
  );

  console.log(
    'BLOCOS TÊM CORO:',
    bloquesHasChorus ? 'SIM' : 'NÃO'
  );

  console.log(
    'RESULTADO EFETIVO TEM CORO:',
    effectiveHasChorus ? 'SIM' : 'NÃO'
  );

  if (
    letraHasChorus &&
    !effectiveHasChorus
  ) {
    console.log(
      '>>> CAUSA DA PERDA DO CORO CONFIRMADA.'
    );
    console.log(
      '>>> BLOCOS ESTÃO SOBREpondo A LETRA CORRETA.'
    );
  }

  if (
    letraHasChorus &&
    bloquesHasChorus
  ) {
    console.log(
      '>>> CORO EXISTE TANTO NA LETRA COMO NOS BLOCOS.'
    );
    console.log(
      '>>> INVESTIGAR CONTEÚDO/FRONTEIRA DOS BLOCOS.'
    );
  }
}

console.log();
console.log('============================================');
console.log(' 3. AUDITORIA GLOBAL DE BLOCOS');
console.log('============================================');

let withBlocks = 0;
let withoutBlocks = 0;
let disagreement = 0;

const problems = [];

for (const h of hymns) {
  const hasBlocks =
    Array.isArray(h.bloques) &&
    h.bloques.length > 0;

  if (hasBlocks) {
    withBlocks++;
  } else {
    withoutBlocks++;
  }

  const fromText =
    parseLetra(h.letra || '');

  const fromSavedBlocks =
    fromBloques(h);

  if (!hasBlocks) continue;

  const textChorus =
    fromText.some(
      s => s.kind === 'chorus'
    );

  const blockChorus =
    fromSavedBlocks.some(
      s => s.kind === 'chorus'
    );

  if (textChorus !== blockChorus) {
    disagreement++;

    problems.push({
      id: h.id,
      titulo: h.titulo,
      letraCoro: textChorus,
      bloquesCoro: blockChorus,
      bloques: h.bloques.length
    });
  }
}

console.log(
  'HINOS COM BLOCOS:',
  withBlocks
);

console.log(
  'HINOS SEM BLOCOS:',
  withoutBlocks
);

console.log(
  'DIVERGÊNCIA LETRA/BLOCOS SOBRE CORO:',
  disagreement
);

if (problems.length) {
  console.log();
  console.log(
    'PRIMEIRAS DIVERGÊNCIAS:'
  );

  problems
    .slice(0, 50)
    .forEach(p => {
      console.log(
        `- ${p.id} | ${p.titulo} | ` +
        `LETRA CORO: ${p.letraCoro ? 'SIM' : 'NÃO'} | ` +
        `BLOCOS CORO: ${p.bloquesCoro ? 'SIM' : 'NÃO'} | ` +
        `BLOCOS: ${p.bloques}`
      );
    });
}

console.log();
console.log('============================================');
console.log(' 4. VERIFICAÇÃO DO CÓDIGO ATUAL');
console.log('============================================');

const apiFile = 'src/lib/api.ts';

const apiSource =
  fs.readFileSync(apiFile, 'utf8');

const priorityPattern =
  /if\s*\(\s*hymn\.bloques\?\.length\s*\)/;

console.log(
  'GETSECTIONS PRIORIZA BLOCOS:',
  priorityPattern.test(apiSource)
    ? 'SIM'
    : 'NÃO / VERIFICAR MANUALMENTE'
);

console.log();
console.log('============================================');
console.log(' 5. CONTROLE DE IMUTABILIDADE');
console.log('============================================');

const hashAfter = sha256(BASE);

console.log('HASH ANTES: ', hashBefore);
console.log('HASH DEPOIS:', hashAfter);

console.log(
  'BASE ALTERADA:',
  hashBefore === hashAfter
    ? 'NÃO'
    : 'SIM'
);

if (hashBefore !== hashAfter) {
  throw new Error(
    'ERRO: auditoria alterou a base.'
  );
}

console.log();
console.log('============================================');
console.log(' ETAPA 11C CONCLUÍDA');
console.log(' SOMENTE DIAGNÓSTICO');
console.log('============================================');
