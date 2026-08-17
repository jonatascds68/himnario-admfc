const fs = require('fs');

const FILE = './assets/base_mestre.json';

const CATS = {
  'Actividad Cristiana': [
    38,301,1,127,192,285,120,211,261,154,317,40,150,8,159,283,223,118,219,
    218,146,210,170,241,197,291,273,75,7,262,231,290,80,22,151,70,126,171,84
  ],

  'Alabanza a Dios': [
    318,103,23,66,27,79,69,201,281
  ],

  'Amor y Gracia de Dios': [
    179,115,293,278
  ],

  'Año Nuevo': [
    217
  ],

  'Apertura de Cultos': [
    254,264
  ],

  'Ayuda de Dios en las Pruebas': [
    233,33,24,34,309,161,251,278
  ],

  'Bautismo en el Espíritu Santo': [
    204,274,106,4,266,162,190,165,5,257,269,152,178,44,49
  ],

  'Bautismo en las Aguas': [
    67
  ],

  'Bienvenidas': [
    112,121,177
  ],

  'Bodas': [
    96,76
  ],

  'Cena del Señor': [
    99,91
  ],

  'Cielo - Gloriosa Esperanza': [
    12,312,205,149,63,130,72,299,246,10,223,71,311,226,292,110,15,215,55,
    199,248,268,209,194,272,270,128,282,314,28,54,173,2,277,157,303,172,252,132
  ],

  'Consagración': [
    36,3,243,276,309,206,19,65,295,78,45,307,100,273,42,11
  ],

  'Coros': [
    308,296,87,294,238,300,304,298,302
  ],

  'Despedida': [
    247,236
  ],

  'Escuela Dominical': [
    242,92,87,185,43,155,240,93,158,156,89,316,90,88
  ],

  'Fe y Confianza': [
    138,9
  ],

  'Gozo y Paz de los Creyentes': [
    282,315,237,253,305,266,248,50,275,159,16,191,6,163,263,185,260,14,53,
    122,148,77,60,280,279,310,207
  ],

  'Iglesia': [
    86
  ],

  'Invitación': [
    297,198,180,214,288,267,124,229,119,239,35,37,265,153,182,148,287,141,
    313,255,143
  ],

  'Jesús Salvador y Amigo': [
    104,50,101,139,18,212,208,48,74,259,20,174,82,225,56,83,107,200,258,309,
    131,196,181,188,31,73,136,286,145,164,167,85,26,102,54,278,51,98,30,105,
    41,114,77,224,29,306,144,245,21,39
  ],

  'Navidad': [
    140,141,160,256,94,221,250,95
  ],

  'Oración - Culto': [
    133,111,166,193,129,271,147,62,244
  ],

  'Pascua': [
    220,169,183,230,249
  ],

  'Sagradas Escrituras': [
    108,227,195,175,81,58,97
  ],

  'Sanidad Divina': [
    134,63,235
  ],

  'Sangre, Redención, Salvación': [
    168,186,13,57,32,117,189,176,112,222,213,17
  ],

  'Segunda Venida': [
    311,109,116,52,61
  ],

  'Sufrimiento y Muerte de Jesús': [
    184,25,46,203,289,216,47,202,123
  ]
};

const d = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const sion = (d.himnos || []).filter(h => h.himnario === 'Himnos de Sión');

const porNumero = new Map();

for (const [categoria, nums] of Object.entries(CATS)) {
  for (const n of nums) {
    if (!porNumero.has(n)) porNumero.set(n, []);
    porNumero.get(n).push(categoria);
  }
}

const inexistentes = [];
for (const n of porNumero.keys()) {
  if (!sion.some(h => Number(h.numero) === n)) inexistentes.push(n);
}

const classificados = sion.filter(h => porNumero.has(Number(h.numero)));
const semCategoria = sion.filter(h => !porNumero.has(Number(h.numero)));

console.log('CATEGORIAS PDF:', Object.keys(CATS).length);
console.log('REFERÊNCIAS CATEGORIA/HINO:', Object.values(CATS).flat().length);
console.log('HINOS ÚNICOS CLASSIFICADOS:', classificados.length);
console.log('HINOS SIÓN SEM CATEGORIA NO ÍNDICE:', semCategoria.length);
console.log(
  'NÚMEROS SEM CATEGORIA:',
  semCategoria.map(h => h.numero).join(', ') || 'ninguno'
);
console.log(
  'NÚMEROS DO MAPA INEXISTENTES NA BASE:',
  inexistentes.join(', ') || 'ninguno'
);

console.log('\nAMOSTRA DE MULTICATEGORIA:');
for (const h of classificados.filter(h => porNumero.get(Number(h.numero)).length > 1).slice(0, 20)) {
  console.log(
    `Sión Nº ${h.numero} - ${h.titulo} => ${porNumero.get(Number(h.numero)).join(' | ')}`
  );
}

if (process.argv.includes('--apply')) {
  for (const h of sion) {
    const categorias = porNumero.get(Number(h.numero));
    if (categorias) h.categorias = categorias;
    else delete h.categorias;
  }

  fs.writeFileSync(FILE, JSON.stringify(d, null, 2) + '\n');
  console.log('\nBASE ATUALIZADA COM SUCESSO.');
} else {
  console.log('\nMODO AUDITORIA: nenhuma alteração foi gravada.');
}
