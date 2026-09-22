import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const basePath = path.join(root, 'assets', 'base_mestre.json');
const manifestPath = path.join(root, 'updates', 'manifest.json');
const checkOnly = process.argv.includes('--check');

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const stable = (value) => JSON.stringify(value, null, 2) + '\n';

const base = readJson(basePath);
const manifest = readJson(manifestPath);

if (manifest?.schema_version !== 'admfc-content-manifest-1') {
  throw new Error('Invalid ADMFC content manifest.');
}
if (!Number.isInteger(manifest.latest_revision) || manifest.latest_revision < 0) {
  throw new Error('Invalid latest content revision.');
}
if (!Array.isArray(base.himnos)) throw new Error('Canonical base has no himnos array.');

const currentRevision = Number(base.content_revision ?? 0);
if (!Number.isInteger(currentRevision) || currentRevision < 0) {
  throw new Error('Invalid canonical content_revision.');
}
if (currentRevision > manifest.latest_revision) {
  throw new Error(`Canonical revision R${String(currentRevision).padStart(6,'0')} is ahead of manifest R${String(manifest.latest_revision).padStart(6,'0')}.`);
}

const packages = manifest.patches
  .map((filename) => {
    const file = path.join(root, 'updates', filename);
    if (!fs.existsSync(file)) throw new Error(`Missing content package ${filename}.`);
    return readJson(file);
  })
  .sort((a, b) => a.revision - b.revision);

const pending = packages.filter((pkg) => pkg.revision > currentRevision);
if (pending.length) {
  const expected = Array.from(
    { length: manifest.latest_revision - currentRevision },
    (_, index) => currentRevision + index + 1,
  );
  const actual = pending.map((pkg) => pkg.revision);
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    throw new Error(`Content revisions are not contiguous after R${String(currentRevision).padStart(6,'0')}.`);
  }
}

const countKey = (himnario) => String(himnario || '');
const adjustCollectionCount = (himnario, delta) => {
  const key = countKey(himnario);
  if (!key) return;
  if (!base.himnarios || typeof base.himnarios !== 'object') base.himnarios = {};
  const current = Number(base.himnarios[key] ?? 0);
  base.himnarios[key] = current + delta;
};

for (const pkg of pending) {
  if (pkg?.schema_version !== 'admfc-content-patch-1' || !Array.isArray(pkg.patches)) {
    throw new Error(`Invalid content package R${pkg?.revision ?? '?'}.`);
  }

  for (const patch of pkg.patches) {
    const index = base.himnos.findIndex((hymn) => hymn.id === patch.hymn_id);

    if (patch.operation === 'create') {
      if (index >= 0) throw new Error(`Cannot create existing canonical hymn ${patch.hymn_id}.`);
      const hymn = { id: patch.hymn_id, ...(patch.fields || {}) };
      base.himnos.push(hymn);
      adjustCollectionCount(hymn.himnario, 1);
      continue;
    }

    if (patch.operation === 'update') {
      if (index < 0) throw new Error(`Cannot update missing canonical hymn ${patch.hymn_id}.`);
      const before = base.himnos[index];
      const after = { ...before, ...(patch.fields || {}), id: patch.hymn_id };
      if (before.himnario !== after.himnario) {
        adjustCollectionCount(before.himnario, -1);
        adjustCollectionCount(after.himnario, 1);
      }
      base.himnos[index] = after;
      continue;
    }

    if (patch.operation === 'delete') {
      if (index < 0) throw new Error(`Cannot delete missing canonical hymn ${patch.hymn_id}.`);
      const [removed] = base.himnos.splice(index, 1);
      adjustCollectionCount(removed.himnario, -1);
      continue;
    }

    throw new Error(`Unsupported operation ${patch.operation} in R${pkg.revision}.`);
  }

  base.content_revision = pkg.revision;
}

base.himnos.sort((a, b) => {
  const order = { 'Gloria y Triunfo': 1, 'Himnos de Sión': 2, 'Cánticos de Alabanza': 3 };
  return (order[a.himnario] ?? 99) - (order[b.himnario] ?? 99)
    || Number(a.numero ?? 0) - Number(b.numero ?? 0)
    || String(a.id).localeCompare(String(b.id));
});
base.total = base.himnos.length;

const next = stable(base);
const current = fs.readFileSync(basePath, 'utf8');

if (checkOnly) {
  if (current !== next) {
    console.error(`Canonical base is behind published content. Run: node scripts/sync-canonical-base.mjs`);
    process.exit(1);
  }
  console.log(`Canonical base synchronized: ${base.total} records through R${String(base.content_revision ?? 0).padStart(6,'0')}.`);
} else {
  if (current !== next) fs.writeFileSync(basePath, next);
  console.log(`Canonical base synchronized: ${base.total} records through R${String(base.content_revision ?? 0).padStart(6,'0')}.`);
}
