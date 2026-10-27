import { timeLabel } from "@/lib/format";

type Message = { id: number; author_id: string; body: string; created_at: string };

/** Fil de messages d'une discussion (réservation ou question avant réservation). */
export function ChatMessages({ messages, myId, empty }: { messages: Message[]; myId: string; empty: string }) {
  return (
    <ol className="flex-1 space-y-3 overflow-y-auto p-5" aria-label="Messages">
      {messages.length === 0 && <li className="text-center text-sm text-muted">{empty}</li>}
      {messages.map((m) => {
        const mine = m.author_id === myId;
        return (
          <li key={m.id} className={`flex ${mine ? "justify-end" : ""}`}>
            <p className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] whitespace-pre-line ${mine ? "bg-brand text-white" : "bg-paper"}`}>
              {m.body}
              <span className={`mt-1 block text-[11px] ${mine ? "text-white/70" : "text-muted"}`}>{timeLabel(m.created_at)}</span>
            </p>
          </li>
        );
      })}
    </ol>
  );
}
