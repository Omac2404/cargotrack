"use client";

import { useState } from "react";
import { LogIn, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";

type RegisterFieldDef = { id: string; key: string; type?: string; full?: boolean };

const registerFields: RegisterFieldDef[] = [
  { id: "company",      key: "company",       full: true },
  { id: "address",      key: "address",       full: true },
  { id: "postal",       key: "postal" },
  { id: "city",         key: "city" },
  { id: "country",      key: "country" },
  { id: "person",       key: "person" },
  { id: "phone",        key: "phone",         type: "tel" },
  { id: "email",        key: "email",         type: "email" },
  { id: "tax",          key: "tax" },
  { id: "mersis",       key: "mersis" },
  { id: "eori",         key: "eori",          full: true },
  { id: "billingEmail", key: "billing_email", type: "email", full: true },
];

const field =
  "w-full rounded-[10px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue focus:bg-white focus:ring-2 focus:ring-blue/10";

export default function PortalTabs() {
  const { t } = useTranslation();
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
          <LogIn size={16} /> {t("portal.tabs.login")}
        </button>
        <button
          onClick={() => setTab("register")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 font-display text-sm font-semibold transition ${
            tab === "register"
              ? "bg-white text-navy shadow-sm"
              : "text-slate-500"
          }`}
        >
          <UserPlus size={16} /> {t("portal.tabs.register")}
        </button>
      </div>

      {tab === "login" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setMsg(t("portal.login_demo_msg"));
          }}
          className="flex flex-col gap-3"
        >
          <p className="mb-2 text-center text-sm text-slate-500">
            {t("portal.login_intro")}
          </p>
          <input className={field} placeholder={t("portal.login_user_ph")} />
          <input className={field} type="password" placeholder={t("portal.login_pass_ph")} />
          <button type="submit" className="btn-secondary w-full">
            {t("buttons.login")}
          </button>
          <a href="#" className="text-center text-sm text-orange">
            {t("buttons.forgot_password")}
          </a>
          <div className="mt-3 flex flex-wrap justify-center gap-2 border-t border-slate-100 pt-4">
            {(["document_dl", "live_tracking", "history"] as const).map((k) => (
              <span
                key={k}
                className="rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-600"
              >
                {t(`portal.tags.${k}`)}
              </span>
            ))}
          </div>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setMsg(t("portal.register_demo_msg"));
          }}
        >
          <p className="mb-5 text-center text-sm text-slate-500">
            {t("portal.register_intro")}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {registerFields.map((f) => (
              <div key={f.id} className={f.full ? "sm:col-span-2" : ""}>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  {t(`portal.register_fields.${f.key}`)}
                </label>
                <input
                  className={field}
                  type={f.type ?? "text"}
                  placeholder={t(`portal.register_fields.${f.key}_ph`)}
                />
              </div>
            ))}
          </div>
          <button type="submit" className="btn-primary mt-6 w-full">
            {t("buttons.register")}
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
