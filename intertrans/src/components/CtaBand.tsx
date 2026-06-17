import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CtaBand({
  title = "Yükünüz için en uygun çözümü birlikte planlayalım",
  text = "Uzman ekibimiz ihtiyacınıza özel teklif ve operasyon planını en kısa sürede hazırlar.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-navy-deep to-navy">
      <div className="container-x py-16 text-center md:py-20">
        <h2 className="mx-auto max-w-3xl text-2xl font-extrabold text-white md:text-3xl">
          {title}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-white/60">{text}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/iletisim" className="btn-primary">
            Teklif Al <ArrowRight size={18} />
          </Link>
          <Link
            href="/hizmetler"
            className="btn border border-white/20 bg-white/5 text-white hover:bg-white/10"
          >
            Hizmetleri İncele
          </Link>
        </div>
      </div>
    </section>
  );
}
