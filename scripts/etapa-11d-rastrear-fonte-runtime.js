const fs = require('fs');
const path = require('path');
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

console.log('============================================');
console.log(' 1. BASE MESTRE');
console.log('============================================');

const hash = sha256(BASE);

console.log('ARQUIVO:', BASE);
console.log('HASH:', hash);
console.log(
  'HASH OFICIAL:',
  hash === HASH_OFICIAL ? 'OK' : 'DIVERGENTE'
);

if (hash !== HASH_OFICIAL) {
  throw new Error('Hash inesperado da Base Mestre.');
}

const IGNORE = new Set([
  'node_modules',
  '.git',
  '.expo',
  'dist',
  'build',
  '.next',
  'coverage'
]);

const EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json'
]);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;

  for (const entry of fs.readdirSync(dir, {
    withFileTypes: true
  })) {
    if (IGNORE.has(entry.name)) continue;

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(full, out);
      continue;
    }

    if (
      EXTENSIONS.has(
        path.extname(entry.name).toLowerCase()
      )
    ) {
      out.push(full);
    }
  }

  return out;
}

const roots = [
  'app',
  'src',
  'assets',
  'scripts'
];

const files = [];

for (const root of roots) {
  walk(root, files);
}

console.log();
console.log('============================================');
console.log(' 2. REFERÊNCIAS À BASE MESTRE');
console.log('============================================');

const patterns = [
  /base_mestre/gi,
  /require\s*\([^)]*\.json/gi,
  /AsyncStorage/gi,
  /SecureStore/gi,
  /FileSystem/gi,
  /SQLite/gi,
  /expo-sqlite/gi,
  /localStorage/gi,
  /getItem\s*\(/gi,
  /setItem\s*\(/gi,
  /JSON\.parse/gi,
  /JSON\.stringify/gi,
  /restore/gi,
  /backup/gi,
  /seed/gi,
  /cache/gi
];

const hits = [];

for (const file of files) {
  let text;

  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  const found = patterns
    .map(re => {
      re.lastIndex = 0;
      return {
        pattern: re.source,
        count: (text.match(re) || []).length
      };
    })
    .filter(x => x.count > 0);

  if (found.length) {
    hits.push({
      file,
      found
    });
  }
}

for (const h of hits) {
  console.log();
  console.log('ARQUIVO:', h.file);

  for (const f of h.found) {
    console.log(
      `  ${f.pattern} -> ${f.count}`
    );
  }
}

console.log();
console.log('============================================');
console.log(' 3. LINHAS COM BASE / STORAGE / CACHE');
console.log('============================================');

const linePattern =
  /base_mestre|AsyncStorage|SecureStore|FileSystem|SQLite|expo-sqlite|localStorage|getItem\s*\(|setItem\s*\(|seed|cache/i;

for (const file of files) {
  let text;

  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  const lines = text.split('\n');

  const selected = [];

  lines.forEach((line, index) => {
    if (linePattern.test(line)) {
      selected.push({
        n: index + 1,
        line: line.trim()
      });
    }
  });

  if (!selected.length) continue;

  console.log();
  console.log('--------------------------------------------');
  console.log(file);
  console.log('--------------------------------------------');

  selected
    .slice(0, 100)
    .forEach(x => {
      console.log(
        String(x.n).padStart(4, '0'),
        '|',
        x.line.slice(0, 260)
      );
    });
}

console.log();
console.log('============================================');
console.log(' 4. INSPEÇÃO ESPECIAL src/lib/api.ts');
console.log('============================================');

const api = 'src/lib/api.ts';

if (fs.existsSync(api)) {
  const text =
    fs.readFileSync(api, 'utf8');

  const lines = text.split('\n');

  const keys = [
    'base_mestre',
    'AsyncStorage',
    'getItem',
    'setItem',
    'hymns',
    'himnos',
    'load',
    'restore',
    'backup'
  ];

  const indexes = new Set();

  lines.forEach((line, i) => {
    if (
      keys.some(k =>
        line.toLowerCase().includes(
          k.toLowerCase()
        )
      )
    ) {
      for (
        let n = Math.max(0, i - 4);
        n <= Math.min(lines.length - 1, i + 8);
        n++
      ) {
        indexes.add(n);
      }
    }
  });

  [...indexes]
    .sort((a, b) => a - b)
    .forEach(i => {
      console.log(
        String(i + 1).padStart(4, '0'),
        '|',
        lines[i]
      );
    });
}

console.log();
console.log('============================================');
console.log(' 5. OUTROS JSON COM HINOS');
console.log('============================================');

const jsonCandidates = [];

for (const file of files) {
  if (
    path.extname(file).toLowerCase() !== '.json'
  ) continue;

  if (file === BASE) continue;

  let raw;

  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  if (
    /CRISTO LA ROCA|A LOS PIES DE JESUCRISTO|BELLAS PALABRAS DE VIDA/i.test(raw)
  ) {
    jsonCandidates.push(file);
  }
}

if (!jsonCandidates.length) {
  console.log(
    'NENHUMA OUTRA BASE JSON COM OS CASOS-TESTEMUNHA.'
  );
} else {
  for (const file of jsonCandidates) {
    console.log(file);

    try {
      console.log(
        '  HASH:',
        sha256(file)
      );
    } catch {}
  }
}

console.log();
console.log('============================================');
console.log(' 6. BUSCA DE GT-052 FORA DA BASE');
console.log('============================================');

for (const file of files) {
  if (file === BASE) continue;

  let text;

  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  if (
    text.includes('CRISTO LA ROCA') ||
    text.includes('GT-052')
  ) {
    console.log(
      'ENCONTRADO:',
      file
    );
  }
}

console.log();
console.log('============================================');
console.log(' 7. IMUTABILIDADE');
console.log('============================================');

const hashAfter = sha256(BASE);

console.log('HASH ANTES: ', hash);
console.log('HASH DEPOIS:', hashAfter);
console.log(
  'BASE ALTERADA:',
  hash === hashAfter ? 'NÃO' : 'SIM'
);

if (hash !== hashAfter) {
  throw new Error(
    'ERRO: diagnóstico alterou a base.'
  );
}

console.log();
console.log('============================================');
console.log(' ETAPA 11D CONCLUÍDA');
console.log(' FONTE DE RUNTIME MAPEADA');
console.log(' NENHUMA ALTERAÇÃO APLICADA');
console.log('============================================');
