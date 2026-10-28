import Image, { type StaticImageData } from "next/image";
import type { LucideIcon } from "lucide-react";

const ARC = "M14 70 Q160 -12 306 70";
const PLANE =
  "M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z";

/** Arc de vol en pointillés, avec un avion qui le parcourt en boucle. */
export function RouteArc({
  className = "",
  flying = true,
  tone = "light",
}: {
  className?: string;
  flying?: boolean;
  tone?: "light" | "dark";
}) {
  const line =
    tone === "light" ? "rgb(255 255 255 / 0.55)" : "rgb(14 48 76 / 0.3)";
  return (
    <svg viewBox="0 0 320 84" className={className} aria-hidden="true">
      <path
        d={ARC}
        fill="none"
        stroke={line}
        strokeWidth="2"
        strokeLinecap="round"
        className="route-dash"
      />
      <circle cx="14" cy="70" r="5" fill="var(--color-signal)" />
      <circle cx="306" cy="70" r="5" fill="var(--color-signal)" />
      {flying && (
        <g className="motion-only">
          <g>
            <animateMotion
              dur="4.2s"
              repeatCount="indefinite"
              rotate="auto"
              path={ARC}
              keyPoints="0;1"
              keyTimes="0;1"
              calcMode="spline"
              keySplines="0.45 0 0.55 1"
            />
            <g transform="rotate(45) translate(-12 -12)">
              <path
                d={PLANE}
                fill={tone === "light" ? "#fff" : "var(--color-ink)"}
                stroke={tone === "light" ? "#fff" : "var(--color-ink)"}
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </g>
          </g>
        </g>
      )}
    </svg>
  );
}

/** Bandeau photo des pages de publication. */
export function JourneyHero({
  image,
  alt,
  eyebrow,
  title,
  text,
  points,
  position = "50% 40%",
}: {
  image: StaticImageData;
  alt: string;
  eyebrow: string;
  title: string;
  text: string;
  points: [LucideIcon, string][];
  position?: string;
}) {
  return (
    <section className="relative isolate overflow-hidden rounded-[28px] bg-night text-white">
      <Image quality={90}
        src={image}
        alt={alt}
        fill
        priority
        placeholder="blur"
        sizes="(min-width: 1152px) 1152px, 100vw"
        className="ken-burns -z-10 object-cover"
        style={{ objectPosition: position }}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-night via-night/85 to-night/25 max-md:bg-gradient-to-t max-md:via-night/80" />
      <RouteArc className="float-y absolute top-8 right-6 hidden w-72 md:block lg:right-16 lg:w-96" />
      <div className="max-w-xl px-6 pt-28 pb-8 sm:px-10 md:py-14">
        <p className="reveal text-sm font-bold tracking-wide text-signal uppercase">
          {eyebrow}
        </p>
        <h1 className="display reveal reveal-delay-1 mt-2 text-4xl sm:text-5xl">
          {title}
        </h1>
        <p className="reveal reveal-delay-2 mt-4 text-lg leading-relaxed text-white/80">
          {text}
        </p>
        <ul className="mt-6 flex flex-wrap gap-2">
          {points.map(([Icon, label], i) => (
            <li
              key={label}
              className={`reveal flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-semibold backdrop-blur-sm ring-1 ring-white/15 reveal-delay-${i + 3}`}
            >
              <Icon className="h-4 w-4 text-signal" aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const CONFETTI = [
  ["-90px", "70px", "0s", "bg-signal"],
  ["-40px", "90px", "0.1s", "bg-card"],
  ["30px", "80px", "0.05s", "bg-brand-fill"],
  ["80px", "60px", "0.15s", "bg-signal"],
  ["120px", "95px", "0.2s", "bg-card"],
  ["-130px", "100px", "0.25s", "bg-brand-fill"],
];

/** Message de réussite après une publication : l'avion décolle. */
export function TakeoffBanner({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      role="status"
      className="pop-in relative mb-6 overflow-hidden rounded-3xl bg-night px-6 py-6 text-white sm:px-8"
    >
      <div
        className="pointer-events-none absolute top-10 left-24"
        aria-hidden="true"
      >
        {CONFETTI.map(([x, y, d, c], i) => (
          <span
            key={i}
            className={`confetti absolute h-2.5 w-1.5 rounded-sm ${c}`}
            style={{ "--x": x, "--y": y, "--d": d } as React.CSSProperties}
          />
        ))}
      </div>
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
        <RouteArc className="w-40 shrink-0" />
        <div className="min-w-0">
          <p className="display text-2xl text-signal">{title}</p>
          <p className="mt-1 text-white/80">{text}</p>
          {children}
        </div>
      </div>
    </section>
  );
}
