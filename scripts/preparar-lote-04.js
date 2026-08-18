const fs = require("fs");

const BASE = "assets/base_mestre.json";
const CAT = "scripts/data/gt-fontes.json";
const OUT = "scripts/data/gt-lote-consolidado-04.json";

/*
  Números explicitamente identificados na coleção pesquisada.
  Nesta etapa registramos a FONTE EXTERNA, sem copiar a cifra
  para dentro do aplicativo.
*/
const numerosFonte = [
  1, 2, 3, 4, 7, 8, 12, 20, 30, 31,
  33, 41, 43, 44, 45, 49, 50, 52, 53
];

const fonte =
  "https://es.scribd.com/document/710656090/Acordes-Himnos-de-Gloria-y-Triunfo";

const db = JSON.parse(fs.readFileSync(BASE, "utf8"));
const cat = JSON.parse(fs.readFileSync(CAT, "utf8"));

const catalogados = new Set(
  (cat.registros || []).map(r => Number(r.numero))
);

const gt = new Map(
  db.himnos
    .filter(h => h.himnario === "Gloria y Triunfo")
    .map(h => [Number(h.numero), h])
);

const registros = [];
const jaCatalogados = [];
const inexistentes = [];

for (const numero of numerosFonte) {
  const h = gt.get(numero);

  if (!h) {
    inexistentes.push(numero);
    continue;
  }

  if (catalogados.has(numero)) {
    jaCatalogados.push(numero);
    continue;
  }

  registros.push({
    numero,
    titulo: h.titulo,
    cifra_url: fonte,
    cifra_notas:
      `Coleção externa de acordes identifica explicitamente ` +
      `o hino GT ${String(numero).padStart(3, "0")} - ${h.titulo}. ` +
      `Referência externa; conteúdo da cifra não incorporado.`,
    cifra_autorizada: false
  });
}

fs.writeFileSync(
  OUT,
  JSON.stringify({ registros }, null, 2) + "\n"
);

console.log("=== LOTE 04 ===");
console.log("Fonte examinada:", numerosFonte.length);
console.log("Já catalogados:", jaCatalogados.length, jaCatalogados);
console.log("NOVOS:", registros.length);

for (const r of registros) {
  console.log(
    `GT ${String(r.numero).padStart(3,"0")} | ${r.titulo}`
  );
}

console.log("Inexistentes:", inexistentes);
console.log("Arquivo:", OUT);
