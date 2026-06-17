import Link from "next/link";
import Image from "next/image";
import { MapPin, Phone, Mail, MessageCircle } from "lucide-react";
import { contact, services, navLinks } from "@/lib/data";

export default function Footer() {
  return (
    <footer className="bg-navy-deep text-white/70">
      <div className="container-x grid gap-10 py-16 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Image
            src="/logo.png"
            alt="Inter Trans MMS - Multi Modal Services"
            width={200}
            height={103}
            className="mb-5 h-16 w-auto"
          />
          <p className="text-sm leading-relaxed text-white/60">
            Taşımacılık, gümrük ve lojistikte küresel çözüm ortağınız. Hava,
            deniz ve kara yolunda uçtan uca entegre hizmet.
          </p>
        </div>

        <div>
          <h4 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-white">
            Hızlı Erişim
          </h4>
          <ul className="space-y-2 text-sm">
            {navLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-white/60 transition-colors hover:text-orange-light"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-white">
            Hizmetler
          </h4>
          <ul className="space-y-2 text-sm">
            {services.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/hizmetler/${s.slug}`}
                  className="text-white/60 transition-colors hover:text-orange-light"
                >
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-white">
            İletişim
          </h4>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3">
              <MapPin size={18} className="mt-0.5 shrink-0 text-orange-light" />
              <span className="text-white/60">{contact.address}</span>
            </li>
            <li className="flex gap-3">
              <Phone size={18} className="shrink-0 text-orange-light" />
              <a
                href={`tel:${contact.phoneRaw}`}
                className="text-white/60 transition-colors hover:text-orange-light"
              >
                {contact.phone}
              </a>
            </li>
            <li className="flex gap-3">
              <Mail size={18} className="shrink-0 text-orange-light" />
              <a
                href={`mailto:${contact.email}`}
                className="text-white/60 transition-colors hover:text-orange-light"
              >
                {contact.email}
              </a>
            </li>
            <li className="flex gap-3">
              <MessageCircle size={18} className="shrink-0 text-[#25D366]" />
              <a
                href={`https://wa.me/${contact.whatsappRaw}`}
                className="text-white/60 transition-colors hover:text-orange-light"
              >
                WhatsApp
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-x flex flex-col items-center justify-between gap-4 py-6 text-sm text-white/40 md:flex-row">
          <p>&copy; 2026 Inter Trans MMS. Tüm hakları saklıdır.</p>
          <div className="flex gap-6">
            <Link href="#" className="transition-colors hover:text-orange-light">
              Gizlilik
            </Link>
            <Link href="#" className="transition-colors hover:text-orange-light">
              Kullanım Koşulları
            </Link>
            <Link href="#" className="transition-colors hover:text-orange-light">
              KVKK
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
