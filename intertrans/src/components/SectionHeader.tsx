import Reveal from "./Reveal";

export default function SectionHeader({
  title,
  subtitle,
  dark = false,
  align = "center",
}: {
  title: string;
  subtitle?: string;
  dark?: boolean;
  align?: "center" | "left";
}) {
  const alignment = align === "center" ? "text-center" : "text-left";
  return (
    <Reveal className={`mb-14 ${alignment}`}>
      <div
        className={`mb-5 h-1 w-14 rounded bg-gradient-to-r from-orange to-orange-light ${
          align === "center" ? "mx-auto" : ""
        }`}
      />
      <h2
        className={`section-title ${dark ? "text-white" : "text-navy"}`}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={`mx-auto mt-4 max-w-2xl text-base ${
            align === "center" ? "" : "ml-0"
          } ${dark ? "text-white/60" : "text-slate-500"}`}
        >
          {subtitle}
        </p>
      )}
    </Reveal>
  );
}
