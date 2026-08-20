const fs = require('fs');
const crypto = require('crypto');

const BASE = 'assets/base_mestre.json';

const OUT_JSON =
  'scripts/data/etapa-10j-investigacao-bloqueados.json';

const OUT_TXT =
  'scripts/data/etapa-10j-investigacao-bloqueados.txt';

const HASH_OFICIAL =
  '48cd4be20055aa9243a0a2223aef36376186dfd202f72ca4a4666015c44445a5';

function sha256(file) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(file))
    .digest('hex');
}

function normalizeTitle(s = '') {
  return String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¡!¿?.,;:'"()\-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function textOf(obj) {
  const candidates = [
    obj.letra,
    obj.lyrics,
    obj.texto,
    obj.text,
    obj.conteudo,
    obj.content
  ];

  return candidates.find(v => typeof v === 'string') || '';
}

function titleOf(obj) {
  return (
    obj.titulo ??
    obj.title ??
    obj.nome ??
    obj.name ??
    ''
  );
}

function numberOf(obj) {
  return (
    obj.numero ??
    obj.number ??
    obj.num ??
    obj.n ??
    ''
  );
}

function hymnalOf(obj) {
  return String(
    obj.hinario ??
    obj.hymnal ??
    obj.book ??
    obj.livro ??
    obj.edicao ??
    ''
  ).toUpperCase();
}

function idOf(obj) {
  return String(
    obj.id ??
    obj.codigo ??
    obj.code ??
    ''
  ).toUpperCase();
}

function collectObjects(root) {
  const out = [];

  function walk(value, path = '$') {
    if (!value || typeof value !== 'object') return;

    if (!Array.isArray(value)) {
      const txt = textOf(value);
      const title = titleOf(value);

      if (txt || title) {
        out.push({
          obj: value,
          path
        });
      }

      for (const [k, v] of Object.entries(value)) {
        walk(v, `${path}.${k}`);
      }
    } else {
      value.forEach((v, i) => walk(v, `${path}[${i}]`));
    }
  }

  walk(root);
  return out;
}

function detectEdition(entry) {
  const obj = entry.obj;
  const id = idOf(obj);
  const h = hymnalOf(obj);
  const path = entry.path.toUpperCase();

  if (
    id.startsWith('GT-') ||
    /\bGT\b/.test(h) ||
    h.includes('GLORIA') ||
    path.includes('GLORIA')
  ) return 'GT';

  if (
    id.startsWith('SION-') ||
    id.startsWith('SIÓN-') ||
    h.includes('SION') ||
    h.includes('SIÓN') ||
    path.includes('SION')
  ) return 'SION';

  return '';
}

function recordKey(entry) {
  const edition = detectEdition(entry);
  const num = numberOf(entry.obj);

  if (edition && num !== '') {
    return `${edition}-${String(num).padStart(3, '0')}`;
  }

  const id = idOf(entry.obj);

  if (/^(GT|SION|SIÓN)-\d+$/i.test(id)) {
    const [ed, n] = id.split('-');
    return `${ed === 'SIÓN' ? 'SION' : ed}-${String(Number(n)).padStart(3, '0')}`;
  }

  return '';
}

function structuralNumbers(text) {
  const normalized = String(text)
    .replace(/\r/g, '')
    .replace(/\|/g, '\n');

  const numbers = [];

  for (const line of normalized.split('\n')) {
    const t = line.trim();

    if (/^\d{1,2}[.)]?$/.test(t)) {
      numbers.push(Number(t.replace(/\D/g, '')));
      continue;
    }

    const m = t.match(/^(\d{1,2})[.)]\s+/);
    if (m) numbers.push(Number(m[1]));
  }

  return numbers;
}

function excerpt(text, term, radius = 180) {
  if (!text) return '';

  const idx = term
    ? text.toLowerCase().indexOf(term.toLowerCase())
    : -1;

  if (idx < 0) {
    return text.slice(0, 500);
  }

  return text.slice(
    Math.max(0, idx - radius),
    Math.min(text.length, idx + term.length + radius)
  );
}

function similarity(a, b) {
  const A = normalizeTitle(a);
  const B = normalizeTitle(b);

  if (!A || !B) return 0;
  if (A === B) return 100;

  const wa = new Set(A.split(' '));
  const wb = new Set(B.split(' '));

  let common = 0;
  for (const w of wa) {
    if (wb.has(w)) common++;
  }

  const union = new Set([...wa, ...wb]).size;
  return union ? Math.round((common / union) * 100) : 0;
}

const hashAntes = sha256(BASE);

if (hashAntes !== HASH_OFICIAL) {
  console.error('ERRO: HASH DA BASE NÃO CORRESPONDE AO HASH OFICIAL.');
  console.error('ATUAL:   ' + hashAntes);
  console.error('OFICIAL: ' + HASH_OFICIAL);
  process.exit(1);
}

const raw = fs.readFileSync(BASE, 'utf8');
const data = JSON.parse(raw);
const objects = collectObjects(data);

const records = objects
  .map(entry => ({
    ...entry,
    key: recordKey(entry),
    edition: detectEdition(entry),
    number: numberOf(entry.obj),
    title: titleOf(entry.obj),
    text: textOf(entry.obj)
  }))
  .filter(r => r.key);

function findKey(key) {
  return records.find(r => r.key === key);
}

function possiblePairs(target) {
  if (!target) return [];

  const otherEdition =
    target.edition === 'GT' ? 'SION' : 'GT';

  return records
    .filter(r => r.edition === otherEdition)
    .map(r => ({
      key: r.key,
      title: r.title,
      score: similarity(target.title, r.title),
      textEqual:
        target.text &&
        r.text &&
        target.text === r.text
    }))
    .filter(r => r.score >= 55)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return Number(b.textEqual) - Number(a.textEqual);
    })
    .slice(0, 8);
}

const targets = [
  {
    key: 'GT-283',
    type: 'COTEJO_VISUAL',
    term: 'tierra mis Allí',
    question:
      'Determinar a leitura correta do verso suspeito sem reconstrução por inferência.'
  },
  {
    key: 'GT-042',
    type: 'ESTRUTURA_NUMERACAO',
    term: '',
    question:
      'Determinar se há duplicação/justaposição de conteúdo e qual é a estrutura correta das estrofes.'
  },
  {
    key: 'GT-182',
    type: 'SALTO_NUMERICO',
    term: '',
    question:
      'Confirmar se a edição realmente salta da estrofe 1 para a 3 ou se existe estrofe 2 perdida.'
  },
  {
    key: 'SION-079',
    type: 'SALTO_NUMERICO',
    term: '',
    question:
      'Confirmar se a edição realmente salta da estrofe 1 para a 3 ou se existe estrofe 2 perdida.'
  }
];

const investigations = [];

for (const t of targets) {
  const r = findKey(t.key);

  if (!r) {
    investigations.push({
      ...t,
      found: false
    });
    continue;
  }

  investigations.push({
    ...t,
    found: true,
    title: r.title,
    number: r.number,
    edition: r.edition,
    path: r.path,
    structuralNumbers: structuralNumbers(r.text),
    excerpt: excerpt(r.text, t.term),
    fullText: r.text,
    possiblePairs: possiblePairs(r)
  });
}

/*
 * Investigação específica GT-042:
 * procura registros vizinhos para detectar eventual
 * contaminação/justaposição entre hinos.
 */
const gt42 = findKey('GT-042');

const gt42Neighborhood = ['GT-040', 'GT-041', 'GT-042', 'GT-043']
  .map(findKey)
  .filter(Boolean)
  .map(r => ({
    key: r.key,
    title: r.title,
    structuralNumbers: structuralNumbers(r.text),
    textLength: r.text.length,
    beginning: r.text.slice(0, 300),
    ending: r.text.slice(-300)
  }));

/*
 * Investigação conjunta GT-182 / SION-079.
 */
const gt182 = findKey('GT-182');
const sion079 = findKey('SION-079');

const pair182079 = {
  bothFound: Boolean(gt182 && sion079),
  titleGT: gt182?.title || '',
  titleSion: sion079?.title || '',
  normalizedTitleEqual:
    Boolean(gt182 && sion079) &&
    normalizeTitle(gt182.title) ===
      normalizeTitle(sion079.title),

  textEqual:
    Boolean(gt182 && sion079) &&
    gt182.text === sion079.text,

  gtNumbers:
    gt182 ? structuralNumbers(gt182.text) : [],

  sionNumbers:
    sion079 ? structuralNumbers(sion079.text) : [],

  gtText:
    gt182?.text || '',

  sionText:
    sion079?.text || ''
};

const result = {
  etapa: '10J',
  descricao:
    'Investigação interna dos quatro casos bloqueados antes do cotejo documental/visual.',
  hashOficial: HASH_OFICIAL,
  hashAntes,
  totalObjetosInspecionados: objects.length,
  totalRegistrosDetectados: records.length,
  investigations,
  gt42Neighborhood,
  pair182079,
  regras: {
    alteraBase: false,
    permiteInferenciaSemFonte: false,
    objetivo:
      'Separar o que pode ser resolvido por evidência cruzada do que obrigatoriamente depende da imagem/PDF da edição.'
  }
};

fs.mkdirSync('scripts/data', { recursive: true });

fs.writeFileSync(
  OUT_JSON,
  JSON.stringify(result, null, 2) + '\n'
);

const lines = [];

function p(s = '') {
  lines.push(s);
}

p('============================================');
p(' AUDITORIA HINÁRIA - ETAPA 10J');
p(' INVESTIGAÇÃO DOS 4 CASOS BLOQUEADOS');
p(' CRUZAMENTO INTERNO GT / SIÓN');
p(' SOMENTE LEITURA');
p('============================================');
p();

p('============================================');
p(' 1. CONTROLE');
p('============================================');
p(`HASH ATUAL:   ${hashAntes}`);
p(`HASH OFICIAL: ${HASH_OFICIAL}`);
p(`HASH: ${hashAntes === HASH_OFICIAL ? 'OK' : 'FALHA'}`);
p(`OBJETOS INSPECIONADOS: ${objects.length}`);
p(`REGISTROS DETECTADOS: ${records.length}`);
p();

p('============================================');
p(' 2. INVESTIGAÇÃO DOS BLOQUEADOS');
p('============================================');

for (const inv of investigations) {
  p();
  p('--------------------------------------------');
  p(`${inv.key}`);
  p(`TIPO: ${inv.type}`);
  p(`LOCALIZADO: ${inv.found ? 'SIM' : 'NÃO'}`);

  if (!inv.found) continue;

  p(`TÍTULO: ${inv.title}`);
  p(
    `NÚMEROS ESTRUTURAIS: ${
      inv.structuralNumbers.length
        ? inv.structuralNumbers.join(' -> ')
        : 'NENHUM DETECTADO'
    }`
  );

  if (inv.term) {
    p(`TERMO SUSPEITO: "${inv.term}"`);
  }

  p(`QUESTÃO DOCUMENTAL: ${inv.question}`);
  p();
  p('TRECHO / CONTEÚDO:');
  p(inv.excerpt.replace(/\n/g, ' | '));

  p();
  p('POSSÍVEIS CORRESPONDENTES NA OUTRA EDIÇÃO:');

  if (!inv.possiblePairs.length) {
    p('  NENHUM PAR FORTE LOCALIZADO.');
  } else {
    for (const pair of inv.possiblePairs) {
      p(
        `  ${pair.key} | ${pair.title}` +
        ` | similaridade=${pair.score}%` +
        ` | letra_idêntica=${pair.textEqual ? 'SIM' : 'NÃO'}`
      );
    }
  }
}

p();
p('============================================');
p(' 3. VIZINHANÇA ESTRUTURAL DO GT-042');
p('============================================');

for (const r of gt42Neighborhood) {
  p();
  p(`${r.key} | ${r.title}`);
  p(
    `NÚMEROS: ${
      r.structuralNumbers.length
        ? r.structuralNumbers.join(' -> ')
        : 'NENHUM'
    }`
  );
  p(`TAMANHO DO TEXTO: ${r.textLength}`);
  p(`INÍCIO: ${r.beginning.replace(/\n/g, ' | ')}`);
  p(`FINAL:  ${r.ending.replace(/\n/g, ' | ')}`);
}

p();
p('============================================');
p(' 4. PAR GT-182 / SION-079');
p('============================================');
p(`AMBOS LOCALIZADOS: ${pair182079.bothFound ? 'SIM' : 'NÃO'}`);
p(
  `TÍTULO NORMALIZADO IGUAL: ${
    pair182079.normalizedTitleEqual ? 'SIM' : 'NÃO'
  }`
);
p(`LETRA IDÊNTICA: ${pair182079.textEqual ? 'SIM' : 'NÃO'}`);
p(`GT-182 NÚMEROS: ${pair182079.gtNumbers.join(' -> ') || 'NENHUM'}`);
p(`SION-079 NÚMEROS: ${pair182079.sionNumbers.join(' -> ') || 'NENHUM'}`);

p();
p('GT-182:');
p(pair182079.gtText.replace(/\n/g, ' | '));

p();
p('SION-079:');
p(pair182079.sionText.replace(/\n/g, ' | '));

p();
p('============================================');
p(' 5. DECISÃO DE SEGURANÇA');
p('============================================');
p('NENHUMA CORREÇÃO FOI APLICADA.');
p('NENHUM TEXTO SUSPEITO FOI RECONSTRUÍDO POR INFERÊNCIA.');
p('A SAÍDA DESTA ETAPA SERVIRÁ PARA DECIDIR QUAIS CASOS');
p('AINDA EXIGEM COTEJO VISUAL COM A EDIÇÃO FONTE.');

const hashDepois = sha256(BASE);

p();
p('============================================');
p(' 6. CONTROLE DE IMUTABILIDADE');
p('============================================');
p(`HASH ANTES:  ${hashAntes}`);
p(`HASH DEPOIS: ${hashDepois}`);
p(
  `BASE ALTERADA PELA 10J: ${
    hashAntes === hashDepois ? 'NÃO' : 'SIM — ERRO'
  }`
);

p();
p('============================================');
p(' ETAPA 10J CONCLUÍDA');
p(' AGUARDANDO ANÁLISE DOS 4 CASOS');
p('============================================');

fs.writeFileSync(
  OUT_TXT,
  lines.join('\n') + '\n'
);

console.log(lines.join('\n'));

if (hashAntes !== hashDepois) {
  console.error('ERRO: A BASE FOI ALTERADA.');
  process.exit(2);
}
