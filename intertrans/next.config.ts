import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: out/ klasörüne saf HTML/CSS/JS üretir.
  // Cargotrack express'i bu çıktıyı /  altında servet edecek.
  output: "export",
  // /hakkimizda → /hakkimizda/index.html ile servet edilir, link uyumu için trailingSlash
  trailingSlash: true,
};

export default nextConfig;
