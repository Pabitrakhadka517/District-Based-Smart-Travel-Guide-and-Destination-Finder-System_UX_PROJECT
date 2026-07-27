import Link from "next/link";
import { Logo } from "./logo";
import { PrayerFlags } from "./prayer-flags";
import { MountainDivider } from "./mountain-divider";
import { Facebook, Instagram, Twitter, Youtube, Mail, MapPin } from "lucide-react";
import { BACKGROUND } from "@/lib/theme-colors";

const cols = [
  { title: "Explore", links: [["Districts", "/districts"], ["Attractions", "/search"], ["Trekking routes", "/treks"], ["Map explorer", "/map"]] },
  { title: "Plan",    links: [["Trip planner", "/planner"], ["Weather & seasons", "/weather"], ["Booking", "/booking"], ["Wishlist", "/wishlist"]] },
  { title: "Discover", links: [["Travel guides", "/guides"], ["Festivals & culture", "/festivals"], ["About Nepal", "/about"], ["Reviews", "/reviews"]] },
  { title: "Support", links: [["FAQ", "/faq"], ["Contact", "/contact"], ["Dashboard", "/dashboard"], ["Admin", "/admin"]] },
];

const socials = [
  { Icon: Facebook,  label: "Follow NepaYatra on Facebook",  href: "#" },
  { Icon: Instagram, label: "Follow NepaYatra on Instagram", href: "#" },
  { Icon: Twitter,   label: "Follow NepaYatra on Twitter",   href: "#" },
  { Icon: Youtube,   label: "Watch NepaYatra on YouTube",    href: "#" },
];

export function Footer() {
  return (
    <footer className="relative mt-24 mesh-brand text-slate-200">
      <MountainDivider fill={BACKGROUND} className="absolute -top-px left-0" />
      <div className="container grid gap-12 pt-28 pb-14 md:grid-cols-6">

        {/* Brand column */}
        <div className="md:col-span-2">
          <Logo light />
          <p className="mt-4 max-w-xs text-sm text-slate-200">
            Your smart guide to Nepal — explore districts, discover destinations and plan unforgettable journeys across the Himalayas.
          </p>
          <PrayerFlags className="mt-6 max-w-[220px] text-white/30" aria-hidden="true" />

          {/* Social links */}
          <div className="mt-6 flex gap-3">
            {socials.map(({ Icon, label, href }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-white transition-all duration-200 hover:scale-110 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-600"
              >
                <Icon size={16} aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>

        {/* Link columns — each wrapped in a nav landmark */}
        {cols.map((c) => (
          <nav key={c.title} aria-label={`${c.title} links`}>
            <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wide text-white">{c.title}</h2>
            <ul className="space-y-2.5 text-sm">
              {c.links.map(([label, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="link-underline text-white transition-colors duration-200 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-brand-600 rounded"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="container flex flex-col items-center justify-between gap-3 py-6 text-xs text-slate-300 md:flex-row">
          <p>© {new Date().getFullYear()} NepaYatra. Crafted for the Himalayas.</p>
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5"><MapPin size={13} aria-hidden="true" /> Kathmandu, Nepal</span>
            <a href="mailto:hello@nepayatra.com" className="flex items-center gap-1.5 text-white transition-colors duration-200 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded">
              <Mail size={13} aria-hidden="true" /> hello@nepayatra.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
