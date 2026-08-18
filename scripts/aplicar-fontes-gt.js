const fs = require('fs');

const basePath = 'assets/base_mestre.json';
const sourcesPath = 'scripts/data/gt-fontes.json';

const base = JSON.parse(fs.readFileSync(basePath, 'utf8'));
const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'));

const gt = base.himnos.filter(
  h => h.himnario === 'Gloria y Triunfo'
);

let applied = 0;
let skipped = 0;

for (const src of sources.registros || []) {
  const hymn = gt.find(h => h.numero === src.numero);

  if (!hymn) {
    console.log(`SKIP GT ${src.numero}: não encontrado`);
    skipped++;
    continue;
  }

  if (
    src.titulo &&
    hymn.titulo.trim().toUpperCase() !==
      src.titulo.trim().toUpperCase()
  ) {
    console.log(
      `SKIP GT ${src.numero}: título divergente`
    );
    console.log(`  Base:  ${hymn.titulo}`);
    console.log(`  Fonte: ${src.titulo}`);
    skipped++;
    continue;
  }

  // Tom: só preenche se a base ainda não possuir um tom definido.
  if (src.tom && !hymn.tom) {
    hymn.tom = src.tom;
  }

  if (src.cifra_url) {
    hymn.cifra_url = src.cifra_url;

    const cifraAutorizada =
      src.cifra_autorizada === true;

    hymn.cifra_autorizada = cifraAutorizada;

    hymn.cifra_procedencia = {
      fuente: src.cifra_url,
      tipo: 'enlace_externo',
      autorizado: cifraAutorizada,
      notas:
        src.cifra_notas ||
        'Cifra externa referenciada; conteúdo não incorporado.'
    };
  }

  if (src.audio_external_url) {
    hymn.audio_external_url =
      src.audio_external_url;

    const audioAutorizado =
      src.audio_autorizado === true;

    hymn.audio_autorizado =
      audioAutorizado;

    hymn.audio_procedencia = {
      fuente: src.audio_external_url,
      tipo: 'enlace_externo',
      autorizado: audioAutorizado,
      notas:
        src.audio_notas ||
        'Áudio externo referenciado; conteúdo não redistribuído.'
    };
  }

  applied++;
}

fs.copyFileSync(
  basePath,
  'assets/base_mestre.bak-antes-fontes-gt.json'
);

fs.writeFileSync(
  basePath,
  JSON.stringify(base, null, 2) + '\n'
);

console.log('');
console.log('Aplicados:', applied);
console.log('Ignorados:', skipped);
