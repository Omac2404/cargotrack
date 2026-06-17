"use client";

import { useState } from "react";
import { LogIn, UserPlus } from "lucide-react";

const registerFields: { id: string; label: string; type?: string; full?: boolean; placeholder?: string }[] = [
  { id: "company", label: "Şirket Adı *", full: true, placeholder: "Şirket / Firma adı" },
  { id: "address", label: "Fiziksel Adres", full: true, placeholder: "Sokak, mahalle, ilçe" },
  { id: "postal", label: "Posta Kodu", placeholder: "34000" },
  { id: "city", label: "Şehir", placeholder: "İzmir" },
  { id: "country", label: "Ülke", placeholder: "Türkiye" },
  { id: "person", label: "Yetkili Kişi", placeholder: "Ad Soyad" },
  { id: "phone", label: "Telefon", type: "tel", placeholder: "+90 5xx xxx xx xx" },
  { id: "email", label: "E-posta", type: "email", placeholder: "yetkili@sirket.com" },
  { id: "tax", label: "Vergi Numarası", placeholder: "1234567890" },
  { id: "mersis", label: "MERSİS No", placeholder: "0123456789012345" },
  { id: "eori", label: "EORI No", full: true, placeholder: "TR123456789" },
  { id: "billingEmail", label: "Fatura E-posta", type: "email", full: true, placeholder: "fatura@sirket.com" },
];

const field =
  "w-full rounded-[10px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue focus:bg-white focus:ring-2 focus:ring-blue/10";

export default function PortalTabs() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-7 shadow-[var(--shadow-card-lg)] md:p-9">
      {/* Tabs */}
      <div className="mb-7 flex gap-1 rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => setTab("login")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 font-display text-sm font-semibold transition ${
            tab === "login"
              ? "bg-white text-navy shadow-sm"
              : "text-slate-500"
          }`}
        >
          <LogIn size={16} /> Giriş Yap
        </button>
        <button
          onClick={() => setTab("register")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 font-display text-sm font-semibold transition ${
            tab === "register"
              ? "bg-white text-navy shadow-sm"
              : "text-slate-500"
          }`}
        >
          <UserPlus size={16} /> Hesap Oluştur
        </button>
      </div>

      {tab === "login" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setMsg("Giriş altyapısı yakında devreye girecek. (Demo)");
          }}
          className="flex flex-col gap-3"
        >
          <p className="mb-2 text-center text-sm text-slate-500">
            Hesabınıza giriş yaparak belgelerinize, gönderi takibinize ve tüm
            işlemlerinize erişin.
          </p>
          <input className={field} placeholder="Kullanıcı Adı veya E-posta" />
          <input className={field} type="password" placeholder="Şifre" />
          <button type="submit" className="btn-secondary w-full">
            Giriş Yap
          </button>
          <a href="#" className="text-center text-sm text-orange">
            Şifremi Unuttum
          </a>
          <div className="mt-3 flex flex-wrap justify-center gap-2 border-t border-slate-100 pt-4">
            {["Belge İndirme", "Anlık Takip", "Gönderi Geçmişi"].map((s) => (
              <span
                key={s}
                className="rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-600"
              >
                {s}
              </span>
            ))}
          </div>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setMsg("Kayıt altyapısı yakında devreye girecek. (Demo)");
          }}
        >
          <p className="mb-5 text-center text-sm text-slate-500">
            Profesyonel müşteri hesabı oluşturarak tüm hizmetlerimize erişim
            sağlayın.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {registerFields.map((f) => (
              <div key={f.id} className={f.full ? "sm:col-span-2" : ""}>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  {f.label}
                </label>
                <input
                  className={field}
                  type={f.type ?? "text"}
                  placeholder={f.placeholder}
                />
              </div>
            ))}
          </div>
          <button type="submit" className="btn-primary mt-6 w-full">
            Hesap Oluştur
          </button>
        </form>
      )}

      {msg && (
        <p className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-center text-sm font-semibold text-blue">
          {msg}
        </p>
      )}
    </div>
  );
}
