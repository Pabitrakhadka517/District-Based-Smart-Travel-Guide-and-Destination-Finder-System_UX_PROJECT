"use client";

import { useEffect, useState } from "react";
import { Marker } from "react-leaflet";
import L from "leaflet";

export interface WeatherPoint {
  id: string;
  lat: number;
  lng: number;
  label: string;
}

interface CurrentWeather {
  temperature: number;
  weathercode: number;
}

// Same World Meteorological Organization weather-code ranges the /weather
// page uses (see use-content.ts's wmoToCondition) — kept as emoji here since
// Leaflet divIcons render raw HTML, not React components.
function weatherEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code <= 48) return "☁️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌧️";
  if (code <= 86) return "❄️";
  return "🌧️";
}

function buildWeatherIcon(temp: number, code: number, label: string): L.DivIcon {
  const html = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:3px;pointer-events:none;">
      <div style="display:flex;align-items:center;gap:4px;background:rgba(255,255,255,0.95);border-radius:9999px;padding:4px 10px;box-shadow:0 3px 10px rgba(0,0,0,0.2);font-size:12px;font-weight:700;color:#1e3a5f;white-space:nowrap;">
        <span style="font-size:14px;line-height:1;">${weatherEmoji(code)}</span>${Math.round(temp)}°C
      </div>
      <span style="font-size:10px;font-weight:600;color:#1e3a5f;background:rgba(255,255,255,0.9);border-radius:6px;padding:1px 6px;white-space:nowrap;">${label}</span>
    </div>`;
  return L.divIcon({ html, className: "", iconSize: [90, 44], iconAnchor: [45, 22] });
}

/**
 * Floating current-conditions badges, one per point (province centers, in
 * practice) — toggled on demand from the Filters panel rather than fetched
 * unconditionally, since fetching weather for every single marker on the map
 * would be an unreasonable number of Open-Meteo calls.
 */
export function WeatherLayer({ points, visible }: { points: WeatherPoint[]; visible: boolean }) {
  const [weather, setWeather] = useState<Record<string, CurrentWeather>>({});

  useEffect(() => {
    if (!visible || points.length === 0) return;
    let cancelled = false;

    Promise.all(
      points.map(async (p) => {
        try {
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}&current_weather=true`
          );
          if (!res.ok) return null;
          const json = await res.json() as { current_weather?: { temperature: number; weathercode: number } };
          if (!json.current_weather) return null;
          return { id: p.id, temperature: json.current_weather.temperature, weathercode: json.current_weather.weathercode };
        } catch {
          return null;
        }
      })
    ).then((results) => {
      if (cancelled) return;
      const next: Record<string, CurrentWeather> = {};
      for (const r of results) {
        if (r) next[r.id] = { temperature: r.temperature, weathercode: r.weathercode };
      }
      setWeather(next);
    });

    return () => { cancelled = true; };
  }, [visible, points]);

  if (!visible) return null;

  return (
    <>
      {points.map((p) => {
        const w = weather[p.id];
        if (!w) return null;
        return (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            icon={buildWeatherIcon(w.temperature, w.weathercode, p.label)}
            interactive={false}
            zIndexOffset={-1000}
          />
        );
      })}
    </>
  );
}
