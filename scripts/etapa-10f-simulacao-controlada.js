const fs = require('fs');
const crypto = require('crypto');

const BASE = 'assets/base_mestre.json';

const OUT_JSON =
  'scripts/data/etapa-10f-simulacao-controlada.json';

const OUT_TXT =
  'scripts/data/etapa-10f-simulacao-controlada.txt';

const HASH_OFICIAL =
'a0a97173c5ce6fd7d39e22813a15576304218bfce2f85dbd694a726364835d41';

function sha256(path) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(path))
    .digest('hex');
}

function linha() {
  return '============================================';
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/*
 * Procura recursivamente todos os objetos da base.
 * Isso evita assumir que base_mestre.json seja array.
 */
function coletarObjetos(valor, lista = []) {
  if (!valor || typeof valor !== 'object') return lista;

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

function normalizarId(v) {
  return String(v ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

function idPossiveis(obj) {
  const valores = [];

  for (const chave of [
    'id',
    'codigo',
    'code',
    'uid',
    'hymnId',
    'hinoId'
  ]) {
    if (obj[chave] != null) {
      valores.push(normalizarId(obj[chave]));
    }
  }

  /*
   * Reconstrução auxiliar caso a base guarde
   * hinário + número separadamente.
   */
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
      valores.push(`GT-${String(numero).padStart(3, '0')}`);
    }

    if (/SION|SIÓN/.test(h)) {
      valores.push(`SION-${String(numero).padStart(3, '0')}`);
    }
  }

  return [...new Set(valores)];
}

function encontrarRegistro(objetos, alvoId) {
  const alvo = normalizarId(alvoId);

  return objetos.find(obj =>
    idPossiveis(obj).includes(alvo)
  );
}

/*
 * Faz substituição recursiva SOMENTE em strings
 * pertencentes ao registro encontrado.
 */
function substituirRecursivo(valor, atual, novo, caminho = '') {
  const mudancas = [];

  if (typeof valor === 'string') {
    if (!valor.includes(atual)) {
      return { valor, mudancas };
    }

    const ocorrencias =
      valor.split(atual).length - 1;

    const alterado =
      valor.split(atual).join(novo);

    mudancas.push({
      caminho,
      ocorrencias,
      antes: valor,
      depois: alterado
    });

    return {
      valor: alterado,
      mudancas
    };
  }

  if (Array.isArray(valor)) {
    const copia = [];

    valor.forEach((item, i) => {
      const r = substituirRecursivo(
        item,
        atual,
        novo,
        `${caminho}[${i}]`
      );

      copia.push(r.valor);
      mudancas.push(...r.mudancas);
    });

    return {
      valor: copia,
      mudancas
    };
  }

  if (valor && typeof valor === 'object') {
    const copia = {};

    for (const [k, v] of Object.entries(valor)) {
      const novoCaminho =
        caminho ? `${caminho}.${k}` : k;

      const r = substituirRecursivo(
        v,
        atual,
        novo,
        novoCaminho
      );

      copia[k] = r.valor;
      mudancas.push(...r.mudancas);
    }

    return {
      valor: copia,
      mudancas
    };
  }

  return {
    valor,
    mudancas
  };
}

const correcoes = [
  ['GT-040', 'oid, .', 'oid,'],
  ['GT-056', 'serIe', 'serle'],
  ['SION-026', 'serIe', 'serle'],
  ['GT-161', 'serás . De', 'serás. De'],

  ['GT-018', 'referirIa', 'referirla'],
  ['GT-018', 'buen .Jesús', 'buen Jesús'],

  ['SION-128', 'referirIa', 'referirla'],
  ['SION-128', 'buen .Jesús', 'buen Jesús'],

  ['GT-007', 'serIe', 'serle'],
  ['SION-011', 'serIe', 'serle'],

  ['GT-025', 'serIe', 'serle'],
  ['SION-134', 'serIe', 'serle'],

  ['GT-102', 'hazIo', 'hazlo'],
  ['SION-044', 'hazIo', 'hazlo']
];

if (!fs.existsSync(BASE)) {
  console.error('ERRO: Base Mestre não encontrada.');
  process.exit(1);
}

const hashAntes = sha256(BASE);

if (hashAntes !== HASH_OFICIAL) {
  console.error('ERRO: HASH DA BASE DIFERE DO OFICIAL.');
  console.error('ESPERADO:', HASH_OFICIAL);
  console.error('ATUAL:   ', hashAntes);
  process.exit(1);
}

const original =
  JSON.parse(fs.readFileSync(BASE, 'utf8'));

const simulada = clone(original);

const objetos =
  coletarObjetos(simulada);

let txt = '';

function out(s = '') {
  txt += s + '\n';
}

out(linha());
out(' AUDITORIA HINÁRIA - ETAPA 10F');
out(' SIMULAÇÃO CONTROLADA');
out(' NENHUMA ESCRITA NA BASE MESTRE');
out(linha());
out();

out(linha());
out(' 1. CONTROLE INICIAL');
out(linha());
out(`HASH OFICIAL: ${HASH_OFICIAL}`);
out(`HASH ATUAL:   ${hashAntes}`);
out('HASH: OK');
out(`OBJETOS INSPECIONADOS: ${objetos.length}`);
out();

const resultados = [];

let totalLocalizadas = 0;
let totalNaoLocalizadas = 0;
let totalOcorrencias = 0;

for (let i = 0; i < correcoes.length; i++) {
  const [id, atual, proposta] = correcoes[i];

  const registro =
    encontrarRegistro(objetos, id);

  const resultado = {
    ordem: i + 1,
    id,
    atual,
    proposta,
    registroLocalizado: !!registro,
    ocorrencias: 0,
    alteracoes: []
  };

  out('--------------------------------------------');
  out(
    `${String(i + 1).padStart(2, '0')}. ${id}`
  );
  out(`ATUAL:    "${atual}"`);
  out(`PROPOSTA: "${proposta}"`);

  if (!registro) {
    out('REGISTRO: NÃO LOCALIZADO');
    out('SIMULAÇÃO: BLOQUEADA');

    totalNaoLocalizadas++;
    resultados.push(resultado);
    continue;
  }

  totalLocalizadas++;

  const r =
    substituirRecursivo(
      registro,
      atual,
      proposta
    );

  /*
   * Atualiza o objeto em memória mantendo
   * a mesma referência usada pela árvore.
   */
  if (
    r.valor &&
    typeof r.valor === 'object' &&
    !Array.isArray(r.valor)
  ) {
    for (const k of Object.keys(registro)) {
      delete registro[k];
    }

    Object.assign(registro, r.valor);
  }

  resultado.ocorrencias =
    r.mudancas.reduce(
      (s, x) => s + x.ocorrencias,
      0
    );

  resultado.alteracoes =
    r.mudancas;

  totalOcorrencias += resultado.ocorrencias;

  out('REGISTRO: LOCALIZADO');
  out(
    `OCORRÊNCIAS EXATAS: ${resultado.ocorrencias}`
  );

  if (resultado.ocorrencias === 0) {
    out('RESULTADO: TEXTO-ALVO NÃO ENCONTRADO');
    out('AÇÃO FUTURA: NÃO APLICAR AUTOMATICAMENTE');
  } else {
    out('RESULTADO: SIMULAÇÃO POSSÍVEL');

    for (const m of r.mudancas) {
      out(`CAMPO: ${m.caminho}`);
      out(`SUBSTITUIÇÕES: ${m.ocorrencias}`);

      const pos = m.antes.indexOf(atual);

      const ini = Math.max(0, pos - 90);
      const fim = Math.min(
        m.antes.length,
        pos + atual.length + 90
      );

      const trechoAntes =
        m.antes.slice(ini, fim);

      const trechoDepois =
        m.depois.slice(
          ini,
          Math.min(
            m.depois.length,
            ini +
            trechoAntes.length +
            (proposta.length - atual.length) +
            10
          )
        );

      out('ANTES:');
      out(trechoAntes.replace(/\n/g, ' | '));

      out('DEPOIS:');
      out(trechoDepois.replace(/\n/g, ' | '));
    }
  }

  resultados.push(resultado);
}

out();
out(linha());
out(' 2. RESUMO DA SIMULAÇÃO');
out(linha());

const comOcorrencia =
  resultados.filter(x => x.ocorrencias > 0);

const semOcorrencia =
  resultados.filter(
    x => x.registroLocalizado &&
         x.ocorrencias === 0
  );

out(`CORREÇÕES TESTADAS: ${correcoes.length}`);
out(`REGISTROS LOCALIZADOS: ${totalLocalizadas}`);
out(`REGISTROS NÃO LOCALIZADOS: ${totalNaoLocalizadas}`);
out(`PONTOS COM OCORRÊNCIA EXATA: ${comOcorrencia.length}`);
out(`PONTOS SEM OCORRÊNCIA EXATA: ${semOcorrencia.length}`);
out(`TOTAL DE SUBSTITUIÇÕES SIMULADAS: ${totalOcorrencias}`);

if (semOcorrencia.length) {
  out();
  out('ATENÇÃO — NÃO APLICAR AUTOMATICAMENTE:');

  for (const x of semOcorrencia) {
    out(`- ${x.id}: "${x.atual}"`);
  }
}

const hashDepois = sha256(BASE);

out();
out(linha());
out(' 3. CONTROLE DE IMUTABILIDADE');
out(linha());
out(`HASH ANTES:  ${hashAntes}`);
out(`HASH DEPOIS: ${hashDepois}`);
out(
  `BASE MESTRE ALTERADA: ${
    hashAntes === hashDepois ? 'NÃO' : 'SIM'
  }`
);
out();

out(linha());
out(' ETAPA 10F CONCLUÍDA');
out(' ALTERAÇÕES REALIZADAS SOMENTE EM MEMÓRIA');
out(' ARQUIVO OFICIAL PRESERVADO');
out(linha());

const relatorio = {
  etapa: '10F',
  finalidade:
    'simulação controlada antes/depois',
  hashAntes,
  hashDepois,
  baseAlterada: hashAntes !== hashDepois,
  correcoesTestadas: correcoes.length,
  registrosLocalizados: totalLocalizadas,
  registrosNaoLocalizados: totalNaoLocalizadas,
  pontosComOcorrenciaExata: comOcorrencia.length,
  pontosSemOcorrenciaExata: semOcorrencia.length,
  totalSubstituicoesSimuladas: totalOcorrencias,
  resultados
};

fs.writeFileSync(
  OUT_JSON,
  JSON.stringify(relatorio, null, 2) + '\n'
);

fs.writeFileSync(
  OUT_TXT,
  txt
);

process.stdout.write(txt);

if (hashAntes !== hashDepois) {
  console.error(
    'ERRO CRÍTICO: BASE MESTRE FOI ALTERADA.'
  );
  process.exit(1);
}
