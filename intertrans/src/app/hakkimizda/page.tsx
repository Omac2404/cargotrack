"use client";

import { Target, Eye, HeartHandshake } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHero from "@/components/PageHero";
import SectionHeader from "@/components/SectionHeader";
import Reveal from "@/components/Reveal";
import CtaBand from "@/components/CtaBand";
import { whyUs, stats } from "@/lib/data";

const valueDefs = [
  { keyBase: "mission", icon: Target },
  { keyBase: "vision", icon: Eye },
  { keyBase: "values", icon: HeartHandshake },
];

export default function HakkimizdaPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHero
        title={t("about.page_title")}
        subtitle={t("about.page_subtitle")}
      />

      {/* Story */}
      <section className="section">
        <div className="container-x grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <div
              className="aspect-[4/3] w-full rounded-2xl bg-cover bg-center shadow-[var(--shadow-card-lg)]"
              style={{
                backgroundImage:
                  "url('https://images.pexels.com/photos/667492/pexels-photo-667492.jpeg?auto=compress&cs=tinysrgb&w=1200')",
              }}
            />
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mb-5 h-1 w-14 rounded bg-gradient-to-r from-orange to-orange-light" />
            <h2 className="section-title">{t("about.story_title")}</h2>
            <p className="mt-5 text-slate-600">{t("about.story_p1")}</p>
            <p className="mt-4 text-slate-600">{t("about.story_p2")}</p>
          </Reveal>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-navy py-14">
        <div className="container-x grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.keyBase} delay={i * 0.08} className="text-center">
              <div className="font-display text-4xl font-extrabold text-white">
                {s.value}
              </div>
              <div className="mt-1 text-sm text-white/60">
                {t(`stats.${s.keyBase}`)}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="section bg-slate-50">
        <div className="container-x">
          <SectionHeader
            title={t("about.values_section_title")}
            subtitle={t("about.values_section_subtitle")}
          />
          <div className="grid gap-6 md:grid-cols-3">
            {valueDefs.map((v, i) => {
              const Icon = v.icon;
              return (
                <Reveal key={v.keyBase} delay={i * 0.08}>
                  <div className="h-full rounded-2xl border border-slate-200 bg-white p-8">
                    <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange to-orange-light text-white">
                      <Icon size={24} />
                    </span>
                    <h3 className="mb-2 text-lg font-bold text-navy">
                      {t(`about.values.${v.keyBase}_title`)}
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-500">
                      {t(`about.values.${v.keyBase}_text`)}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="section">
        <div className="container-x">
          <SectionHeader
            title={t("about.why_section_title")}
            subtitle={t("about.why_section_subtitle")}
          />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {whyUs.map((w, i) => {
              const Icon = w.icon;
              return (
                <Reveal key={w.keyBase} delay={(i % 5) * 0.08}>
                  <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 text-center transition hover:-translate-y-1 hover:shadow-[var(--shadow-card)]">
                    <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-pale text-blue">
                      <Icon size={22} />
                    </span>
                    <h4 className="mb-1.5 text-sm font-bold text-navy">
                      {t(`why_us.${w.keyBase}_title`)}
                    </h4>
                    <p className="text-xs leading-relaxed text-slate-500">
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
