"use client";

import { useTranslation } from "react-i18next";
import PageHero from "@/components/PageHero";
import SectionHeader from "@/components/SectionHeader";
import ServiceCard from "@/components/ServiceCard";
import Reveal from "@/components/Reveal";
import CtaBand from "@/components/CtaBand";
import { services } from "@/lib/data";

export default function HizmetlerPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHero
        title={t("services.page_title")}
        subtitle={t("services.page_subtitle")}
      />
      <section className="section bg-slate-50">
        <div className="container-x">
          <SectionHeader
            title={t("services.section_title")}
            subtitle={t("services.section_subtitle")}
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s, i) => (
              <Reveal key={s.slug} delay={(i % 3) * 0.08}>
                <ServiceCard service={s} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <CtaBand />
    </>
  );
}
