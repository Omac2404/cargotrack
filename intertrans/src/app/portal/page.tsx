import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import PortalTabs from "@/components/PortalTabs";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Müşteri Portalı",
  description:
    "Inter Trans MMS müşteri portalı — belgelerinize, gönderi takibinize ve işlemlerinize tek noktadan erişin.",
};

export default function PortalPage() {
  return (
    <>
      <PageHero
        title="Müşteri Portalı"
        subtitle="Belgeleriniz, gönderi takibiniz ve işlemleriniz tek noktada."
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
