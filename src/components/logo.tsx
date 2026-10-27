import Image from "next/image";
import symbol from "../../public/brand/logo-symbol.png";

type Props = { className?: string; withWordmark?: boolean; tone?: "dark" | "light" };

/** Symbole du logo : deux mains qui portent le colis, l'avion qui s'envole (logo officiel Send By Me). */
export function LogoMark({ className = "h-10 w-10", priority = false }: { className?: string; priority?: boolean }) {
  return <Image src={symbol} alt="" className={`object-contain ${className}`} sizes="80px" priority={priority} />;
}

export function Logo({ className = "", withWordmark = true, tone = "dark" }: Props) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {tone === "light" ? (
        <span className="rounded-xl bg-[#FAF6EB] p-0.5">
          <LogoMark className="h-9 w-9" priority />
        </span>
      ) : (
        <LogoMark priority />
      )}
      {withWordmark && (
        <span className={`wide text-[19px] font-extrabold tracking-tight ${tone === "dark" ? "text-ink" : "text-white"}`}>Send By Me</span>
      )}
    </span>
  );
}
