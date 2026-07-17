"use client";
import { useState } from "react";
import { Mail, Phone, MapPin, Clock, CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { submitContact } from "@/services/contactService";

const info = [
  { icon: Mail, label: "Email", value: "hello@nepayatra.com" },
  { icon: Phone, label: "Phone", value: "+977 1 4000 000" },
  { icon: MapPin, label: "Office", value: "Thamel, Kathmandu, Nepal" },
  { icon: Clock, label: "Hours", value: "Sun–Fri, 9am–6pm (NPT)" }
];

export function ContactClient() {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (message.trim().length < 10) {
      setError("Message must be at least 10 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await submitContact({ name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim() });
      setSent(true);
      setName(""); setEmail(""); setSubject(""); setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send your message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <section className="mesh-light border-b border-border/70">
        <div className="container py-16">
          <span className="kicker">Get in touch</span>
          <h1 className="h1 mt-3 text-brand-600">We&apos;d love to help you plan</h1>
          <p className="lead mt-3 max-w-2xl">Questions about a destination, a trek or your itinerary? Send us a message.</p>
        </div>
      </section>

      <section className="section">
        <div className="grid gap-10 lg:grid-cols-5">
          {/* info */}
          <div className="space-y-4 lg:col-span-2">
            {info.map((i) => (
              <div key={i.label} className="flex items-start gap-4 rounded-2xl border border-border/70 bg-white p-5 shadow-soft">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-secondary"><i.icon size={20} /></span>
                <div><p className="text-xs uppercase tracking-wide text-muted-foreground">{i.label}</p><p className="font-medium text-brand-600">{i.value}</p></div>
              </div>
            ))}
          </div>

          {/* form */}
          <div className="lg:col-span-3">
            {sent ? (
              <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-success/30 bg-success/5 p-12 text-center">
                <CheckCircle2 className="text-success" size={56} />
                <h2 className="mt-4 font-display text-xl font-semibold text-brand-600">Message sent!</h2>
                <p className="mt-1 text-sm text-muted-foreground">Thanks for reaching out — we&apos;ll reply within one business day.</p>
                <Button variant="outline" className="mt-6" onClick={() => setSent(false)}>Send another</Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-border/70 bg-white p-7 shadow-soft">
                {error && <Alert variant="error">{error}</Alert>}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label>Name</Label><Input required placeholder="Your name" className="mt-1" value={name} onChange={(e) => setName(e.target.value)} /></div>
                  <div><Label>Email</Label><Input type="email" required placeholder="you@email.com" className="mt-1" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                </div>
                <div><Label>Subject</Label><Input required placeholder="How can we help?" className="mt-1" value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
                <div><Label>Message</Label><Textarea required placeholder="Tell us about your trip..." className="mt-1 min-h-[140px]" value={message} onChange={(e) => setMessage(e.target.value)} /></div>
                <Button type="submit" variant="accent" size="lg" disabled={submitting}>
                  <Send size={16} /> {submitting ? "Sending…" : "Send message"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
