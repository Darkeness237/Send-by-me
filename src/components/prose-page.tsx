import type { ReactNode } from "react";
import { PageShell } from "@/components/page-shell";

export function ProsePage({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <PageShell>
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16">
        <h1 className="display text-4xl sm:text-5xl">{title}</h1>
        {intro && <p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-muted">{intro}</p>}
        <div className="mt-10 space-y-8 text-[16px] leading-relaxed text-ink-soft [&_h2]:wide [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-2">
          {children}
        </div>
      </article>
    </PageShell>
  );
}
