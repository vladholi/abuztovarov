'use strict';
const $ = id => document.getElementById(id);
const E = globalThis.MarginEngine;
const KEYS = ['query', 'city', 'maxPrice', 'costs', 'minProfit', 'minMargin', 'resale'];
const RUB = n => Math.round(n).toLocaleString('ru-RU') + ' ₽';
const nval = id => Math.max(0, Number($(id).value) || 0);
let rows = [], history = [], seen = {}, autoSearchState = {}, personalQueries = [], running = false, stopped = false, currentTab = null;

function updateCatalogCount() {
  const total = E.combinedCatalog(personalQueries).length;
  const own = personalQueries.length;
  const onlyMine = $('onlyPersonal').checked;
  $('catalogCount').textContent = onlyMine
    ? `${own} моих товаров · до ${E.AUTO_BATCH_SIZE} за запуск`
    : `${E.CATALOG.length} встроенных + ${own} моих · до ${E.AUTO_BATCH_SIZE} за запуск`;
}
function renderPersonalQueries() {
  personalQueries = E.sanitizePersonalQueries(personalQueries);
  $('personalCount').textContent = personalQueries.length;
  const root = $('personalList'); root.replaceChildren();
  if (!personalQueries.length) {
    const empty = document.createElement('span'); empty.className = 'muted';
    empty.textContent = 'Список пуст. Добавь модели выше — они появятся здесь.';
    root.append(empty);
  }
  for (const query of personalQueries) {
    const chip = document.createElement('div'); chip.className = 'personal-tag';
    const label = document.createElement('span'); label.textContent = query;
    const del = document.createElement('button'); del.type = 'button'; del.className = 'remove-personal';
    del.textContent = '×'; del.title = `Удалить: ${query}`; del.setAttribute('aria-label', `Удалить ${query}`);
    del.disabled = running;
    del.addEventListener('click', async () => {
      personalQueries = personalQueries.filter(x => E.queryKey(x) !== E.queryKey(query));
      await chrome.storage.local.set({ personalQueries });
      renderPersonalQueries();
      setPersonalStatus(`Убрали «${query}» из следующих автопоисков.`);
    });
    chip.append(label, del); root.append(chip);
  }
  updateCatalogCount();
}
function setPersonalStatus(message) { $('personalStatus').textContent = message; }
async function addPersonalQueries() {
  if (running) return;
  const input = $('personalInput');
  const raw = input.value.trim();
  if (!raw) { setPersonalStatus('Напиши хотя бы одну модель или бренд.'); input.focus(); return; }
  const candidates = raw.split(/[\n\r,;]+/).map(x => x.trim()).filter(Boolean);
  const currentKeys = new Set(personalQueries.map(E.queryKey));
  const next = E.sanitizePersonalQueries([...personalQueries, ...candidates]);
  const added = next.filter(x => !currentKeys.has(E.queryKey(x))).length;
  personalQueries = next;
  await chrome.storage.local.set({ personalQueries });
  renderPersonalQueries();
  if (added) {
    input.value = '';
    setPersonalStatus(`Добавлено: ${added}. Всего твоих товаров: ${next.length}. Они будут участвовать в следующем автопоиске.`);
  } else {
    setPersonalStatus(`Новых товаров нет: такие названия уже есть, введённый текст недопустим или достигнут лимит ${E.MAX_PERSONAL_QUERIES}.`);
  }
}


function renderAutoQueries() {
  const box = $('autoQueries');
  box.replaceChildren();
  const queries = Array.isArray(autoSearchState.lastQueries) ? autoSearchState.lastQueries : [];
  $('lastAutoCount').textContent = queries.length ? `Запуск №${autoSearchState.runCount || 1}: ${queries.length} запросов` : 'пока нет';
  for (const query of queries) {
    const li = document.createElement('li'); li.textContent = query; box.append(li);
  }
  if (!queries.length) {
    const li = document.createElement('li'); li.textContent = 'Нажми «Автопоиск всего», чтобы получить новый набор.'; box.append(li);
  }
}

function settings() {
  return {
    costs: nval('costs'), minProfit: nval('minProfit'), minMargin: nval('minMargin'),
    maxPrice: nval('maxPrice'), manualResale: nval('resale')
  };
}
function winners() {
  const parsed = currentScope();
  if (parsed.error) return [];
  return E.winners(rows.filter(r => r.scopeSlug === parsed.scope.slug && r.scopeType === parsed.scope.type), settings());
}
function visible() {
  return winners().filter(r => !$('onlyNew').checked || r.isNew);
}
const L = globalThis.MarginLocation;
function currentScope() { return L.resolveScope($('city').value); }
function updateScopeIndicator() {
  const parsed = currentScope();
  $('regionHint').textContent = parsed.error
    ? `⚠️ ${parsed.error}`
    : `✓ Поиск: ${parsed.scope.label}. Объявления без подтверждённого совпадения по месту исключаются.`;
  $('regionHint').className = parsed.error ? 'scope-warning' : 'scope-ok';
}
function setStatus(message) { $('status').textContent = message; }
function progress(done, total) { $('progressFill').style.width = (total ? 100 * done / total : 0) + '%'; }
function busy(value) {
  running = value;
  $('scan').disabled = value;
  $('scanAuto').disabled = value;
  $('city').disabled = value;
  $('stop').disabled = !value;
  $('clear').disabled = value;
  $('addPersonal').disabled = value;
  $('clearPersonal').disabled = value;
  $('personalInput').disabled = value;
  $('onlyPersonal').disabled = value;
  for (const button of document.querySelectorAll('.remove-personal')) button.disabled = value;
}

function scrapeVisibleCards() {
  // Runs in the ordinary loaded tab; no hidden APIs, anti-bot workarounds, or login access.
  const firstText = (document.title || '') + ' ' + (document.body?.innerText || '').slice(0, 1600);
  const blocked = /(?:доступ ограничен|подтвердите.{0,30}не робот|проверка безопасности|captcha|access denied)/i.test(firstText);
  if (blocked) return { blocked: true, items: [] };
  const out = new Map();
  for (const a of document.querySelectorAll('a[href]')) {
    let link;
    try { link = new URL(a.getAttribute('href'), location.origin); } catch { continue; }
    if (!/^(?:www\.)?avito\.ru$/i.test(link.hostname)) continue;
    const idMatch = link.pathname.match(/_(\d{7,})(?:\/|$)/);
    if (!idMatch) continue;
    const item = a.closest('[data-marker="item"], [data-item-id], article') || a.parentElement?.parentElement;
    if (!item) continue;
    const titleNode = item.querySelector('[itemprop="name"], [data-marker="item-title"], h3');
    const title = (titleNode?.textContent || a.getAttribute('title') || a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 220);
    if (title.length < 5) continue;
    const priceNode = item.querySelector('meta[itemprop="price"], [itemprop="price"], [data-marker="item-price"], [data-marker="item-price/main"]');
    const raw = priceNode?.getAttribute('content') || priceNode?.textContent || item.textContent.match(/([\d\s\u00a0]{2,13})\s*₽/)?.[1] || '';
    const price = Number(raw.replace(/\D/g, ''));
    if (!price || price > 100000000) continue;
    const locationElement = item.querySelector('[data-marker="item-address"], [data-marker="item-location"], [data-marker="item-address-line"], [data-marker*="item-address"], [itemprop="address"], [class*="geo-root"], [class*="geo-georeferences"]');
    const locationText = (locationElement?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 170);
    if (!out.has(idMatch[1])) out.set(idMatch[1], { id: idMatch[1], title, price, url: link.origin + link.pathname, location: locationText });
  }
  return { blocked: false, items: [...out.values()].slice(0, 140) };
}

async function waitLoaded(tabId, timeout = 30000) {
  return new Promise(resolve => {
    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    };
    const listener = (id, data) => { if (id === tabId && data.status === 'complete') setTimeout(cleanup, 1400); };
    const timer = setTimeout(cleanup, timeout);
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.get(tabId).then(tab => { if (tab?.status === 'complete') setTimeout(cleanup, 1400); }).catch(cleanup);
  });
}
function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function pruneSeen() {
  const ids = Object.keys(seen);
  if (ids.length <= 5000) return;
  ids.sort((a, b) => (seen[b]?.lastSeen || '').localeCompare(seen[a]?.lastSeen || ''));
  ids.slice(5000).forEach(id => delete seen[id]);
}
async function notifyWinners(candidates) {
  if (!candidates.length) return;
  const top = candidates.slice(0, 3);
  try {
    const { notificationTargets = {} } = await chrome.storage.local.get('notificationTargets');
    const planned = top.map(r => ({ id: `deal-${Date.now()}-${r.id}`, item: r }));
    for (const { id, item } of planned) notificationTargets[id] = item.url;
    const ids = Object.keys(notificationTargets);
    if (ids.length > 80) ids.slice(0, ids.length - 80).forEach(id => delete notificationTargets[id]);
    await chrome.storage.local.set({ notificationTargets });
    for (const { id, item: r } of planned) {
      await chrome.notifications.create(id, {
        type: 'basic', iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
        title: `Возможная прибыль ${RUB(r.profit)}`,
        message: `${r.scopeLabel || "Регион"} · ${r.title.slice(0, 110)} · цена ${RUB(r.price)} · маржа ${r.margin.toFixed(0)}%. Нажми, чтобы открыть объявление.`,
        priority: 1
      });
    }
  } catch (e) {
    console.warn('Notifications not available:', e);
  }
}
async function persist() {
  await chrome.storage.local.set({
    seen, history, lastRows: rows, autoSearchState,
    ...Object.fromEntries(KEYS.map(k => [k, $(k).value]))
  });
}

async function run(mode) {
  if (running) return;
  const q = $('query').value.trim();
  const parsed = currentScope();
  if (parsed.error) { setStatus(parsed.error); $('city').focus(); return; }
  const scope = parsed.scope;
  if (mode === 'custom' && !q) { setStatus('Укажи товар для ручного поиска или нажми «Автопоиск всего».'); $('query').focus(); return; }
  busy(true); stopped = false;
  let scanned = 0, errors = 0, blocked = false, totalRaw = 0, geoRejected = 0, locationError = null;
  const oldSeen = { ...seen };
  const found = new Map();
  let jobs;
  if (mode === 'auto') {
    if ($('onlyPersonal').checked && !personalQueries.length) {
      setStatus('Сначала добавь товары в список «Мои товары для автопоиска» или выключи режим «Только мои».');
      busy(false); $('personalInput').focus(); return;
    }
    const plan = E.nextAutoPlan(autoSearchState, E.AUTO_BATCH_SIZE, Math.random, personalQueries, $('onlyPersonal').checked);
    autoSearchState = plan.state;
    jobs = plan.jobs;
    renderAutoQueries();
  } else {
    jobs = E.variants(q).map(x => ({ query: x, baseQuery: q, group: 'Мой поиск', mode }));
  }
  progress(0, jobs.length);
  try {
    // Save rotation before scanning: even after a failed or stopped run, the
    // next click uses new search targets rather than the same fixed list.
    if (mode === 'auto') await chrome.storage.local.set({ autoSearchState });
    for (let i = 0; i < jobs.length && !stopped; i++) {
      const job = jobs[i];
      setStatus(`Проверка ${i + 1}/${jobs.length} · ${scope.label}: ${job.query}`);
      let tab;
      try {
        tab = await chrome.tabs.create({ url: L.searchUrl(job.query, scope), active: false });
        currentTab = tab.id;
        await waitLoaded(tab.id);
        if (stopped) break;
        // Avito can replace an unsupported location with /all or another city.
        // Do not silently continue with a country-wide or unintended search.
        const loadedTab = await chrome.tabs.get(tab.id);
        if (!L.searchPageMatchesScope(loadedTab?.url || '', scope)) {
          locationError = `Авито открыл другую географию вместо «${scope.label}»: ${loadedTab?.url || 'неизвестная страница'}. Поиск остановлен. Выбери регион на самом Авито и вставь его ссылку в поле.`;
          stopped = true;
          break;
        }
        const data = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: scrapeVisibleCards });
        const result = data?.[0]?.result || { items: [], blocked: false };
        if (result.blocked) { blocked = true; stopped = true; break; }
        if (!result.items.length) errors++;
        for (const item of result.items) {
          const key = item.id;
          if (!L.matchesScope(item,scope)) { geoRejected++; continue; }
          if (!found.has(key)) found.set(key, { ...item, scopeSlug: scope.slug, scopeType: scope.type, scopeLabel: scope.label, baseQuery: job.baseQuery || job.query, group: job.group, mode: job.mode });
        }
      } catch (err) {
        errors++;
        console.warn('Cannot read search:', job.query, err);
      } finally {
        if (tab) { try { await chrome.tabs.remove(tab.id); } catch {} }
        currentTab = null;
        scanned++;
        progress(scanned, jobs.length);
      }
      if (!stopped && i < jobs.length - 1) await delay(1800); // Avoid rapid-fire requests.
    }

    // Evaluate each target model separately: a PS5 must never be compared with a MacBook.
    const groups = new Map();
    for (const item of found.values()) {
      const k = item.baseQuery;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(item);
    }
    const next = [];
    for (const [baseQuery, items] of groups) {
      const any = items[0];
      next.push(...E.estimate(items, {
        query: baseQuery, group: any.group, mode: any.mode,
        manualResale: mode === 'custom' ? nval('resale') : 0, oldSeen
      }));
    }
    rows = next;
    const stamp = new Date().toISOString();
    for (const item of found.values()) {
      seen[item.id] = { firstSeen: seen[item.id]?.firstSeen || stamp, lastSeen: stamp, price: item.price, title: item.title, url: item.url, location: item.location, scopeSlug: scope.slug };
    }
    pruneSeen();
    totalRaw = found.size;
    const accepted = winners();
    const newAccepted = accepted.filter(r => r.isNew);
    history = [{ mode, scope: scope.label, scopeSlug: scope.slug, q: mode === 'auto' ? `Автопоиск: ${jobs.length} из ${E.combinedCatalog(personalQueries).length} моделей` : q, queries: jobs.map(job => job.query), date: stamp, total: totalRaw, accepted: accepted.length, newCount: newAccepted.length }, ...history].slice(0, 25);
    await persist();
    render(); renderHistory();
    if (locationError) setStatus(locationError);
    else if (blocked) setStatus(`Авито запросил проверку/ограничил доступ. Остановлено. Успели проверить ${scanned} из ${jobs.length}; подходящих ${accepted.length}.`);
    else if (stopped) setStatus(`Поиск остановлен. Проверено ${scanned} из ${jobs.length}, подходящих ${accepted.length}.`);
    else setStatus(`Готово · ${scope.label}: проверено ${scanned} поисков, подтверждено местных объявлений ${totalRaw}, исключено из других городов или с неизвестным местом ${geoRejected}; подходят ${accepted.length}, новых ${newAccepted.length}.${errors ? ` Пустых или недоступных поисков: ${errors}.` : ''}`);
    if (!locationError) await notifyWinners(newAccepted);
  } catch (e) {
    console.error(e); setStatus('Не удалось завершить проверку: ' + (e.message || e));
  } finally {
    busy(false);
  }
}
function render() {
  const all = winners(), filtered = visible();
  $('count').textContent = filtered.length;
  $('summary').textContent = `После фильтра: ${all.length} · Из них впервые обнаружены: ${all.filter(r => r.isNew).length}`;
  const box = $('results'); box.replaceChildren();
  if (!filtered.length) {
    const empty = document.createElement('div'); empty.className = 'empty';
    const scope = currentScope();
    empty.textContent = scope.error ? scope.error : rows.length && !rows.some(r => r.scopeSlug === scope.scope.slug && r.scopeType === scope.scope.type) ? 'Для выбранного региона пока нет результатов. Запусти поиск заново.' : rows.length ? 'Нет подходящих объявлений в выбранном регионе: недостаточная прибыль, маленькая маржа или мало сопоставимых цен.' : 'Пока нет проверенных объявлений. Запусти один из режимов поиска.';
    box.append(empty); return;
  }
  for (const r of filtered.slice(0, 300)) {
    const card = document.createElement('article'); card.className = 'card';
    const top = document.createElement('div'); top.className = 'card-top';
    const link = document.createElement('a'); link.href = r.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = r.title;
    top.append(link);
    if (r.isNew) { const badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = 'НОВОЕ'; top.append(badge); }
    card.append(top);
    const cat = document.createElement('div'); cat.className = 'category'; cat.textContent = `${r.group} · ${r.query} · ${r.scopeLabel}${r.location ? ` · ${r.location}` : ''}`; card.append(cat);
    const p = document.createElement('p'); p.textContent = `Цена: ${RUB(r.price)} · Ориентир перепродажи: ${RUB(r.reference)}`; card.append(p);
    const profit = document.createElement('p'); profit.className = 'profit'; profit.textContent = `+${RUB(r.profit)}`;
    const small = document.createElement('small'); small.textContent = ` · маржа ${r.margin.toFixed(1)}%`; profit.append(small); card.append(profit);
    const note = document.createElement('p'); note.className = 'fine';
    note.textContent = r.referenceType === 'manual'
      ? 'Ориентир введён вручную. Проверь реальную цену продажи, дефекты и все расходы.'
      : `Оценка по ${r.comparables} похожим объявлениям (40-й процентиль). Не подтверждённые продажи. Проверь комплектацию, состояние и комиссии.`;
    card.append(note); box.append(card);
  }
}
function renderHistory() {
  const box = $('history'); box.replaceChildren();
  if (!history.length) { const s = document.createElement('span'); s.className = 'muted'; s.textContent = 'Пока нет запусков'; box.append(s); return; }
  for (const h of history) {
    const b = document.createElement('button');
    b.textContent = `${h.mode === 'auto' ? '⚡ ' : '🔎 '}${h.q} · ${h.scope || 'Регион не указан'} · ${new Date(h.date).toLocaleString('ru-RU')} · +${h.accepted || 0}`;
    b.title = 'История запуска (не выполняет поиск)';
    b.addEventListener('click', () => { if (h.mode === 'custom') $('query').value = h.q; setStatus(`Запуск: ${h.q}. Для повторной проверки нажми кнопку поиска.`); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    box.append(b);
  }
}
function exportCsv() {
  const data = visible();
  if (!data.length) { setStatus('Нет подходящих объявлений для экспорта.'); return; }
  const cols = ['group', 'query', 'scopeLabel', 'location', 'title', 'price', 'reference', 'profit', 'margin', 'comparables', 'isNew', 'url'];
  const records = [cols.join(';'), ...data.map(r => cols.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(';'))];
  const blob = new Blob(['\ufeff' + records.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = `avito-profit-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2500);
}
async function initialize() {
  try {
    const data = await chrome.storage.local.get([...KEYS, 'seen', 'history', 'lastRows', 'autoSearchState', 'personalQueries', 'onlyPersonal']);
    for (const k of KEYS) if (data[k] !== undefined) $(k).value = data[k];
    seen = data.seen || {}; history = data.history || []; rows = data.lastRows || []; autoSearchState = data.autoSearchState || {};
    personalQueries = E.sanitizePersonalQueries(data.personalQueries || []);
    $('onlyPersonal').checked = data.onlyPersonal === true;
  } catch (e) { console.warn('Storage unavailable:', e); }
  render(); renderHistory(); renderAutoQueries(); renderPersonalQueries(); updateScopeIndicator();
}
KEYS.forEach(k => $(k).addEventListener('input', () => { chrome.storage.local.set({ [k]: $(k).value }); if (k === 'city') updateScopeIndicator(); render(); }));
$('addPersonal').addEventListener('click', () => addPersonalQueries().catch(e => setPersonalStatus('Ошибка сохранения: ' + e.message)));
$('personalInput').addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); $('addPersonal').click(); } });
$('clearPersonal').addEventListener('click', async () => {
  if (running || !personalQueries.length) return;
  if (!confirm('Удалить все добавленные тобой товары из автопоиска? История объявлений сохранится.')) return;
  personalQueries = [];
  await chrome.storage.local.set({ personalQueries });
  renderPersonalQueries(); setPersonalStatus('Твой список очищен. Встроенный каталог остался.');
});
$('onlyPersonal').addEventListener('change', () => {
  chrome.storage.local.set({ onlyPersonal: $('onlyPersonal').checked });
  updateCatalogCount();
});
$('scan').addEventListener('click', () => run('custom'));
$('scanAuto').addEventListener('click', () => run('auto'));
$('stop').addEventListener('click', () => { stopped = true; setStatus('Останавливаем поиск после текущей страницы…'); });
$('onlyNew').addEventListener('change', render);
$('export').addEventListener('click', exportCsv);
$('clear').addEventListener('click', async () => {
  if (!confirm('Удалить историю объявлений, результатов и ротации поисковых запросов?')) return;
  seen = {}; history = []; rows = []; autoSearchState = {};
  await chrome.storage.local.remove(['seen', 'history', 'lastRows', 'autoSearchState', 'notificationTargets']);
  render(); renderHistory(); renderAutoQueries(); progress(0, 1); setStatus('История, результаты и очередь поисков очищены.');
});
initialize();
