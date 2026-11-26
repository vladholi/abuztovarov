/* Business logic is kept pure for offline tests. The dashboard owns browser APIs. */
(function (root) {
  'use strict';
  // Curated watchlist: ideas for searches, NOT verified best-sellers or real-time demand.
  // Every automatic run samples a different subset from this catalog.
  const CATALOG = Object.freeze([
    { group: 'Смартфоны', query: 'iPhone 12 128 ГБ' },
    { group: 'Смартфоны', query: 'iPhone 13 128 ГБ' },
    { group: 'Смартфоны', query: 'iPhone 13 mini 128 ГБ' },
    { group: 'Смартфоны', query: 'iPhone 14 128 ГБ' },
    { group: 'Смартфоны', query: 'iPhone 15 128 ГБ' },
    { group: 'Смартфоны', query: 'Samsung Galaxy S22 128 ГБ' },
    { group: 'Смартфоны', query: 'Samsung Galaxy S23 128 ГБ' },
    { group: 'Смартфоны', query: 'Samsung Galaxy A54 128 ГБ' },
    { group: 'Смартфоны', query: 'Google Pixel 7 128 ГБ' },
    { group: 'Смартфоны', query: 'Xiaomi Redmi Note 12 Pro' },

    { group: 'Ноутбуки', query: 'MacBook Air M1' },
    { group: 'Ноутбуки', query: 'MacBook Air M2' },
    { group: 'Ноутбуки', query: 'MacBook Pro M1' },
    { group: 'Ноутбуки', query: 'Lenovo ThinkPad T480' },
    { group: 'Ноутбуки', query: 'Lenovo ThinkPad T490' },
    { group: 'Ноутбуки', query: 'Lenovo ThinkPad X1 Carbon' },
    { group: 'Ноутбуки', query: 'Dell Latitude 5420' },
    { group: 'Ноутбуки', query: 'HP EliteBook 840 G7' },
    { group: 'Ноутбуки', query: 'Acer Nitro 5' },
    { group: 'Ноутбуки', query: 'ASUS TUF Gaming F15' },

    { group: 'Приставки', query: 'PlayStation 4 Slim' },
    { group: 'Приставки', query: 'PlayStation 4 Pro' },
    { group: 'Приставки', query: 'PlayStation 5' },
    { group: 'Приставки', query: 'PlayStation 5 Digital' },
    { group: 'Приставки', query: 'Xbox Series S 512' },
    { group: 'Приставки', query: 'Xbox Series X' },
    { group: 'Приставки', query: 'Nintendo Switch OLED' },
    { group: 'Приставки', query: 'Nintendo Switch Lite' },
    { group: 'Приставки', query: 'Steam Deck 256 GB' },
    { group: 'Приставки', query: 'Meta Quest 2' },

    { group: 'Инструменты', query: 'Makita DDF482' },
    { group: 'Инструменты', query: 'Makita DHP482' },
    { group: 'Инструменты', query: 'Makita DTD152' },
    { group: 'Инструменты', query: 'Makita DGA504' },
    { group: 'Инструменты', query: 'Bosch GSR 18V-50' },
    { group: 'Инструменты', query: 'Bosch GSR 12V-15' },
    { group: 'Инструменты', query: 'Bosch GBH 2-26' },
    { group: 'Инструменты', query: 'DeWalt DCD791' },
    { group: 'Инструменты', query: 'DeWalt DCF887' },
    { group: 'Инструменты', query: 'Milwaukee M18 FPD2' },

    { group: 'Фото и видео', query: 'GoPro Hero 10' },
    { group: 'Фото и видео', query: 'GoPro Hero 11' },
    { group: 'Фото и видео', query: 'GoPro Hero 12' },
    { group: 'Фото и видео', query: 'Sony A6400' },
    { group: 'Фото и видео', query: 'Sony A7 III' },
    { group: 'Фото и видео', query: 'Canon EOS R50' },
    { group: 'Фото и видео', query: 'Fujifilm X-T30' },
    { group: 'Фото и видео', query: 'DJI Mini 3' },
    { group: 'Фото и видео', query: 'DJI Osmo Action 4' },
    { group: 'Фото и видео', query: 'Insta360 X3' },

    { group: 'Аудио', query: 'Sony WH-1000XM4' },
    { group: 'Аудио', query: 'Sony WH-1000XM5' },
    { group: 'Аудио', query: 'JBL Charge 5' },
    { group: 'Аудио', query: 'JBL Flip 6' },
    { group: 'Аудио', query: 'Marshall Emberton II' },
    { group: 'Аудио', query: 'Sennheiser Momentum 4' },
    { group: 'Аудио', query: 'AirPods Pro 2' },
    { group: 'Аудио', query: 'Bose QuietComfort 45' },

    { group: 'Бытовая техника', query: 'Dyson V8' },
    { group: 'Бытовая техника', query: 'Dyson V10' },
    { group: 'Бытовая техника', query: 'Dyson Airwrap' },
    { group: 'Бытовая техника', query: 'Roborock S5 Max' },
    { group: 'Бытовая техника', query: 'Roborock S7' },
    { group: 'Бытовая техника', query: 'Karcher K5' },
    { group: 'Бытовая техника', query: 'Delonghi Magnifica S' },
    { group: 'Бытовая техника', query: 'Philips LatteGo 3200' },

    { group: 'Спорт и гаджеты', query: 'Garmin Fenix 6' },
    { group: 'Спорт и гаджеты', query: 'Garmin Forerunner 255' },
    { group: 'Спорт и гаджеты', query: 'Apple Watch Series 8' },
    { group: 'Спорт и гаджеты', query: 'Apple Watch SE 2' },
    { group: 'Спорт и гаджеты', query: 'Samsung Galaxy Watch 5' },
    { group: 'Спорт и гаджеты', query: 'Wahoo Elemnt Bolt V2' }
  ]);
  const AUTO_BATCH_SIZE = 16;
  // Rephrase repeated searches; an unsuffixed query is used frequently to avoid
  // losing comparable listings through unnecessarily narrow search keywords.
  const AUTO_MODIFIERS = Object.freeze(['', ' б/у', '', ' торг', '', ' срочно', '', ' без коробки']);

  function shuffled(values, random = Math.random) {
    const copy = [...values];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.max(0, Math.min(i, Math.floor(random() * (i + 1))));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  const MAX_PERSONAL_QUERIES = 200;
  const PERSONAL_SLOTS = 8; // At least half of each mixed batch can be user-managed.

  function queryKey(value) {
    return String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('ru-RU');
  }
  function sanitizePersonalQueries(queries) {
    if (!Array.isArray(queries)) return [];
    const result = [], used = new Set();
    for (const candidate of queries) {
      if (typeof candidate !== 'string') continue;
      const title = candidate.trim().replace(/\s+/g, ' ');
      if (title.length < 2 || title.length > 120 || /^https?:\/\//i.test(title)) continue;
      const key = queryKey(title);
      if (used.has(key)) continue;
      used.add(key);
      result.push(title);
      if (result.length >= MAX_PERSONAL_QUERIES) break;
    }
    return result;
  }
  function combinedCatalog(personalQueries = []) {
    const personal = sanitizePersonalQueries(personalQueries).map(query => ({ group: 'Мои товары', query, personal: true }));
    const ownKeys = new Set(personal.map(item => queryKey(item.query)));
    // If the user added a built-in model, it is their own target, not a second duplicate job.
    return [...personal, ...CATALOG.filter(item => !ownKeys.has(queryKey(item.query)))];
  }

  // Each target pool has its own persistent queue. Personal targets get up to
  // 8 of 16 slots in mixed mode; with fewer than 8, all of them are checked.
  // In "only mine" mode we search only user-defined models (up to 16/run).
  function pickFromPool(items, requestedCount, priorQueue, lastTargets, random) {
    const valid = new Set(items.map(item => item.query));
    const queue = [...new Set((Array.isArray(priorQueue) ? priorQueue : []).filter(q => valid.has(q)))];
    const last = new Set((Array.isArray(lastTargets) ? lastTargets : []).filter(q => valid.has(q)));
    const chosen = [];
    const count = Math.min(requestedCount, valid.size);
    while (chosen.length < count) {
      if (!queue.length) {
        const available = [...valid].filter(q => !chosen.includes(q));
        const fresh = available.filter(q => !last.has(q));
        const repeat = available.filter(q => last.has(q));
        queue.push(...shuffled(fresh, random), ...shuffled(repeat, random));
      }
      const candidate = queue.shift();
      if (valid.has(candidate) && !chosen.includes(candidate)) chosen.push(candidate);
    }
    return { chosen, queue };
  }

  // Compatible with v5 nextAutoPlan(state, count, random) calls.
  function nextAutoPlan(previous = {}, batchSize = AUTO_BATCH_SIZE, random = Math.random, personalQueries = [], onlyPersonal = false) {
    const all = combinedCatalog(personalQueries);
    const personal = all.filter(item => item.personal);
    const builtIn = onlyPersonal ? [] : all.filter(item => !item.personal);
    const availableCount = personal.length + builtIn.length;
    const count = Math.min(availableCount, Math.max(1, Math.floor(Number(batchSize) || AUTO_BATCH_SIZE)));
    const personalCount = onlyPersonal
      ? count
      : Math.min(personal.length, count, Math.min(PERSONAL_SLOTS, Math.ceil(count / 2)));
    const builtinCount = Math.min(builtIn.length, count - personalCount);
    const ownCount = Math.min(personal.length, count - builtinCount);

    const own = pickFromPool(personal, ownCount, previous.personalQueue, previous.lastTargets, random);
    const regular = pickFromPool(builtIn, builtinCount, previous.builtinQueue || previous.queue, previous.lastTargets, random);
    // Keep source order mixed so personal queries aren't all in the last pages.
    const selected = [];
    for (let i = 0; i < Math.max(own.chosen.length, regular.chosen.length); i++) {
      if (own.chosen[i]) selected.push(own.chosen[i]);
      if (regular.chosen[i]) selected.push(regular.chosen[i]);
    }
    const byQuery = new Map(all.map(item => [item.query, item]));
    const previousOffsets = previous.modifierOffsets && typeof previous.modifierOffsets === 'object' ? previous.modifierOffsets : {};
    const modifierOffsets = {};
    // Keep offsets only for still-existing models, so deletion doesn't accumulate dead state.
    for (const item of all) if (Number.isInteger(previousOffsets[item.query])) modifierOffsets[item.query] = previousOffsets[item.query];
    const jobs = selected.map((baseQuery) => {
      const item = byQuery.get(baseQuery);
      const lastIndex = modifierOffsets[baseQuery];
      const index = Number.isInteger(lastIndex) && lastIndex >= 0
        ? lastIndex % AUTO_MODIFIERS.length
        : Math.floor(random() * AUTO_MODIFIERS.length);
      modifierOffsets[baseQuery] = (index + 1) % AUTO_MODIFIERS.length;
      return { query: baseQuery + AUTO_MODIFIERS[index], baseQuery, group: item.group, mode: 'auto', personal: !!item.personal };
    });
    return {
      jobs,
      state: {
        queue: regular.queue, // old key retained for safe migrations
        builtinQueue: regular.queue,
        personalQueue: own.queue,
        lastTargets: selected,
        lastQueries: jobs.map(job => job.query),
        modifierOffsets,
        runCount: Math.max(0, Number(previous.runCount) || 0) + 1
      }
    };
  }
  const REJECT = /(?:^|[\s,;.!?()])(?:куплю|ищу|обмен|аренда|запчасти|запчастей|запчасть|чехол|коробка|упаковка|муляж|реплика|копия|подделка|нерабочий|неисправный|не работает|разбитый|только корпус|без телефона|без устройства|донор|разбор)(?=$|[\s,;.!?()])/i;
  const replacements = [
    [/айфон/gi, 'iphone'], [/макбук/gi, 'macbook'], [/макита/gi, 'makita'],
    [/плейстейшн|плейстейшен/gi, 'playstation'], [/нинтендо/gi, 'nintendo'],
    [/шуруповёрт/gi, 'шуруповерт'], [/гб|gb/gi, 'gb'], [/тб|tb/gi, 'tb'],
    [/\bps\s*5\b/gi, 'playstation 5'], [/\bм\s*1\b/gi, 'm1'],
    [/\bwh\s*[-_]?\s*1000\s*[-_]?\s*xm4\b/gi, 'wh1000xm4'],
    [/\bпро\b/gi, 'pro'], [/\bмакс\b/gi, 'max'], [/\bмини\b/gi, 'mini'],
    [/\bультра\b/gi, 'ultra'], [/\bдиджитал\b/gi, 'digital'], [/\bслим\b/gi, 'slim']
  ];
  function normalize(s) {
    let t = String(s || '').toLowerCase().replace(/ё/g, 'е');
    for (const [rx, replacement] of replacements) t = t.replace(rx, replacement);
    return t.replace(/(\d+)\s*(gb|tb)\b/g, '$1').replace(/(\d+)\s*v\b/g, '$1v').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  }
  function tokens(s) {
    return [...new Set(normalize(s).split(/\s+/).filter(w => w && w.length > 1 && !['продам','продаю','новый','новая','бу','срочно','торг','хорошее','идеальное','состояние','оригинал','отличный','доставка','комплект'].includes(w)))];
  }
  function comparable(a, b, query) {
    const at = tokens(a), bt = tokens(b), qt = tokens(query);
    if (!at.length || !bt.length || !qt.length) return false;
    const as = new Set(at), bs = new Set(bt);
    // Do not compare separate capacity, generation or model number variants.
    const qNumbers = qt.filter(x => /\d/.test(x));
    if (qNumbers.some(x => !as.has(x) || !bs.has(x))) return false;
    // For short generic queries, different model numbers must not become comparables.
    const numericA = at.filter(x => /\d/.test(x)).sort().join('|');
    const numericB = bt.filter(x => /\d/.test(x)).sort().join('|');
    if (numericA !== numericB) return false;
    const queryWords = qt.filter(x => x.length >= 3);
    if (queryWords.some(x => !as.has(x) || !bs.has(x))) return false;
    // Both titles must share most model-related parts, not just a generic product type.
    const shared = at.filter(x => bs.has(x)).length;
    return shared / Math.max(at.length, bt.length) >= 0.45;
  }
  function matchesQuery(title, query) {
    const tt = new Set(tokens(title)), qt = tokens(query), qs = new Set(qt);
    if (!qt.length || !qt.every(x => tt.has(x))) return false;
    // Avoid treating an iPhone 13 Pro as the same item as an iPhone 13, etc.
    for (const variant of ['pro','max','mini','plus','ultra','lite','oled','digital','slim']) {
      if (tt.has(variant) !== qs.has(variant)) return false;
    }
    return true;
  }
  function quantile(values, percentile = 0.4) {
    if (!values.length) return null;
    const a = [...values].sort((x, y) => x - y);
    const pos = (a.length - 1) * percentile;
    const low = Math.floor(pos), high = Math.ceil(pos);
    return a[low] + (a[high] - a[low]) * (pos - low);
  }
  function variants(q) {
    const base = String(q || '').trim().replace(/\s+/g, ' ');
    return [...new Set([base, base + ' срочно', base + ' торг', base + ' б/у'])];
  }
  function estimate(items, { query, group = 'Поиск товара', mode = 'custom', manualResale = 0, oldSeen = {} } = {}) {
    const safe = items.filter(r => r.price > 0 && r.price < 100000000 && !REJECT.test(r.title) && matchesQuery(r.title, query));
    return safe.map(r => {
      const similar = safe.filter(other => other.id !== r.id && comparable(r.title, other.title, query)).map(x => x.price);
      // A conservative 40th-percentile asking price. Never claim confirmed sale prices.
      const marketReference = similar.length >= 4 ? Math.round(quantile(similar, .4)) : null;
      const reference = mode === 'custom' && manualResale > 0 ? manualResale : marketReference;
      return {
        ...r, query, group, mode,
        marketReference, reference, comparables: similar.length,
        isNew: !oldSeen[r.id],
        referenceType: mode === 'custom' && manualResale > 0 ? 'manual' : 'market'
      };
    });
  }
  function financials(r, { costs = 500, minProfit = 1500, minMargin = 20, maxPrice = 0, manualResale = 0 } = {}) {
    let reference = r.reference;
    if (r.mode === 'custom' && r.referenceType === 'manual' && manualResale > 0) reference = manualResale;
    const profit = Number.isFinite(reference) && reference > 0 ? reference - r.price - Math.max(0, costs) : null;
    const margin = profit === null ? null : (profit / reference) * 100;
    const eligible = profit !== null && profit > 0 && profit >= Math.max(0, minProfit) && margin >= Math.max(0, minMargin) && (maxPrice <= 0 || r.price <= maxPrice);
    return { ...r, reference, profit, margin, eligible };
  }
  function winners(rows, settings) {
    return rows.map(r => financials(r, settings)).filter(r => r.eligible).sort((a, b) => (Number(b.isNew) - Number(a.isNew)) || (b.profit - a.profit) || (b.margin - a.margin));
  }
  const api = { CATALOG, AUTO_BATCH_SIZE, AUTO_MODIFIERS, MAX_PERSONAL_QUERIES, PERSONAL_SLOTS, queryKey, sanitizePersonalQueries, combinedCatalog, nextAutoPlan, REJECT, normalize, tokens, matchesQuery, comparable, quantile, variants, estimate, financials, winners };
  root.MarginEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
