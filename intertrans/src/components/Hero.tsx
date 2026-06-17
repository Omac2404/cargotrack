"use client";

import { motion } from "framer-motion";
import { Plane, Ship, Truck } from "lucide-react";
import { useTranslation } from "react-i18next";
import TrackingWidget from "./TrackingWidget";

export default function Hero() {
  const { t } = useTranslation();

  const floatCards = [
    {
      icon: Plane,
      titleKey: "home.floating.air_title",
      textKey: "home.floating.air_text",
      color: "#1E88E5",
      bg: "rgba(21,101,192,.2)",
      pos: "left-0 top-[6%]",
    },
    {
      icon: Ship,
      titleKey: "home.floating.sea_title",
      textKey: "home.floating.sea_text",
      color: "#00897B",
      bg: "rgba(0,121,107,.2)",
      pos: "right-0 top-[36%]",
    },
    {
      icon: Truck,
      titleKey: "home.floating.road_title",
      textKey: "home.floating.road_text",
      color: "#FF6D00",
      bg: "rgba(230,81,0,.2)",
      pos: "bottom-[6%] left-[8%]",
    },
  ];

  return (
    <section
      className="relative flex min-h-screen items-center overflow-hidden bg-cover bg-center pt-24"
      style={{
        backgroundImage:
          "linear-gradient(165deg, rgba(6,26,51,.85), rgba(11,37,69,.78) 40%, rgba(13,59,110,.74)), url('https://images.pexels.com/photos/906494/pexels-photo-906494.jpeg?auto=compress&cs=tinysrgb&w=1600')",
      }}
    >
      <div className="pointer-events-none absolute -right-24 -top-24 h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(21,101,192,.25),transparent_70%)]" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(230,81,0,.15),transparent_70%)]" />

      <div className="container-x relative z-10 grid items-center gap-14 py-16 lg:grid-cols-2">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange" />
            <span className="text-xs font-semibold uppercase tracking-wider text-orange-light">
              {t("home.hero_badge")}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl font-extrabold leading-[1.15] text-white md:text-5xl"
          >
            {t("home.hero_title_a")}{" "}
            <em className="not-italic text-orange-light">
              {t("home.hero_title_b")}
            </em>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-5 max-w-xl text-lg leading-relaxed text-white/70"
          >
            {t("home.hero_subtitle")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 max-w-xl"
          >
            <TrackingWidget dark />
          </motion.div>
        </div>

        {/* Floating cards */}
        <div className="relative hidden aspect-square w-full max-w-[460px] justify-self-center lg:block">
          {floatCards.map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={c.titleKey}
                className={`absolute flex items-center gap-3.5 rounded-2xl border border-white/12 bg-white/10 p-5 backdrop-blur-md ${c.pos}`}
                animate={{ y: [0, -12, 0] }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 1.6,
                }}
              >
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ background: c.bg, color: c.color }}
                >
                  <Icon size={24} />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-white">{t(c.titleKey)}</h4>
                  <p className="text-xs text-white/60">{t(c.textKey)}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
