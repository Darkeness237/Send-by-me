/**
 * Écran affiché dès le clic, pendant que le serveur prépare la page : le membre voit
 * tout de suite que sa demande est prise en compte, même quand la réponse met du temps.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl animate-pulse px-4 py-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Chargement…</span>
      <div className="h-8 w-2/3 max-w-sm rounded-full bg-line" />
      <div className="mt-3 h-4 w-1/2 max-w-xs rounded-full bg-line/70" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-3xl bg-card ring-1 ring-line" />
        ))}
      </div>
    </div>
  );
}
