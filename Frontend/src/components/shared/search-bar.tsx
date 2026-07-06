"use client";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

export function SearchBar({
  large = false,
  className,
  placeholder = "Search districts, cities, destinations...",
}: {
  large?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const router  = useRouter();
  const inputId = useId();
  const [q, setQ] = useState("");

  return (
    <form
      role="search"
      aria-label="Search NepalYatra"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/search?q=${encodeURIComponent(q)}`);
      }}
      className={cn(
        "flex items-center gap-2 rounded-2xl border border-border bg-white shadow-soft",
        large ? "p-2 pl-5" : "px-4 h-11",
        className
      )}
    >
      <Search className="shrink-0 text-muted-foreground" size={large ? 22 : 18} aria-hidden="true" />
      {/* sr-only label provides accessible name; placeholder is supplemental */}
      <label htmlFor={inputId} className="sr-only">
        Search destinations, districts and cities
      </label>
      <input
        id={inputId}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
      {large && (
        <button
          type="submit"
          aria-label="Submit search"
          className="rounded-xl bg-accent px-6 py-3 text-sm font-medium text-white transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Explore
        </button>
      )}
    </form>
  );
}
