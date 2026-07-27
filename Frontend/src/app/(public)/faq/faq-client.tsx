"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronDown, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const groups = [
  {
    title: "Planning & visas",
    items: [
      { q: "Do I need a visa to visit Nepal?", a: "Most nationalities can get a visa on arrival at Kathmandu airport or land borders. Bring passport photos and the fee in USD. Always check the latest requirements for your country before travelling." },
      { q: "When is the best time to visit?", a: "Autumn (September–November) and spring (March–May) offer the clearest skies and best trekking conditions. Winter suits wildlife and lower treks; monsoon is ideal for rain-shadow regions like Upper Mustang." },
      { q: "How much should I budget per day?", a: "Budget travel runs around $25–40/day, mid-range $50–90, and comfortable/luxury $120+. Treks cost more once permits, guides and teahouses are included — see each destination's budget estimate." }
    ]
  },
  {
    title: "Trekking & permits",
    items: [
      { q: "Do I need a guide to trek?", a: "As of recent regulations, most trekking regions require a licensed guide. Restricted areas like Upper Mustang always require a registered guide and special permit." },
      { q: "What permits will I need?", a: "It varies by route — commonly a national park or conservation area permit (e.g. ACAP, Sagarmatha) plus a TIMS card. Restricted areas need additional permits. Each trek page lists exactly what's required." },
      { q: "How do I avoid altitude sickness?", a: "Ascend gradually, build in acclimatisation days, stay hydrated, and never increase sleeping altitude too fast. If symptoms worsen, descend. See our altitude sickness guide for details." }
    ]
  },
  {
    title: "Using NepaYatra",
    items: [
      { q: "Is NepaYatra free to use?", a: "Yes. Browsing destinations, reading guides, saving a wishlist and planning trips are all free." },
      { q: "Can I book hotels and transport here?", a: "The booking section is currently a preview that lets you explore options and pricing. Live booking integrations are on the roadmap." },
      { q: "How do I save destinations?", a: "Tap the heart icon on any destination card or guide page. Your wishlist is saved to your browser and synced to your dashboard." }
    ]
  }
];

function Item({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-border/70 bg-white shadow-soft">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-4 p-5 text-left">
        <span className="font-medium text-brand-600">{q}</span>
        <ChevronDown size={18} className={cn("shrink-0 text-muted-foreground transition", open && "rotate-180 text-accent")} />
      </button>
      {open && <p className="px-5 pb-5 text-sm text-muted-foreground">{a}</p>}
    </div>
  );
}

export function FaqClient() {
  return (
    <>
      <section className="mesh-light border-b border-border/70">
        <div className="container py-16 text-center">
          <span className="kicker justify-center">Help centre</span>
          <h1 className="h1 mt-3 text-brand-600">Frequently asked questions</h1>
          <p className="lead mx-auto mt-3 max-w-xl">Everything you need to know about planning a trip to Nepal.</p>
        </div>
      </section>

      <section className="section">
        <div className="mx-auto max-w-3xl space-y-10">
          {groups.map((g) => (
            <div key={g.title}>
              <h2 className="h3 mb-4 text-brand-600">{g.title}</h2>
              <div className="space-y-3">{g.items.map((it) => <Item key={it.q} {...it} />)}</div>
            </div>
          ))}

          <div className="flex flex-col items-center gap-3 rounded-3xl mesh-light border border-border/70 p-10 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-secondary"><LifeBuoy size={26} /></span>
            <h3 className="font-display text-xl font-semibold text-brand-600">Still have a question?</h3>
            <p className="text-sm text-muted-foreground">Our team is happy to help you plan.</p>
            <Link href="/contact"><Button variant="accent">Contact us</Button></Link>
          </div>
        </div>
      </section>
    </>
  );
}
