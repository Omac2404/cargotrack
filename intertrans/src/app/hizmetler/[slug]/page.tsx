import { services } from "@/lib/data";
import ServiceDetailClient from "./ServiceDetailClient";

// Static export: tüm slug'ları pre-render et (server tarafı)
export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ServiceDetailClient slug={slug} />;
}
