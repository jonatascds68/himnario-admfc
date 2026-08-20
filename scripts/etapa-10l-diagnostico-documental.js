const fs = require('fs');
const crypto = require('crypto');

const BASE = 'assets/base_mestre.json';
const OUT_JSON =
  'scripts/data/etapa-10l-diagnostico-documental.json';
const OUT_TXT =
  'scripts/data/etapa-10l-diagnostico-documental.txt';

const HASH_OFICIAL =
  '48cd4be20055aa9243a0a2223aef36376186dfd202f72ca4a4666015c44445a5';

function sha256(path) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(path))
    .digest('hex');
}

const hashAntes = sha256(BASE);

if (hashAntes !== HASH_OFICIAL) {
  console.error('ERRO: HASH DA BASE DIFERE DO OFICIAL.');
  console.error('ESPERADO:', HASH_OFICIAL);
  console.error('ATUAL:   ', hashAntes);
  process.exit(1);
}

const root = JSON.parse(fs.readFileSync(BASE, 'utf8'));

function collect(node, out = []) {
  if (!node || typeof node !== 'object') return out;

  if (
    typeof node.id === 'string' &&
    typeof node.titulo === 'string' &&
    Object.prototype.hasOwnProperty.call(node, 'letra')
  ) {
    out.push(node);
  }

  if (Array.isArray(node)) {
    for (const x of node) collect(x, out);
  } else {
    for (const v of Object.values(node)) collect(v, out);
  }

  return out;
}

const hymns = collect(root);

function get(id) {
  return hymns.find(h => h.id === id);
}

const gt041 = get('GT-041');
const gt042 = get('GT-042');
const gt283 = get('GT-283');

if (!gt041 || !gt042 || !gt283) {
  console.error('ERRO: um ou mais registros não foram localizados.');
  process.exit(1);
}

function count(text, term) {
  if (typeof text !== 'string') return 0;
  return text.split(term).length - 1;
}

const tituloManantial = 'HAY UN PRECIOSO MANANTIAL';

const diagnostico = {
  etapa: '10L',
  hash_oficial: HASH_OFICIAL,

  gt283: {
    id: gt283.id,
    numero: gt283.numero,
    titulo: gt283.titulo,
    termo_suspeito: 'tierra mis Allí',
    ocorrencias:
      count(gt283.letra, 'tierra mis Allí'),

    decisao:
      'BLOQUEADO_DOCUMENTAL',

    motivo:
      'A fonte textual anteriormente usada também contém a leitura suspeita; não existe evidência suficiente para reconstrução automática.'
  },

  gt041_gt042: {
    gt041: {
      titulo: gt041.titulo,
      letra: gt041.letra
    },

    gt042: {
      titulo: gt042.titulo,
      tamanho: String(gt042.letra || '').length,
      ocorrencias_titulo_interno:
        count(gt042.letra, tituloManantial)
    },

    titulo_igual:
      gt041.titulo === gt042.titulo,

    evidencia:
      [
        'GT-041 possui apenas o marcador estrutural "1".',
        'GT-041 e GT-042 possuem o mesmo título.',
        'GT-042 contém repetição interna do título.',
        'GT-042 contém duas sequências do mesmo conteúdo.',
        'O padrão é compatível com deslocamento de fronteira durante importação/transcrição.'
      ],

    decisao:
      'ERRO_DE_SEGMENTACAO_FORTEMENTE_CONFIRMADO',

    regra:
      'NÃO aplicar correção até definir documentalmente qual número pertence ao hino e qual conteúdo deveria ocupar o outro registro.'
  },

  alteracao_base: false
};

let txt = '';

function line(s = '') {
  txt += s + '\n';
}

line('============================================');
line(' AUDITORIA HINÁRIA - ETAPA 10L');
line(' DIAGNÓSTICO DOCUMENTAL CONSOLIDADO');
line(' SOMENTE LEITURA');
line('============================================');
line();

line('============================================');
line(' 1. CONTROLE');
line('============================================');
line(`HASH ATUAL:   ${hashAntes}`);
line(`HASH OFICIAL: ${HASH_OFICIAL}`);
line('HASH: OK');
line(`REGISTROS DETECTADOS: ${hymns.length}`);
line();

line('============================================');
line(' 2. GT-283 — EN LA MAÑANA');
line('============================================');
line(`TERMO: "tierra mis Allí"`);
line(
  `OCORRÊNCIAS: ${diagnostico.gt283.ocorrencias}`
);
line('DECISÃO: BLOQUEADO DOCUMENTAL');
line();
line(
  'A mesma leitura suspeita já estava presente no material'
);
line(
  'anterior marcado como VERIFICADO_FONTE.'
);
line(
  'Portanto, a marcação histórica de verificação não constitui'
);
line(
  'prova independente da leitura correta deste verso.'
);
line(
  'NÃO RECONSTRUIR POR INFERÊNCIA.'
);
line();

line('============================================');
line(' 3. GT-041 / GT-042');
line('============================================');
line(`GT-041 TÍTULO: ${gt041.titulo}`);
line(`GT-041 LETRA: ${JSON.stringify(gt041.letra)}`);
line();
line(`GT-042 TÍTULO: ${gt042.titulo}`);
line(
  `GT-042 TAMANHO: ${String(gt042.letra || '').length}`
);
line(
  `TÍTULO REPETIDO INTERNAMENTE: ${
    diagnostico.gt041_gt042.gt042
      .ocorrencias_titulo_interno
  }`
);
line();
line(
  `TÍTULOS GT-041/GT-042 IGUAIS: ${
    diagnostico.gt041_gt042.titulo_igual
      ? 'SIM'
      : 'NÃO'
  }`
);
line();

line('EVIDÊNCIAS:');
for (const e of diagnostico.gt041_gt042.evidencia) {
  line(`- ${e}`);
}
line();

line(
  'DECISÃO: ERRO DE SEGMENTAÇÃO FORTEMENTE CONFIRMADO'
);
line();
line(
  'IMPORTANTE: ainda não será decidido automaticamente'
);
line(
  'se HAY UN PRECIOSO MANANTIAL corresponde ao nº 41 ou 42.'
);
line(
  'Essa definição exige confirmação independente da numeração'
);
line(
  'da edição original.'
);
line();

line('============================================');
line(' 4. REAVALIAÇÃO DA MARCA VERIFICADO_FONTE');
line('============================================');
line(
  'A indicação histórica "VERIFICADO_FONTE" não é suficiente'
);
line(
  'para estes dois casos, porque os próprios dados derivados'
);
line(
  'da fonte preservaram as anomalias.'
);
line();
line(
  'GT-283: verificação textual independente necessária.'
);
line(
  'GT-041/042: verificação de paginação/numeração necessária.'
);
line();

line('============================================');
line(' 5. ESTADO APÓS A ETAPA 10L');
line('============================================');
line(
  'GT-182   -> RESOLVIDO COMO FALSO POSITIVO'
);
line(
  'SION-079 -> RESOLVIDO COMO FALSO POSITIVO'
);
line(
  'GT-283   -> BLOQUEADO DOCUMENTAL'
);
line(
  'GT-041/042 -> ERRO DE SEGMENTAÇÃO CONFIRMADO,'
);
line(
  '              NUMERAÇÃO AINDA BLOQUEADA'
);
line();

line('============================================');
line(' 6. PRÓXIMA ETAPA');
line('============================================');
line(
  'A Etapa 10M deverá preparar a resolução documental final'
);
line(
  'dos dois problemas restantes, sem inferir conteúdo.'
);
line();

const hashDepois = sha256(BASE);

line('============================================');
line(' 7. CONTROLE DE IMUTABILIDADE');
line('============================================');
line(`HASH ANTES:  ${hashAntes}`);
line(`HASH DEPOIS: ${hashDepois}`);
line(
  `BASE ALTERADA PELA 10L: ${
    hashAntes === hashDepois ? 'NÃO' : 'SIM'
  }`
);
line();

if (hashAntes !== hashDepois) {
  console.error(
    'ERRO CRÍTICO: BASE FOI ALTERADA DURANTE ETAPA DE LEITURA.'
  );
  process.exit(1);
}

fs.writeFileSync(
  OUT_JSON,
  JSON.stringify(diagnostico, null, 2) + '\n'
);

fs.writeFileSync(OUT_TXT, txt);

console.log(txt);

console.log('============================================');
console.log(' ETAPA 10L CONCLUÍDA');
console.log(' GT-283: BLOQUEADO DOCUMENTAL');
console.log(' GT-041/042: SEGMENTAÇÃO CONFIRMADA');
console.log(' NENHUMA ALTERAÇÃO NA BASE');
console.log('============================================');
