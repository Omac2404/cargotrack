"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import tr from "@/locales/tr.json";
import en from "@/locales/en.json";
import fr from "@/locales/fr.json";

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        tr: { translation: tr },
        en: { translation: en },
        fr: { translation: fr },
      },
      fallbackLng: "tr",
      supportedLngs: ["tr", "en", "fr"],
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator"],
        caches: ["localStorage"],
        lookupLocalStorage: "intertrans_lang",
      },
    });
}

export default i18n;
