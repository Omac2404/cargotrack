"use client";

import { useEffect, useState } from "react";
import i18n from "@/lib/i18n";

/**
 * i18next'i ilk render'da initialize eder.
 * Static export'ta SSR sırasında dil "tr" (fallback) ile başlar,
 * client-side mount sonrası localStorage'dan gerçek tercih okunur.
 */
export default function I18nProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // i18n initialized in module scope already
  void i18n;

  // SSR build sırasında tüm metinler TR ile pre-render edilir;
  // mount olunca client tercihiyle yeniden render olur (hydration uyumsuzluğunu engellemek için suppressHydrationWarning gerekirse <html>'a ekle).
  void mounted;
  return <>{children}</>;
}
