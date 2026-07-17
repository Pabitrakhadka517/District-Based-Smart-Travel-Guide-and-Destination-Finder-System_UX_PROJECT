"use client";
import { AlertTriangle, Star, Snowflake, Sun, CloudOff } from "lucide-react";
import { SectionHeader } from "@/components/shared/section-header";
import { WeatherCard } from "@/components/cards/weather-card";
import { Reveal } from "@/components/shared/reveal";
import { EmptyState } from "@/components/shared/empty-state";
import { useWeather, useTravelAlerts } from "@/hooks/use-content";

// Kathmandu Valley coordinates
const KTM_LAT = 27.7172;
const KTM_LNG = 85.324;

const seasons = [
  { name: "Spring (Mar–May)", best: "Trekking, rhododendrons, clear mountain views" },
  { name: "Summer / Monsoon (Jun–Aug)", best: "Upper Mustang, lush valleys, fewer crowds" },
  { name: "Autumn (Sep–Nov)", best: "Peak trekking season, festivals, crystal skies" },
  { name: "Winter (Dec–Feb)", best: "Wildlife safaris, lower-altitude treks, culture" }
];

const trekkingSeasons = [
  { name: "Autumn (Sep–Nov)", note: "Peak season — clear skies, stable weather, ideal for all treks.", rating: 5 },
  { name: "Spring (Mar–May)", note: "Second-best — warm, rhododendrons in bloom, great visibility.", rating: 5 },
  { name: "Winter (Dec–Feb)", note: "Cold but clear; lower treks only, high passes may close.", rating: 3 },
  { name: "Monsoon (Jun–Aug)", note: "Rain in most regions; ideal only for rain-shadow Mustang & Dolpo.", rating: 2 }
];

export default function WeatherPage() {
  const { data: forecast, isLoading: forecastLoading, isError: forecastError, refetch: refetchForecast } = useWeather(KTM_LAT, KTM_LNG);
  const { data: alerts = [], isLoading: alertsLoading, isError: alertsError } = useTravelAlerts();

  return (
    <section className="container py-10">
      <h1 className="h2 text-brand-600">Weather & seasonal guide</h1>
      <p className="lead mt-2 max-w-2xl">Plan around Nepal&apos;s seasons — when to trek, when to safari and what to expect.</p>

      <div className="mt-8">
        <SectionHeader title="7-day forecast" subtitle="Kathmandu Valley — live data." />
        {forecastError ? (
          <EmptyState
            icon={CloudOff}
            title="Couldn't load the forecast"
            description="We weren't able to reach the weather service. Please try again."
            action={{ label: "Retry", onClick: () => refetchForecast() }}
          />
        ) : forecast ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {forecast.map((w, i) => <Reveal key={w.day + i} delay={i * 0.04}><WeatherCard day={w} /></Reveal>)}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{forecastLoading ? "Loading weather data…" : "No forecast data available."}</p>
        )}
      </div>

      <div className="mt-14">
        <SectionHeader title="Trekking seasons" subtitle="The best windows for hitting the trail." />
        <div className="grid gap-4 md:grid-cols-2">
          {trekkingSeasons.map((s) => (
            <div key={s.name} className="rounded-2xl border border-border bg-white p-6 shadow-soft">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-brand-600">{s.name}</h3>
                <span className="flex">{Array.from({ length: 5 }).map((_, j) => <Star key={j} size={13} className={j < s.rating ? "fill-accent text-accent" : "fill-muted text-muted"} />)}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{s.note}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-14">
        <SectionHeader title="Seasonal recommendations" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {seasons.map((s) => (
            <div key={s.name} className="rounded-2xl bg-brand-50 p-6">
              {s.name.startsWith("Winter") ? <Snowflake className="text-secondary" /> : <Sun className="text-accent" />}
              <h3 className="mt-3 font-display font-semibold text-brand-600">{s.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.best}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-14">
        <SectionHeader title="Travel alerts" />
        {alertsError ? (
          <p className="text-sm text-muted-foreground">Couldn&apos;t load travel alerts right now.</p>
        ) : alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {alertsLoading ? "Loading travel alerts…" : "No active travel alerts — conditions look normal across Nepal."}
          </p>
        ) : (
          <div className="space-y-3">
            {alerts.map((a) => (
              <div key={a.id} className="flex items-start gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-5">
                <AlertTriangle className="mt-0.5 shrink-0 text-accent" size={20} />
                <p className="text-sm text-foreground"><span className="font-semibold">{a.level}:</span> {a.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
