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

const hashAntes = sha256(BASE);

console.log('============================================');
console.log(' 1. INTEGRIDADE DA BASE');
console.log('============================================');
console.log('HASH ATUAL:  ', hashAntes);
console.log('HASH OFICIAL:', HASH_OFICIAL);
console.log(
  'STATUS:',
  hashAntes === HASH_OFICIAL ? 'OK' : 'DIVERGENTE'
);

if (hashAntes !== HASH_OFICIAL) {
  throw new Error('Base Mestre inesperadamente alterada.');
}

const apiFile = 'src/lib/api.ts';

if (!fs.existsSync(apiFile)) {
  throw new Error('src/lib/api.ts não encontrado.');
}

const api = fs.readFileSync(apiFile, 'utf8');
const lines = api.split('\n');

console.log();
console.log('============================================');
console.log(' 2. CONSTANTES DE BANCO / VERSÃO');
console.log('============================================');

const constantPatterns = [
  /\bDB_KEY\b/,
  /\bDB_DATA_VERSION_KEY\b/,
  /\bDB_DATA_VERSION\b/
];

let foundConstants = false;

lines.forEach((line, i) => {
  if (constantPatterns.some(re => re.test(line))) {
    foundConstants = true;
    console.log(
      String(i + 1).padStart(4, '0'),
      '|',
      line
    );
  }
});

if (!foundConstants) {
  console.log('CONSTANTES NÃO LOCALIZADAS.');
}

console.log();
console.log('============================================');
console.log(' 3. BLOCO COMPLETO DE loadDb()');
console.log('============================================');

let loadStart = lines.findIndex(line =>
  /async\s+function\s+loadDb\s*\(/.test(line)
);

if (loadStart < 0) {
  console.log('loadDb() NÃO ENCONTRADO.');
} else {
  let depth = 0;
  let started = false;
  let loadEnd = loadStart;

  for (let i = loadStart; i < lines.length; i++) {
    const line = lines[i];

    for (const ch of line) {
      if (ch === '{') {
        depth++;
        started = true;
      } else if (ch === '}') {
        depth--;
      }
    }

    loadEnd = i;

    if (started && depth === 0) {
      break;
    }
  }

  for (let i = loadStart; i <= loadEnd; i++) {
    console.log(
      String(i + 1).padStart(4, '0'),
      '|',
      lines[i]
    );
  }
}

console.log();
console.log('============================================');
console.log(' 4. TODOS OS USOS DAS CHAVES');
console.log('============================================');

const keyTerms = [
  'DB_KEY',
  'DB_DATA_VERSION_KEY',
  'DB_DATA_VERSION'
];

for (const term of keyTerms) {
  console.log();
  console.log('---', term, '---');

  let count = 0;

  lines.forEach((line, i) => {
    if (line.includes(term)) {
      count++;
      console.log(
        String(i + 1).padStart(4, '0'),
        '|',
        line
      );
    }
  });

  console.log('OCORRÊNCIAS:', count);
}

console.log();
console.log('============================================');
console.log(' 5. OPERAÇÕES SOBRE O BANCO LOCAL');
console.log('============================================');

const dbOps =
  /kv\.(get|set|remove)|saveDb|loadDb|JSON\.parse|JSON\.stringify/;

lines.forEach((line, i) => {
  if (dbOps.test(line)) {
    console.log(
      String(i + 1).padStart(4, '0'),
      '|',
      line.trim()
    );
  }
});

console.log();
console.log('============================================');
console.log(' 6. RESTORE BACKUP E VERSIONAMENTO');
console.log('============================================');

const restoreIndex = lines.findIndex(line =>
  /restoreBackup\s*:/.test(line)
);

if (restoreIndex < 0) {
  console.log('restoreBackup NÃO ENCONTRADO.');
} else {
  const from = Math.max(0, restoreIndex - 5);
  const to = Math.min(
    lines.length - 1,
    restoreIndex + 15
  );

  for (let i = from; i <= to; i++) {
    console.log(
      String(i + 1).padStart(4, '0'),
      '|',
      lines[i]
    );
  }
}

console.log();
console.log('============================================');
console.log(' 7. HIPÓTESE TÉCNICA');
console.log('============================================');

console.log(
  'Se DB_DATA_VERSION permanece igual após mudanças'
);
console.log(
  'em assets/base_mestre.json, uma instalação que já'
);
console.log(
  'possua DB_KEY persistida pode continuar usando'
);
console.log(
  'db.hymns antigo em vez do seed atualizado.'
);

console.log();
console.log(
  'ESTA ETAPA NÃO CONFIRMA O CONTEÚDO DO ASYNCSTORAGE'
);
console.log(
  'DO APARELHO; ELA AUDITA A POLÍTICA DE SINCRONIZAÇÃO.'
);

console.log();
console.log('============================================');
console.log(' 8. CONTROLE DE IMUTABILIDADE');
console.log('============================================');

const hashDepois = sha256(BASE);

console.log('HASH ANTES: ', hashAntes);
console.log('HASH DEPOIS:', hashDepois);
console.log(
  'BASE ALTERADA:',
  hashAntes === hashDepois ? 'NÃO' : 'SIM'
);

if (hashAntes !== hashDepois) {
  throw new Error(
    'ERRO: diagnóstico alterou a Base Mestre.'
  );
}

console.log();
console.log('============================================');
console.log(' ETAPA 11E CONCLUÍDA');
console.log(' NENHUMA ALTERAÇÃO APLICADA');
console.log('============================================');
