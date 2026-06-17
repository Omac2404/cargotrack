"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { useTranslation } from "react-i18next";

const TRANSPORT_KEYS = [
  "air",
  "sea_fcl",
  "sea_lcl",
  "road",
  "multimodal",
  "customs",
  "storage",
] as const;

export default function ContactForm() {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Backend entegrasyonu sonraki fazda eklenecek (CargoTrack / e-posta).
    setSent(true);
  };

  const field =
    "w-full rounded-[10px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue focus:bg-white focus:ring-2 focus:ring-blue/10";
  const label = "mb-1.5 block text-sm font-semibold text-slate-700";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-7 shadow-[var(--shadow-card)]"
    >
      <h3 className="mb-1 text-xl font-bold text-navy">{t("contact_form.title")}</h3>
      <p className="mb-6 text-sm text-slate-500">{t("contact_form.subtitle")}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>{t("contact_form.name")}</label>
          <input className={field} type="text" placeholder={t("contact_form.name_ph")} />
        </div>
        <div>
          <label className={label}>{t("contact_form.company")}</label>
          <input className={field} type="text" placeholder={t("contact_form.company_ph")} />
        </div>
        <div>
          <label className={label}>{t("contact_form.email")}</label>
          <input className={field} type="email" placeholder={t("contact_form.email_ph")} />
        </div>
        <div>
          <label className={label}>{t("contact_form.phone")}</label>
          <input className={field} type="tel" placeholder={t("contact_form.phone_ph")} />
        </div>
        <div>
          <label className={label}>{t("contact_form.transport")}</label>
          <select className={field} defaultValue="">
            <option value="" disabled>
              {t("contact_form.transport_select")}
            </option>
            {TRANSPORT_KEYS.map((k) => (
              <option key={k}>{t(`contact_form.transport_types.${k}`)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>{t("contact_form.weight")}</label>
          <input className={field} type="text" placeholder={t("contact_form.weight_ph")} />
        </div>
        <div>
          <label className={label}>{t("contact_form.loading")}</label>
          <input className={field} type="text" placeholder={t("contact_form.loading_ph")} />
        </div>
        <div>
          <label className={label}>{t("contact_form.destination")}</label>
          <input className={field} type="text" placeholder={t("contact_form.destination_ph")} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>{t("contact_form.details")}</label>
          <textarea
            className={`${field} min-h-28 resize-y`}
            placeholder={t("contact_form.details_ph")}
          />
        </div>
      </div>

      {sent && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center text-sm font-semibold text-emerald-700">
          {t("contact_form.success")}
        </p>
      )}

      <button type="submit" className="btn-primary mt-6 w-full">
        <Send size={18} /> {t("buttons.send")}
      </button>
    </form>
  );
}
