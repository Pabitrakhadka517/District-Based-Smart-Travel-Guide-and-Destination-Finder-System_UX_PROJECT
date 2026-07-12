import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2 font-display text-xl font-bold", className)}>
      <Image
        src={light ? "/logo-icon-light.png" : "/logo-icon.png"}
        alt=""
        width={36}
        height={36}
        className="h-9 w-9"
        priority
      />
      <span className={light ? "text-white" : "text-brand-600"}>
        Nepa<span className="text-accent">Yatra</span>
      </span>
    </Link>
  );
}
