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

/**
 * Statik / dilden bağımsız bilgiler:
 *   - slug (URL ve i18n anahtarı)
 *   - icon (lucide-react bileşeni)
 *   - image (statik kaynak)
 *
 * Çevrilebilir metinler (title, excerpt, description, features, highlights)
 * locales/{tr,en,fr}.json içinde "services.items.<slug>" altında saklanır.
 * Bileşenlerde: t(`services.items.${slug}.title`), t(...features, { returnObjects: true }) vb.
 */

export type ServiceMeta = {
  slug: string;
  icon: LucideIcon;
  image: string;
};

export const services: ServiceMeta[] = [
  {
    slug: "hava-kargo",
    icon: Plane,
    image:
      "https://images.pexels.com/photos/46148/aircraft-jet-landing-cloud-46148.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    slug: "deniz-tasimaciligi",
    icon: Ship,
    image:
      "https://images.pexels.com/photos/753331/pexels-photo-753331.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    slug: "kara-yolu",
    icon: Truck,
    image:
      "https://images.pexels.com/photos/1267325/pexels-photo-1267325.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    slug: "lojistik-depolama",
    icon: Warehouse,
    image:
      "https://images.pexels.com/photos/4481259/pexels-photo-4481259.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    slug: "gumruk",
    icon: FileCheck2,
    image:
      "https://images.pexels.com/photos/4481326/pexels-photo-4481326.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    slug: "proje-tasimaciligi",
    icon: Boxes,
    image:
      "https://images.pexels.com/photos/681335/pexels-photo-681335.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
];

// "Neden biz" maddeleri — i18n key + icon
export type WhyMeta = { keyBase: string; icon: LucideIcon };

export const whyUs: WhyMeta[] = [
  { keyBase: "global_network", icon: Globe },
  { keyBase: "expertise", icon: ShieldCheck },
  { keyBase: "tracking", icon: BarChart3 },
  { keyBase: "single_contact", icon: Users },
  { keyBase: "custom", icon: Star },
];

// İstatistikler — değer statik, label i18n
export type StatMeta = { value: string; keyBase: string };

export const stats: StatMeta[] = [
  { value: "30+", keyBase: "experience" },
  { value: "120+", keyBase: "countries" },
  { value: "10K+", keyBase: "shipments" },
  { value: "%99", keyBase: "on_time" },
];

export type NavLink = { href: string; key: string };

export const navLinks: NavLink[] = [
  { href: "/", key: "home" },
  { href: "/hizmetler", key: "services" },
  { href: "/hakkimizda", key: "about" },
  { href: "/takip", key: "tracking" },
  { href: "/iletisim", key: "contact" },
];

export const contact = {
  address: "Alsancak Mah. 1453 Sok. No:12/A, Konak, İzmir – Türkiye",
  phone: "+90 (232) 425 10 00",
  phoneRaw: "+902324251000",
  email: "info@intertransmms.com",
  whatsapp: "+90 (232) 425 10 00",
  whatsappRaw: "902324251000",
};
