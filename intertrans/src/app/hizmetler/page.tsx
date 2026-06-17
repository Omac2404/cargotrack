import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import SectionHeader from "@/components/SectionHeader";
import ServiceCard from "@/components/ServiceCard";
import Reveal from "@/components/Reveal";
import CtaBand from "@/components/CtaBand";
import { services } from "@/lib/data";

export const metadata: Metadata = {
  title: "Hizmetlerimiz",
  description:
    "Hava kargo, deniz ve kara yolu taşımacılığı, gümrük müşavirliği, lojistik & depolama ve proje taşımacılığı — Inter Trans MMS hizmetleri.",
};

export default function HizmetlerPage() {
  return (
    <>
      <PageHero
        title="Hizmetlerimiz"
        subtitle="Taşımacılık, gümrük ve lojistikte uçtan uca entegre çözümler."
      />
      <section className="section bg-slate-50">
        <div className="container-x">
          <SectionHeader
            title="Uçtan Uca Lojistik Çözümleri"
            subtitle="İhtiyacınıza en uygun taşıma modunu ve operasyon planını birlikte belirliyoruz."
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s, i) => (
              <Reveal key={s.slug} delay={(i % 3) * 0.08}>
                <ServiceCard service={s} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <CtaBand />
    </>
  );
}
