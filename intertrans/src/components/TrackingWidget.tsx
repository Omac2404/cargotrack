"use client";

import { useState } from "react";
import { Check, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function TrackingWidget({ dark = true }: { dark?: boolean }) {
  const { t } = useTranslation();
  const STEPS = [
    t("tracking.steps.received"),
    t("tracking.steps.customs"),
    t("tracking.steps.in_transit"),
    t("tracking.steps.delivered"),
  ];
  const [value, setValue] = useState("");
  const [result, setResult] = useState<{ no: string; current: number } | null>(
    null,
  );

  const track = () => {
    const v = value.trim();
    if (!v) return;
    // Demo: ileride CargoTrack API'sine baglanacak
    const current = Math.floor(Math.random() * 3) + 1;
    setResult({ no: v, current });
  };

  const baseInput = dark
    ? "border-white/20 bg-white/10 text-white placeholder:text-white/40"
    : "border-slate-200 bg-slate-50 text-slate-700 placeholder:text-slate-400";

  return (
    <div
      className={
        dark
          ? "rounded-2xl border border-white/15 bg-white/5 p-7 backdrop-blur-md"
          : "rounded-2xl border border-slate-200 bg-white p-7 shadow-[var(--shadow-card)]"
      }
    >
      <label
        className={`mb-3 block font-display text-sm font-bold uppercase tracking-wide ${
          dark ? "text-white" : "text-navy"
        }`}
      >
        {t("tracking.widget_label")}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && track()}
          placeholder={t("tracking.widget_ph")}
          className={`h-13 flex-1 rounded-[10px] border px-4 py-3 text-base outline-none transition focus:border-blue-light ${baseInput}`}
        />
        <button
          onClick={track}
          className="inline-flex h-13 items-center justify-center gap-2 rounded-[10px] bg-gradient-to-br from-blue to-blue-light px-7 py-3 font-display font-bold text-white transition hover:shadow-[0_6px_24px_rgba(21,101,192,0.4)]"
        >
          <Search size={18} /> {t("buttons.track")}
        </button>
      </div>

      {result && (
        <div
          className={`mt-5 rounded-xl border p-4 ${
            dark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"
          }`}
        >
          <h4
            className={`mb-4 text-sm font-semibold ${
              dark ? "text-white" : "text-navy"
            }`}
          >
            {t("tracking.shipment")}: <span className="text-orange-light">{result.no}</span>
          </h4>
          <div className="flex">
            {STEPS.map((s, i) => {
              const done = i < result.current;
              return (
                <div key={s} className="relative flex-1 text-center">
                  {i > 0 && (
                    <span
                      className={`absolute left-0 top-3.5 h-0.5 w-1/2 ${
                        done ? "bg-blue" : dark ? "bg-white/15" : "bg-slate-200"
                      }`}
                    />
                  )}
                  {i < STEPS.length - 1 && (
                    <span
                      className={`absolute right-0 top-3.5 h-0.5 w-1/2 ${
                        i + 1 < result.current
                          ? "bg-blue"
                          : dark
                            ? "bg-white/15"
                            : "bg-slate-200"
                      }`}
                    />
                  )}
                  <span
                    className={`relative z-10 mx-auto mb-2 flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                      done
                        ? "border-blue-light bg-blue text-white"
                        : dark
                          ? "border-white/20 bg-white/10 text-white/30"
                          : "border-slate-300 bg-white text-slate-300"
                    }`}
                  >
                    <Check size={13} />
                  </span>
                  <span
                    className={`block text-[0.7rem] ${
                      done
                        ? dark
                          ? "text-white/85"
                          : "text-slate-700"
                        : dark
                          ? "text-white/45"
                          : "text-slate-400"
                    }`}
                  >
                    {s}
                  </span>
                </div>
              );
            })}
          </div>
          <p
            className={`mt-3 text-xs ${dark ? "text-white/40" : "text-slate-400"}`}
          >
            {t("tracking.demo_note")}
          </p>
        </div>
      )}
    </div>
  );
}
