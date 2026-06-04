/**
 * Şehir → Ülke otomatik eşleme (PHP cargotrack.php:10267'den port).
 * Şehir adı yazılınca ülke alanını otomatik doldurmak için.
 * Key: lowercase şehir adı, Value: ülke adı (Türkçe).
 */

export const CITY_COUNTRY: Record<string, string> = {
  // Türkiye
  istanbul: 'Türkiye', ankara: 'Türkiye', izmir: 'Türkiye', bursa: 'Türkiye', antalya: 'Türkiye',
  adana: 'Türkiye', konya: 'Türkiye', gaziantep: 'Türkiye', mersin: 'Türkiye', kayseri: 'Türkiye',
  eskişehir: 'Türkiye', eskisehir: 'Türkiye', samsun: 'Türkiye', trabzon: 'Türkiye',
  diyarbakır: 'Türkiye', diyarbakir: 'Türkiye', şanlıurfa: 'Türkiye', sanliurfa: 'Türkiye',
  kocaeli: 'Türkiye', izmit: 'Türkiye', sakarya: 'Türkiye', tekirdağ: 'Türkiye', tekirdag: 'Türkiye',
  aydın: 'Türkiye', aydin: 'Türkiye', manisa: 'Türkiye', denizli: 'Türkiye',
  muğla: 'Türkiye', mugla: 'Türkiye', hatay: 'Türkiye', iskenderun: 'Türkiye',
  balıkesir: 'Türkiye', balikesir: 'Türkiye', çorum: 'Türkiye', corum: 'Türkiye',
  malatya: 'Türkiye', elazığ: 'Türkiye', elazig: 'Türkiye', erzurum: 'Türkiye', van: 'Türkiye',
  sivas: 'Türkiye', batman: 'Türkiye', kahramanmaraş: 'Türkiye', kahramanmaras: 'Türkiye',

  // Almanya
  berlin: 'Almanya', münchen: 'Almanya', munchen: 'Almanya', munich: 'Almanya', hamburg: 'Almanya',
  köln: 'Almanya', koln: 'Almanya', cologne: 'Almanya', frankfurt: 'Almanya', stuttgart: 'Almanya',
  düsseldorf: 'Almanya', dusseldorf: 'Almanya', dortmund: 'Almanya', essen: 'Almanya',
  leipzig: 'Almanya', bremen: 'Almanya', dresden: 'Almanya', hannover: 'Almanya',
  nürnberg: 'Almanya', nurnberg: 'Almanya', duisburg: 'Almanya', bochum: 'Almanya',
  wuppertal: 'Almanya', bielefeld: 'Almanya', bonn: 'Almanya', mannheim: 'Almanya',
  karlsruhe: 'Almanya', münster: 'Almanya', munster: 'Almanya', wiesbaden: 'Almanya',
  augsburg: 'Almanya', aachen: 'Almanya',

  // Fransa
  paris: 'Fransa', marseille: 'Fransa', lyon: 'Fransa', toulouse: 'Fransa', nice: 'Fransa',
  nantes: 'Fransa', strasbourg: 'Fransa', montpellier: 'Fransa', bordeaux: 'Fransa', lille: 'Fransa',
  rennes: 'Fransa', reims: 'Fransa', 'le havre': 'Fransa', 'saint-étienne': 'Fransa',
  'saint-etienne': 'Fransa', toulon: 'Fransa', grenoble: 'Fransa', dijon: 'Fransa',
  angers: 'Fransa', nîmes: 'Fransa', nimes: 'Fransa', villeurbanne: 'Fransa',
  'clermont-ferrand': 'Fransa', 'le mans': 'Fransa', 'aix-en-provence': 'Fransa', brest: 'Fransa',
  tours: 'Fransa', amiens: 'Fransa', limoges: 'Fransa', annecy: 'Fransa', perpignan: 'Fransa',
  metz: 'Fransa', besançon: 'Fransa', besancon: 'Fransa', calais: 'Fransa',

  // İtalya
  roma: 'İtalya', rome: 'İtalya', milano: 'İtalya', milan: 'İtalya', napoli: 'İtalya', naples: 'İtalya',
  torino: 'İtalya', turin: 'İtalya', palermo: 'İtalya', genova: 'İtalya', genoa: 'İtalya',
  bologna: 'İtalya', firenze: 'İtalya', florence: 'İtalya', bari: 'İtalya', catania: 'İtalya',
  venezia: 'İtalya', venice: 'İtalya', verona: 'İtalya', messina: 'İtalya', padova: 'İtalya',
  trieste: 'İtalya', brescia: 'İtalya', parma: 'İtalya', modena: 'İtalya', 'reggio emilia': 'İtalya',
  livorno: 'İtalya', 'la spezia': 'İtalya', ancona: 'İtalya', salerno: 'İtalya',

  // Hollanda
  amsterdam: 'Hollanda', rotterdam: 'Hollanda', 'den haag': 'Hollanda', 'the hague': 'Hollanda',
  utrecht: 'Hollanda', eindhoven: 'Hollanda', tilburg: 'Hollanda', groningen: 'Hollanda',
  almere: 'Hollanda', breda: 'Hollanda', nijmegen: 'Hollanda', enschede: 'Hollanda',

  // Belçika
  brussels: 'Belçika', bruxelles: 'Belçika', antwerpen: 'Belçika', antwerp: 'Belçika',
  anvers: 'Belçika', gent: 'Belçika', ghent: 'Belçika', charleroi: 'Belçika',
  liège: 'Belçika', liege: 'Belçika', brugge: 'Belçika', bruges: 'Belçika',
  namur: 'Belçika', leuven: 'Belçika', mons: 'Belçika',

  // İspanya
  madrid: 'İspanya', barcelona: 'İspanya', valencia: 'İspanya', sevilla: 'İspanya',
  seville: 'İspanya', zaragoza: 'İspanya', málaga: 'İspanya', malaga: 'İspanya',
  murcia: 'İspanya', palma: 'İspanya', 'las palmas': 'İspanya', bilbao: 'İspanya',
  alicante: 'İspanya', córdoba: 'İspanya', cordoba: 'İspanya', valladolid: 'İspanya',
  vigo: 'İspanya', gijón: 'İspanya', gijon: 'İspanya', granada: 'İspanya',
  algeciras: 'İspanya', santander: 'İspanya', 'san sebastián': 'İspanya', 'san sebastian': 'İspanya',

  // Portekiz
  lisboa: 'Portekiz', lisbon: 'Portekiz', porto: 'Portekiz', braga: 'Portekiz',
  coimbra: 'Portekiz', faro: 'Portekiz', setúbal: 'Portekiz', setubal: 'Portekiz',
  aveiro: 'Portekiz', funchal: 'Portekiz',

  // İngiltere
  london: 'Birleşik Krallık', londra: 'Birleşik Krallık', birmingham: 'Birleşik Krallık',
  manchester: 'Birleşik Krallık', glasgow: 'Birleşik Krallık', liverpool: 'Birleşik Krallık',
  leeds: 'Birleşik Krallık', sheffield: 'Birleşik Krallık', edinburgh: 'Birleşik Krallık',
  bristol: 'Birleşik Krallık', cardiff: 'Birleşik Krallık', belfast: 'Birleşik Krallık',
  newcastle: 'Birleşik Krallık', nottingham: 'Birleşik Krallık', southampton: 'Birleşik Krallık',
  felixstowe: 'Birleşik Krallık', dover: 'Birleşik Krallık',

  // İrlanda
  dublin: 'İrlanda', cork: 'İrlanda', limerick: 'İrlanda', galway: 'İrlanda',

  // İsviçre / Avusturya / Polonya / Çekya / Slovakya / Macaristan / Romanya / Bulgaristan / Yunanistan
  zürich: 'İsviçre', zurich: 'İsviçre', geneva: 'İsviçre', genève: 'İsviçre',
  geneve: 'İsviçre', basel: 'İsviçre', bern: 'İsviçre', lausanne: 'İsviçre',
  luzern: 'İsviçre', lucerne: 'İsviçre',
  wien: 'Avusturya', vienna: 'Avusturya', viyana: 'Avusturya', graz: 'Avusturya',
  linz: 'Avusturya', salzburg: 'Avusturya', innsbruck: 'Avusturya',
  warszawa: 'Polonya', warsaw: 'Polonya', kraków: 'Polonya', krakow: 'Polonya',
  łódź: 'Polonya', lodz: 'Polonya', wrocław: 'Polonya', wroclaw: 'Polonya',
  poznań: 'Polonya', poznan: 'Polonya', gdańsk: 'Polonya', gdansk: 'Polonya',
  szczecin: 'Polonya', katowice: 'Polonya',
  praha: 'Çekya', prague: 'Çekya', brno: 'Çekya', ostrava: 'Çekya',
  plzeň: 'Çekya', plzen: 'Çekya',
  bratislava: 'Slovakya', košice: 'Slovakya', kosice: 'Slovakya',
  budapest: 'Macaristan', budapeşte: 'Macaristan', debrecen: 'Macaristan',
  szeged: 'Macaristan', miskolc: 'Macaristan', pécs: 'Macaristan', pecs: 'Macaristan',
  bucurești: 'Romanya', bucuresti: 'Romanya', bucharest: 'Romanya',
  'cluj-napoca': 'Romanya', timișoara: 'Romanya', timisoara: 'Romanya',
  iași: 'Romanya', iasi: 'Romanya', constanța: 'Romanya', constanta: 'Romanya',
  craiova: 'Romanya', brașov: 'Romanya', brasov: 'Romanya',
  sofia: 'Bulgaristan', sofya: 'Bulgaristan', plovdiv: 'Bulgaristan', varna: 'Bulgaristan',
  burgas: 'Bulgaristan', ruse: 'Bulgaristan', 'stara zagora': 'Bulgaristan',
  athens: 'Yunanistan', atina: 'Yunanistan', thessaloniki: 'Yunanistan',
  selanik: 'Yunanistan', patras: 'Yunanistan', piraeus: 'Yunanistan', heraklion: 'Yunanistan',

  // Eski Yugoslavya
  zagreb: 'Hırvatistan', split: 'Hırvatistan', rijeka: 'Hırvatistan',
  beograd: 'Sırbistan', belgrade: 'Sırbistan', 'novi sad': 'Sırbistan', niš: 'Sırbistan', nis: 'Sırbistan',
  ljubljana: 'Slovenya', maribor: 'Slovenya', koper: 'Slovenya',
  sarajevo: 'Bosna Hersek', 'banja luka': 'Bosna Hersek', mostar: 'Bosna Hersek',
  podgorica: 'Karadağ', skopje: 'Kuzey Makedonya', tirana: 'Arnavutluk',
  durrës: 'Arnavutluk', durres: 'Arnavutluk',

  // İskandinavya
  stockholm: 'İsveç', göteborg: 'İsveç', goteborg: 'İsveç', malmö: 'İsveç', malmo: 'İsveç',
  oslo: 'Norveç', bergen: 'Norveç', trondheim: 'Norveç', stavanger: 'Norveç',
  helsinki: 'Finlandiya', espoo: 'Finlandiya', tampere: 'Finlandiya', vantaa: 'Finlandiya',
  københavn: 'Danimarka', kobenhavn: 'Danimarka', copenhagen: 'Danimarka',
  aarhus: 'Danimarka', odense: 'Danimarka',
  reykjavík: 'İzlanda', reykjavik: 'İzlanda',
  tallinn: 'Estonya', riga: 'Letonya', vilnius: 'Litvanya',
  kaunas: 'Litvanya', klaipėda: 'Litvanya', klaipeda: 'Litvanya',

  // Rusya / Ukrayna / Belarus
  moskva: 'Rusya', moscow: 'Rusya', moskova: 'Rusya', 'sankt-peterburg': 'Rusya',
  'st. petersburg': 'Rusya', novosibirsk: 'Rusya', yekaterinburg: 'Rusya',
  kazan: 'Rusya', rostov: 'Rusya', sochi: 'Rusya',
  kyiv: 'Ukrayna', kiev: 'Ukrayna', odesa: 'Ukrayna', odessa: 'Ukrayna',
  kharkiv: 'Ukrayna', lviv: 'Ukrayna', minsk: 'Belarus',

  // Kafkasya / Orta Asya
  tbilisi: 'Gürcistan', batumi: 'Gürcistan', baku: 'Azerbaycan', bakü: 'Azerbaycan',
  yerevan: 'Ermenistan', almaty: 'Kazakistan', 'nur-sultan': 'Kazakistan', astana: 'Kazakistan',
  tashkent: 'Özbekistan', taşkent: 'Özbekistan',
  bishkek: 'Kırgızistan', dushanbe: 'Tacikistan',

  // Orta Doğu
  dubai: 'BAE', 'abu dhabi': 'BAE', sharjah: 'BAE',
  riyadh: 'Suudi Arabistan', riyad: 'Suudi Arabistan',
  jeddah: 'Suudi Arabistan', cidde: 'Suudi Arabistan', dammam: 'Suudi Arabistan',
  doha: 'Katar', 'kuwait city': 'Kuveyt', manama: 'Bahreyn',
  muscat: 'Umman', maskat: 'Umman',
  tehran: 'İran', tahran: 'İran', baghdad: 'Irak', bağdat: 'Irak', erbil: 'Irak', basra: 'Irak',
  amman: 'Ürdün', beirut: 'Lübnan', beyrut: 'Lübnan',
  damascus: 'Suriye', şam: 'Suriye',
  'tel aviv': 'İsrail', jerusalem: 'İsrail', kudüs: 'İsrail', haifa: 'İsrail',

  // Kuzey Afrika
  cairo: 'Mısır', kahire: 'Mısır', alexandria: 'Mısır', iskenderiye: 'Mısır',
  casablanca: 'Fas', kazablanka: 'Fas', rabat: 'Fas', tangier: 'Fas', tanca: 'Fas',
  algiers: 'Cezayir', cezayir: 'Cezayir', oran: 'Cezayir',
  tunis: 'Tunus', sfax: 'Tunus', tripoli: 'Libya', trablus: 'Libya', benghazi: 'Libya',

  // Asya
  beijing: 'Çin', pekin: 'Çin', shanghai: 'Çin', şanghay: 'Çin',
  guangzhou: 'Çin', shenzhen: 'Çin', 'hong kong': 'Hong Kong',
  tokyo: 'Japonya', osaka: 'Japonya', yokohama: 'Japonya', nagoya: 'Japonya',
  seoul: 'Güney Kore', seul: 'Güney Kore', busan: 'Güney Kore', incheon: 'Güney Kore',
  mumbai: 'Hindistan', bombay: 'Hindistan', delhi: 'Hindistan', 'new delhi': 'Hindistan',
  bangalore: 'Hindistan', chennai: 'Hindistan', kolkata: 'Hindistan',
  hyderabad: 'Hindistan', pune: 'Hindistan',
  karachi: 'Pakistan', lahore: 'Pakistan', islamabad: 'Pakistan',
  dhaka: 'Bangladeş', colombo: 'Sri Lanka', kathmandu: 'Nepal',
  singapore: 'Singapur', singapur: 'Singapur',
  'kuala lumpur': 'Malezya', penang: 'Malezya',
  bangkok: 'Tayland', 'chiang mai': 'Tayland',
  jakarta: 'Endonezya', surabaya: 'Endonezya',
  manila: 'Filipinler', cebu: 'Filipinler',
  'ho chi minh': 'Vietnam', hanoi: 'Vietnam', haiphong: 'Vietnam',

  // Kuzey Amerika
  'new york': 'ABD', 'los angeles': 'ABD', chicago: 'ABD', houston: 'ABD', phoenix: 'ABD',
  philadelphia: 'ABD', 'san antonio': 'ABD', 'san diego': 'ABD', dallas: 'ABD', 'san jose': 'ABD',
  austin: 'ABD', jacksonville: 'ABD', 'san francisco': 'ABD', seattle: 'ABD', denver: 'ABD',
  boston: 'ABD', miami: 'ABD', atlanta: 'ABD', 'las vegas': 'ABD', detroit: 'ABD',
  'long beach': 'ABD', newark: 'ABD', savannah: 'ABD', charleston: 'ABD',
  toronto: 'Kanada', montreal: 'Kanada', vancouver: 'Kanada',
  calgary: 'Kanada', ottawa: 'Kanada', edmonton: 'Kanada', winnipeg: 'Kanada',
  québec: 'Kanada', quebec: 'Kanada', halifax: 'Kanada',
  'mexico city': 'Meksika', meksika: 'Meksika', guadalajara: 'Meksika',
  monterrey: 'Meksika', veracruz: 'Meksika', tijuana: 'Meksika',

  // Güney Amerika
  'são paulo': 'Brezilya', 'sao paulo': 'Brezilya', 'rio de janeiro': 'Brezilya',
  brasília: 'Brezilya', brasilia: 'Brezilya', salvador: 'Brezilya',
  santos: 'Brezilya', 'porto alegre': 'Brezilya',
  'buenos aires': 'Arjantin', rosario: 'Arjantin',
  santiago: 'Şili', valparaíso: 'Şili', valparaiso: 'Şili',
  lima: 'Peru', callao: 'Peru',
  bogotá: 'Kolombiya', bogota: 'Kolombiya', medellín: 'Kolombiya',
  medellin: 'Kolombiya', cartagena: 'Kolombiya', caracas: 'Venezuela',
  quito: 'Ekvador', guayaquil: 'Ekvador', montevideo: 'Uruguay',
  asunción: 'Paraguay', asuncion: 'Paraguay', 'la paz': 'Bolivya',

  // Afrika
  lagos: 'Nijerya', abuja: 'Nijerya', accra: 'Gana',
  dakar: 'Senegal', abidjan: 'Fildişi Sahili',
  nairobi: 'Kenya', mombasa: 'Kenya', 'dar es salaam': 'Tanzanya',
  'addis ababa': 'Etiyopya', 'addis abeba': 'Etiyopya',
  kampala: 'Uganda', kigali: 'Ruanda', khartoum: 'Sudan',
  'cape town': 'Güney Afrika', johannesburg: 'Güney Afrika',
  durban: 'Güney Afrika', pretoria: 'Güney Afrika',

  // Avustralya / Yeni Zelanda
  sydney: 'Avustralya', melbourne: 'Avustralya', brisbane: 'Avustralya', perth: 'Avustralya',
  adelaide: 'Avustralya', canberra: 'Avustralya',
  auckland: 'Yeni Zelanda', wellington: 'Yeni Zelanda', christchurch: 'Yeni Zelanda',
}

/**
 * Şehir adından ülke bul.
 * @param city - şehir adı (case-insensitive)
 * @returns ülke adı (Türkçe) veya undefined
 */
export function getCountryFromCity(city: string | undefined | null): string | undefined {
  if (!city) return undefined
  return CITY_COUNTRY[city.trim().toLowerCase()]
}
