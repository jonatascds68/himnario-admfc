const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const BASE =
  'assets/base_mestre.json';

const APROVACAO =
  'scripts/data/etapa-10g-aprovacao-tecnica.json';

const BACKUP =
  'assets/base_mestre.bak-etapa-10h.json';

const TEMP =
  'assets/base_mestre.tmp-etapa-10h.json';

const OUT_JSON =
  'scripts/data/etapa-10h-aplicacao-transacional.json';

const OUT_TXT =
  'scripts/data/etapa-10h-aplicacao-transacional.txt';

const HASH_ANTES_ESPERADO =
  'a0a97173c5ce6fd7d39e22813a15576304218bfce2f85dbd694a726364835d41';

function sha256File(file) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(file))
    .digest('hex');
}

function linha() {
  return '============================================';
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

function substituirExatoNoRegistro(
  registro,
  atual,
  proposta
) {
  let total = 0;
  let campo = null;

  function walk(v, pathAtual = '') {
    if (typeof v === 'string') {
      const qtd =
        v.split(atual).length - 1;

      if (qtd > 0) {
        total += qtd;

        if (campo === null) {
          campo = pathAtual;
        }

        return v.split(atual).join(proposta);
      }

      return v;
    }

    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) {
        v[i] = walk(
          v[i],
          `${pathAtual}[${i}]`
        );
      }

      return v;
    }

    if (v && typeof v === 'object') {
      for (const k of Object.keys(v)) {
        v[k] = walk(
          v[k],
          pathAtual
            ? `${pathAtual}.${k}`
            : k
        );
      }

      return v;
    }

    return v;
  }

  walk(registro);

  return {
    substituicoes: total,
    campo
  };
}

let txt = '';

function out(s = '') {
  txt += s + '\n';
}

function abortar(msg) {
  out();
  out('ERRO CRÍTICO: ' + msg);

  if (fs.existsSync(TEMP)) {
    fs.unlinkSync(TEMP);
  }

  fs.writeFileSync(OUT_TXT, txt);

  console.error(txt);
  process.exit(1);
}

out(linha());
out(' AUDITORIA HINÁRIA - ETAPA 10H');
out(' APLICAÇÃO TRANSACIONAL');
out(' 14 CORREÇÕES APROVADAS');
out(linha());
out();

if (!fs.existsSync(BASE)) {
  abortar('Base Mestre não encontrada.');
}

if (!fs.existsSync(APROVACAO)) {
  abortar(
    'Relatório de aprovação da 10G não encontrado.'
  );
}

const hashAntes = sha256File(BASE);

out(linha());
out(' 1. PRÉ-CHECAGEM');
out(linha());

out(`HASH ATUAL:    ${hashAntes}`);
out(`HASH ESPERADO: ${HASH_ANTES_ESPERADO}`);

if (hashAntes !== HASH_ANTES_ESPERADO) {
  abortar(
    'Hash inicial diferente do hash aprovado.'
  );
}

out('HASH INICIAL: OK');

const aprovacao =
  JSON.parse(
    fs.readFileSync(APROVACAO, 'utf8')
  );

if (
  aprovacao.statusLote !==
  'APROVADO_TECNICAMENTE'
) {
  abortar(
    'Etapa 10G não marcou o lote como aprovado.'
  );
}

const lote =
  aprovacao.loteAprovado || [];

out(`CORREÇÕES RECEBIDAS: ${lote.length}`);

if (lote.length !== 14) {
  abortar(
    `Esperadas 14 correções; recebidas ${lote.length}.`
  );
}

/*
 * Criar backup ANTES de qualquer escrita.
 */
if (fs.existsSync(BACKUP)) {
  abortar(
    `Backup ${BACKUP} já existe. Nada foi sobrescrito.`
  );
}

fs.copyFileSync(BASE, BACKUP);

const hashBackup = sha256File(BACKUP);

out();
out(linha());
out(' 2. BACKUP');
out(linha());

out(`ARQUIVO: ${BACKUP}`);
out(`HASH BACKUP: ${hashBackup}`);

if (hashBackup !== hashAntes) {
  abortar(
    'Hash do backup difere da Base Mestre original.'
  );
}

out('BACKUP: ÍNTEGRO');

/*
 * Trabalhamos em memória.
 */
const baseOriginalText =
  fs.readFileSync(BASE, 'utf8');

const base =
  JSON.parse(baseOriginalText);

const objetos =
  coletarObjetos(base);

/*
 * Pré-validação completa antes de alterar
 * qualquer registro em memória.
 */
out();
out(linha());
out(' 3. PRÉ-VALIDAÇÃO DAS 14 CORREÇÕES');
out(linha());

for (const item of lote) {
  const registro =
    encontrar(objetos, item.id);

  if (!registro) {
    abortar(
      `${item.id}: registro não localizado.`
    );
  }

  const qtd =
    contarExato(
      registro,
      item.atual
    );

  out(
    `${item.id}: "${item.atual}" | ocorrências=${qtd}`
  );

  if (qtd !== 1) {
    abortar(
      `${item.id}: esperado exatamente 1 texto-alvo; encontrado ${qtd}.`
    );
  }
}

out('PRÉ-VALIDAÇÃO: OK');

/*
 * Aplicação em memória.
 */
const aplicadas = [];

out();
out(linha());
out(' 4. APLICAÇÃO EM MEMÓRIA');
out(linha());

for (const item of lote) {
  const registro =
    encontrar(objetos, item.id);

  const resultado =
    substituirExatoNoRegistro(
      registro,
      item.atual,
      item.proposta
    );

  if (resultado.substituicoes !== 1) {
    abortar(
      `${item.id}: substituição inesperada (${resultado.substituicoes}).`
    );
  }

  aplicadas.push({
    id: item.id,
    atual: item.atual,
    proposta: item.proposta,
    campo: resultado.campo,
    substituicoes:
      resultado.substituicoes
  });

  out(
    `${item.id}: "${item.atual}" -> "${item.proposta}" | OK`
  );
}

/*
 * Pós-validação ainda em memória.
 */
out();
out(linha());
out(' 5. PÓS-VALIDAÇÃO EM MEMÓRIA');
out(linha());

for (const item of lote) {
  const registro =
    encontrar(objetos, item.id);

  const velho =
    contarExato(
      registro,
      item.atual
    );

  if (velho !== 0) {
    abortar(
      `${item.id}: texto antigo ainda presente após simulação.`
    );
  }

  out(
    `${item.id}: texto antigo restante=${velho}`
  );
}

out('PÓS-VALIDAÇÃO EM MEMÓRIA: OK');

/*
 * Preserva o formato JSON padronizado.
 */
const novoConteudo =
  JSON.stringify(base, null, 2) + '\n';

/*
 * Grava primeiro em arquivo temporário.
 */
fs.writeFileSync(
  TEMP,
  novoConteudo,
  'utf8'
);

/*
 * Confirma que o temporário é JSON válido.
 */
try {
  JSON.parse(
    fs.readFileSync(TEMP, 'utf8')
  );
} catch (e) {
  abortar(
    'Arquivo temporário gerado não é JSON válido.'
  );
}

const hashTemp =
  sha256File(TEMP);

out();
out(linha());
out(' 6. ARQUIVO TEMPORÁRIO');
out(linha());

out(`TEMP: ${TEMP}`);
out(`HASH TEMP: ${hashTemp}`);
out('JSON TEMPORÁRIO: VÁLIDO');

/*
 * Só agora ocorre a escrita efetiva:
 * rename no mesmo filesystem.
 */
fs.renameSync(
  TEMP,
  BASE
);

const hashDepois =
  sha256File(BASE);

out();
out(linha());
out(' 7. ESCRITA ATÔMICA');
out(linha());

out('BASE MESTRE: SUBSTITUÍDA PELO TEMPORÁRIO');
out(`HASH ANTES:  ${hashAntes}`);
out(`HASH DEPOIS: ${hashDepois}`);

if (hashDepois === hashAntes) {
  /*
   * Isto seria inesperado porque 14 textos mudaram.
   * Restauramos por segurança.
   */
  fs.copyFileSync(
    BACKUP,
    BASE
  );

  abortar(
    'Hash não mudou após 14 correções; backup restaurado.'
  );
}

/*
 * Releitura física da base gravada.
 */
let baseFinal;

try {
  baseFinal =
    JSON.parse(
      fs.readFileSync(BASE, 'utf8')
    );
} catch (e) {
  fs.copyFileSync(
    BACKUP,
    BASE
  );

  abortar(
    'Base gravada ficou inválida; backup restaurado.'
  );
}

const objetosFinal =
  coletarObjetos(baseFinal);

out();
out(linha());
out(' 8. AUDITORIA PÓS-GRAVAÇÃO');
out(linha());

let falhou = false;

for (const item of lote) {
  const registro =
    encontrar(
      objetosFinal,
      item.id
    );

  if (!registro) {
    out(
      `${item.id}: ERRO — registro desapareceu`
    );

    falhou = true;
    continue;
  }

  const antigo =
    contarExato(
      registro,
      item.atual
    );

  /*
   * Não exigimos proposta=1 porque algumas
   * palavras corretas já podem aparecer em
   * outros pontos do mesmo hino.
   */
  const proposta =
    contarExato(
      registro,
      item.proposta
    );

  out(
    `${item.id}: antigo=${antigo} | proposta=${proposta}`
  );

  if (antigo !== 0) {
    falhou = true;
  }
}

if (falhou) {
  fs.copyFileSync(
    BACKUP,
    BASE
  );

  const hashRestaurado =
    sha256File(BASE);

  out();
  out(
    'FALHA NA AUDITORIA — BACKUP RESTAURADO.'
  );

  out(
    `HASH RESTAURADO: ${hashRestaurado}`
  );

  fs.writeFileSync(
    OUT_TXT,
    txt
  );

  console.error(txt);
  process.exit(1);
}

out('AUDITORIA PÓS-GRAVAÇÃO: OK');

/*
 * Confirmar que o backup continua sendo
 * exatamente a versão anterior.
 */
const hashBackupFinal =
  sha256File(BACKUP);

if (hashBackupFinal !== hashAntes) {
  abortar(
    'Backup foi alterado inesperadamente.'
  );
}

const relatorio = {
  etapa: '10H',

  status:
    'APLICADO_COM_SUCESSO',

  correcoesEsperadas: 14,
  correcoesAplicadas:
    aplicadas.length,

  hashAnteriorOficial:
    hashAntes,

  novoHashOficial:
    hashDepois,

  backup: {
    arquivo: BACKUP,
    hash: hashBackupFinal,
    integro:
      hashBackupFinal === hashAntes
  },

  aplicadas,

  bloqueadosMantidos: [
    'GT-283',
    'GT-042',
    'GT-182',
    'SION-079'
  ]
};

fs.writeFileSync(
  OUT_JSON,
  JSON.stringify(
    relatorio,
    null,
    2
  ) + '\n'
);

out();
out(linha());
out(' 9. RESULTADO FINAL');
out(linha());

out(
  `CORREÇÕES APLICADAS: ${aplicadas.length}`
);

out(
  'CASOS BLOQUEADOS ALTERADOS: NÃO'
);

out(
  `BACKUP PRESERVADO: ${BACKUP}`
);

out(
  `HASH ANTERIOR: ${hashAntes}`
);

out(
  `NOVO HASH OFICIAL: ${hashDepois}`
);

out();

out(linha());
out(' ETAPA 10H CONCLUÍDA COM SUCESSO');
out(' 14 CORREÇÕES APLICADAS');
out(' BASE MESTRE VALIDADA');
out(' BACKUP PRESERVADO');
out(' NOVO HASH OFICIAL GERADO');
out(linha());

fs.writeFileSync(
  OUT_TXT,
  txt
);

process.stdout.write(txt);
