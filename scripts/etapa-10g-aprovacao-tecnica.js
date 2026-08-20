const fs = require('fs');
const crypto = require('crypto');

const BASE =
  'assets/base_mestre.json';

const SIM =
  'scripts/data/etapa-10f-simulacao-controlada.json';

const OUT_JSON =
  'scripts/data/etapa-10g-aprovacao-tecnica.json';

const OUT_TXT =
  'scripts/data/etapa-10g-aprovacao-tecnica.txt';

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

function norm(v) {
  return String(v ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
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

function contarEmStrings(valor, termo) {
  let total = 0;
  const locais = [];

  function walk(v, path = '') {
    if (typeof v === 'string') {
      const qtd =
        v.split(termo).length - 1;

      if (qtd > 0) {
        total += qtd;

        locais.push({
          campo: path,
          ocorrencias: qtd
        });
      }

      return;
    }

    if (Array.isArray(v)) {
      v.forEach(
        (x, i) =>
          walk(x, `${path}[${i}]`)
      );
      return;
    }

    if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) {
        walk(
          x,
          path ? `${path}.${k}` : k
        );
      }
    }
  }

  walk(valor);

  return {
    total,
    locais
  };
}

if (!fs.existsSync(BASE)) {
  console.error('ERRO: Base Mestre ausente.');
  process.exit(1);
}

if (!fs.existsSync(SIM)) {
  console.error(
    'ERRO: relatório da Etapa 10F ausente.'
  );
  process.exit(1);
}

const hashAntes = sha256(BASE);

if (hashAntes !== HASH_OFICIAL) {
  console.error(
    'ERRO: HASH DA BASE NÃO É O OFICIAL.'
  );
  console.error('ATUAL:   ', hashAntes);
  console.error('OFICIAL: ', HASH_OFICIAL);
  process.exit(1);
}

const base =
  JSON.parse(fs.readFileSync(BASE, 'utf8'));

const sim =
  JSON.parse(fs.readFileSync(SIM, 'utf8'));

const objetos =
  coletarObjetos(base);

/*
 * O manifesto nasce diretamente do resultado
 * validado da Etapa 10F.
 */
const candidatos =
  (sim.resultados || [])
    .filter(
      x =>
        x.registroLocalizado === true &&
        x.ocorrencias === 1
    )
    .map(x => ({
      id: x.id,
      atual: x.atual,
      proposta: x.proposta
    }));

const bloqueados = [
  {
    id: 'GT-283',
    motivo:
      'Texto suspeito requer cotejo visual com fonte.'
  },
  {
    id: 'GT-042',
    motivo:
      'Estrutura/numeração requer cotejo documental.'
  },
  {
    id: 'GT-182',
    motivo:
      'Salto numérico requer confirmação da fonte.'
  },
  {
    id: 'SION-079',
    motivo:
      'Salto numérico requer confirmação da fonte.'
  }
];

let txt = '';

function out(s = '') {
  txt += s + '\n';
}

out(linha());
out(' AUDITORIA HINÁRIA - ETAPA 10G');
out(' APROVAÇÃO TÉCNICA DO LOTE');
out(' SOMENTE LEITURA');
out(linha());
out();

out(linha());
out(' 1. CONTROLE');
out(linha());

out(`HASH ATUAL:   ${hashAntes}`);
out(`HASH OFICIAL: ${HASH_OFICIAL}`);
out('HASH: OK');

out(
  `CANDIDATOS RECEBIDOS DA 10F: ${candidatos.length}`
);

out(
  `CASOS BLOQUEADOS: ${bloqueados.length}`
);

out();

const aprovados = [];
const rejeitados = [];

out(linha());
out(' 2. VALIDAÇÃO INDIVIDUAL');
out(linha());

candidatos.forEach((c, i) => {
  const registro =
    encontrar(objetos, c.id);

  out();
  out(
    `${String(i + 1).padStart(2, '0')}. ${c.id}`
  );

  out(`ATUAL:    "${c.atual}"`);
  out(`PROPOSTA: "${c.proposta}"`);

  if (!registro) {
    out('REGISTRO: NÃO LOCALIZADO');
    out('DECISÃO: REJEITADO');

    rejeitados.push({
      ...c,
      motivo: 'registro não localizado'
    });

    return;
  }

  const atual =
    contarEmStrings(registro, c.atual);

  const proposta =
    contarEmStrings(registro, c.proposta);

  out('REGISTRO: LOCALIZADO');

  out(
    `OCORRÊNCIAS DO TEXTO ATUAL: ${atual.total}`
  );

  out(
    `OCORRÊNCIAS DA PROPOSTA JÁ EXISTENTES: ${proposta.total}`
  );

  if (atual.locais.length) {
    out(
      'CAMPO(S): ' +
      atual.locais
        .map(x => x.campo)
        .join(', ')
    );
  }

  /*
   * Para aprovação automática:
   *
   * 1. registro existe;
   * 2. texto errado ocorre exatamente uma vez;
   * 3. proposta ainda não substituiu o texto-alvo.
   *
   * A existência da palavra correta em outro trecho
   * não invalida necessariamente a correção, portanto
   * não usamos proposta.total como bloqueio.
   */
  if (atual.total === 1) {
    out('DECISÃO: APROVADO TECNICAMENTE');

    aprovados.push({
      ...c,
      campo: atual.locais[0]?.campo ?? null,
      ocorrencias: atual.total
    });
  } else {
    out('DECISÃO: REJEITADO / REVISÃO MANUAL');

    rejeitados.push({
      ...c,
      motivo:
        `texto atual possui ${atual.total} ocorrências`
    });
  }
});

out();
out(linha());
out(' 3. LOTE APROVADO');
out(linha());

out(`TOTAL APROVADO: ${aprovados.length}`);

aprovados.forEach((x, i) => {
  out(
    `${String(i + 1).padStart(2, '0')}. ` +
    `${x.id}: "${x.atual}" -> "${x.proposta}"`
  );
});

out();
out(linha());
out(' 4. REJEITADOS');
out(linha());

out(`TOTAL REJEITADO: ${rejeitados.length}`);

if (!rejeitados.length) {
  out('NENHUM.');
} else {
  rejeitados.forEach(x => {
    out(
      `- ${x.id}: ${x.motivo}`
    );
  });
}

out();
out(linha());
out(' 5. CASOS BLOQUEADOS');
out(linha());

bloqueados.forEach(x => {
  out(`- ${x.id}: ${x.motivo}`);
});

out();
out(linha());
out(' 6. REGRA DE SEGURANÇA');
out(linha());

if (
  aprovados.length === 14 &&
  rejeitados.length === 0
) {
  out('STATUS DO LOTE: APROVADO TECNICAMENTE');
  out(
    'O lote está apto para preparação da correção controlada.'
  );
} else {
  out('STATUS DO LOTE: NÃO APROVADO');
  out(
    'NÃO executar qualquer escrita na Base Mestre.'
  );
}

const hashDepois = sha256(BASE);

out();
out(linha());
out(' 7. CONTROLE DE IMUTABILIDADE');
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
out(' ETAPA 10G CONCLUÍDA');
out(` APROVADOS: ${aprovados.length}`);
out(` REJEITADOS: ${rejeitados.length}`);
out(` BLOQUEADOS: ${bloqueados.length}`);
out(' NENHUMA CORREÇÃO APLICADA');
out(linha());

const relatorio = {
  etapa: '10G',
  hashAntes,
  hashDepois,
  baseAlterada:
    hashAntes !== hashDepois,

  candidatosRecebidos:
    candidatos.length,

  aprovados: aprovados.length,
  rejeitados: rejeitados.length,
  bloqueados: bloqueados.length,

  statusLote:
    aprovados.length === 14 &&
    rejeitados.length === 0
      ? 'APROVADO_TECNICAMENTE'
      : 'NAO_APROVADO',

  loteAprovado: aprovados,
  loteRejeitado: rejeitados,
  casosBloqueados: bloqueados
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
