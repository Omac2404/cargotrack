import type { Metadata } from "next";
import { Plus_Jakarta_Sans, DM_Sans } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-dmsans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Inter Trans MMS — Multi Modal Services",
    template: "%s | Inter Trans MMS",
  },
  description:
    "Inter Trans MMS — Uluslararası taşımacılık, gümrük müşavirliği ve lojistikte küresel çözüm ortağınız. Hava, deniz, kara yolu, depolama ve proje taşımacılığı.",
  keywords: [
    "uluslararası taşımacılık",
    "lojistik",
    "gümrük müşavirliği",
    "hava kargo",
    "deniz taşımacılığı",
    "kara yolu taşımacılığı",
    "multi modal services",
  ],
  icons: {
    icon: [
      { url: "/logo2.png", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${jakarta.variable} ${dmSans.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-white text-slate-700 antialiased">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
