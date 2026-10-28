import type { ReactNode } from "react";
import { PageShell } from "@/components/page-shell";
import { getLocale, getT } from "@/i18n/server";

/** frenchOnly : texte juridique non traduit, une note le signale aux visiteurs anglophones. */
export async function ProsePage({ title, intro, frenchOnly, children }: { title: string; intro?: string; frenchOnly?: boolean; children: ReactNode }) {
  const t = await getT();
  const notice = frenchOnly && (await getLocale()) === "en";
  return (
    <PageShell>
      <article lang={notice ? "fr" : undefined} className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16">
        <h1 className="display text-4xl sm:text-5xl">{title}</h1>
        {notice && (
          <p lang="en" className="mt-5 rounded-xl bg-brand-pale px-4 py-3 text-sm text-ink">
            {t("Ce document n'existe qu'en français, qui est la version de référence.")}
          </p>
        )}
        {intro && <p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-muted">{intro}</p>}
        <div className="mt-10 space-y-8 text-[16px] leading-relaxed text-ink-soft [&_h2]:wide [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-2">
          {children}
        </div>
      </article>
    </PageShell>
  );
}
