"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function CtaBand({
  titleKey,
  textKey,
  title: titleOverride,
  text: textOverride,
}: {
  titleKey?: string;
  textKey?: string;
  title?: string;
  text?: string;
}) {
  const { t } = useTranslation();
  const title = titleOverride ?? t(titleKey ?? "cta.default_title");
  const text = textOverride ?? t(textKey ?? "cta.default_text");
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-navy-deep to-navy">
      <div className="container-x py-16 text-center md:py-20">
        <h2 className="mx-auto max-w-3xl text-2xl font-extrabold text-white md:text-3xl">
          {title}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-white/60">{text}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/iletisim" className="btn-primary">
            {t("nav.quote_cta")} <ArrowRight size={18} />
          </Link>
          <Link
            href="/hizmetler"
            className="btn border border-white/20 bg-white/5 text-white hover:bg-white/10"
          >
            {t("buttons.examine_services")}
          </Link>
        </div>
      </div>
    </section>
  );
}
