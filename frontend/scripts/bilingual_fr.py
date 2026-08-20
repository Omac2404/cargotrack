# -*- coding: utf-8 -*-
"""
Fransizca dilinde form etiketlerini cift dilli yapar: "Francais (Turkce)".

Yalnizca fr.json degisir; tr/en/de aynen kalir.
Kapsam: veri girisi yapilan yerler (form etiketleri, bolum basliklari, acilir
liste secenekleri). Sol menu, sekme cubugu ve mod rozetleri KAPSAM DISI —
oralar veri girisi degil ve cift dil kalabalik yapar.
"""
import io, os, re, json, collections, unicodedata

LOCALES = 'src/i18n/locales'

# Etiket konumunda kullanilan anahtarlar koddan tespit edilir (ui.* icin gerekli)
LABEL_PATTERNS = [
    r"label=\{t\('([a-zA-Z0-9_.]+)'",
    r"<Label[^>]*>\s*\{t\('([a-zA-Z0-9_.]+)'\)\}",
    r"<SectionTitle[^>]*>\s*\{t\('([a-zA-Z0-9_.]+)'",
    r"<Section[^>]*>\s*\{t\('([a-zA-Z0-9_.]+)'\)\}",
]

# Form/veri girisi ad alanlari — tamami islenir ki ayni acilir listedeki
# secenekler tutarli olsun (dinamik anahtarlar koddan tespit edilemiyor)
FORM_NS = (
    'partner.', 'shipment.fields.', 'shipment.sections.', 'shipment.status.',
    'shipment.payment_types.', 'shipment.storage_pricing.', 'shipment.cargo.',
    'shipment.financial.', 'shipment.summary.',
    'vehicle.', 'warehouse.', 'assignment.', 'invoice.', 'users.', 'auth.',
    'fin.ui.', 'fin.items.', 'fin.groups.', 'transport.vehicle_labels.',
    'statistics.summary.', 'statistics.table.',
)

# Veri girisi olmayan yerler
SKIP_NS = ('nav.', 'shipment.tabs.', 'archive.tabs.', 'transport.modes.',
           'auth.roles.', 'partner.err.', 'common.menu')

MAX_LEN = 60  # bundan uzunlari cumle kabul edip cift dile cevirme


def fold(s):
    """Karsilastirma icin sadelestir: aksan/nokta/buyuk-kucuk farkini yok say."""
    s = s.replace(u'ı', 'i').replace(u'İ', 'i').replace(u'ş', 's').replace(u'Ş', 's')
    s = s.replace(u'ğ', 'g').replace(u'Ğ', 'g').replace(u'ç', 'c').replace(u'Ç', 'c')
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode('ascii')
    return re.sub(r'[^a-z0-9]', '', s.lower())


def collect_label_keys():
    keys = set()
    for dp, _, fs in os.walk('src'):
        if 'node_modules' in dp:
            continue
        for f in fs:
            if not f.endswith('.tsx'):
                continue
            fp = os.path.join(dp, f).replace(os.sep, '/')
            if '/locales/' in fp:
                continue
            s = io.open(fp, encoding='utf-8').read()
            for pat in LABEL_PATTERNS:
                keys.update(re.findall(pat, s))
    return keys


def walk(o, prefix=''):
    for k, v in o.items():
        n = prefix + '.' + k if prefix else k
        if isinstance(v, dict):
            for x in walk(v, n):
                yield x
        else:
            yield n, v


def get(d, k):
    cur = d
    for x in k.split('.'):
        if not isinstance(cur, dict) or x not in cur:
            return None
        cur = cur[x]
    return cur if isinstance(cur, str) else None


def set_nested(o, k, val):
    cur = o
    parts = k.split('.')
    for x in parts[:-1]:
        cur = cur[x]
    cur[parts[-1]] = val


def combine(fr_val, tr_val):
    """
    "Raison sociale *" + "Şirket Adı *" -> "Raison sociale (Şirket Adı) *"
    Parantez iceren degerlerde ic ice parantez yerine egik cizgi kullanilir.
    """
    star = ''
    f, t = fr_val.strip(), tr_val.strip()
    if f.endswith('*'):
        f, star = f[:-1].strip(), ' *'
    if t.endswith('*'):
        t = t[:-1].strip()
    if '(' in f or '(' in t:
        return '%s / %s%s' % (f, t, star)
    return '%s (%s)%s' % (f, t, star)


label_keys = collect_label_keys()
tr = json.load(io.open('%s/tr.json' % LOCALES, encoding='utf-8'))
frp = '%s/fr.json' % LOCALES
fr = json.load(io.open(frp, encoding='utf-8'), object_pairs_hook=collections.OrderedDict)

applied, skipped = [], collections.Counter()
for key, fval in list(walk(fr)):
    in_scope = key.startswith(FORM_NS) or key in label_keys
    if not in_scope:
        continue
    if key.startswith(SKIP_NS):
        skipped['kapsam disi'] += 1; continue
    tval = get(tr, key)
    if tval is None:
        skipped['tr yok'] += 1; continue
    if '{{' in fval or '{{' in tval:
        skipped['degisken'] += 1; continue
    if fold(fval) == fold(tval):
        skipped['ayni metin'] += 1; continue
    if fold(tval) and fold(tval) in fold(fval):
        skipped['zaten iceriyor'] += 1; continue
    if len(fval) > MAX_LEN:
        skipped['uzun cumle'] += 1; continue
    set_nested(fr, key, combine(fval, tval))
    applied.append(key)

io.open(frp, 'w', encoding='utf-8', newline='\n').write(
    json.dumps(fr, ensure_ascii=False, indent=2) + '\n')

print('cift dilli yapilan: %d' % len(applied))
print('atlanan:', dict(skipped))
