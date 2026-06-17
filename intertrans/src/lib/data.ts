import {
  Plane,
  Ship,
  Truck,
  Warehouse,
  FileCheck2,
  Boxes,
  Globe,
  ShieldCheck,
  BarChart3,
  Users,
  Star,
  type LucideIcon,
} from "lucide-react";

export type Service = {
  slug: string;
  title: string;
  icon: LucideIcon;
  excerpt: string;
  description: string;
  image: string;
  features: string[];
  highlights: { title: string; text: string }[];
};

export const services: Service[] = [
  {
    slug: "hava-kargo",
    title: "Hava Kargo",
    icon: Plane,
    excerpt:
      "Tüm destinasyonlara hızlı ve güvenli hava kargo çözümleri. Ekspres seçenekler.",
    description:
      "Zamana duyarlı gönderileriniz için dünya genelindeki havayolu ağımızla hızlı, güvenli ve izlenebilir hava kargo hizmeti sunuyoruz. Standart, ekspres ve konsolide seçeneklerle ihtiyacınıza en uygun çözümü planlıyoruz.",
    image:
      "https://images.pexels.com/photos/46148/aircraft-jet-landing-cloud-46148.jpeg?auto=compress&cs=tinysrgb&w=1200",
    features: [
      "Ekspres ve standart hava kargo",
      "Konsolidasyon hizmetleri",
      "Kapıdan kapıya teslimat",
      "Tehlikeli madde (DGR) taşımacılığı",
    ],
    highlights: [
      { title: "Hız", text: "Acil gönderiler için aynı/ertesi gün çözümler." },
      { title: "Ağ", text: "Başlıca havalimanlarına doğrudan bağlantılar." },
      { title: "Takip", text: "Uçuş bazlı anlık durum bilgilendirmesi." },
    ],
  },
  {
    slug: "deniz-tasimaciligi",
    title: "Deniz Taşımacılığı",
    icon: Ship,
    excerpt: "Tam konteyner (FCL), parsiyel (LCL) ve özel proje taşımacılığı.",
    description:
      "Tam konteyner (FCL), parsiyel (LCL) ve özel proje yükleriniz için rekabetçi navlun oranları ve güvenilir hat bağlantıları sunuyoruz. Limanlar arası uçtan uca operasyon yönetimiyle yükünüz güvende.",
    image:
      "https://images.pexels.com/photos/753331/pexels-photo-753331.jpeg?auto=compress&cs=tinysrgb&w=1200",
    features: [
      "FCL — Tam konteyner taşımacılığı",
      "LCL — Parsiyel yük konsolidasyonu",
      "Reefer (soğuk zincir) konteyner",
      "Liman ve terminal operasyonları",
    ],
    highlights: [
      { title: "FCL & LCL", text: "Her hacme uygun esnek konteyner çözümleri." },
      { title: "Hat ağı", text: "Dünya genelinde güçlü armatör iş birlikleri." },
      { title: "Maliyet", text: "Hacme göre optimize edilmiş navlun." },
    ],
  },
  {
    slug: "kara-yolu",
    title: "Kara Yolu Taşımacılığı",
    icon: Truck,
    excerpt: "Yurt içi ve uluslararası. Ekspres, parsiyel ve sıcaklık kontrollü.",
    description:
      "Yurt içi ve uluslararası kara yolu taşımacılığında komple (FTL) ve parsiyel (LTL) çözümler. Sıcaklık kontrollü, ADR'li ve standart taşımalarla Avrupa ve komşu ülkelere kesintisiz erişim sağlıyoruz.",
    image:
      "https://images.pexels.com/photos/1267325/pexels-photo-1267325.jpeg?auto=compress&cs=tinysrgb&w=1200",
    features: [
      "FTL — Komple araç taşımacılığı",
      "LTL — Parsiyel taşımacılık",
      "Sıcaklık kontrollü (frigorifik) taşıma",
      "ADR — Tehlikeli madde taşımacılığı",
    ],
    highlights: [
      { title: "Avrupa hattı", text: "Düzenli sefer ağıyla hızlı transit." },
      { title: "Esneklik", text: "Komple ve parsiyel seçenekler." },
      { title: "Soğuk zincir", text: "Hassas yükler için kontrollü taşıma." },
    ],
  },
  {
    slug: "lojistik-depolama",
    title: "Lojistik & Depolama",
    icon: Warehouse,
    excerpt: "Güvenli depolama, sipariş hazırlama, cross-docking ve antrepo.",
    description:
      "Modern depo altyapımızla kısa ve uzun vadeli depolama, stok yönetimi, sipariş hazırlama (pick & pack), cross-docking ve gümrük altı antrepo hizmetleri sunuyoruz. Tedarik zincirinizi tek noktadan yönetin.",
    image:
      "https://images.pexels.com/photos/4481259/pexels-photo-4481259.jpeg?auto=compress&cs=tinysrgb&w=1200",
    features: [
      "Kısa/uzun vadeli depolama",
      "Cross-docking",
      "Antrepo (gümrük altı)",
      "Stok yönetimi ve sipariş hazırlama",
    ],
    highlights: [
      { title: "Antrepo", text: "Gümrük altı stok ve vergi avantajı." },
      { title: "Esnek alan", text: "İhtiyacınıza göre ölçeklenen depolama." },
      { title: "Katma değer", text: "Etiketleme, paketleme, pick & pack." },
    ],
  },
  {
    slug: "gumruk",
    title: "Gümrük İthalat – İhracat",
    icon: FileCheck2,
    excerpt: "Yetkili gümrük müşavirliği ile işlemlerinizi güvenle yönetiyoruz.",
    description:
      "Yetkili gümrük müşavirlerimizle ithalat, ihracat ve transit işlemlerinizi mevzuata tam uyumla yürütüyoruz. Beyanname hazırlama, gümrük rejimleri ve danışmanlık ile süreçlerinizi hızlandırıyoruz.",
    image:
      "https://images.pexels.com/photos/4481326/pexels-photo-4481326.jpeg?auto=compress&cs=tinysrgb&w=1200",
    features: [
      "İthalat & ihracat beyannameleri",
      "Transit işlemleri",
      "Özel gümrük rejimleri",
      "Gümrük danışmanlığı",
    ],
    highlights: [
      { title: "Uyum", text: "Güncel mevzuata tam uyumlu işlemler." },
      { title: "Hız", text: "Beyanname ve onay süreçlerinde hızlı çözüm." },
      { title: "Danışmanlık", text: "Doğru rejim ve maliyet planlaması." },
    ],
  },
  {
    slug: "proje-tasimaciligi",
    title: "Proje Taşımacılığı",
    icon: Boxes,
    excerpt: "Ağır yük, gabari dışı ve özel proje taşımacılığı çözümleri.",
    description:
      "Ağır, gabari dışı ve özel proje yükleriniz için mühendislik temelli taşıma çözümleri. Rota etüdü, izin süreçleri, özel ekipman ve sigorta yönetimiyle en karmaşık projeleri uçtan uca planlıyoruz.",
    image:
      "https://images.pexels.com/photos/681335/pexels-photo-681335.jpeg?auto=compress&cs=tinysrgb&w=1200",
    features: [
      "Ağır & gabari dışı yükler",
      "Rota planlama & izin süreçleri",
      "Özel ekipman ve yükleme",
      "Sigorta & risk yönetimi",
    ],
    highlights: [
      { title: "Mühendislik", text: "Yük etüdü ve rota fizibilitesi." },
      { title: "İzinler", text: "Resmi izin ve eskort koordinasyonu." },
      { title: "Risk", text: "Kapsamlı sigorta ve güvenlik planı." },
    ],
  },
];

export const whyUs: { title: string; text: string; icon: LucideIcon }[] = [
  {
    title: "Uluslararası Ağ",
    text: "Dünya genelinde entegre partner ağı ile kesintisiz hizmet.",
    icon: Globe,
  },
  {
    title: "Uzmanlık",
    text: "Taşımacılık, gümrük ve lojistikte derin sektör bilgisi.",
    icon: ShieldCheck,
  },
  {
    title: "Tam İzlenebilirlik",
    text: "Her adımda anlık takip ve şeffaf bilgilendirme.",
    icon: BarChart3,
  },
  {
    title: "Tek Muhatap",
    text: "Tüm tedarik zinciri için tek bir iletişim noktası.",
    icon: Users,
  },
  {
    title: "Özel Çözümler",
    text: "İhtiyacınıza göre özelleştirilmiş lojistik planları.",
    icon: Star,
  },
];

export const navLinks = [
  { href: "/", label: "Ana Sayfa" },
  { href: "/hizmetler", label: "Hizmetler" },
  { href: "/hakkimizda", label: "Hakkımızda" },
  { href: "/takip", label: "Gönderi Takip" },
  { href: "/iletisim", label: "İletişim" },
];

export const contact = {
  address: "Alsancak Mah. 1453 Sok. No:12/A, Konak, İzmir – Türkiye",
  phone: "+90 (232) 425 10 00",
  phoneRaw: "+902324251000",
  email: "info@intertransmms.com",
  whatsapp: "+90 (232) 425 10 00",
  whatsappRaw: "902324251000",
};

export const stats = [
  { value: "30+", label: "Yıl Tecrübe" },
  { value: "120+", label: "Ülke Ağı" },
  { value: "10K+", label: "Yıllık Gönderi" },
  { value: "%99", label: "Zamanında Teslim" },
];
