/* Location resolution and conservative location filtering, with NO silent /all fallback.
   Search pages can contain out-of-area promoted/delivery listings. To prevent
   geographic false positives, only ads with verifiable geography pass. */
(function (root) {
  'use strict';
  const CITIES = [
    ['Москва','moskva'], ['Санкт-Петербург','sankt-peterburg'], ['Новосибирск','novosibirsk'],
    ['Екатеринбург','ekaterinburg'], ['Казань','kazan'], ['Краснодар','krasnodar'],
    ['Ростов-на-Дону','rostov-na-donu'], ['Самара','samara'], ['Уфа','ufa'],
    ['Челябинск','chelyabinsk'], ['Пермь','perm'], ['Омск','omsk'], ['Воронеж','voronezh'],
    ['Сочи','sochi'], ['Тюмень','tyumen'], ['Нижний Новгород','nizhniy_novgorod'],
    ['Волгоград','volgograd'], ['Саратов','saratov'], ['Тольятти','tolyatti'],
    ['Ижевск','izhevsk'], ['Барнаул','barnaul'], ['Ульяновск','ulyanovsk'],
    ['Иркутск','irkutsk'], ['Хабаровск','habarovsk'], ['Владивосток','vladivostok'],
    ['Ярославль','yaroslavl'], ['Томск','tomsk'], ['Оренбург','orenburg'],
    ['Кемерово','kemerovo'], ['Новокузнецк','novokuznetsk'], ['Рязань','ryazan'],
    ['Астрахань','astrahan'], ['Пенза','penza'], ['Липецк','lipetsk'],
    ['Киров','kirov'], ['Тула','tula'], ['Калининград','kaliningrad'],
    ['Брянск','bryansk'], ['Курск','kursk'], ['Тверь','tver'], ['Магнитогорск','magnitogorsk'],
    ['Ставрополь','stavropol'], ['Белгород','belgorod'], ['Владимир','vladimir'],
    ['Чебоксары','cheboksary'], ['Смоленск','smolensk'], ['Мурманск','murmansk'],
    ['Архангельск','arhangelsk'], ['Вологда','vologda'], ['Череповец','cherepovets'],
    ['Кострома','kostroma'], ['Петрозаводск','petrozavodsk'], ['Сыктывкар','syktyvkar'],
    ['Якутск','yakutsk'], ['Чита','chita'], ['Улан-Удэ','ulan-ude'],
    ['Благовещенск','blagoveschensk'], ['Южно-Сахалинск','yuzhno-sahalinsk'],
    ['Магадан','magadan'], ['Псков','pskov'], ['Великий Новгород','velikiy_novgorod'],
    ['Курган','kurgan'], ['Сургут','surgut'], ['Нижневартовск','nizhnevartovsk'],
    ['Новороссийск','novorossiysk'], ['Армавир','armavir'], ['Геленджик','gelendzhik'],
    ['Анапа','anapa'], ['Майкоп','maykop'], ['Нальчик','nalchik'], ['Махачкала','mahachkala'],
    ['Грозный','groznyy'], ['Владикавказ','vladikavkaz'], ['Элиста','elista'],
    ['Йошкар-Ола','yoshkar-ola'], ['Саранск','saransk'], ['Абакан','abakan'],
    ['Кызыл','kyzyl'], ['Норильск','norilsk'], ['Красноярск','krasnoyarsk'],
    ['Севастополь','sevastopol'], ['Симферополь','simferopol'], ['Керчь','kerch'],
    ['Подольск','podolsk'], ['Химки','himki'], ['Балашиха','balashiha'],
    ['Мытищи','mytischi'], ['Королёв','korolev'], ['Люберцы','lyubertsy'],
    ['Одинцово','odintsovo'], ['Реутов','reutov'], ['Красногорск','krasnogorsk'],
    ['Зеленоград','zelenograd'], ['Щёлково','schelkovo'], ['Домодедово','domodedovo'],
    ['Коломна','kolomna'], ['Серпухов','serpuhov'], ['Жуковский','zhukovskiy'],
    ['Долгопрудный','dolgoprudnyy'], ['Электросталь','elektrostal'],
    ['Ногинск','noginsk'], ['Пушкино','pushkino'], ['Солнечногорск','solnechnogorsk'],
    ['Дмитров','dmitrov'], ['Видное','vidnoe'], ['Истра','istra'],
    ['Гатчина','gatchina'], ['Всеволожск','vsevolozhsk'], ['Выборг','vyborg'],
    ['Кингисепп','kingisepp'], ['Тосно','tosno'], ['Мурино','murino'], ['Кудрово','kudrovo'],
    ['Зеленогорск','zelenogorsk'], ['Сестрорецк','sestroretsk'],
    ['Набережные Челны','naberezhnye_chelny'], ['Нижнекамск','nizhnekamsk'],
    ['Альметьевск','almetevsk'], ['Зеленодольск','zelenodolsk'],
    ['Стерлитамак','sterlitamak'], ['Салават','salavat'], ['Нефтекамск','neftekamsk'],
    ['Дербент','derbent'], ['Каспийск','kaspiysk'],
    ['Таганрог','taganrog'], ['Шахты','shahty'], ['Волгодонск','volgodonsk'],
    ['Батайск','bataysk'], ['Аксай','aksay'], ['Азов','azov'],
    ['Ессентуки','essentuki'], ['Пятигорск','pyatigorsk'], ['Кисловодск','kislovodsk'],
    ['Минеральные Воды','mineralnye_vody'], ['Невинномысск','nevinnomyssk'],
    ['Каменск-Уральский','kamensk-uralskiy'], ['Нижний Тагил','nizhniy_tagil'],
    ['Первоуральск','pervouralsk'], ['Березники','berezniki'], ['Соликамск','solikamsk'],
    ['Ангарск','angarsk'], ['Братск','bratsk'], ['Усолье-Сибирское','usole-sibirskoe'],
    ['Северск','seversk'], ['Бердск','berdsk'], ['Искитим','iskitim'],
    ['Бийск','biysk'], ['Рубцовск','rubtsovsk'], ['Междуреченск','mezhdurechensk'],
    ['Прокопьевск','prokopevsk'], ['Ачинск','achinsk']
  ];
  // Regional slugs and memberships are supplied for common markets. For any
  // other locality, paste the location URL selected through Avito's own picker.
  const REGIONS = [
    { name:'Московская область', slug:'moskovskaya_oblast', aliases:['подмосковье'], cities:['Подольск','Химки','Балашиха','Мытищи','Королёв','Люберцы','Одинцово','Реутов','Красногорск','Щёлково','Домодедово','Коломна','Серпухов','Жуковский','Долгопрудный','Электросталь','Ногинск','Пушкино','Солнечногорск','Дмитров','Видное','Истра'] },
    { name:'Ленинградская область', slug:'leningradskaya_oblast', cities:['Гатчина','Всеволожск','Выборг','Кингисепп','Тосно','Мурино','Кудрово'] },
    { name:'Краснодарский край', slug:'krasnodarskiy_kray', cities:['Краснодар','Сочи','Новороссийск','Армавир','Геленджик','Анапа'] },
    { name:'Республика Татарстан', slug:'tatarstan', aliases:['татарстан'], cities:['Казань','Набережные Челны','Нижнекамск','Альметьевск','Зеленодольск'] },
    { name:'Республика Башкортостан', slug:'bashkortostan', aliases:['башкирия','башкортостан'], cities:['Уфа','Стерлитамак','Салават','Нефтекамск'] },
    { name:'Ростовская область', slug:'rostovskaya_oblast', cities:['Ростов-на-Дону','Таганрог','Шахты','Волгодонск','Батайск','Аксай','Азов'] },
    { name:'Свердловская область', slug:'sverdlovskaya_oblast', cities:['Екатеринбург','Каменск-Уральский','Нижний Тагил','Первоуральск'] },
    { name:'Самарская область', slug:'samarskaya_oblast', cities:['Самара','Тольятти'] },
    { name:'Новосибирская область', slug:'novosibirskaya_oblast', cities:['Новосибирск','Бердск','Искитим'] },
    { name:'Челябинская область', slug:'chelyabinskaya_oblast', cities:['Челябинск','Магнитогорск'] },
    { name:'Пермский край', slug:'permskiy_kray', cities:['Пермь','Березники','Соликамск'] },
    { name:'Воронежская область', slug:'voronezhskaya_oblast', cities:['Воронеж'] },
    { name:'Тюменская область', slug:'tyumenskaya_oblast', cities:['Тюмень'] },
    { name:'Нижегородская область', slug:'nizhegorodskaya_oblast', cities:['Нижний Новгород'] },
    { name:'Саратовская область', slug:'saratovskaya_oblast', cities:['Саратов'] },
    { name:'Волгоградская область', slug:'volgogradskaya_oblast', cities:['Волгоград'] },
    { name:'Иркутская область', slug:'irkutskaya_oblast', cities:['Иркутск','Ангарск','Братск','Усолье-Сибирское'] },
    { name:'Кемеровская область', slug:'kemerovskaya_oblast', aliases:['кузбасс'], cities:['Кемерово','Новокузнецк','Междуреченск','Прокопьевск'] },
    { name:'Красноярский край', slug:'krasnoyarskiy_kray', cities:['Красноярск','Норильск','Ачинск'] },
    { name:'Алтайский край', slug:'altayskiy_kray', cities:['Барнаул','Бийск','Рубцовск'] },
    { name:'Ставропольский край', slug:'stavropolskiy_kray', cities:['Ставрополь','Ессентуки','Пятигорск','Кисловодск','Минеральные Воды','Невинномысск'] }
  ];
  const key = str => String(str || '').toLowerCase().replace(/ё/g,'е').replace(/[–—\-_.,;:()]/g,' ').replace(/\s+/g,' ').replace(/^г\.?\s+|^город\s+/, '').replace(/^респ\.?\s+/, 'республика ').replace(/\s+обл\.?$/, ' область').trim();
  const cityByKey = new Map();
  const cityBySlug = new Map();
  for (const [name,slug] of CITIES) {
    const obj = { type:'city', label:name, slug };
    cityByKey.set(key(name),obj);
    cityBySlug.set(slug, obj);
  }
  cityByKey.set('спб',cityBySlug.get('sankt-peterburg'));
  cityByKey.set('питер',cityBySlug.get('sankt-peterburg'));
  cityByKey.set('н новгород',cityBySlug.get('nizhniy_novgorod'));
  const regionByKey = new Map(), regionBySlug = new Map(), memberRegion = new Map();
  for (const raw of REGIONS) {
    const obj = { type:'region', label:raw.name, slug:raw.slug,
      aliases:[raw.name, ...(raw.aliases||[])],
      memberSlugs: raw.cities.map(name => cityByKey.get(key(name))?.slug).filter(Boolean) };
    regionBySlug.set(obj.slug, obj);
    for (const alias of obj.aliases) regionByKey.set(key(alias),obj);
    for (const slug of obj.memberSlugs) {
      if (!memberRegion.has(slug)) memberRegion.set(slug,new Set());
      memberRegion.get(slug).add(obj.slug);
    }
  }
  const SLUG = /^[a-z][a-z0-9_-]{1,90}$/i;
  function getPathSlug(url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' || !/^(?:www\.)?avito\.ru$/i.test(parsed.hostname)) return null;
      return parsed.pathname.split('/').filter(Boolean)[0]?.toLowerCase() || null;
    } catch { return null; }
  }
  function resolveScope(value) {
    const typed = String(value || '').trim();
    if (!typed) return { error:'Укажи город или регион. Поиск по всей России включается только явным выбором «Вся Россия».' };
    const k = key(typed);
    if (['вся россия','все регионы','по всей россии','all','россия'].includes(k)) return { scope:{type:'all',slug:'all',label:'Вся Россия',aliases:[],memberSlugs:[]} };
    const known = cityByKey.get(k) || regionByKey.get(k);
    if (known) return { scope:known };
    if (/^https?:\/\//i.test(typed)) {
      const slug = getPathSlug(typed);
      if (!slug || !SLUG.test(slug)) return {error:'Нужна ссылка на регион с avito.ru, например https://www.avito.ru/tula. Другие сайты не принимаются.'};
      if (slug === 'all') return {scope:{type:'all',slug:'all',label:'Вся Россия',aliases:[],memberSlugs:[]}};
      return {scope:cityBySlug.get(slug) || regionBySlug.get(slug) || {
        type: /(?:oblast|kray|krai|respublika|avtonomnyy_okrug|okrug)/.test(slug) ? 'region' : 'city',
        slug, label:`Авито: ${slug.replace(/[-_]/g,' ')}`, aliases:[], memberSlugs:[]
      }};
    }
    if (SLUG.test(typed)) return {scope:cityBySlug.get(typed.toLowerCase()) || regionBySlug.get(typed.toLowerCase()) || {
      type:'city', slug:typed.toLowerCase(),label:`Авито: ${typed}`, aliases:[], memberSlugs:[]
    }};
    return { error:`Не могу надёжно распознать «${typed}». Открой Авито, выбери свой регион и вставь сюда ссылку из адресной строки. По всей России искать не буду.` };
  }
  function searchUrl(query,scope) {
    if (!scope || !SLUG.test(scope.slug)) throw new Error('Не задан корректный регион поиска');
    const u = new URL(`https://www.avito.ru/${scope.slug}`);
    u.searchParams.set('q',String(query || '').trim());
    if (scope.type === 'city') u.searchParams.set('radius','0');
    return u.href;
  }
  function searchPageMatchesScope(url,scope) {
    return getPathSlug(url) === scope.slug;
  }
  function matchesScope(item,scope) {
    if (!scope) return false;
    if (scope.type === 'all') return true;
    const pathSlug = getPathSlug(item?.url);
    if (!pathSlug || pathSlug === 'all') return false;
    if (scope.type === 'city') return pathSlug === scope.slug;
    if (scope.type === 'region') {
      if (pathSlug === scope.slug) return true;
      if (scope.memberSlugs.includes(pathSlug)) return true;
      if (memberRegion.get(pathSlug)?.has(scope.slug)) return true;
      // Some cards include full street address / region, others only the city;
      // the latter must not be guessed as belonging to the chosen region.
      const location = key(item?.location || '');
      return !!location && (scope.aliases || []).some(a => {
        const alias = key(a);
        return alias.length >= 5 && (location === alias || location.startsWith(alias+' ') || location.includes(' '+alias+' ')
          || location.endsWith(' '+alias));
      });
    }
    return false;
  }
  const api={CITIES,REGIONS,resolveScope,searchUrl,getPathSlug,searchPageMatchesScope,matchesScope,key};
  root.MarginLocation=api;
  if (typeof module !== 'undefined' && module.exports) module.exports=api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
