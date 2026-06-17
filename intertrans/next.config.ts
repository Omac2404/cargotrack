import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: out/ klasörüne saf HTML/CSS/JS üretir.
  // Cargotrack express'i bu çıktıyı /  altında servet edecek.
  output: "export",
  // /hakkimizda → /hakkimizda/index.html ile servet edilir, link uyumu için trailingSlash
  trailingSlash: true,
  // Static export'ta runtime image optimization API yok → next/image kaynakları olduğu gibi servet edilir.
  // Bu olmadan <Image> bileşeni /_next/image?url=... formatında URL üretir ve 404 verir.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
