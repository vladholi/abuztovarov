'use strict';
const assert = require('node:assert/strict');
const { CATALOG, AUTO_BATCH_SIZE, nextAutoPlan, sanitizePersonalQueries, combinedCatalog, estimate, winners, financials, comparable, variants, matchesQuery } = require('./engine.js');
const rows = [
  [10000,'iPhone 13 128 GB оригинал'],
  [16000,'iPhone 13 128 GB хороший'],
  [17500,'iPhone 13 128 GB отличный'],
  [18000,'iPhone 13 128 GB бу'],
  [19000,'iPhone 13 128 GB'],
  [20000,'iPhone 13 128 GB'],
  [2500,'iPhone 13 128 GB не работает'],
  [30000,'iPhone 13 Pro 128 GB'],
  [11000,'iPhone 13 256 GB']
].map(([price,title],i)=>({price,title,id:String(10000000+i),url:'https://www.avito.ru/all/test_'+(10000000+i)}));
assert(CATALOG.length >= 70,'Autosearch should have many built-in targets');
assert.equal(new Set(CATALOG.map(x=>x.query)).size, CATALOG.length, 'Catalog targets are distinct');
// Deterministic pseudo-random stream for repeatable rotation tests.
let seed = 123456;
const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
let saved = {};
const planRuns = [];
for (let i=0; i<5; i++) {
  const planned = nextAutoPlan(saved, AUTO_BATCH_SIZE, random);
  assert.equal(planned.jobs.length, AUTO_BATCH_SIZE, 'Each auto run uses a bounded batch');
  assert.equal(new Set(planned.jobs.map(x=>x.baseQuery)).size, AUTO_BATCH_SIZE, 'No duplicate models in a run');
  assert(planned.jobs.every(x=>x.query.startsWith(x.baseQuery)), 'Query words must preserve the product model');
  assert(planned.jobs.every(x=>x.mode==='auto' && x.group), 'Each job preserves its mode and category');
  planRuns.push(planned.jobs);
  saved=JSON.parse(JSON.stringify(planned.state)); // simulate persisting + reloading Chrome storage
}
assert.equal(new Set(planRuns.slice(0,4).flatMap(list=>list.map(x=>x.baseQuery))).size, AUTO_BATCH_SIZE*4, 'First four runs have no repeated models');
assert(planRuns[0].some((job,i)=>job.query !== planRuns[1][i].query), 'Subsequent runs use different searches');
assert.equal(saved.runCount, 5, 'Rotation state survives serialization');
const firstFull = nextAutoPlan({}, CATALOG.length, random);
const secondFull = nextAutoPlan(firstFull.state, CATALOG.length, random);
const previousForm = new Map(firstFull.jobs.map(j=>[j.baseQuery,j.query]));
assert(secondFull.jobs.every(j=>previousForm.get(j.baseQuery)!==j.query), 'Repeated models get another search formulation');
assert.equal(nextAutoPlan({}, 3, random).jobs.length, 3, 'Custom batch size works');
// User-editable autosearch catalog: de-duplicate, persist and interleave.
const names = sanitizePersonalQueries([' Dyson Airwrap HS01 ', 'dyson  airwrap hs01', 'Makita DDF482', '', 'https://www.avito.ru/item', 'Nintendo Switch Lite']);
assert.deepEqual(names, ['Dyson Airwrap HS01', 'Makita DDF482', 'Nintendo Switch Lite']);
assert.equal(combinedCatalog(names).length, CATALOG.length + 1, 'Built-in models should not be duplicated');
let personalState = {};
const personalRuns = [];
for (let i=0; i<5; i++) {
  const result = nextAutoPlan(personalState, 16, random, names);
  assert.equal(result.jobs.length,16,'Mixed search still uses 16 targets');
  assert.equal(result.jobs.filter(j=>j.personal).length,3,'Every short personal list gets checked');
  assert(result.jobs.some(j=>j.group==='Мои товары' && j.baseQuery==='Dyson Airwrap HS01'));
  assert.equal(new Set(result.jobs.map(x=>x.baseQuery)).size,16,'No model twice in one run');
  personalRuns.push(result.jobs);
  personalState = JSON.parse(JSON.stringify(result.state));
}
assert.equal(new Set(personalRuns.slice(0,4).flatMap(run=>run.filter(j=>!j.personal).map(j=>j.baseQuery))).size,52,'Builtin targets continue rotating with personalized targets');
assert(personalRuns[0].some(j=>j.personal),'Custom products are included in each mixed run');
const manyCustom = Array.from({length:31},(_,i)=>`Модель Пользователя №${i+1}`);
let manyState = {};
let personalUsed = new Set();
for(let run=0;run<4;run++) {
  const planned = nextAutoPlan(manyState,16,random,manyCustom);
  assert.equal(planned.jobs.filter(j=>j.personal).length,8,'Eight reserved custom slots with a larger list');
  for(const item of planned.jobs.filter(j=>j.personal)) personalUsed.add(item.baseQuery);
  manyState=JSON.parse(JSON.stringify(planned.state));
}
assert.equal(personalUsed.size,31,'Rotation should cover all personal models before repeating');
const mineOnly = nextAutoPlan({},16,random,names,true);
assert.equal(mineOnly.jobs.length,3,'Only mine checks up to available custom products');
assert(mineOnly.jobs.every(j=>j.personal),'Only mine must never show builtin models');
assert.equal(nextAutoPlan({},16,random,[],true).jobs.length,0,'Empty user list yields no searches in only-mine mode');
const afterDeletion = nextAutoPlan(personalState,16,random,['Dyson Airwrap HS01']);
assert(afterDeletion.jobs.filter(j=>j.personal).every(j=>j.baseQuery==='Dyson Airwrap HS01'),'Deleted custom models are excluded from future runs');
assert.equal(sanitizePersonalQueries(Array.from({length:300},(_,i)=>`Товар ${i}`)).length,200,'Custom search catalog has a safe upper bound');
assert.equal(variants('Makita').length,4);
assert(matchesQuery('iPhone 13 128 ГБ','iphone 13 128 GB'));
assert(!matchesQuery('iPhone 13 256 GB','iphone 13 128 GB'));
const estimated = estimate(rows,{query:'iPhone 13 128 ГБ',mode:'auto'});
assert.equal(estimated.length,6,'Reject broken or model-variant listings');
const opts = { costs:500, minProfit:1500, minMargin:20, maxPrice:0 };
const filtered = winners(estimated,opts);
assert(filtered.length >= 1,'There must be at least one bargain');
assert(filtered.every(r=>r.profit>0 && r.profit>=1500 && r.margin>=20),'No negative or weak results can appear');
assert(filtered.every(r=>r.reference>0),'Every row requires comparable prices');
assert(!filtered.some(r=>r.price===20000),'Expensive listing is not a bargain');
assert(!filtered.some(r=>r.price===2500),'Broken device is excluded');
assert.equal(winners(estimated,{...opts,maxPrice:5000}).length,0,'Respect maximum buy price');
assert.equal(winners(estimated,{...opts,minProfit:50000}).length,0,'Respect minimum profit');
const manual = estimate([rows[0]],{query:'iPhone 13 128 GB',mode:'custom',manualResale:14000});
assert.equal(winners(manual,opts).length,1,'Manual price allows single listing');
assert.equal(financials(manual[0],{...opts,costs:15000}).eligible,false,'No negative profit can be eligible');
const none = estimate([rows[0]],{query:'iPhone 13 128 GB',mode:'auto'});
assert.equal(winners(none,opts).length,0,'No auto price without comparable offers');

for (const [query, otherModel, family] of [
  ['PlayStation 5', 'PlayStation 4', 'PlayStation'],
  ['Xbox Series X', 'Xbox Series S', 'Xbox Series']
]) {
  const listings = [otherModel, query, query, query, query].map((title, id) => ({
    title, id: String(id), price: id === 0 ? 1000 : 10000
  }));
  assert(!matchesQuery(otherModel, query));
  assert(!comparable(query, otherModel, family));
  assert.equal(winners(estimate(listings, { query }), opts).length, 0);
  listings[0].title = query;
  assert.equal(winners(estimate(listings, { query }), opts)[0].id, '0');
}

// Location input must never silently turn into nationwide /all searches.
const L = require('./location.js');
const moscow = L.resolveScope('Москва').scope;
const petersburg = L.resolveScope('СПб').scope;
const krasnodar = L.resolveScope('Краснодар').scope;
const kuban = L.resolveScope('Краснодарский край').scope;
const tatarstan = L.resolveScope('Татарстан').scope;
assert.equal(moscow.slug, 'moskva');
assert.equal(petersburg.slug, 'sankt-peterburg');
assert.equal(kuban.type, 'region');
assert.equal(tatarstan.type, 'region');
assert.equal(L.resolveScope('Вся Россия').scope.slug, 'all', 'Nationwide search requires explicit selection');
assert(L.resolveScope('').error, 'Empty region must stop search');
assert(L.resolveScope('несуществующий город').error, 'Unknown city cannot silently switch to /all');
assert(L.resolveScope('Вологодская область').error, 'Unknown region needs an Avito URL rather than guessed nationwide');
const pasted = L.resolveScope('https://www.avito.ru/tver?q=ipad').scope;
assert.equal(pasted.slug,'tver', 'Allow copied Avito search link');
assert(L.resolveScope('https://example.com/all').error, 'Reject external links');
assert.equal(L.searchUrl('iPhone 13',moscow),'https://www.avito.ru/moskva?q=iPhone+13&radius=0');
assert.equal(new URL(L.searchUrl('Makita',kuban)).pathname,'/krasnodarskiy_kray');
assert(L.searchPageMatchesScope('https://www.avito.ru/moskva?q=iphone',moscow));
assert(!L.searchPageMatchesScope('https://www.avito.ru/all?q=iphone',moscow), 'Detect redirect to all Russia');
assert(!L.searchPageMatchesScope('https://www.avito.ru/kazan?q=iphone',moscow),'Detect redirect to wrong city');
const mosAd={url:'https://www.avito.ru/moskva/telefony/iphone_123456789',location:'Москва, Арбат'};
const spbAd={url:'https://www.avito.ru/sankt-peterburg/telefony/iphone_123456789',location:'Санкт-Петербург'};
const krasnodarAd={url:'https://www.avito.ru/krasnodar/telefony/iphone_123456789',location:'Краснодар'};
assert(L.matchesScope(mosAd,moscow));
assert(!L.matchesScope(spbAd,moscow),'Reject out-of-region listing even on selected search page');
assert(!L.matchesScope({url:'https://www.avito.ru/all/telefony/iphone_12345678'},moscow));
assert(!L.matchesScope({url:'https://example.com/moskva/iphone_12345678'},moscow));
assert(L.matchesScope(krasnodarAd,krasnodar));
assert(L.matchesScope(krasnodarAd,kuban),'Regional scope must include known local cities');
assert(!L.matchesScope(spbAd,kuban),'Regional scope excludes other regions');
assert(L.matchesScope({url:'https://www.avito.ru/gelendzhik/item_123456789'},kuban),'Regional scope includes known local cities');
assert(!L.matchesScope({url:'https://www.avito.ru/unknowncity/item_123456789'},kuban),'Unknown city is rejected, not guessed');
assert(L.matchesScope({url:'https://www.avito.ru/unknowncity/item_123456789',location:'Краснодарский край, поселок XYZ'},kuban),'Explicit address validates region');
assert(L.matchesScope({url:'https://www.avito.ru/kazan/item_123456789'},tatarstan));
assert(!L.matchesScope({url:'https://www.avito.ru/ufa/item_123456789'},tatarstan));
// Stored results from one city must not leak into another city after changing the input.
const taggedRows = [{...estimated[0],scopeSlug:'moskva',scopeType:'city'}, {...estimated[1],scopeSlug:'kazan',scopeType:'city'}];
assert.equal(taggedRows.filter(r=>r.scopeSlug === moscow.slug && r.scopeType===moscow.type).length,1);
assert.equal(taggedRows.filter(r=>r.scopeSlug === L.resolveScope('Казань').scope.slug).length,1);
console.log('PASS: editable personal autosearch, mixed rotation, only-personal mode, and profit filtering; strict city/region URL generation; no silent /all; cross-region listing exclusion; location-pinned results.');
