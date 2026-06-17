"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function PageHero({
  title,
  subtitle,
  crumbs = [],
  image = "https://images.pexels.com/photos/1117210/pexels-photo-1117210.jpeg?auto=compress&cs=tinysrgb&w=1600",
}: {
  title: string;
  subtitle?: string;
  crumbs?: { href: string; label: string }[];
  image?: string;
}) {
  const { t } = useTranslation();
  return (
    <section
      className="relative bg-cover bg-center pb-16 pt-36 md:pb-20 md:pt-44"
      style={{
        backgroundImage: `linear-gradient(165deg, rgba(6,26,51,.9), rgba(11,37,69,.85)), url('${image}')`,
      }}
    >
      <div className="container-x">
        <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-white/60">
          <Link href="/" className="hover:text-orange-light">
            {t("nav.home")}
          </Link>
          {crumbs.map((c) => (
            <span key={c.href} className="flex items-center gap-1.5">
              <ChevronRight size={14} />
              <Link href={c.href} className="hover:text-orange-light">
                {c.label}
              </Link>
            </span>
          ))}
          <ChevronRight size={14} />
          <span className="text-orange-light">{title}</span>
        </nav>
        <h1 className="max-w-3xl text-3xl font-extrabold text-white md:text-5xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-4 max-w-2xl text-lg text-white/70">{subtitle}</p>
        )}
      </div>
    </section>
  );
}
