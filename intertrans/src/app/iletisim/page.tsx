"use client";

import { useTranslation } from "react-i18next";
import { MapPin, Phone, Mail, MessageCircle, Clock } from "lucide-react";
import PageHero from "@/components/PageHero";
import ContactForm from "@/components/ContactForm";
import Reveal from "@/components/Reveal";
import { contact } from "@/lib/data";

export default function IletisimPage() {
  const { t } = useTranslation();
  const items = [
    {
      icon: MapPin,
      titleKey: "contact_page.address_label",
      value: contact.address,
      href: null,
      color: "text-orange-light",
    },
    {
      icon: Phone,
      titleKey: "contact_page.phone_label",
      value: contact.phone,
      href: `tel:${contact.phoneRaw}`,
      color: "text-orange-light",
    },
    {
      icon: Mail,
      titleKey: "contact_page.email_label",
      value: contact.email,
      href: `mailto:${contact.email}`,
      color: "text-orange-light",
    },
    {
      icon: MessageCircle,
      titleKey: "contact_page.whatsapp_label",
      value: contact.whatsapp,
      href: `https://wa.me/${contact.whatsappRaw}`,
      color: "text-[#25D366]",
    },
    {
      icon: Clock,
      titleKey: "contact_page.hours_label",
      value: t("contact_page.hours_value"),
      href: null,
      color: "text-orange-light",
    },
  ];

  return (
    <>
      <PageHero
        title={t("contact_page.page_title")}
        subtitle={t("contact_page.page_subtitle")}
      />

      <section className="section">
        <div className="container-x grid gap-12 lg:grid-cols-[1fr_1.2fr]">
          <Reveal>
            <h2 className="section-title text-2xl">{t("contact_page.panel_title")}</h2>
            <p className="mt-3 text-slate-500">{t("contact_page.panel_subtitle")}</p>
            <ul className="mt-8 space-y-5">
              {items.map((it) => {
                const Icon = it.icon;
                return (
                  <li key={it.titleKey} className="flex items-start gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                      <Icon size={22} className={it.color} />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-navy">
                        {t(it.titleKey)}
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
                title={t("contact_page.map_title")}
                src="https://www.openstreetmap.org/export/embed.html?bbox=27.13%2C38.42%2C27.16%2C38.44&layer=mapnik"
                className="h-64 w-full"
                loading="lazy"
              />
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <ContactForm />
          </Reveal>
        </div>
      </section>
    </>
  );
}
