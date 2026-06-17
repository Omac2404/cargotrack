"use client";

import { useState } from "react";
import { Send } from "lucide-react";

const transportTypes = [
  "Hava Kargo",
  "Deniz (FCL)",
  "Deniz (LCL)",
  "Kara Yolu",
  "Çok Modlu",
  "Gümrük",
  "Depolama",
];

export default function ContactForm() {
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
      <h3 className="mb-1 text-xl font-bold text-navy">Teklif & İletişim</h3>
      <p className="mb-6 text-sm text-slate-500">
        Formu doldurun, ekibimiz en kısa sürede dönüş yapsın.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Ad Soyad</label>
          <input className={field} type="text" placeholder="Ad Soyad" />
        </div>
        <div>
          <label className={label}>Firma</label>
          <input className={field} type="text" placeholder="Firma adı" />
        </div>
        <div>
          <label className={label}>E-posta</label>
          <input className={field} type="email" placeholder="ornek@firma.com" />
        </div>
        <div>
          <label className={label}>Telefon</label>
          <input className={field} type="tel" placeholder="+90 5XX XXX XX XX" />
        </div>
        <div>
          <label className={label}>Taşıma Türü</label>
          <select className={field} defaultValue="">
            <option value="" disabled>
              Seçiniz
            </option>
            {transportTypes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Ağırlık (kg)</label>
          <input className={field} type="text" placeholder="Örn: 1500" />
        </div>
        <div>
          <label className={label}>Yükleme Yeri</label>
          <input className={field} type="text" placeholder="Şehir / Ülke" />
        </div>
        <div>
          <label className={label}>Varış Yeri</label>
          <input className={field} type="text" placeholder="Şehir / Ülke" />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Detaylar</label>
          <textarea
            className={`${field} min-h-28 resize-y`}
            placeholder="Yük cinsi, ambalaj, özel gereksinimler..."
          />
        </div>
      </div>

      {sent && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center text-sm font-semibold text-emerald-700">
          Talebiniz alındı. (Demo) — Form altyapısı yakında devreye girecek.
        </p>
      )}

      <button type="submit" className="btn-primary mt-6 w-full">
        <Send size={18} /> Gönder
      </button>
    </form>
  );
}
