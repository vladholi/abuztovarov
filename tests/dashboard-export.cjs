'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const root = path.join(__dirname, '..', 'avito-margin-scout-v6');

test('dashboard exports visible rows with spreadsheet-safe text and numeric prices', async () => {
  const elements = new Map();
  const handlers = {};
  const element = id => ({
    value: '', style: {}, append() {}, replaceChildren() {}, click() {},
    addEventListener(event, callback) { handlers[id + ':' + event] = callback; }
  });
  const document = {
    createElement: element,
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, element(id));
      return elements.get(id);
    }
  };
  const row = {
    group: '+group', query: ' @query', location: 'Москва', scopeType: 'city',
    scopeSlug: 'moskva', title: '\t=1+1;"цена"', price: 1000, reference: 3000,
    mode: 'custom', isNew: true, url: 'https://www.avito.ru/moskva/item_12345678'
  };
  let download;
  const context = {
    MarginEngine: require(path.join(root, 'engine.js')),
    MarginLocation: require(path.join(root, 'location.js')),
    document, chrome: { storage: { local: { get: async () => ({
      city: 'Москва', lastRows: [row, { ...row, scopeSlug: 'kazan', title: 'Казань' }]
    }) } } },
    URL: { createObjectURL(blob) { download = blob; return 'blob:test'; } },
    Blob, setTimeout() {}, console
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'dashboard.js'), 'utf8'), context);
  await new Promise(resolve => setImmediate(resolve)); // Let initialize() restore the saved rows.
  handlers['export:click']();
  const csv = await download.text();
  assert.equal(csv.split('\r\n').length, 2);
  assert.match(csv, /"'\+group";"' @query"/);
  assert.ok(csv.includes('"\'\t=1+1;""цена"""'));
  assert.ok(csv.includes('"1000";"3000";"2000"'));
  assert.ok(!csv.includes('Казань'));
});
