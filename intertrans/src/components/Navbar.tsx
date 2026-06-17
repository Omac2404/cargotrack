"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { navLinks } from "@/lib/data";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Navbar() {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[100] transition-all duration-300 ${
        scrolled
          ? "bg-navy/95 py-2 shadow-[0_2px_20px_rgba(0,0,0,0.15)] backdrop-blur-md"
          : "bg-transparent py-3"
      }`}
    >
      <nav className="container-x flex items-center justify-between">
        <Link href="/" className="flex items-center shrink-0" aria-label={t("nav.home")}>
          <Image
            src="/logo.png"
            alt="Inter Trans MMS - Multi Modal Services"
            width={200}
            height={103}
            priority
            className="h-11 w-auto md:h-12 xl:h-14"
          />
        </Link>

        {/* Desktop links — xl'den itibaren tek sıra (lg'de yer dar oluyor → mobile menü açılır) */}
        <div className="hidden items-center gap-0.5 xl:flex">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`whitespace-nowrap rounded-md px-3 py-2 font-display text-sm font-semibold transition-colors ${
                isActive(l.href)
                  ? "text-orange-light"
                  : "text-white/85 hover:text-white"
              }`}
            >
              {t(`nav.${l.key}`)}
            </Link>
          ))}
          <Link
            href="/iletisim"
            className="ml-2 whitespace-nowrap rounded-md bg-orange px-3.5 py-2 font-display text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-orange-light"
          >
            {t("nav.quote_cta")}
          </Link>
          <Link
            href="/portal"
            className="ml-1 whitespace-nowrap rounded-md bg-blue px-3.5 py-2 font-display text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-light"
          >
            {t("nav.portal_cta")}
          </Link>
          {/* Language switcher — küçük bayraklar */}
          <div className="ml-3 border-l border-white/15 pl-3 shrink-0">
            <LanguageSwitcher />
          </div>
        </div>

        {/* Mobile + Tablet: switcher + toggle (lg ve aşağıda) */}
        <div className="flex items-center gap-3 xl:hidden">
          <LanguageSwitcher variant="mobile" />
          <button
            className="text-white"
            onClick={() => setOpen((v) => !v)}
            aria-label={t("nav.menu_label")}
          >
            {open ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </nav>

      {/* Mobile + tablet menu (xl altında) */}
      {open && (
        <div className="border-t border-white/10 bg-navy/98 backdrop-blur-md xl:hidden">
          <div className="container-x flex flex-col gap-1 py-4">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-3 font-display text-base font-semibold ${
                  isActive(l.href) ? "text-orange-light" : "text-white/90"
                }`}
              >
                {t(`nav.${l.key}`)}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link
                href="/iletisim"
                className="rounded-md bg-orange px-4 py-3 text-center font-display text-sm font-semibold text-white"
              >
                {t("nav.quote_cta")}
              </Link>
              <Link
                href="/portal"
                className="rounded-md bg-blue px-4 py-3 text-center font-display text-sm font-semibold text-white"
              >
                {t("nav.portal_cta")}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
