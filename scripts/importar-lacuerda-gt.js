const fs = require('fs');

const INDEX =
  'https://acordes.lacuerda.net/himnos_de_gloria_y_triunfo/';

const BASE =
  'assets/base_mestre.json';

const CATALOG =
  'scripts/data/gt-fontes.json';

const REPORT =
  'scripts/data/gt-lacuerda-relatorio.json';

function decodeHtml(text) {
  return text
    .replace(/&aacute;/gi, 'á')
    .replace(/&eacute;/gi, 'é')
    .replace(/&iacute;/gi, 'í')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&uacute;/gi, 'ú')
    .replace(/&ntilde;/gi, 'ñ')
    .replace(/&uuml;/gi, 'ü')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function norm(text) {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  console.log('Baixando índice LaCuerda...');

  const response = await fetch(INDEX);

  if (!response.ok) {
    throw new Error(
      `Falha HTTP ${response.status}`
    );
  }

  const html = await response.text();

  const db = JSON.parse(
    fs.readFileSync(BASE, 'utf8')
  );

  const catalog = JSON.parse(
    fs.readFileSync(CATALOG, 'utf8')
  );

  const gt = db.himnos.filter(
    h =>
      h.himnario ===
      'Gloria y Triunfo'
  );

  const existing =
    new Map(
      (catalog.registros || []).map(
        r => [Number(r.numero), r]
      )
    );

  const links = [];

  const regex =
    /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match;

  while ((match = regex.exec(html))) {
    let href = match[1];
    let title = decodeHtml(match[2]);

    if (
      !href.includes(
        'himnos_de_gloria_y_triunfo'
      )
    ) {
      continue;
    }

    title = title
      .replace(/\s+acordes$/i, '')
      .trim();

    if (!title) continue;

    if (href.startsWith('/')) {
      href =
        'https://acordes.lacuerda.net' +
        href;
    } else if (
      !/^https?:\/\//i.test(href)
    ) {
      href =
        new URL(href, INDEX).href;
    }

    links.push({
      title,
      href,
    });
  }

  const uniqueLinks = [
    ...new Map(
      links.map(x => [
        `${norm(x.title)}|${x.href}`,
        x,
      ])
    ).values(),
  ];

  const added = [];
  const already = [];
  const missing = [];
  const ambiguous = [];
  const skipped = [];

  for (const source of uniqueLinks) {
    const external =
      source.title.trim();

    // Casos genéricos do tipo "Himno 28"
    if (/^HIMNO\s+\d+$/i.test(external)) {
      skipped.push({
        source: external,
        reason:
          'Título genérico sem confirmação textual',
      });
      continue;
    }

    // Corrige entradas como:
    // "36 entera consagración"
    const numbered =
      external.match(
        /^(\d+)\s+(.+)$/
      );

    let candidates = [];

    if (numbered) {
      const numero =
        Number(numbered[1]);

      const titlePart =
        numbered[2];

      const h = gt.find(
        item =>
          item.numero === numero &&
          norm(item.titulo) ===
            norm(titlePart)
      );

      if (h) candidates = [h];
    } else {
      candidates = gt.filter(
        h =>
          norm(h.titulo) ===
          norm(external)
      );
    }

    if (candidates.length === 0) {
      missing.push({
        source: external,
        url: source.href,
      });
      continue;
    }

    if (candidates.length > 1) {
      ambiguous.push({
        source: external,
        matches:
          candidates.map(h => ({
            numero: h.numero,
            titulo: h.titulo,
          })),
      });
      continue;
    }

    const hymn = candidates[0];

    if (existing.has(hymn.numero)) {
      already.push({
        numero: hymn.numero,
        titulo: hymn.titulo,
      });
      continue;
    }

    const record = {
      numero: hymn.numero,
      titulo: hymn.titulo,
      cifra_url: source.href,
      cifra_notas:
        'Cifra externa encontrada no índice de Himnos de Gloria y Triunfo da LaCuerda; referenciada, não incorporada.',
    };

    existing.set(
      hymn.numero,
      record
    );

    added.push({
      numero: hymn.numero,
      titulo: hymn.titulo,
      url: source.href,
    });
  }

  catalog.registros =
    [...existing.values()]
      .sort(
        (a, b) =>
          Number(a.numero) -
          Number(b.numero)
      );

  fs.copyFileSync(
    CATALOG,
    CATALOG +
      '.bak-antes-importacao-lacuerda'
  );

  fs.writeFileSync(
    CATALOG,
    JSON.stringify(
      catalog,
      null,
      2
    ) + '\n'
  );

  const report = {
    fonte: INDEX,
    encontrados_no_indice:
      uniqueLinks.length,
    novos: added,
    ja_catalogados: already,
    nao_encontrados: missing,
    ambiguos: ambiguous,
    ignorados: skipped,
  };

  fs.writeFileSync(
    REPORT,
    JSON.stringify(
      report,
      null,
      2
    ) + '\n'
  );

  console.log('');
  console.log(
    'Links encontrados:',
    uniqueLinks.length
  );
  console.log(
    'Novos confirmados:',
    added.length
  );
  console.log(
    'Já catalogados:',
    already.length
  );
  console.log(
    'Não encontrados:',
    missing.length
  );
  console.log(
    'Ambíguos:',
    ambiguous.length
  );
  console.log(
    'Ignorados:',
    skipped.length
  );
  console.log(
    'CATÁLOGO TOTAL:',
    catalog.registros.length
  );

  console.log(
    '\n=== NOVOS ==='
  );

  for (const h of added) {
    console.log(
      `GT ${String(
        h.numero
      ).padStart(3, '0')} | ${h.titulo}`
    );
  }

  console.log(
    '\nRelatório:',
    REPORT
  );
}

main().catch(error => {
  console.error(
    'ERRO:',
    error.message
  );
  process.exit(1);
});
