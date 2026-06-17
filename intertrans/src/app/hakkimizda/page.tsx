import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import SectionHeader from "@/components/SectionHeader";
import Reveal from "@/components/Reveal";
import CtaBand from "@/components/CtaBand";
import { whyUs, stats } from "@/lib/data";
import { Target, Eye, HeartHandshake } from "lucide-react";

export const metadata: Metadata = {
  title: "Hakkımızda",
  description:
    "Inter Trans MMS — 30 yılı aşkın tecrübesiyle uluslararası taşımacılık, gümrük ve lojistikte güvenilir çözüm ortağı.",
};

const values = [
  {
    icon: Target,
    title: "Misyonumuz",
    text: "Müşterilerimizin tedarik zincirini en verimli, şeffaf ve güvenilir şekilde yöneterek küresel ticarette rekabet avantajı sağlamak.",
  },
  {
    icon: Eye,
    title: "Vizyonumuz",
    text: "Çok modlu taşımacılıkta teknolojiyi ve insan uzmanlığını birleştiren, bölgenin referans lojistik markası olmak.",
  },
  {
    icon: HeartHandshake,
    title: "Değerlerimiz",
    text: "Güven, şeffaflık, zamanında teslim ve müşteri odaklılık tüm operasyonlarımızın temelini oluşturur.",
  },
];

export default function HakkimizdaPage() {
  return (
    <>
      <PageHero
        title="Hakkımızda"
        subtitle="Uluslararası ticaretin her adımında, 30 yılı aşkın tecrübeyle yanınızdayız."
      />

      {/* Story */}
      <section className="section">
        <div className="container-x grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <div
              className="aspect-[4/3] w-full rounded-2xl bg-cover bg-center shadow-[var(--shadow-card-lg)]"
              style={{
                backgroundImage:
                  "url('https://images.pexels.com/photos/667492/pexels-photo-667492.jpeg?auto=compress&cs=tinysrgb&w=1200')",
              }}
            />
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mb-5 h-1 w-14 rounded bg-gradient-to-r from-orange to-orange-light" />
            <h2 className="section-title">Küresel Çözüm Ortağınız</h2>
            <p className="mt-5 text-slate-600">
              Inter Trans MMS (Multi Modal Services), uluslararası ve yurt içi
              taşımacılık, gümrük müşavirliği ve lojistik alanında uçtan uca
              hizmet sunan bir çözüm ortağıdır. Hava, deniz ve kara yolu
              taşımacılığını tek çatı altında birleştirerek yükünüzü güvenle
              hedefine ulaştırıyoruz.
            </p>
            <p className="mt-4 text-slate-600">
              Güçlü uluslararası partner ağımız, deneyimli ekibimiz ve
              teknolojiye dayalı süreç yönetimimizle her gönderide şeffaflık ve
              izlenebilirlik sağlıyoruz. Karmaşık proje taşımalarından günlük
              parsiyel sevkiyatlara kadar her ölçekte yanınızdayız.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-navy py-14">
        <div className="container-x grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08} className="text-center">
              <div className="font-display text-4xl font-extrabold text-white">
                {s.value}
              </div>
              <div className="mt-1 text-sm text-white/60">{s.label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="section bg-slate-50">
        <div className="container-x">
          <SectionHeader
            title="Misyon, Vizyon & Değerler"
            subtitle="İş yapış biçimimizi şekillendiren temel ilkeler."
          />
          <div className="grid gap-6 md:grid-cols-3">
            {values.map((v, i) => {
              const Icon = v.icon;
              return (
                <Reveal key={v.title} delay={i * 0.08}>
                  <div className="h-full rounded-2xl border border-slate-200 bg-white p-8">
                    <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange to-orange-light text-white">
                      <Icon size={24} />
                    </span>
                    <h3 className="mb-2 text-lg font-bold text-navy">
                      {v.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-500">
                      {v.text}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="section">
        <div className="container-x">
          <SectionHeader
            title="Neden Inter Trans MMS?"
            subtitle="Bizi tercih eden firmaların güvendiği başlıca avantajlar."
          />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {whyUs.map((w, i) => {
              const Icon = w.icon;
              return (
                <Reveal key={w.title} delay={(i % 5) * 0.08}>
                  <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 text-center transition hover:-translate-y-1 hover:shadow-[var(--shadow-card)]">
                    <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-pale text-blue">
                      <Icon size={22} />
                    </span>
                    <h4 className="mb-1.5 text-sm font-bold text-navy">
                      {w.title}
                    </h4>
                    <p className="text-xs leading-relaxed text-slate-500">
                      {w.text}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
