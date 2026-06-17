import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import TrackingWidget from "@/components/TrackingWidget";
import Reveal from "@/components/Reveal";
import { PackageSearch, Bell, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Gönderi Takip",
  description:
    "Takip numaranız, BL veya CMR ile gönderinizin güncel durumunu anlık olarak sorgulayın.",
};

const features = [
  {
    icon: PackageSearch,
    title: "Anlık Durum",
    text: "Gönderinizin teslim alımından teslimata kadar her aşamasını görün.",
  },
  {
    icon: Bell,
    title: "Bilgilendirme",
    text: "Önemli durum değişikliklerinde otomatik bildirim (yakında).",
  },
  {
    icon: FileText,
    title: "Belge Erişimi",
    text: "BL, CMR ve fatura gibi belgelerinize portal üzerinden ulaşın (yakında).",
  },
];

export default function TakipPage() {
  return (
    <>
      <PageHero
        title="Gönderi Takip"
        subtitle="Takip No, BL veya CMR numaranızla gönderinizi sorgulayın."
      />

      <section className="section">
        <div className="container-x max-w-3xl">
          <Reveal>
            <TrackingWidget dark={false} />
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className="rounded-2xl border border-slate-200 bg-white p-6 text-center"
                  >
                    <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-pale text-blue">
                      <Icon size={22} />
                    </span>
                    <h3 className="mb-1.5 text-base font-bold text-navy">
                      {f.title}
                    </h3>
                    <p className="text-sm text-slate-500">{f.text}</p>
                  </div>
                );
              })}
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <p className="mt-10 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-700">
              Bu sayfa şu anda demo modundadır. Canlı gönderi takibi yakında
              CargoTrack entegrasyonu ile aktif olacaktır.
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
