"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ServiceMeta } from "@/lib/data";

export default function ServiceCard({ service }: { service: ServiceMeta }) {
  const { t } = useTranslation();
  const Icon = service.icon;
  return (
    <Link
      href={`/hizmetler/${service.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1.5 hover:border-transparent hover:shadow-[var(--shadow-card-lg)]"
    >
      <div
        className="h-44 w-full bg-cover bg-center"
        style={{ backgroundImage: `url('${service.image}')` }}
      />
      <div className="flex flex-1 flex-col p-7">
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-pale text-blue">
            <Icon size={20} />
          </span>
          <h3 className="font-display text-lg font-bold text-navy">
            {t(`services.items.${service.slug}.title`)}
          </h3>
        </div>
        <p className="flex-1 text-sm leading-relaxed text-slate-500">
          {t(`services.items.${service.slug}.excerpt`)}
        </p>
        <span className="mt-4 inline-flex items-center gap-1.5 font-display text-sm font-semibold text-orange transition-transform group-hover:gap-2.5">
          {t("buttons.details")} <ArrowRight size={16} />
        </span>
      </div>
    </Link>
  );
}
