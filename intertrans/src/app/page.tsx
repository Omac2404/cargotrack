"use client";

import { useTranslation } from "react-i18next";
import Hero from "@/components/Hero";
import SectionHeader from "@/components/SectionHeader";
import ServiceCard from "@/components/ServiceCard";
import Reveal from "@/components/Reveal";
import CtaBand from "@/components/CtaBand";
import { services, whyUs, stats } from "@/lib/data";

export default function Home() {
  const { t } = useTranslation();
  return (
    <>
      <Hero />

      {/* Stats */}
      <section className="border-b border-slate-100 bg-white py-12">
        <div className="container-x grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.keyBase} delay={i * 0.08} className="text-center">
              <div className="font-display text-4xl font-extrabold text-navy">
                {s.value}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {t(`stats.${s.keyBase}`)}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="section bg-slate-50">
        <div className="container-x">
          <SectionHeader
            title={t("home.services_section_title")}
            subtitle={t("home.services_section_subtitle")}
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

      {/* Why us */}
      <section
        className="section bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(165deg, rgba(6,26,51,.92), rgba(11,37,69,.9)), url('https://images.pexels.com/photos/1117210/pexels-photo-1117210.jpeg?auto=compress&cs=tinysrgb&w=1600')",
        }}
      >
        <div className="container-x">
          <SectionHeader
            dark
            title={t("home.why_section_title")}
            subtitle={t("home.why_section_subtitle")}
          />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {whyUs.map((w, i) => {
              const Icon = w.icon;
              return (
                <Reveal key={w.keyBase} delay={(i % 5) * 0.08}>
                  <div className="h-full rounded-2xl border border-white/10 bg-white/8 p-7 text-center backdrop-blur transition hover:-translate-y-1 hover:bg-white/15">
                    <span className="mx-auto mb-4 flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-blue to-blue-light text-white">
                      <Icon size={24} />
                    </span>
                    <h4 className="mb-1.5 text-sm font-bold text-white">
                      {t(`why_us.${w.keyBase}_title`)}
                    </h4>
                    <p className="text-xs leading-relaxed text-white/65">
                      {t(`why_us.${w.keyBase}_text`)}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
