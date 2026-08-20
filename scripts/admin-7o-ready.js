const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const BASE = 'assets/base_mestre.json';

const EXPECTED_HASH =
  '29fe35592ba18e5ef8793dff6af2e59be0736dcf977422936014204b0052847d';

const EXPORT_NAME =
  'admfc-correcciones-7j-ready-test.json';

const SEARCH_DIRS = [
  process.env.HOME + '/storage/downloads',
  process.env.HOME + '/storage/shared/Download',
  process.env.HOME + '/storage/shared/Documents',
  '/sdcard/Download',
];

const ALLOWED_FIELDS = new Set([
  'titulo',
  'letra',
  'bloques',
  'numero_equivalente',
  'himnario_equivalente',
  'estado',
  'fuente',
  'observacion',
  'categorias',
  'has_lyrics',
  'tom',
  'cifra',
  'cifra_bloques',
  'cifra_url',
  'audio_url',
  'audio_local',
  'audio_external_url',
  'cifra_autorizada',
  'cifra_procedencia',
  'audio_autorizado',
  'audio_procedencia',
]);

function sha256File(file) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(file))
    .digest('hex');
}

function same(a, b) {
  return JSON.stringify(a ?? null) ===
         JSON.stringify(b ?? null);
}

function findFile(dir, target) {
  if (!fs.existsSync(dir)) return null;

  const stack = [dir];

  while (stack.length) {
    const current = stack.pop();

    let entries;

    try {
      entries = fs.readdirSync(current, {
        withFileTypes: true,
      });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const full = path.join(current, entry.name);

      if (entry.isFile() && entry.name === target) {
        return full;
      }

      if (entry.isDirectory()) {
        stack.push(full);
      }
    }
  }

  return null;
}

function abort(message) {
  console.error('');
  console.error('RESULTADO: ABORTED');
  console.error('MOTIVO:', message);
  process.exit(1);
}

console.log('======================================================');
console.log(' ADMIN 7I — SIMULAÇÃO DO APLICADOR TRANSACIONAL');
console.log(' PACOTE ADMIN → BASE MESTRE');
console.log(' SOMENTE LEITURA');
console.log('======================================================');

console.log('');
console.log('=== 1. BASE MESTRE ===');

if (!fs.existsSync(BASE)) {
  abort('Base Mestre não encontrada.');
}

const hashBase = sha256File(BASE);

console.log('ARQUIVO:', BASE);
console.log('HASH ATUAL:   ', hashBase);
console.log('HASH ESPERADO:', EXPECTED_HASH);

if (hashBase !== EXPECTED_HASH) {
  abort('Hash da Base Mestre diverge do checkpoint oficial.');
}

let base;

try {
  base = JSON.parse(fs.readFileSync(BASE, 'utf8'));
} catch (e) {
  abort('Base Mestre não é JSON válido: ' + e.message);
}

if (
  !base ||
  typeof base !== 'object' ||
  !Array.isArray(base.himnos)
) {
  abort('Estrutura base.himnos não encontrada ou inválida.');
}

const hymns = base.himnos;

if (
  typeof base.total === 'number' &&
  base.total !== hymns.length
) {
  abort(
    'base.total diverge de base.himnos.length.'
  );
}

console.log('CHECKPOINT: OK');
console.log('JSON BASE: VÁLIDO');
console.log('TOTAL DECLARADO:', base.total);
console.log('REGISTROS:', hymns.length);

console.log('');
console.log('=== 2. LOCALIZANDO PACOTE ===');

let packageFile = null;

for (const dir of SEARCH_DIRS) {
  packageFile = findFile(dir, EXPORT_NAME);
  if (packageFile) break;
}

if (!packageFile) {
  abort('Pacote exportado não localizado.');
}

console.log('PACOTE:', packageFile);
console.log('HASH:', sha256File(packageFile));

let pack;

try {
  pack = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
} catch (e) {
  abort('Pacote não é JSON válido: ' + e.message);
}

console.log('');
console.log('=== 3. VALIDANDO ENVELOPE ===');

if (pack.schema_version !== 'admfc-admin-changes-1') {
  abort(
    'schema_version não reconhecido: ' +
    String(pack.schema_version)
  );
}

if (!Array.isArray(pack.changes)) {
  abort('changes não é array.');
}

if (pack.total_changes !== pack.changes.length) {
  abort('total_changes diverge de changes.length.');
}

console.log('SCHEMA: OK');
console.log('RELEASE:', pack.release);
console.log('TOTAL:', pack.total_changes);

console.log('');
console.log('=== 4. SIMULAÇÃO DAS ALTERAÇÕES ===');

let ready = 0;
let alreadyApplied = 0;
let conflict = 0;
let invalid = 0;

for (const change of pack.changes) {
  console.log('');
  console.log('----------------------------------------');
  console.log(`${change.hymn_id} — ${change.titulo}`);

  if (change.action !== 'update') {
    console.log('RESULTADO DO REGISTRO: INVALID');
    console.log('MOTIVO: ação não suportada:', change.action);
    invalid++;
    continue;
  }

  const hymn = hymns.find(h => h.id === change.hymn_id);

  if (!hymn) {
    console.log('RESULTADO DO REGISTRO: INVALID');
    console.log('MOTIVO: hymn_id não existe na Base Mestre');
    invalid++;
    continue;
  }

  if (
    hymn.himnario !== change.himnario ||
    hymn.numero !== change.numero
  ) {
    console.log('RESULTADO DO REGISTRO: INVALID');
    console.log('MOTIVO: identidade diverge da Base Mestre');
    invalid++;
    continue;
  }

  if (
    !Array.isArray(change.changed_fields) ||
    change.changed_fields.length === 0
  ) {
    console.log('RESULTADO DO REGISTRO: INVALID');
    console.log('MOTIVO: changed_fields ausente ou vazio');
    invalid++;
    continue;
  }

  let hasReady = false;
  let hasAlready = false;
  let hasConflict = false;
  let hasInvalid = false;

  for (const field of change.changed_fields) {
    if (!ALLOWED_FIELDS.has(field)) {
      console.log(`${field}: INVALID_FIELD`);
      hasInvalid = true;
      continue;
    }

    const before = change.before?.[field];
    const after = change.after?.[field];
    const current = hymn[field];

    if (same(current, after)) {
      console.log(`${field}: ALREADY_APPLIED`);
      hasAlready = true;
    } else if (same(current, before)) {
      console.log(`${field}: READY_TO_APPLY`);
      hasReady = true;
    } else {
      console.log(`${field}: CONFLICT`);
      console.log('  BASE ATUAL:', JSON.stringify(current));
      console.log('  BEFORE:    ', JSON.stringify(before));
      console.log('  AFTER:     ', JSON.stringify(after));
      hasConflict = true;
    }
  }

  let status;

  if (hasInvalid) {
    status = 'INVALID';
    invalid++;
  } else if (hasConflict) {
    status = 'CONFLICT';
    conflict++;
  } else if (hasReady) {
    status = 'READY_TO_APPLY';
    ready++;
  } else if (hasAlready) {
    status = 'ALREADY_APPLIED';
    alreadyApplied++;
  } else {
    status = 'INVALID';
    invalid++;
  }

  console.log('RESULTADO DO REGISTRO:', status);
}

console.log('');
console.log('=== 5. RESUMO TRANSACIONAL ===');
console.log('READY_TO_APPLY:  ', ready);
console.log('ALREADY_APPLIED: ', alreadyApplied);
console.log('CONFLICT:        ', conflict);
console.log('INVALID:         ', invalid);

console.log('');
console.log('=== 6. DECISÃO ===');

let decisionExitCode = 0;

if (conflict > 0 || invalid > 0) {
  console.log('PACOTE: BLOQUEADO');
  console.log('Nenhuma aplicação seria permitida.');
  decisionExitCode = 2;
} else if (ready === 0) {
  console.log('PACOTE: JÁ SINCRONIZADO');
  console.log('Nenhuma alteração seria necessária.');
} else {
  console.log('PACOTE: APTO PARA APLICAÇÃO');
  console.log(
    `${ready} registro(s) possui(em) alterações aplicáveis.`
  );
}

console.log('');
console.log('=== 7. GARANTIA DE NÃO ESCRITA ===');

const hashFinal = sha256File(BASE);

console.log('HASH INICIAL:', hashBase);
console.log('HASH FINAL:  ', hashFinal);

if (hashFinal !== hashBase) {
  abort('ERRO CRÍTICO: Base Mestre mudou durante simulação.');
}

console.log('BASE MESTRE: INTACTA');

if (decisionExitCode !== 0) {
  console.log('');
  console.log(
    'EXIT CODE TRANSACIONAL:',
    decisionExitCode
  );
  process.exitCode = decisionExitCode;
}

console.log('');
console.log('======================================================');
console.log(' ADMIN 7I — SIMULAÇÃO CONCLUÍDA');
console.log(' NENHUMA ALTERAÇÃO FOI APLICADA');
console.log('======================================================');
