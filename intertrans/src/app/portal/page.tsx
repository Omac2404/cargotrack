"use client";

import { useTranslation } from "react-i18next";
import PageHero from "@/components/PageHero";
import PortalTabs from "@/components/PortalTabs";
import Reveal from "@/components/Reveal";

export default function PortalPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHero
        title={t("portal.page_title")}
        subtitle={t("portal.page_subtitle")}
      />
      <section className="section bg-slate-50">
        <div className="container-x">
          <Reveal>
            <PortalTabs />
          </Reveal>
        </div>
      </section>
    </>
  );
}
