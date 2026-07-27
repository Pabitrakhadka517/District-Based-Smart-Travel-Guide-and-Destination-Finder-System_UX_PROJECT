import { Mountain } from "lucide-react";

export default function Loading() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="flex flex-col items-center gap-3">
        <div className="grid h-14 w-14 animate-pulse place-items-center rounded-2xl bg-brand-50 text-secondary"><Mountain size={26} /></div>
        <p className="text-sm text-muted-foreground">Loading NepaYatra…</p>
      </div>
    </div>
  );
}
