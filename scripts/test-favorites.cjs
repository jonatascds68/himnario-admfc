const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync('src/lib/collections.ts', 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

async function setup(hymns, original = []) {
  const store = new Map([['admfc_favorites', JSON.stringify(original)]]);
  const api = {
    getHymn: async id => {
      if (!hymns[id]) throw Error('Not found');
      return hymns[id];
    },
    getByNumber: async (collection, number) => {
      const name = collection === 'gt' ? 'Gloria y Triunfo' : 'Himnos de Sión';
      const h = Object.values(hymns).find(h =>
        (h.himnario === name && h.numero === number) ||
        (h.colecciones || []).some(c => c.himnario === name && c.numero === number)
      );
      if (!h) throw Error('Not found');
      return h;
    },
  };
  const module = { exports: {} };
  const storage = { kv: { get: async k => store.get(k) || null, set: async (k,v) => store.set(k,v) } };
  const context = { module, exports: module.exports, require: name => {
    if (name === '../lib/storage') return storage;
    if (name === './api') return { api };
    throw Error('Unexpected import: ' + name);
  }};
  vm.runInNewContext(compiled, context, { filename: 'collections.js' });
  return { favorites: module.exports.favorites, store };
}

const pair = {
  gt: { id:'gt',himnario:'Gloria y Triunfo',numero:12,numero_equivalente:34,himnario_equivalente:'Himnos de Sión' },
  sion: { id:'sion',himnario:'Himnos de Sión',numero:34,numero_equivalente:12,himnario_equivalente:'Gloria y Triunfo' },
  solo: { id:'solo',himnario:'Gloria y Triunfo',numero:99 },
};
(async () => {
  {
    const { favorites } = await setup(pair);
    assert.equal(await favorites.toggle('gt'),true);
    assert.deepEqual(Array.from(await favorites.list()),['gt','sion']);
    assert.equal(await favorites.has('sion'),true);
    assert.equal(await favorites.toggle('sion'),false);
    assert.deepEqual(Array.from(await favorites.list()),[]);
  }
  {
    const { favorites } = await setup(pair,['gt','solo']);
    assert.deepEqual(Array.from(await favorites.reconcile()),['gt','solo','sion']);
    assert.deepEqual(Array.from(await favorites.reconcile()),['gt','solo','sion']);
    assert.equal(await favorites.has('solo'),true);
  }
  {
    const { favorites } = await setup(pair,['sion']);
    assert.equal(await favorites.has('gt'),true);
    assert.equal(await favorites.toggle('gt'),false);
    assert.deepEqual(Array.from(await favorites.list()),[]);
  }
  {
    const shared = { both: { id:'both',himnario:'Gloria y Triunfo',numero:12,colecciones:[{himnario:'Himnos de Sión',numero:34}],numero_equivalente:34,himnario_equivalente:'Himnos de Sión' }};
    const { favorites } = await setup(shared);
    assert.equal(await favorites.toggle('both'),true);
    assert.deepEqual(Array.from(await favorites.list()),['both']);
    assert.equal(await favorites.toggle('both'),false);
  }
  {
    const { favorites } = await setup(pair);
    await Promise.all([favorites.toggle('gt'),favorites.toggle('gt')]);
    assert.deepEqual(Array.from(await favorites.list()),[]);
  }
  console.log('PASS: paired favorites, reverse toggle, migration, shared IDs, concurrency');
})().catch(err=>{ console.error(err); process.exitCode=1; });
