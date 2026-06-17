"use client";

import { useTranslation } from "react-i18next";
import { PackageSearch, Bell, FileText } from "lucide-react";
import PageHero from "@/components/PageHero";
import TrackingWidget from "@/components/TrackingWidget";
import Reveal from "@/components/Reveal";

const featureDefs = [
  { keyBase: "live", icon: PackageSearch },
  { keyBase: "notify", icon: Bell },
  { keyBase: "documents", icon: FileText },
];

export default function TakipPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHero
        title={t("tracking.page_title")}
        subtitle={t("tracking.page_subtitle")}
      />

      <section className="section">
        <div className="container-x max-w-3xl">
          <Reveal>
            <TrackingWidget dark={false} />
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {featureDefs.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.keyBase}
                    className="rounded-2xl border border-slate-200 bg-white p-6 text-center"
                  >
                    <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-pale text-blue">
                      <Icon size={22} />
                    </span>
                    <h3 className="mb-1.5 text-base font-bold text-navy">
                      {t(`tracking.features.${f.keyBase}_title`)}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {t(`tracking.features.${f.keyBase}_text`)}
                    </p>
                  </div>
                );
              })}
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <p className="mt-10 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-700">
              {t("tracking.demo_banner")}
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
