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
      (typeof v.letra === 'string' ||
       typeof v.lyrics === 'string')
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

function text(h) {
  return String(h.letra ?? h.lyrics ?? '');
}

function title(h) {
  return String(h.titulo ?? h.title ?? '');
}

const hashBefore = sha256(BASE);

console.log('============================================');
console.log(' 1. INTEGRIDADE DA BASE');
console.log('============================================');
console.log('HASH ATUAL:  ', hashBefore);
console.log('HASH OFICIAL:', HASH_OFICIAL);

if (hashBefore !== HASH_OFICIAL) {
  throw new Error('ABORTADO: hash inesperado.');
}

const root = JSON.parse(fs.readFileSync(BASE, 'utf8'));
const hymns = getHymns(root);

if (hymns.length !== 718) {
  throw new Error(
    `ABORTADO: esperados 718 hinos; encontrados ${hymns.length}.`
  );
}

const map = new Map(
  hymns.map(h => [String(h.id).toUpperCase(), h])
);

console.log('TOTAL DE HINOS:', hymns.length);
console.log();

console.log('============================================');
console.log(' 2. ESTRUTURA BRUTA DOS CASOS');
console.log('============================================');

for (const id of [
  'GT-052',
  'GT-100',
  'GT-188',
  'GT-177'
]) {
  const h = map.get(id);

  console.log();
  console.log('--------------------------------------------');
  console.log(id, '|', h ? title(h) : 'NÃO LOCALIZADO');
  console.log('--------------------------------------------');

  if (!h) continue;

  const letra = text(h);

  letra.split(/\r?\n/).forEach((line, i) => {
    console.log(
      String(i + 1).padStart(3, '0'),
      '|',
      JSON.stringify(line)
    );
  });
}

console.log();
console.log('============================================');
console.log(' 3. GT-052 — TESTE DO CORO');
console.log('============================================');

{
  const h = map.get('GT-052');
  const letra = text(h);

  const marker = letra.match(/\bCORO\s*:/i);

  console.log(
    'MARCADOR CORO:',
    marker ? 'PRESENTE' : 'AUSENTE'
  );

  if (marker) {
    console.log('ÍNDICE:', marker.index);
    console.log(
      'ANTES:',
      JSON.stringify(
        letra.slice(
          Math.max(0, marker.index - 120),
          marker.index
        )
      )
    );

    console.log(
      'DEPOIS:',
      JSON.stringify(
        letra.slice(
          marker.index,
          marker.index + 250
        )
      )
    );
  }
}

console.log();
console.log('============================================');
console.log(' 4. GT-100 — TESTE DO CORO');
console.log('============================================');

{
  const h = map.get('GT-100');
  const letra = text(h);

  const marker = letra.match(/\bCORO\s*:/i);

  console.log(
    'MARCADOR CORO:',
    marker ? 'PRESENTE' : 'AUSENTE'
  );

  if (marker) {
    console.log('ÍNDICE:', marker.index);
    console.log(
      'ANTES:',
      JSON.stringify(
        letra.slice(
          Math.max(0, marker.index - 120),
          marker.index
        )
      )
    );

    console.log(
      'DEPOIS:',
      JSON.stringify(
        letra.slice(
          marker.index,
          marker.index + 250
        )
      )
    );
  }
}

console.log();
console.log('============================================');
console.log(' 5. GT-188 — ANOMALIA DOCUMENTAL');
console.log('============================================');

{
  const h = map.get('GT-188');
  const letra = text(h);

  const checks = [
    'Son sostén y a:',
    'Son sostén y guía:',
    '||',
    'CORO:'
  ];

  for (const value of checks) {
    const count =
      letra.split(value).length - 1;

    console.log(
      JSON.stringify(value),
      '->',
      count,
      'ocorrência(s)'
    );
  }

  console.log();
  console.log(
    'DIAGNÓSTICO: GT-188 TEM ANOMALIA NA BASE.'
  );
  console.log(
    'NÃO CORRIGIR AINDA SEM COTEJO/VALIDAÇÃO.'
  );
}

console.log();
console.log('============================================');
console.log(' 6. GT-177 — FRAGMENTO ISOLADO');
console.log('============================================');

{
  const h = map.get('GT-177');
  const letra = text(h);

  const lines = letra.split(/\r?\n/);

  lines.forEach((line, i) => {
    if (line.trim() === 'S') {
      console.log(
        'LINHA ISOLADA "S" ENCONTRADA:',
        i + 1
      );

      console.log(
        'CONTEXTO:',
        lines
          .slice(
            Math.max(0, i - 3),
            Math.min(lines.length, i + 4)
          )
          .join(' | ')
      );
    }
  });

  console.log(
    'DIAGNÓSTICO: CANDIDATO A ERRO DOCUMENTAL.'
  );
}

console.log();
console.log('============================================');
console.log(' 7. LOCALIZANDO O PARSER DO APLICATIVO');
console.log('============================================');

const roots = [
  'app',
  'src',
  'components',
  'lib',
  'utils'
];

const extensions = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx'
]);

const findings = [];

function scan(dir) {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, {
    withFileTypes: true
  })) {
    const full = `${dir}/${entry.name}`;

    if (
      entry.name === 'node_modules' ||
      entry.name === '.expo' ||
      entry.name === '.git'
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      scan(full);
      continue;
    }

    if (!extensions.has(
      require('path').extname(entry.name)
    )) {
      continue;
    }

    let source;

    try {
      source = fs.readFileSync(full, 'utf8');
    } catch {
      continue;
    }

    const patterns = [
      /cleanBlockText/g,
      /contentMode/g,
      /\bCORO\b/g,
      /split\s*\(/g,
      /sections?/gi,
      /estrofa/gi,
      /chorus/gi
    ];

    const hits = [];

    for (const pattern of patterns) {
      const matches =
        source.match(pattern);

      if (matches?.length) {
        hits.push(
          `${pattern}=${matches.length}`
        );
      }
    }

    if (hits.length) {
      findings.push({
        file: full,
        hits
      });
    }
  }
}

roots.forEach(scan);

console.log(
  'ARQUIVOS CANDIDATOS:',
  findings.length
);

for (const f of findings) {
  console.log();
  console.log(f.file);
  console.log('  ', f.hits.join(' | '));
}

console.log();
console.log('============================================');
console.log(' 8. TRECHOS DO PARSER');
console.log('============================================');

for (const f of findings) {
  const source =
    fs.readFileSync(f.file, 'utf8');

  const lines = source.split(/\r?\n/);

  const interesting = [];

  lines.forEach((line, index) => {
    if (
      /cleanBlockText|CORO|estrofa|chorus|section/i
        .test(line)
    ) {
      interesting.push(index);
    }
  });

  if (!interesting.length) continue;

  console.log();
  console.log('--------------------------------------------');
  console.log('ARQUIVO:', f.file);
  console.log('--------------------------------------------');

  const printed = new Set();

  for (const index of interesting.slice(0, 30)) {
    const start = Math.max(0, index - 3);
    const end = Math.min(
      lines.length,
      index + 4
    );

    for (let i = start; i < end; i++) {
      if (printed.has(i)) continue;

      printed.add(i);

      console.log(
        String(i + 1).padStart(4, '0'),
        '|',
        lines[i]
      );
    }

    console.log('...');
  }
}

const hashAfter = sha256(BASE);

console.log();
console.log('============================================');
console.log(' 9. CONCLUSÃO');
console.log('============================================');
console.log(
  'GT-052:',
  'BASE CONTÉM MARCADOR CORO'
);
console.log(
  'GT-100:',
  'BASE CONTÉM MARCADOR CORO'
);
console.log(
  'GT-188:',
  'ANOMALIA PRESENTE NA BASE'
);
console.log(
  'GT-177:',
  'CANDIDATO DOCUMENTAL'
);
console.log();
console.log(
  'SE GT-052/GT-100 CONTINUAM ERRADOS NA TELA,'
);
console.log(
  'O DEFEITO ESTÁ NA INTERPRETAÇÃO/RENDERIZAÇÃO.'
);

console.log();
console.log('============================================');
console.log(' 10. IMUTABILIDADE');
console.log('============================================');
console.log('HASH ANTES: ', hashBefore);
console.log('HASH DEPOIS:', hashAfter);
console.log(
  'BASE ALTERADA:',
  hashBefore === hashAfter ? 'NÃO' : 'SIM'
);

if (hashBefore !== hashAfter) {
  throw new Error(
    'ERRO: a auditoria alterou a base.'
  );
}

console.log();
console.log('============================================');
console.log(' ETAPA 11B CONCLUÍDA');
console.log(' NENHUMA ALTERAÇÃO APLICADA');
console.log('============================================');
