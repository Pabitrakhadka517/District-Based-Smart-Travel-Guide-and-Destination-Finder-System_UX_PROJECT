import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function EmptyState({ icon: Icon = Inbox, title, description, action }: {
  icon?: LucideIcon; title: string; description?: string;
  action?: { label: string; href: string } | { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white/50 px-6 py-16 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-secondary">
        <Icon size={28} />
      </div>
      <h3 className="mt-5 font-display text-lg font-semibold text-brand-600">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && ("href" in action ? (
        <Link href={action.href} className="mt-5"><Button variant="accent">{action.label}</Button></Link>
      ) : (
        <Button variant="accent" className="mt-5" onClick={action.onClick}>{action.label}</Button>
      ))}
    </div>
  );
}
