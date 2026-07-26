import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight, Clock, Calendar } from "lucide-react";
import { getGuide, getGuides } from "@/services/content";
import { Badge } from "@/components/ui/badge";
import { CTASection } from "@/components/shared/cta-section";
import { CloudinaryImage } from "@/components/shared/cloudinary-image";
import { formatDate } from "@/lib/utils";

export async function generateStaticParams() { return (await getGuides()).map((g) => ({ slug: g.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const g = await getGuide(slug);
  return { title: g?.title ?? "Guide", description: g?.excerpt };
}

export default async function GuideArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = await getGuide(slug);
  if (!g) notFound();
  const more = await (await getGuides()).filter((x) => x.id !== g.id).slice(0, 3);

  return (
    <article>
      <section className="relative h-[52vh] min-h-[380px]">
        <CloudinaryImage image={g.cover} alt={g.title} fill priority className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900/90 via-brand-900/40 to-brand-900/20" />
        <div className="container relative flex h-full flex-col justify-end pb-12 text-white">
          <nav className="mb-4 flex items-center gap-1 text-sm text-white/70">
            <Link href="/guides" className="hover:text-white">Guides</Link><ChevronRight size={14} /><span>{g.category}</span>
          </nav>
          <Badge className="w-fit bg-white/20 text-white backdrop-blur">{g.category}</Badge>
          <h1 className="h1 mt-3 max-w-3xl">{g.title}</h1>
          <div className="mt-4 flex items-center gap-3 text-sm text-white/85">
            <CloudinaryImage image={g.authorAvatar} alt={g.author} width={36} height={36} className="rounded-full ring-2 ring-white/30" />
            <span className="font-medium text-white">{g.author}</span>
            <span className="flex items-center gap-1"><Calendar size={13} /> {formatDate(g.date)}</span>
            <span className="flex items-center gap-1"><Clock size={13} /> {g.readMinutes} min read</span>
          </div>
        </div>
      </section>

      <div className="container max-w-3xl py-12">
        <p className="lead">{g.excerpt}</p>
        <div className="mt-6 space-y-5 text-[1.05rem] leading-relaxed text-foreground/90">
          {g.body.map((para, i) => <p key={i}>{para}</p>)}
        </div>
        <div className="mt-8 flex flex-wrap gap-2 border-t border-border pt-6">
          {g.tags.map((t) => <Badge key={t} variant="secondary">#{t}</Badge>)}
        </div>
      </div>

      <section className="section pt-0">
        <h2 className="h3 mb-6 text-brand-600">More guides</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {more.map((m) => (
            <Link key={m.id} href={`/guides/${m.slug}`} className="group overflow-hidden rounded-3xl border border-border/70 bg-white shadow-soft card-hover">
              <div className="relative h-40 overflow-hidden">
                <CloudinaryImage image={m.cover} alt={m.title} fill sizes="33vw" className="object-cover transition duration-600 group-hover:scale-[1.07]" />
              </div>
              <div className="p-5">
                <Badge variant="secondary">{m.category}</Badge>
                <h3 className="mt-2 font-display font-semibold text-brand-600 group-hover:text-secondary">{m.title}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="pb-10"><CTASection /></div>
    </article>
  );
}
