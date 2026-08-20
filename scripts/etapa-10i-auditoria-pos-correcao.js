const fs = require('fs');
const crypto = require('crypto');

const BASE =
  'assets/base_mestre.json';

const BACKUP =
  'assets/base_mestre.bak-etapa-10h.json';

const REL10H =
  'scripts/data/etapa-10h-aplicacao-transacional.json';

const OUT_JSON =
  'scripts/data/etapa-10i-auditoria-pos-correcao.json';

const OUT_TXT =
  'scripts/data/etapa-10i-auditoria-pos-correcao.txt';

const HASH_OFICIAL =
  '48cd4be20055aa9243a0a2223aef36376186dfd202f72ca4a4666015c44445a5';

const HASH_BACKUP_ESPERADO =
  'a0a97173c5ce6fd7d39e22813a15576304218bfce2f85dbd694a726364835d41';

function sha256File(file) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(file))
    .digest('hex');
}

function norm(v) {
  return String(v ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

function coletarObjetos(valor, lista = []) {
  if (!valor || typeof valor !== 'object') {
    return lista;
  }

  if (Array.isArray(valor)) {
    for (const item of valor) {
      coletarObjetos(item, lista);
    }
    return lista;
  }

  lista.push(valor);

  for (const v of Object.values(valor)) {
    if (v && typeof v === 'object') {
      coletarObjetos(v, lista);
    }
  }

  return lista;
}

function ids(obj) {
  const r = [];

  for (const k of [
    'id',
    'codigo',
    'code',
    'uid',
    'hymnId',
    'hinoId'
  ]) {
    if (obj[k] != null) {
      r.push(norm(obj[k]));
    }
  }

  const numero =
    obj.numero ??
    obj.number ??
    obj.num ??
    obj.hino ??
    obj.hymnNumber;

  const hinario =
    obj.hinario ??
    obj.hymnal ??
    obj.source ??
    obj.origem;

  if (numero != null && hinario != null) {
    const h = String(hinario).toUpperCase();

    if (/GLORIA|TRIUNFO|GT/.test(h)) {
      r.push(
        `GT-${String(numero).padStart(3, '0')}`
      );
    }

    if (/SION|SIÓN/.test(h)) {
      r.push(
        `SION-${String(numero).padStart(3, '0')}`
      );
    }
  }

  return [...new Set(r)];
}

function encontrar(objetos, alvo) {
  const n = norm(alvo);

  return objetos.find(
    obj => ids(obj).includes(n)
  );
}

function contarExato(valor, termo) {
  let total = 0;

  function walk(v) {
    if (typeof v === 'string') {
      total += v.split(termo).length - 1;
      return;
    }

    if (Array.isArray(v)) {
      v.forEach(walk);
      return;
    }

    if (v && typeof v === 'object') {
      Object.values(v).forEach(walk);
    }
  }

  walk(valor);
  return total;
}

function contarHinos(valor) {
  let total = 0;

  function walk(v) {
    if (!v || typeof v !== 'object') return;

    if (Array.isArray(v)) {
      v.forEach(walk);
      return;
    }

    const candidatos = ids(v);

    if (
      candidatos.some(x =>
        /^(GT|SION)-\d+$/.test(x)
      )
    ) {
      total++;
    }

    Object.values(v).forEach(walk);
  }

  walk(valor);
  return total;
}

function linha() {
  return '============================================';
}

let txt = '';

function out(s = '') {
  txt += s + '\n';
}

function falha(msg) {
  out(`FALHA: ${msg}`);
}

out(linha());
out(' AUDITORIA HINÁRIA - ETAPA 10I');
out(' AUDITORIA PÓS-CORREÇÃO');
out(' SOMENTE LEITURA');
out(linha());
out();

/*
 * 1. Integridade física
 */
out(linha());
out(' 1. CONTROLE DE INTEGRIDADE');
out(linha());

if (!fs.existsSync(BASE)) {
  throw new Error('Base Mestre não encontrada.');
}

if (!fs.existsSync(BACKUP)) {
  throw new Error('Backup pré-10H não encontrado.');
}

if (!fs.existsSync(REL10H)) {
  throw new Error('Relatório 10H não encontrado.');
}

const hashAntesLeitura =
  sha256File(BASE);

const hashBackup =
  sha256File(BACKUP);

out(`HASH BASE:    ${hashAntesLeitura}`);
out(`HASH OFICIAL: ${HASH_OFICIAL}`);
out(
  `BASE: ${
    hashAntesLeitura === HASH_OFICIAL
      ? 'OK'
      : 'DIVERGENTE'
  }`
);

out();

out(`HASH BACKUP:   ${hashBackup}`);
out(`BACKUP ESP.:   ${HASH_BACKUP_ESPERADO}`);
out(
  `BACKUP: ${
    hashBackup === HASH_BACKUP_ESPERADO
      ? 'OK'
      : 'DIVERGENTE'
  }`
);

/*
 * 2. JSON e estrutura
 */
const base =
  JSON.parse(
    fs.readFileSync(BASE, 'utf8')
  );

const objetos =
  coletarObjetos(base);

const totalHinos =
  contarHinos(base);

out();
out(linha());
out(' 2. ESTRUTURA GLOBAL');
out(linha());

out('JSON: VÁLIDO');
out(`OBJETOS INSPECIONADOS: ${objetos.length}`);
out(`REGISTROS HINÁRIOS DETECTADOS: ${totalHinos}`);

if (totalHinos !== 718) {
  falha(
    `Esperados 718 registros hinários; detectados ${totalHinos}.`
  );
} else {
  out('TOTAL DE HINOS: OK (718)');
}

/*
 * 3. Ler exatamente o lote aplicado
 */
const rel10h =
  JSON.parse(
    fs.readFileSync(REL10H, 'utf8')
  );

const aplicadas =
  rel10h.aplicadas || [];

out();
out(linha());
out(' 3. REAUDITORIA DAS 14 CORREÇÕES');
out(linha());

out(`CORREÇÕES REGISTRADAS NA 10H: ${aplicadas.length}`);

let correcoesOk = 0;
let correcoesFalha = 0;

for (let i = 0; i < aplicadas.length; i++) {
  const item = aplicadas[i];

  const registro =
    encontrar(objetos, item.id);

  if (!registro) {
    out(
      `${String(i + 1).padStart(2, '0')}. ${item.id} | REGISTRO NÃO LOCALIZADO`
    );

    correcoesFalha++;
    continue;
  }

  const antigo =
    contarExato(
      registro,
      item.atual
    );

  const novo =
    contarExato(
      registro,
      item.proposta
    );

  const ok =
    antigo === 0 &&
    novo >= 1;

  out(
    `${String(i + 1).padStart(2, '0')}. ${item.id} | antigo=${antigo} | proposta=${novo} | ${ok ? 'OK' : 'FALHA'}`
  );

  if (ok) {
    correcoesOk++;
  } else {
    correcoesFalha++;
  }
}

out();
out(`CORREÇÕES OK: ${correcoesOk}`);
out(`CORREÇÕES COM FALHA: ${correcoesFalha}`);

/*
 * 4. Verificar especificamente os resíduos
 * antigos em toda a base.
 */
const residuosAntigos = [
  'oid, .',
  'serIe',
  'serás . De',
  'referirIa',
  'buen .Jesús',
  'hazIo'
];

out();
out(linha());
out(' 4. VARREDURA DOS RESÍDUOS CORRIGIDOS');
out(linha());

let residuosTotal = 0;

for (const termo of residuosAntigos) {
  const qtd =
    contarExato(base, termo);

  residuosTotal += qtd;

  out(
    `"${termo}" -> ${qtd}`
  );
}

out(
  `TOTAL DE RESÍDUOS ANTIGOS: ${residuosTotal}`
);

/*
 * 5. Casos bloqueados.
 *
 * Eles não serão corrigidos aqui.
 * Apenas comprovamos que continuam
 * disponíveis para o cotejo posterior.
 */
const bloqueados = [
  {
    id: 'GT-283',
    termo: 'tierra mis Allí',
    classe: 'COTEJO_VISUAL'
  },
  {
    id: 'GT-042',
    termo: null,
    classe: 'ESTRUTURA_NUMERACAO'
  },
  {
    id: 'GT-182',
    termo: null,
    classe: 'SALTO_NUMERICO'
  },
  {
    id: 'SION-079',
    termo: null,
    classe: 'SALTO_NUMERICO'
  }
];

out();
out(linha());
out(' 5. CASOS BLOQUEADOS');
out(linha());

let bloqueadosPresentes = 0;

for (const b of bloqueados) {
  const registro =
    encontrar(objetos, b.id);

  const presente =
    !!registro;

  if (presente) {
    bloqueadosPresentes++;
  }

  out(
    `${b.id} | ${b.classe} | REGISTRO: ${
      presente
        ? 'PRESENTE'
        : 'NÃO LOCALIZADO'
    }`
  );

  if (
    presente &&
    b.termo
  ) {
    out(
      `  TERMO "${b.termo}": ${
        contarExato(registro, b.termo)
      } ocorrência(s)`
    );
  }
}

/*
 * 6. Comparação do backup com a base.
 *
 * Esperamos diferença porque houve
 * exatamente o lote aprovado.
 */
out();
out(linha());
out(' 6. RELAÇÃO BASE / BACKUP');
out(linha());

out(`HASH PRÉ-10H: ${hashBackup}`);
out(`HASH PÓS-10H: ${hashAntesLeitura}`);

out(
  `VERSÕES DIFERENTES: ${
    hashBackup !== hashAntesLeitura
      ? 'SIM — ESPERADO'
      : 'NÃO — INESPERADO'
  }`
);

/*
 * 7. Resultado
 */
const aprovado =
  hashAntesLeitura === HASH_OFICIAL &&
  hashBackup === HASH_BACKUP_ESPERADO &&
  totalHinos === 718 &&
  aplicadas.length === 14 &&
  correcoesOk === 14 &&
  correcoesFalha === 0 &&
  residuosTotal === 0 &&
  bloqueadosPresentes === 4;

out();
out(linha());
out(' 7. RESULTADO DA AUDITORIA');
out(linha());

out(
  `HASH OFICIAL: ${
    hashAntesLeitura === HASH_OFICIAL
      ? 'OK'
      : 'FALHA'
  }`
);

out(
  `BACKUP PRÉ-10H: ${
    hashBackup === HASH_BACKUP_ESPERADO
      ? 'OK'
      : 'FALHA'
  }`
);

out(
  `718 HINOS: ${
    totalHinos === 718
      ? 'OK'
      : 'FALHA'
  }`
);

out(
  `14 CORREÇÕES: ${
    correcoesOk === 14
      ? 'OK'
      : 'FALHA'
  }`
);

out(
  `RESÍDUOS ANTIGOS: ${
    residuosTotal === 0
      ? 'ZERO — OK'
      : 'FALHA'
  }`
);

out(
  `4 BLOQUEADOS PRESERVADOS: ${
    bloqueadosPresentes === 4
      ? 'OK'
      : 'FALHA'
  }`
);

out();

out(
  `STATUS FINAL: ${
    aprovado
      ? 'APROVADO'
      : 'REPROVADO'
  }`
);

/*
 * Controle final de imutabilidade.
 */
const hashDepoisLeitura =
  sha256File(BASE);

out();
out(linha());
out(' 8. CONTROLE DE IMUTABILIDADE');
out(linha());

out(`HASH ANTES:  ${hashAntesLeitura}`);
out(`HASH DEPOIS: ${hashDepoisLeitura}`);

out(
  `BASE ALTERADA PELA 10I: ${
    hashAntesLeitura === hashDepoisLeitura
      ? 'NÃO'
      : 'SIM'
  }`
);

const relatorio = {
  etapa: '10I',
  status:
    aprovado
      ? 'APROVADO'
      : 'REPROVADO',

  hashOficial:
    HASH_OFICIAL,

  hashBase:
    hashDepoisLeitura,

  hashBackup,

  totalHinos,

  correcoes: {
    esperadas: 14,
    ok: correcoesOk,
    falhas: correcoesFalha
  },

  residuosAntigos:
    residuosTotal,

  bloqueadosPresentes,

  baseAlterada:
    hashAntesLeitura !== hashDepoisLeitura
};

fs.writeFileSync(
  OUT_JSON,
  JSON.stringify(
    relatorio,
    null,
    2
  ) + '\n'
);

fs.writeFileSync(
  OUT_TXT,
  txt
);

process.stdout.write(txt);

if (!aprovado) {
  process.exitCode = 1;
}
