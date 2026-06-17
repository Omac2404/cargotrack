import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import ContactForm from "@/components/ContactForm";
import Reveal from "@/components/Reveal";
import { contact } from "@/lib/data";
import { MapPin, Phone, Mail, MessageCircle, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "İletişim",
  description:
    "Inter Trans MMS ile iletişime geçin. Adres, telefon, e-posta ve WhatsApp üzerinden teklif talep edin.",
};

export default function IletisimPage() {
  const items = [
    {
      icon: MapPin,
      title: "Adres",
      value: contact.address,
      href: null,
      color: "text-orange-light",
    },
    {
      icon: Phone,
      title: "Telefon",
      value: contact.phone,
      href: `tel:${contact.phoneRaw}`,
      color: "text-orange-light",
    },
    {
      icon: Mail,
      title: "E-posta",
      value: contact.email,
      href: `mailto:${contact.email}`,
      color: "text-orange-light",
    },
    {
      icon: MessageCircle,
      title: "WhatsApp",
      value: contact.whatsapp,
      href: `https://wa.me/${contact.whatsappRaw}`,
      color: "text-[#25D366]",
    },
    {
      icon: Clock,
      title: "Çalışma Saatleri",
      value: "Hafta içi 09:00 – 18:00",
      href: null,
      color: "text-orange-light",
    },
  ];

  return (
    <>
      <PageHero
        title="İletişim"
        subtitle="Sorularınız veya teklif talepleriniz için bize ulaşın."
      />

      <section className="section">
        <div className="container-x grid gap-12 lg:grid-cols-[1fr_1.2fr]">
          {/* Info */}
          <Reveal>
            <h2 className="section-title text-2xl">Bize Ulaşın</h2>
            <p className="mt-3 text-slate-500">
              Aşağıdaki kanallardan dilediğiniz biriyle bize ulaşabilir veya
              formu doldurarak teklif talep edebilirsiniz.
            </p>
            <ul className="mt-8 space-y-5">
              {items.map((it) => {
                const Icon = it.icon;
                return (
                  <li key={it.title} className="flex items-start gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                      <Icon size={22} className={it.color} />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-navy">
                        {it.title}
                      </h4>
                      {it.href ? (
                        <a
                          href={it.href}
                          className="text-sm text-slate-600 transition hover:text-blue"
                        >
                          {it.value}
                        </a>
                      ) : (
                        <p className="text-sm text-slate-600">{it.value}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">
              <iframe
                title="Harita"
                src="https://www.openstreetmap.org/export/embed.html?bbox=27.13%2C38.42%2C27.16%2C38.44&layer=mapnik"
                className="h-64 w-full"
                loading="lazy"
              />
            </div>
          </Reveal>

          {/* Form */}
          <Reveal delay={0.1}>
            <ContactForm />
          </Reveal>
        </div>
      </section>
    </>
  );
}
