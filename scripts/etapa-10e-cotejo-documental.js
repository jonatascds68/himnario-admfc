const fs = require('fs');
const crypto = require('crypto');

const BASE = 'assets/base_mestre.json';
const PACOTE = 'scripts/data/etapa-10d-pacote-cotejo.json';

const OUT_JSON = 'scripts/data/etapa-10e-cotejo-documental.json';
const OUT_TXT  = 'scripts/data/etapa-10e-cotejo-documental.txt';

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

if (!fs.existsSync(BASE)) {
  console.error('ERRO: Base Mestre não encontrada.');
  process.exit(1);
}

if (!fs.existsSync(PACOTE)) {
  console.error('ERRO: pacote da Etapa 10D não encontrado.');
  process.exit(1);
}

const hashAntes = sha256(BASE);

if (hashAntes !== HASH_OFICIAL) {
  console.error('ERRO: HASH DA BASE DIFERE DO HASH OFICIAL.');
  console.error('ESPERADO:', HASH_OFICIAL);
  console.error('ATUAL:   ', hashAntes);
  console.error('AUDITORIA INTERROMPIDA.');
  process.exit(1);
}

const base = JSON.parse(fs.readFileSync(BASE, 'utf8'));
const pacote = JSON.parse(fs.readFileSync(PACOTE, 'utf8'));

const alvos = [
  {
    id: 'GT-040',
    classe: 'PONTUACAO_OCR',
    atual: 'oid, .',
    proposta: 'oid,',
    decisao: 'CANDIDATO_CORRECAO_SEGURA',
    motivo: 'Sequência vírgula + espaço + ponto é forte resíduo de OCR.'
  },
  {
    id: 'GT-056',
    classe: 'OCR_I_MAIUSCULO_POR_L',
    atual: 'serIe',
    proposta: 'serle',
    decisao: 'CANDIDATO_CORRECAO_SEGURA',
    motivo: 'I maiúsculo no interior da palavra é compatível com erro OCR de l minúsculo.'
  },
  {
    id: 'SION-026',
    classe: 'OCR_I_MAIUSCULO_POR_L',
    atual: 'serIe',
    proposta: 'serle',
    decisao: 'CANDIDATO_CORRECAO_SEGURA',
    motivo: 'Mesmo erro presente no par GT/Sión.'
  },
  {
    id: 'GT-161',
    classe: 'ESPACO_ANTES_PONTUACAO',
    atual: 'serás . De',
    proposta: 'serás. De',
    decisao: 'CANDIDATO_CORRECAO_SEGURA',
    motivo: 'Espaço indevido antes do ponto.'
  },
  {
    id: 'GT-283',
    classe: 'TEXTO_SUSPEITO_REQUER_FONTE',
    atual: 'tierra mis Allí',
    proposta: null,
    decisao: 'REQUER_COTEJO_VISUAL',
    motivo: 'Não deve ser reconstruído apenas por inferência textual.'
  },
  {
    id: 'GT-018',
    classe: 'OCR_I_MAIUSCULO_POR_L',
    atual: 'referirIa',
    proposta: 'referirla',
    decisao: 'CANDIDATO_CORRECAO_SEGURA',
    motivo: 'Forma contextual e padrão OCR indicam l minúsculo.'
  },
  {
    id: 'GT-018',
    classe: 'PONTUACAO_OCR',
    atual: 'buen .Jesús',
    proposta: 'buen Jesús',
    decisao: 'CANDIDATO_CORRECAO_SEGURA',
    motivo: 'Ponto intrusivo entre adjetivo e substantivo próprio.'
  },
  {
    id: 'SION-128',
    classe: 'OCR_I_MAIUSCULO_POR_L',
    atual: 'referirIa',
    proposta: 'referirla',
    decisao: 'CANDIDATO_CORRECAO_SEGURA',
    motivo: 'Mesmo padrão OCR encontrado no correspondente GT.'
  },
  {
    id: 'SION-128',
    classe: 'PONTUACAO_OCR',
    atual: 'buen .Jesús',
    proposta: 'buen Jesús',
    decisao: 'CANDIDATO_CORRECAO_SEGURA',
    motivo: 'Ponto intrusivo evidente.'
  },
  {
    id: 'GT-007',
    classe: 'OCR_I_MAIUSCULO_POR_L',
    atual: 'serIe',
    proposta: 'serle',
    decisao: 'CANDIDATO_CORRECAO_SEGURA',
    motivo: 'Erro OCR recorrente.'
  },
  {
    id: 'SION-011',
    classe: 'OCR_I_MAIUSCULO_POR_L',
    atual: 'serIe',
    proposta: 'serle',
    decisao: 'CANDIDATO_CORRECAO_SEGURA',
    motivo: 'Erro OCR recorrente no par correspondente.'
  },
  {
    id: 'GT-025',
    classe: 'OCR_I_MAIUSCULO_POR_L',
    atual: 'serIe',
    proposta: 'serle',
    decisao: 'CANDIDATO_CORRECAO_SEGURA',
    motivo: 'Erro OCR recorrente.'
  },
  {
    id: 'SION-134',
    classe: 'OCR_I_MAIUSCULO_POR_L',
    atual: 'serIe',
    proposta: 'serle',
    decisao: 'CANDIDATO_CORRECAO_SEGURA',
    motivo: 'Erro OCR recorrente no correspondente Sión.'
  },
  {
    id: 'GT-102',
    classe: 'OCR_I_MAIUSCULO_POR_L',
    atual: 'hazIo',
    proposta: 'hazlo',
    decisao: 'CANDIDATO_CORRECAO_SEGURA',
    motivo: 'I maiúsculo é incompatível com a palavra espanhola; provável l minúsculo.'
  },
  {
    id: 'SION-044',
    classe: 'OCR_I_MAIUSCULO_POR_L',
    atual: 'hazIo',
    proposta: 'hazlo',
    decisao: 'CANDIDATO_CORRECAO_SEGURA',
    motivo: 'Mesmo erro presente no par correspondente.'
  },
  {
    id: 'GT-042',
    classe: 'ESTRUTURA_NUMERACAO',
    atual: null,
    proposta: null,
    decisao: 'REQUER_COTEJO_ESTRUTURAL',
    motivo: 'Há evidência de conteúdo duplicado/justaposto envolvendo os registros 41 e 42.'
  },
  {
    id: 'GT-182',
    classe: 'SALTO_NUMERICO',
    atual: '1 -> 3',
    proposta: null,
    decisao: 'REQUER_COTEJO_VISUAL',
    motivo: 'O salto estrutural precisa ser confirmado na edição fonte.'
  },
  {
    id: 'SION-079',
    classe: 'SALTO_NUMERICO',
    atual: '1 -> 3',
    proposta: null,
    decisao: 'REQUER_COTEJO_VISUAL',
    motivo: 'O salto estrutural precisa ser confirmado na edição fonte.'
  }
];

const candidatos =
  alvos.filter(x => x.decisao === 'CANDIDATO_CORRECAO_SEGURA');

const visuais =
  alvos.filter(x => x.decisao === 'REQUER_COTEJO_VISUAL');

const estruturais =
  alvos.filter(x => x.decisao === 'REQUER_COTEJO_ESTRUTURAL');

let txt = '';

function out(s = '') {
  txt += s + '\n';
}

out(linha());
out(' AUDITORIA HINÁRIA - ETAPA 10E');
out(' COTEJO DOCUMENTAL DOS 16 PRIORITÁRIOS');
out(' NENHUMA CORREÇÃO APLICADA');
out(linha());
out();

out(linha());
out(' 1. CONTROLE DA BASE');
out(linha());
out(`HASH ATUAL:   ${hashAntes}`);
out(`HASH OFICIAL: ${HASH_OFICIAL}`);
out(`HASH: ${hashAntes === HASH_OFICIAL ? 'OK' : 'DIVERGENTE'}`);
out(`TOTAL BASE: ${Array.isArray(base) ? base.length : 'estrutura não-array'}`);
out();

out(linha());
out(' 2. CLASSIFICAÇÃO DOS PONTOS DE COTEJO');
out(linha());

alvos.forEach((x, i) => {
  out();
  out(`${String(i + 1).padStart(2, '0')}. ${x.id}`);
  out(`CLASSE: ${x.classe}`);
  if (x.atual !== null) out(`ATUAL: "${x.atual}"`);
  if (x.proposta !== null) out(`PROPOSTA: "${x.proposta}"`);
  out(`CLASSIFICAÇÃO: ${x.decisao}`);
  out(`MOTIVO: ${x.motivo}`);
});

out();
out(linha());
out(' 3. CANDIDATOS A CORREÇÃO SEGURA');
out(linha());
out(`TOTAL: ${candidatos.length}`);

candidatos.forEach(x => {
  out(`- ${x.id}: "${x.atual}" -> "${x.proposta}"`);
});

out();
out(linha());
out(' 4. CASOS QUE CONTINUAM DEPENDENTES DA FONTE');
out(linha());

visuais.forEach(x => {
  out(`- ${x.id}: ${x.motivo}`);
});

out();
out(linha());
out(' 5. CASOS ESTRUTURAIS');
out(linha());

estruturais.forEach(x => {
  out(`- ${x.id}: ${x.motivo}`);
});

out();
out(linha());
out(' 6. REGRA PARA A PRÓXIMA ETAPA');
out(linha());
out('NENHUMA hipótese será aplicada automaticamente.');
out('A Etapa 10F deverá simular cada alteração sobre uma cópia');
out('e demonstrar exatamente o ANTES e o DEPOIS.');
out('Casos visuais/estruturais permanecem bloqueados.');
out();

const hashDepois = sha256(BASE);

out(linha());
out(' 7. CONTROLE DE IMUTABILIDADE');
out(linha());
out(`HASH ANTES:  ${hashAntes}`);
out(`HASH DEPOIS: ${hashDepois}`);
out(`BASE MESTRE ALTERADA: ${hashAntes === hashDepois ? 'NÃO' : 'SIM'}`);
out();

out(linha());
out(' ETAPA 10E CONCLUÍDA');
out(` CANDIDATOS SEGUROS: ${candidatos.length}`);
out(` PENDENTES VISUAIS: ${visuais.length}`);
out(` PENDENTES ESTRUTURAIS: ${estruturais.length}`);
out(' NENHUMA CORREÇÃO APLICADA');
out(linha());

const resultado = {
  etapa: '10E',
  base: BASE,
  hashAntes,
  hashDepois,
  baseAlterada: hashAntes !== hashDepois,
  registrosPrioritarios: 16,
  pontosDeCotejo: alvos.length,
  candidatosCorrecaoSegura: candidatos.length,
  requerCotejoVisual: visuais.length,
  requerCotejoEstrutural: estruturais.length,
  alvos
};

fs.writeFileSync(
  OUT_JSON,
  JSON.stringify(resultado, null, 2) + '\n'
);

fs.writeFileSync(OUT_TXT, txt);

process.stdout.write(txt);

if (hashAntes !== hashDepois) {
  console.error('ERRO CRÍTICO: A BASE FOI ALTERADA.');
  process.exit(1);
}
