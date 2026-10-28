import { STATUS_LABEL, type BookingStatus } from "@/lib/types";

const tone: Record<BookingStatus, string> = {
  pending: "bg-warn-pale text-warn",
  accepted: "bg-brand-pale text-brand-deep",
  paid: "bg-brand-pale text-brand-deep",
  picked_up: "bg-signal/25 text-ink",
  delivered: "bg-ok-pale text-ok",
  declined: "bg-paper text-muted",
  cancelled: "bg-paper text-muted",
  refunded: "bg-paper text-muted",
};

export function StatusBadge({ status, label }: { status: BookingStatus; label?: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone[status]}`}>{label ?? STATUS_LABEL[status]}</span>;
}
