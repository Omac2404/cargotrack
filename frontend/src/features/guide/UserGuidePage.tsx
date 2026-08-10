import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen, Search, Truck, FileText, Building2, Warehouse,
  ArrowRightLeft, Receipt, BarChart3, Archive, Users, Keyboard,
  HelpCircle, ChevronRight, Lightbulb, AlertTriangle, ExternalLink,
} from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Panel içi kullanım kılavuzu.
 *
 * Amaç: yeni kullanıcının "hangi sayfada hangi butona basacağım" sorusunu
 * dışarıdan bir doküman/video aramadan cevaplaması. Bu yüzden her adım
 * "Sayfa → Buton → Sonuç" biçiminde, panelde gördüğü etiketlerle yazıldı.
 */

// ---- İçerik tipleri -------------------------------------------------------

interface Step {
  /** Kullanıcının bulunduğu yer — sol menüdeki/sayfadaki adıyla */
  where: string
  /** Basacağı buton veya yapacağı işlem */
  action: string
  /** Ne olur */
  result: string
  /** Doğrudan gidilebilen panel yolu */
  to?: string
}

interface Flow {
  title: string
  /** Bu akışa hangi ihtiyaçla gelinir */
  useCase: string
  steps: Step[]
  tips?: string[]
  warnings?: string[]
}

interface Section {
  id: string
  title: string
  icon: React.ReactNode
  summary: string
  flows: Flow[]
}

// ---- Kılavuz içeriği ------------------------------------------------------

const SECTIONS: Section[] = [
  {
    id: 'baslangic',
    title: 'Başlangıç — İlk Kurulum Sırası',
    icon: <BookOpen className="w-4 h-4" />,
    summary: 'Boş bir sistemde işlerin doğru sırayla açılması. Bu sırayı atlarsan sevkiyat formunda seçecek bir şey bulamazsın.',
    flows: [
      {
        title: 'Sistemi kullanıma hazırlama',
        useCase: 'Programı ilk kez açtın, hiç kayıt yok. Nereden başlanır?',
        steps: [
          {
            where: 'Sol menü → Operasyon → Partnerler',
            action: '"Yeni Partner" butonu',
            result: 'Müşteri, gönderici, alıcı ve acente firmalarını tanımlarsın. Sevkiyat formundaki firma listeleri buradan dolar.',
            to: '/partners',
          },
          {
            where: 'Sol menü → Operasyon → Araçlar',
            action: '"Yeni Araç" butonu',
            result: 'TIR / gemi / uçak kayıtları açılır. Yük atayabilmen için en az bir araç gerekir.',
            to: '/vehicles',
          },
          {
            where: 'Sol menü → Operasyon → Depolar',
            action: '"Yeni Depo" butonu',
            result: 'Depolama işi yapıyorsan gerekir. Sadece taşıma yapıyorsan bu adımı atlayabilirsin.',
            to: '/warehouses',
          },
          {
            where: 'Sol menü → Taşımacılık → Karayolu',
            action: '"Yeni Sevkiyat" butonu',
            result: 'Artık sevkiyat açabilirsin; firma ve depo listeleri dolu gelir.',
            to: '/shipments/road',
          },
        ],
        tips: [
          'Partner kaydını önceden açmayı unuttuysan sevkiyat formunda "Taraflar" sekmesindeki + butonuyla oradan da açabilirsin.',
          'Bir firma hem müşteri hem gönderici olabilir: partner kaydında "Ek roller" alanını kullan.',
        ],
      },
    ],
  },

  {
    id: 'sevkiyat',
    title: 'Sevkiyat Açma ve Düzenleme',
    icon: <Truck className="w-4 h-4" />,
    summary: 'Bir dosyanın açılışından kapanışına kadar tüm sekmeler ve hangi bilginin nereye gireceği.',
    flows: [
      {
        title: 'Yeni sevkiyat açma',
        useCase: 'Müşteriden yeni bir yük geldi, dosya açman gerekiyor.',
        steps: [
          {
            where: 'Sol menü → Taşımacılık',
            action: 'Taşıma moduna göre seç: Karayolu / Denizyolu / Havayolu / Depolama',
            result: 'O modun sevkiyat listesi açılır. Dosya numarası da moda göre üretilir (ROU / SEA / AIR / STO).',
            to: '/shipments/road',
          },
          {
            where: 'Sevkiyat listesi (sağ üst)',
            action: '"Yeni Sevkiyat" butonu',
            result: 'Boş form açılır, 9 sekmeden oluşur.',
          },
          {
            where: 'Form → Genel sekmesi',
            action: 'Tarih, sorumlu, müşteri referansı, para birimi, Incoterm gir',
            result: 'Dosyanın kimlik bilgileri. Statü varsayılan olarak "Taslak" gelir.',
          },
          {
            where: 'Form → Taraflar sekmesi',
            action: 'Müşteri, gönderici, alıcı, acente seç; çıkış/varış ülkesi gir',
            result: 'Müşteriyi seçtiğinde iletişim ve adres alanları partner kaydından otomatik dolar (boş olanlar).',
          },
          {
            where: 'Form → Yük sekmesi',
            action: 'Mal tanımı, HS kodu, Kap Adedi ve Brüt Ağırlık gir',
            result: 'Araç ataması bu iki alana göre hesaplanır — boş bırakırsan yük havuzunda atama yapamazsın.',
          },
          {
            where: 'Form → Yük sekmesi → Ürün / Kalem Listesi',
            action: 'Birden fazla ürün varsa "Ürün Ekle"',
            result: 'Her ürünün kendi HS kodu, menşe ülkesi, ağırlığı ve kıymeti girilir. Liste doldurulduğunda üstteki Kap Adedi / Ağırlık / Hacim / Mal Değeri alanları toplamdan otomatik hesaplanır.',
          },
          {
            where: 'Form → sağ üst',
            action: '"Kaydet" butonu',
            result: 'Dosya numarası üretilir ve form düzenleme moduna geçer. Belgeler, Sevk Planı ve Geçmiş sekmeleri artık kullanılabilir.',
          },
        ],
        tips: [
          'Tüm sekmeler tek "Kaydet" ile birlikte kaydedilir — sekme değiştirirken veri kaybolmaz.',
          'Her sekmenin altında da bir Kaydet butonu var, aynı işi yapar.',
          'Kaydet\'e bastığında bir sekmede eksik/hatalı alan varsa program seni otomatik o sekmeye götürür ve kırmızı uyarı gösterir.',
        ],
        warnings: [
          'Belgeler ve Sevk Planı sekmeleri kayıt yapılmadan çalışmaz — dosyanın bir ID\'si olması gerekir. Önce Kaydet.',
        ],
      },
      {
        title: 'Bir sevkiyatta birden fazla ürün',
        useCase: 'Aynı yükte farklı HS kodlu, farklı menşeli birkaç ürün var (gümrük kalem kalem ister).',
        steps: [
          {
            where: 'Sevkiyat formu → Yük sekmesi → en alt',
            action: '"Ürün Ekle" butonu',
            result: 'Yeni bir kalem satırı açılır ve detayları görünür.',
          },
          {
            where: 'Açılan kalem',
            action: 'Ürün adı, HS kodu, menşe ülke, ambalaj tipi, kap adedi, brüt/net ağırlık, hacim ve kıymet gir',
            result: 'Satır başlığında özet görünür (HS kodu, kap, kg). Kapatıp diğer kaleme geçebilirsin.',
          },
          {
            where: 'Kalem satırı',
            action: 'Kopyala ikonu',
            result: 'Benzer ürünleri sıfırdan yazmadan çoğaltırsın; sadece farklı alanları düzeltirsin.',
          },
          {
            where: 'Listenin altı',
            action: 'Toplam kutucuklarını kontrol et',
            result: 'Toplam kap, brüt/net ağırlık, hacim ve kıymet üstteki Yük Bilgileri alanlarına otomatik yazılır. O alanlar "(otomatik)" etiketiyle kilitlenir.',
          },
        ],
        tips: [
          'Üstteki HS Kodu alanı 1. kalemin kodunu gösterir; tam liste Proforma PDF\'inde "Mal Listesi" tablosunda çıkar.',
          'Tek ürünlü sevkiyatlarda listeyi hiç kullanmana gerek yok — eski gibi üstteki alanları elle doldur.',
          'Listeyi tamamen boşaltırsan alanlar tekrar elle düzenlenebilir hale gelir.',
        ],
        warnings: [
          'Liste doluyken kap adedi ve ağırlığı elle değiştiremezsin — araç ataması bu değerleri kullandığı için listeyle her zaman aynı kalması gerekir.',
        ],
      },
      {
        title: 'Mevcut sevkiyatı bulma ve açma',
        useCase: 'Daha önce açılmış bir dosyayı düzenlemek istiyorsun.',
        steps: [
          {
            where: 'Sol menü → ilgili taşıma modu',
            action: 'Listedeki satıra tıkla (veya satır sonundaki kalem ikonu)',
            result: 'Dosya düzenleme modunda açılır.',
          },
          {
            where: 'Üst arama çubuğu',
            action: 'Ctrl + K → dosya no veya müşteri adı yaz',
            result: 'Komut paletinden hızlıca sayfaya atlarsın.',
          },
        ],
        tips: [
          'Sevkiyat, hangi modda açıldıysa o listede görünür. Denizyolu dosyası Karayolu listesinde çıkmaz.',
        ],
      },
      {
        title: 'Statü ilerletme',
        useCase: 'Yük yola çıktı / teslim edildi / ödeme geldi — dosyanın durumunu güncellemek.',
        steps: [
          {
            where: 'Sevkiyat formu → Genel sekmesi',
            action: '"Durum" alanından seç',
            result: 'Taslak → Devam Ediyor → Faturalanacak → Kapalı sırasıyla ilerler.',
          },
          {
            where: 'Sevkiyat listesi',
            action: 'Satırları işaretle → üstteki toplu işlem çubuğu → "Statü Değiştir"',
            result: 'Birden fazla dosyanın statüsü tek seferde değişir. Dosya sahibine bildirim gider.',
          },
        ],
        tips: ['"Kapalı" dosyalar yük havuzunda listelenmez — atama beklemediği varsayılır.'],
      },
    ],
  },

  {
    id: 'atama',
    title: 'Araç Atama — Yükleme',
    icon: <ArrowRightLeft className="w-4 h-4" />,
    summary: 'Bir araca birden fazla yük yükleme ve bir yükü birden fazla araca bölme. En çok soru gelen konu.',
    flows: [
      {
        title: 'BİR ARACA BİRDEN FAZLA YÜK yükleme',
        useCase: 'Elinde 3 farklı müşterinin yükü var, hepsi aynı TIR\'a gidecek (parsiyel yükleme).',
        steps: [
          {
            where: 'Sol menü → Operasyon → Atamalar',
            action: '"Yük Havuzu" sekmesine geç',
            result: 'Atama bekleyen tüm sevkiyatlar, kalan kap ve kalan ağırlıklarıyla listelenir.',
            to: '/assignments',
          },
          {
            where: 'Yük Havuzu → 1. sevkiyatın satırı',
            action: '"Atama Yap" butonu',
            result: 'Atama formu açılır; sevkiyat ve kalan miktar hazır gelir.',
          },
          {
            where: 'Atama formu',
            action: 'Araç listesinden TIR\'ı seç → "Ata"',
            result: '1. yük araca bindi. Formda aracın kapasite çubuğu ne kadar doldu gösterir.',
          },
          {
            where: 'Yük Havuzu → 2. sevkiyatın satırı',
            action: '"Atama Yap" → AYNI TIR\'ı seç → "Ata"',
            result: '2. yük de aynı araca bindi. Kapasite çubuğu birikimli ilerler.',
          },
          {
            where: 'Aynı işlemi 3. yük için tekrarla',
            action: '"Atama Yap" → aynı TIR → "Ata"',
            result: 'Tek araçta 3 sevkiyat. Kapasite aşılırsa program kaydetmez ve kaç kg yer kaldığını söyler.',
          },
          {
            where: 'Sol menü → Araçlar → o aracı aç → "Yük" sekmesi',
            action: 'Sayfayı görüntüle',
            result: 'O TIR\'ın taşıdığı tüm sevkiyatlar tek listede + doluluk yüzdesi. Yükleme listesi olarak kullanılabilir.',
            to: '/vehicles',
          },
        ],
        tips: [
          'Kısayol: Araçlar → aracı aç → "Yük" sekmesi → "Bu Araca Yük Ekle" butonuyla araç hazır seçili gelir, sadece sevkiyat seçersin.',
          'Aracın kalan kapasitesini atama formundaki renkli çubuktan takip edebilirsin: yeşil rahat, sarı doluyor, kırmızı aşıldı.',
        ],
        warnings: [
          'Araç ile sevkiyatın taşıma modu aynı olmalı: karayolu sevkiyatı karayolu aracına biner. İthalat/ihracat dosyaları istisnadır, her araca atanabilir.',
        ],
      },
      {
        title: 'BİR YÜKÜ BİRDEN FAZLA ARACA bölme',
        useCase: '80 kaplık yük tek TIR\'a sığmıyor, 2-3 araca bölünecek.',
        steps: [
          {
            where: 'Atamalar → Yük Havuzu → ilgili sevkiyat',
            action: '"Atama Yap"',
            result: 'Form açılır, "Atanan Kap" alanında kalan miktarın tamamı hazır gelir.',
            to: '/assignments',
          },
          {
            where: 'Atama formu',
            action: '1. aracı seç, "Atanan Kap" değerini küçült (örn. 80 yerine 50) ve ağırlığı da orantılı gir → "Ata"',
            result: 'Yükün 50 kabı 1. araca bindi. Havuzda o satırın "Kalan" sütunu 30 olur ve durum "Kısmen" olarak işaretlenir.',
          },
          {
            where: 'Yük Havuzu → AYNI sevkiyatın satırı',
            action: 'Tekrar "Atama Yap" → bu sefer 2. aracı seç → "Ata"',
            result: 'Kalan 30 kap ikinci araca bindi. "Kalan" sütunu 0 olur, durum "Tamamen atanmış" olur.',
          },
          {
            where: 'Sevkiyat formu → "Sevk Planı" sekmesi',
            action: 'Sayfayı görüntüle',
            result: 'O yükün hangi araçlara nasıl dağıldığı, atanmış/atanmamış kap sayısı ve yüzdelik ilerleme görünür.',
          },
        ],
        tips: [
          '"Kalan" sütunu sıfırlanana kadar aynı sevkiyata atama eklemeye devam edebilirsin.',
          'Yük havuzunda "Durum" filtresini "Atama Bekleyenler" yaparsan yalnızca işi bitmemiş dosyaları görürsün.',
        ],
        warnings: [
          'Toplam atanan kap, sevkiyatın toplam kap adedini aşamaz. Aşarsan program kaç kap kaldığını söyleyip kaydı reddeder.',
        ],
      },
      {
        title: 'Atamayı düzeltme veya kaldırma',
        useCase: 'Yanlış araca atadın ya da miktarı değiştirmen gerekiyor.',
        steps: [
          {
            where: 'Atamalar → "Atamalar" sekmesi (liste)',
            action: 'Satırdaki kalem ikonu',
            result: 'Miktar, ağırlık, yükleme tarihi ve notu düzenlersin. Araç ve sevkiyat değiştirilemez.',
            to: '/assignments',
          },
          {
            where: 'Atamalar listesi',
            action: 'Satırdaki çöp kutusu ikonu',
            result: 'Atama arşive taşınır, yük tekrar havuzda "atanmamış" olarak görünür.',
          },
        ],
        tips: ['Aracı değiştirmek için atamayı sil ve doğru araçla yeniden oluştur.'],
      },
    ],
  },

  {
    id: 'belgeler',
    title: 'Belgeler',
    icon: <FileText className="w-4 h-4" />,
    summary: 'Fatura, çeki listesi, CMR gibi evrakların yüklenmesi, onaylanması ve versiyon takibi.',
    flows: [
      {
        title: 'Belge yükleme ve onaylama',
        useCase: 'Müşteriden gelen faturayı/CMR\'yi dosyaya eklemek.',
        steps: [
          {
            where: 'Sevkiyat formu → "Belgeler" sekmesi',
            action: 'İlgili belge satırında "Yükle" butonu',
            result: 'Dosya seçilir ve yüklenir (PDF, JPG, PNG, Word, Excel — en fazla 20 MB).',
          },
          {
            where: 'Belgeler sekmesi',
            action: 'Satırdaki 3 renkli daireden birine bas',
            result: 'Belgenin durumunu ayarlarsın: kırmızı = Eksik, sarı = Yüklü, yeşil = Onaylı.',
          },
          {
            where: 'Belgeler sekmesi',
            action: 'Göz ikonu',
            result: 'Belgeyi indirmeden önizlersin ve eski versiyonlarını görürsün.',
          },
          {
            where: 'Belgeler sekmesi',
            action: '"Değiştir" butonu',
            result: 'Yeni sürüm yüklenir, eski sürüm silinmez — versiyon geçmişinde saklanır ve geri yüklenebilir.',
          },
        ],
        tips: [
          'Sekme başlığındaki kırmızı rakam, o taşıma modu için eksik olan zorunlu belge sayısıdır.',
          'Zorunlu belge listesi taşıma moduna göre değişir (karayolunda CMR, denizyolunda konşimento gibi).',
          'Sol menüdeki "Belgeler" sayfasından tüm dosyaların evrak durumunu toplu görebilirsin.',
        ],
        warnings: [
          'Belge yükleyebilmek için sevkiyatın kaydedilmiş olması gerekir.',
        ],
      },
      {
        title: 'PDF çıktı alma',
        useCase: 'Dosya kapağı, proforma fatura veya barkod yaprağı yazdırmak.',
        steps: [
          {
            where: 'Sevkiyat formu → sağ üst (kayıtlı dosyada)',
            action: 'Dosya kapağı / Proforma / Barkod ikonlarından birine bas',
            result: 'PDF yeni sekmede açılır, oradan yazdırabilir veya indirebilirsin.',
          },
        ],
        tips: ['Depolama sevkiyatlarında ek olarak "Depo Raporu" PDF ikonu çıkar.'],
      },
    ],
  },

  {
    id: 'partner',
    title: 'Partnerler (Cari)',
    icon: <Building2 className="w-4 h-4" />,
    summary: 'Müşteri, gönderici, alıcı ve acente kayıtları; bir firmanın tüm işlerini ve cirosunu görme.',
    flows: [
      {
        title: 'Firma kaydı açma',
        useCase: 'Yeni bir müşteri veya alıcı firma tanımlamak.',
        steps: [
          {
            where: 'Sol menü → Operasyon → Partnerler',
            action: '"Yeni Partner" butonu',
            result: 'Form açılır: firma adı, vergi no, EORI, adres, iletişim bilgileri.',
            to: '/partners',
          },
          {
            where: 'Partner formu',
            action: '"Tip" seç ve gerekiyorsa "Ek roller" işaretle',
            result: 'Firma birden fazla rolde (hem müşteri hem gönderici gibi) sevkiyat formunda listelenir.',
          },
        ],
        tips: [
          'Sevkiyat formundaki "Taraflar" sekmesinde her firma alanının yanındaki + butonuyla oradan da hızlıca partner açabilirsin.',
        ],
      },
      {
        title: 'Bir firmanın tüm işlerini görme',
        useCase: '"Bu müşteriyle bu yıl ne kadar iş yaptık, ne kadar kâr ettik?"',
        steps: [
          {
            where: 'Partnerler listesi',
            action: 'Firma satırına tıkla',
            result: 'Firma detay sayfası açılır: toplam ciro, maliyet, kâr, marj ve ödenmemiş fatura sayısı.',
          },
          {
            where: 'Firma detay sayfası',
            action: '"Sevkiyatlar" sekmesi',
            result: 'O firmanın müşteri/gönderici/alıcı/acente olarak yer aldığı tüm dosyalar listelenir; satıra tıklayarak dosyayı açarsın.',
          },
        ],
      },
    ],
  },

  {
    id: 'depo',
    title: 'Depolama ve Depo Siparişleri',
    icon: <Warehouse className="w-4 h-4" />,
    summary: 'Antrepo/geçici depolama işlemleri, stok hareketleri ve transit süre takibi.',
    flows: [
      {
        title: 'Depolama işi açma',
        useCase: 'Müşterinin malı depoda bekleyecek, günlük/haftalık/aylık ücretlendirilecek.',
        steps: [
          {
            where: 'Sol menü → Taşımacılık → Depolama',
            action: '"Yeni Sevkiyat" butonu',
            result: 'Depolama modunda dosya açılır (STO ile başlayan numara).',
            to: '/shipments/storage',
          },
          {
            where: 'Form → "Geçici / Transit Depo" sekmesi',
            action: 'Depoyu seç, giriş/çıkış tarihi, toplam kap ve ücret tipini gir',
            result: 'Ücret tipine göre (gün/hafta/ay) toplam depolama bedeli otomatik hesaplanır.',
          },
          {
            where: 'Aynı sekme → Transit bilgileri',
            action: 'Depo tipi (gümrük kodu), transit evrak no ve son geçerlilik tarihi gir',
            result: 'Süre dolmaya yaklaşınca sayfada ve sol menüde uyarı çıkar.',
          },
          {
            where: 'Aynı sekme → Stok hareketleri',
            action: 'Giriş/çıkış satırı ekle',
            result: 'Kısmi sevkler takip edilir, kalan stok hesaplanır.',
          },
        ],
        warnings: [
          'Depolama işlemlerine araç ataması yapılamaz — bunlar yük havuzunda görünmez.',
        ],
      },
      {
        title: 'Depodaki malları toplu izleme',
        useCase: 'Hangi depoda ne kadar mal var, hangi transit süresi doluyor?',
        steps: [
          {
            where: 'Sol menü → Operasyon → Depo Siparişleri',
            action: 'Sayfayı aç, depoya göre filtrele',
            result: 'Aktif depolama işleri, kap sayıları ve transit uyarıları tek ekranda.',
            to: '/storage-orders',
          },
        ],
      },
    ],
  },

  {
    id: 'fatura',
    title: 'Finansal ve Faturalama',
    icon: <Receipt className="w-4 h-4" />,
    summary: 'Alış/satış kalemleri, KDV, fatura bilgisi ve ödeme takibi.',
    flows: [
      {
        title: 'Maliyet ve satış girme',
        useCase: 'Dosyanın gelir-gider kalemlerini işlemek.',
        steps: [
          {
            where: 'Sevkiyat formu → "Finansal" sekmesi',
            action: 'Kalem tablosuna gelir ve gider satırlarını gir',
            result: 'Navlun, gümrük, elleçleme gibi kalemler KDV oranlarıyla işlenir; kâr ve marj otomatik hesaplanır.',
          },
        ],
        tips: ['Kalem listesi taşıma moduna göre değişir — her mod için tipik masraf kalemleri hazır gelir.'],
      },
      {
        title: 'Fatura kesme ve ödeme takibi',
        useCase: 'İş bitti, fatura kesildi, ödeme bekleniyor.',
        steps: [
          {
            where: 'Sevkiyat formu → "Faturalama" sekmesi',
            action: 'Fatura no, tarih, tutar ve ödeme tipini gir',
            result: 'Dosya faturalanmış sayılır ve raporlarda ödenmemiş alacak olarak görünür.',
          },
          {
            where: 'Aynı sekme',
            action: 'Ödeme geldiğinde "Ödeme Alındı" kutucuğunu işaretle',
            result: 'Dosya alacak listesinden düşer.',
          },
          {
            where: 'Genel sekmesi',
            action: 'Durum → "Kapalı"',
            result: 'Dosya kapanır ve yük havuzu/aktif listelerden çıkar.',
          },
        ],
        tips: [
          'Ödenmemiş faturaları toplu görmek için: Raporlar → "Yaşlandırma" raporu (30/60/90 gün gruplarıyla).',
        ],
      },
    ],
  },

  {
    id: 'rapor',
    title: 'Raporlar ve İstatistikler',
    icon: <BarChart3 className="w-4 h-4" />,
    summary: 'Ciro, kârlılık, müşteri sıralaması, araç doluluğu ve alacak yaşlandırma.',
    flows: [
      {
        title: 'Rapor alma',
        useCase: 'Aylık ciro, en iyi müşteriler veya geciken alacakları görmek.',
        steps: [
          {
            where: 'Sol menü → Yönetim → Raporlar',
            action: 'Üstteki sekmelerden raporu seç',
            result: 'Aylık Ciro, Müşteri Sıralaması, Araç Doluluk, Kullanıcı Performansı, Alacak Yaşlandırma raporları.',
            to: '/reports',
          },
          {
            where: 'Herhangi bir rapor',
            action: 'Sağ üstteki "Dışa Aktar" butonu',
            result: 'Rapor Excel olarak indirilir.',
          },
          {
            where: 'Yaşlandırma raporu',
            action: 'Satır sonundaki dış-bağlantı ikonu',
            result: 'İlgili sevkiyat dosyası doğrudan açılır.',
          },
        ],
      },
      {
        title: 'Anlık durum panosu',
        useCase: 'Günlük genel görünüm: kaç açık dosya, ne kadar ciro, hangi belgeler eksik.',
        steps: [
          {
            where: 'Sol menü → İstatistikler',
            action: 'Tarih aralığı ve mod filtresini ayarla',
            result: 'Ciro/kâr kartları, aylık trend grafiği, güzergah ve müşteri dağılımları, eksik belge uyarıları.',
            to: '/',
          },
        ],
      },
    ],
  },

  {
    id: 'arsiv',
    title: 'Silme ve Arşiv',
    icon: <Archive className="w-4 h-4" />,
    summary: 'Hiçbir şey doğrudan silinmez — önce arşive gider, geri alınabilir.',
    flows: [
      {
        title: 'Kayıt silme ve geri alma',
        useCase: 'Yanlışlıkla açılan bir dosyayı kaldırmak ya da silineni geri getirmek.',
        steps: [
          {
            where: 'Herhangi bir liste',
            action: 'Satırdaki çöp kutusu ikonu → onayla',
            result: 'Kayıt arşive taşınır, listelerden kalkar ama silinmez.',
          },
          {
            where: 'Sol menü → Yönetim → Arşiv',
            action: 'Kayıt tipini seç → "Geri Yükle"',
            result: 'Kayıt eski yerine döner. Kimin ne zaman sildiği de burada görünür.',
            to: '/archive',
          },
          {
            where: 'Arşiv',
            action: '"Kalıcı Sil" (yalnızca süper admin)',
            result: 'Kayıt ve yüklü belgeleri geri alınamaz biçimde silinir.',
          },
        ],
        warnings: [
          'Aktif sevkiyatta kullanılan partner, araç veya depo silinemez — önce ilgili dosyaları güncelle ya da arşivle.',
          '"Kalıcı Sil" geri alınamaz, yüklenmiş evraklar da diskten silinir.',
        ],
      },
    ],
  },

  {
    id: 'kullanici',
    title: 'Kullanıcılar ve Yetkiler',
    icon: <Users className="w-4 h-4" />,
    summary: 'Kim neyi görebilir, kim neyi değiştirebilir.',
    flows: [
      {
        title: 'Kullanıcı açma',
        useCase: 'Ekibe yeni bir personel katıldı.',
        steps: [
          {
            where: 'Sol menü → Yönetim → Kullanıcılar',
            action: '"Yeni Kullanıcı" butonu',
            result: 'Kullanıcı adı, şifre ve rol belirlenir.',
            to: '/users',
          },
        ],
        tips: [
          'Kullanıcı: sadece kendi açtığı sevkiyatları görür ve düzenler. Partner/araç/depo listelerini görür ama değiştiremez (yeni müşteri açabilir).',
          'Admin: tüm sevkiyatları görür ve düzenler, partner/araç/depo yönetir, rapor ve denetim kaydına erişir.',
          'Süper Admin: her şey + kullanıcı yönetimi + arşivden kalıcı silme.',
        ],
      },
      {
        title: 'Kim ne değiştirmiş görme',
        useCase: 'Bir bilgi değişmiş, kim değiştirdi öğrenmek istiyorsun.',
        steps: [
          {
            where: 'Sevkiyat formu → "Geçmiş" sekmesi',
            action: 'Sayfayı görüntüle',
            result: 'O dosyada hangi alan, ne zaman, kim tarafından, hangi değerden hangi değere değişmiş — hepsi listelenir.',
          },
          {
            where: 'Sol menü → Yönetim → Audit Log',
            action: 'Kullanıcı/tarih/işlem filtrele',
            result: 'Sistem genelindeki tüm işlemler (giriş, oluşturma, silme, indirme) görüntülenir.',
            to: '/audit',
          },
        ],
      },
    ],
  },

  {
    id: 'kisayol',
    title: 'Kısayollar ve Hızlı Gezinme',
    icon: <Keyboard className="w-4 h-4" />,
    summary: 'Klavyeyle hızlı çalışma.',
    flows: [
      {
        title: 'Klavye kısayolları',
        useCase: 'Fareyle uğraşmadan sayfalar arasında geçmek.',
        steps: [
          { where: 'Her yerde', action: 'Ctrl + K', result: 'Komut paleti — sayfa ara, hızlıca git.' },
          { where: 'Her yerde', action: '?', result: 'Kısayol listesini açar.' },
          { where: 'Her yerde', action: 'G sonra S / P / A / V / D', result: 'Sevkiyatlar / Partnerler / Atamalar / Araçlar / Belgeler sayfasına atlar.' },
          { where: 'Liste sayfaları', action: 'J / K ve Enter', result: 'Satırlar arasında gezinir, seçili satırı açar.' },
          { where: 'Liste sayfaları', action: 'Ctrl + N', result: 'Bulunduğun sayfada yeni kayıt açar.' },
        ],
      },
    ],
  },

  {
    id: 'sorun',
    title: 'Sık Karşılaşılan Durumlar',
    icon: <HelpCircle className="w-4 h-4" />,
    summary: 'Takıldığın noktalarda önce buraya bak.',
    flows: [
      {
        title: 'Sevkiyatım yük havuzunda görünmüyor',
        useCase: 'Atama yapmak istiyorsun ama dosya listede yok.',
        steps: [
          {
            where: 'Sevkiyat formu → "Yük" sekmesi',
            action: '"Kap Adedi" alanını doldur ve kaydet',
            result: 'Atama miktarı kap adedine göre kontrol edildiği için bu alan zorunludur. Havuzda "Kap adedi eksik" uyarısıyla görünür, butondan doğrudan bu alana gidebilirsin.',
          },
          {
            where: 'Yük Havuzu → Durum filtresi',
            action: '"Tümü" seç',
            result: 'Tamamen atanmış dosyalar varsayılan görünümde gizlidir.',
          },
        ],
        tips: [
          'Kapalı statüdeki ve depolama tipindeki dosyalar havuzda hiç listelenmez.',
        ],
      },
      {
        title: 'Kaydet\'e basıyorum bir şey olmuyor',
        useCase: 'Buton çalışmıyor gibi görünüyor.',
        steps: [
          {
            where: 'Sevkiyat formu',
            action: 'Kaydet\'e bastıktan sonra çıkan kırmızı uyarıya bak',
            result: 'Bir alan hatalıysa program seni otomatik o sekmeye götürür ve hangi alanın sorunlu olduğunu yazar.',
          },
        ],
      },
      {
        title: 'Araç kapasitesi aşıldı uyarısı alıyorum',
        useCase: 'Atama kaydedilmiyor.',
        steps: [
          {
            where: 'Atama formu',
            action: 'Uyarıdaki "en fazla X kg" değerine göre miktarı düşür',
            result: 'Kalan yükü ikinci bir araca ata — yükü bölmek normal bir akıştır.',
          },
          {
            where: 'Araçlar → araç kaydı',
            action: 'Kapasite (kg) alanını kontrol et',
            result: 'Araç kapasitesi yanlış girilmişse buradan düzeltilir.',
          },
        ],
      },
      {
        title: 'Sevkiyatı yanlış modda açtım',
        useCase: 'Denizyolu işini karayolunda açmışsın.',
        steps: [
          {
            where: 'Yanlış moddaki dosya',
            action: 'Dosyayı sil (arşive gider) ve doğru moddan yeniden aç',
            result: 'Dosya numarası moda göre üretildiği için mod sonradan değiştirilmez.',
          },
        ],
      },
    ],
  },
]

// ---- Sayfa ----------------------------------------------------------------

export function UserGuidePage() {
  const [query, setQuery] = useState('')
  const [activeId, setActiveId] = useState<string>(SECTIONS[0].id)

  const q = query.trim().toLocaleLowerCase('tr')

  // Arama: bölüm başlığı, akış başlığı, kullanım amacı ve adım metinlerinde arar
  const filtered = useMemo(() => {
    if (!q) return SECTIONS
    const match = (s: string) => s.toLocaleLowerCase('tr').includes(q)
    return SECTIONS
      .map((section) => {
        if (match(section.title) || match(section.summary)) return section
        const flows = section.flows.filter(
          (f) =>
            match(f.title) ||
            match(f.useCase) ||
            f.steps.some((st) => match(st.where) || match(st.action) || match(st.result)) ||
            (f.tips || []).some(match) ||
            (f.warnings || []).some(match)
        )
        return flows.length > 0 ? { ...section, flows } : null
      })
      .filter((s): s is Section => s !== null)
  }, [q])

  const visible = q ? filtered : filtered.filter((s) => s.id === activeId)

  return (
    <div className="space-y-4 max-w-[1400px]">
      {/* Başlık */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Nasıl Kullanılır</h1>
            <p className="text-xs text-muted-foreground">
              Her işlem için adım adım: hangi sayfa, hangi buton, ne olur
            </p>
          </div>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Ara: atama, belge, fatura, depo..."
            className="pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {q && (
        <div className="text-xs text-muted-foreground">
          "{query}" için {filtered.reduce((n, s) => n + s.flows.length, 0)} sonuç
          {filtered.length === 0 && ' — başka bir kelime dene'}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
        {/* Sol: bölüm listesi */}
        {!q && (
          <Card className="p-2 h-fit lg:sticky lg:top-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
              Konular
            </div>
            <div className="space-y-0.5">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveId(s.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors',
                    activeId === s.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-foreground/70 hover:bg-accent hover:text-foreground'
                  )}
                >
                  <span className="shrink-0">{s.icon}</span>
                  <span className="flex-1 leading-tight">{s.title}</span>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Sağ: içerik */}
        <div className={cn('space-y-4', q && 'lg:col-span-2')}>
          {visible.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">
              <HelpCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <div className="text-sm">Aradığın konu bulunamadı.</div>
            </Card>
          ) : (
            visible.map((section) => (
              <SectionBlock key={section.id} section={section} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function SectionBlock({ section }: { section: Section }) {
  return (
    <div className="space-y-3">
      <Card className="p-4 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            {section.icon}
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight">{section.title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{section.summary}</p>
          </div>
        </div>
      </Card>

      {section.flows.map((flow) => (
        <FlowBlock key={flow.title} flow={flow} />
      ))}
    </div>
  )
}

function FlowBlock({ flow }: { flow: Flow }) {
  return (
    <Card className="p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold">{flow.title}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          <span className="font-medium text-foreground/70">Ne zaman: </span>
          {flow.useCase}
        </p>
      </div>

      {/* Adımlar */}
      <ol className="space-y-2.5">
        {flow.steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0 space-y-1">
              {/* Sayfa → Buton → Sonuç zinciri */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <Badge variant="outline" className="font-normal">{step.where}</Badge>
                <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                <Badge variant="secondary" className="font-medium">{step.action}</Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{step.result}</p>
              {step.to && (
                <Button asChild variant="ghost" size="sm" className="h-6 px-2 -ml-2 text-xs">
                  <Link to={step.to}>
                    <ExternalLink className="w-3 h-3" />
                    Sayfayı aç
                  </Link>
                </Button>
              )}
            </div>
          </li>
        ))}
      </ol>

      {/* İpuçları */}
      {flow.tips && flow.tips.length > 0 && (
        <div className="rounded-md border bg-muted/30 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
            <Lightbulb className="w-3.5 h-3.5" />
            İpuçları
          </div>
          <ul className="space-y-1">
            {flow.tips.map((tip, i) => (
              <li key={i} className="text-xs text-muted-foreground leading-relaxed pl-4 relative">
                <span className="absolute left-0">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Uyarılar */}
      {flow.warnings && flow.warnings.length > 0 && (
        <div className="rounded-md border border-warning/30 bg-warning/10 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-warning">
            <AlertTriangle className="w-3.5 h-3.5" />
            Dikkat
          </div>
          <ul className="space-y-1">
            {flow.warnings.map((w, i) => (
              <li key={i} className="text-xs text-muted-foreground leading-relaxed pl-4 relative">
                <span className="absolute left-0">•</span>
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
