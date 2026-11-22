import { AlertTriangle, CheckCircle2, Clock, MinusCircle, XCircle } from "lucide-react";

import { RECEIPT_LABEL, STATUS_LABEL, type MembershipStatus, type Receipt } from "@/lib/billing/types";
import { cn } from "@/lib/utils";

// Semantic states keep their own colours (never brand colours) and always an icon + label.
const MEMBERSHIP = {
  active: { icon: CheckCircle2, tone: "text-[var(--success)]" },
  overdue: { icon: AlertTriangle, tone: "text-[var(--warning)]" },
  suspended: { icon: XCircle, tone: "text-[var(--danger)]" },
  none: { icon: MinusCircle, tone: "text-muted" },
} as const;

const RECEIPT = {
  pending: { icon: Clock, tone: "text-[var(--warning)]" },
  approved: { icon: CheckCircle2, tone: "text-[var(--success)]" },
  rejected: { icon: XCircle, tone: "text-[var(--danger)]" },
} as const;

export function StatusBadge({ status, className }: { status: MembershipStatus; className?: string }) {
  const { icon: Icon, tone } = MEMBERSHIP[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-semibold", tone, className)}>
      <Icon size={16} aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function ReceiptBadge({ status }: { status: Receipt["status"] }) {
  const { icon: Icon, tone } = RECEIPT[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm font-semibold", tone)}>
      <Icon size={15} aria-hidden="true" />
      {RECEIPT_LABEL[status]}
    </span>
  );
}
