"use client";

import { useTranslation } from "react-i18next";

const FLAG_TR = (
  <svg viewBox="0 0 24 16" className="h-4 w-6 rounded-sm" aria-hidden="true">
    <rect width="24" height="16" fill="#E30A17" />
    <circle cx="9" cy="8" r="3.5" fill="#fff" />
    <circle cx="10" cy="8" r="2.8" fill="#E30A17" />
    <polygon points="13,8 15.6,8.8 14,6.6 14,9.4 15.6,7.2" fill="#fff" />
  </svg>
);

const FLAG_EN = (
  <svg viewBox="0 0 24 16" className="h-4 w-6 rounded-sm overflow-hidden" aria-hidden="true">
    <rect width="24" height="16" fill="#012169" />
    <path d="M0 0 L24 16 M24 0 L0 16" stroke="#fff" strokeWidth="3" />
    <path d="M0 0 L24 16 M24 0 L0 16" stroke="#C8102E" strokeWidth="1.5" />
    <path d="M12 0 V16 M0 8 H24" stroke="#fff" strokeWidth="4" />
    <path d="M12 0 V16 M0 8 H24" stroke="#C8102E" strokeWidth="2" />
  </svg>
);

const FLAG_FR = (
  <svg viewBox="0 0 24 16" className="h-4 w-6 rounded-sm" aria-hidden="true">
    <rect width="8" height="16" x="0" fill="#0055A4" />
    <rect width="8" height="16" x="8" fill="#fff" />
    <rect width="8" height="16" x="16" fill="#EF4135" />
  </svg>
);

const LANGS: { code: "tr" | "en" | "fr"; label: string; flag: React.ReactNode }[] = [
  { code: "tr", label: "Türkçe", flag: FLAG_TR },
  { code: "en", label: "English", flag: FLAG_EN },
  { code: "fr", label: "Français", flag: FLAG_FR },
];

export default function LanguageSwitcher({ variant = "navbar" }: { variant?: "navbar" | "mobile" }) {
  const { i18n } = useTranslation();
  const current = (i18n.resolvedLanguage || i18n.language || "tr").slice(0, 2);

  return (
    <div className={variant === "navbar" ? "flex items-center gap-1" : "flex items-center gap-2"}>
      {LANGS.map((l) => {
        const active = current === l.code;
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => i18n.changeLanguage(l.code)}
            title={l.label}
            aria-label={l.label}
            aria-pressed={active}
            className={`flex items-center justify-center rounded transition-all ${
              variant === "navbar" ? "p-1" : "p-1.5"
            } ${
              active
                ? "ring-2 ring-orange opacity-100"
                : "opacity-60 hover:opacity-100"
            }`}
          >
            {l.flag}
          </button>
        );
      })}
    </div>
  );
}
