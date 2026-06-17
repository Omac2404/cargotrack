import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Check, ArrowRight, ArrowLeft } from "lucide-react";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import CtaBand from "@/components/CtaBand";
import { services } from "@/lib/data";

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = services.find((s) => s.slug === slug);
  if (!service) return { title: "Hizmet bulunamadı" };
  return { title: service.title, description: service.excerpt };
}

export default async function ServiceDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = services.find((s) => s.slug === slug);
  if (!service) notFound();

  const others = services.filter((s) => s.slug !== slug);
  const Icon = service.icon;

  return (
    <>
      <PageHero
        title={service.title}
        subtitle={service.excerpt}
        crumbs={[{ href: "/hizmetler", label: "Hizmetler" }]}
        image={service.image}
      />

      <section className="section">
        <div className="container-x grid gap-12 lg:grid-cols-[1.6fr_1fr]">
          {/* Main */}
          <div>
            <Reveal>
              <span className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-pale text-blue">
                <Icon size={28} />
              </span>
              <p className="text-lg leading-relaxed text-slate-600">
                {service.description}
              </p>
            </Reveal>

            <Reveal className="mt-10">
              <h3 className="mb-5 text-xl font-bold text-navy">
                Kapsamımız
              </h3>
              <ul className="grid gap-3 sm:grid-cols-2">
                {service.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700"
                  >
                    <Check size={18} className="shrink-0 text-blue" />
                    {f}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal className="mt-10">
              <div className="grid gap-4 sm:grid-cols-3">
                {service.highlights.map((h) => (
                  <div
                    key={h.title}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-6"
                  >
                    <h4 className="mb-1.5 font-display text-base font-bold text-navy">
                      {h.title}
                    </h4>
                    <p className="text-sm text-slate-500">{h.text}</p>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal className="mt-10">
              <Link href="/iletisim" className="btn-primary">
                Bu hizmet için teklif al <ArrowRight size={18} />
              </Link>
            </Reveal>
          </div>

          {/* Sidebar */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[var(--shadow-card)]">
              <h3 className="mb-4 font-display text-base font-bold text-navy">
                Diğer Hizmetler
              </h3>
              <ul className="space-y-1">
                {others.map((o) => {
                  const OIcon = o.icon;
                  return (
                    <li key={o.slug}>
                      <Link
                        href={`/hizmetler/${o.slug}`}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-blue"
                      >
                        <OIcon size={18} className="text-blue" />
                        {o.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            <Link
              href="/hizmetler"
              className="mt-4 inline-flex items-center gap-2 px-3 text-sm font-semibold text-orange"
            >
              <ArrowLeft size={16} /> Tüm hizmetler
            </Link>
          </aside>
        </div>
      </section>

      <CtaBand title={`${service.title} için hemen teklif alın`} />
    </>
  );
}
