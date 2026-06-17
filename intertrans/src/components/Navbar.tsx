"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { navLinks } from "@/lib/data";

export default function Navbar() {
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
        <Link href="/" className="flex items-center" aria-label="Ana sayfa">
          <Image
            src="/logo.png"
            alt="Inter Trans MMS - Multi Modal Services"
            width={200}
            height={103}
            priority
            className="h-14 w-auto md:h-[68px]"
          />
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 lg:flex">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-md px-4 py-2 font-display text-sm font-semibold transition-colors ${
                isActive(l.href)
                  ? "text-orange-light"
                  : "text-white/85 hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/iletisim"
            className="ml-2 rounded-md bg-orange px-4 py-2 font-display text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-orange-light"
          >
            Teklif Al
          </Link>
          <Link
            href="/portal"
            className="ml-1 rounded-md bg-blue px-4 py-2 font-display text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-light"
          >
            Müşteri Portalı
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="text-white lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menü"
        >
          {open ? <X size={28} /> : <Menu size={28} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-white/10 bg-navy/98 backdrop-blur-md lg:hidden">
          <div className="container-x flex flex-col gap-1 py-4">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-3 font-display text-base font-semibold ${
                  isActive(l.href) ? "text-orange-light" : "text-white/90"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link
                href="/iletisim"
                className="rounded-md bg-orange px-4 py-3 text-center font-display text-sm font-semibold text-white"
              >
                Teklif Al
              </Link>
              <Link
                href="/portal"
                className="rounded-md bg-blue px-4 py-3 text-center font-display text-sm font-semibold text-white"
              >
                Müşteri Portalı
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
