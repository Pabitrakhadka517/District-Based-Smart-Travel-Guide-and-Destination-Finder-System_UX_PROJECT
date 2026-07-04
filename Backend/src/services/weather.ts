type WmoCondition = "Sunny" | "Clear" | "Cloudy" | "Rain" | "Snow";
type VisitAdvice = "Go now" | "Good time" | "Off-season" | "Avoid";

export interface WeatherInsight {
  condition: WmoCondition;
  currentTemp: number;
  isIdealSeason: boolean;
  visitAdvice: VisitAdvice;
  message: string;
  bestMonths: string[];
}

function wmoCondition(code: number): WmoCondition {
  if (code === 0) return "Sunny";
  if (code <= 2) return "Clear";
  if (code <= 48) return "Cloudy";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Rain";
  if (code <= 86) return "Snow";
  return "Rain";
}

const SEASON_MONTHS: Record<string, number[]> = {
  Spring: [2, 3, 4],
  Summer: [5, 6, 7],
  Autumn: [8, 9, 10],
  Winter: [11, 0, 1],
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function currentSeason(): string {
  const m = new Date().getMonth();
  for (const [season, months] of Object.entries(SEASON_MONTHS)) {
    if (months.includes(m)) return season;
  }
  return "Spring";
}

function bestMonthsFromSeasons(seasons: string[]): string[] {
  const indices = new Set<number>();
  for (const s of seasons) {
    for (const m of SEASON_MONTHS[s] ?? []) indices.add(m);
  }
  return [...indices].sort((a, b) => a - b).map((i) => MONTH_NAMES[i]);
}

export async function getWeatherInsight(
  lat: number,
  lng: number,
  bestTimeToVisit: string[]
): Promise<WeatherInsight> {
  let condition: WmoCondition = "Clear";
  let currentTemp = 0;

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lng}` +
      `&current_weather=true&timezone=Asia%2FKathmandu`;
    const weatherRes = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (weatherRes.ok) {
      const weatherJson = (await weatherRes.json()) as {
        current_weather: { temperature: number; weathercode: number };
      };
      condition = wmoCondition(weatherJson.current_weather.weathercode);
      currentTemp = Math.round(weatherJson.current_weather.temperature);
    }
  } catch {
    // Weather API unavailable — still return season-based advice
  }

  const season = currentSeason();
  const isIdealSeason = bestTimeToVisit.includes(season);
  const isWet = condition === "Rain" || condition === "Snow";

  let visitAdvice: VisitAdvice;
  let message: string;

  if (isWet && !isIdealSeason) {
    visitAdvice = "Avoid";
    message = "Heavy rain or snow expected and this is off-peak season. Consider rescheduling.";
  } else if (isWet) {
    visitAdvice = "Good time";
    message = "Peak season despite current rain — trails are open but pack waterproofs.";
  } else if (isIdealSeason) {
    visitAdvice = "Go now";
    message = `${season} is one of the best times to visit. Clear skies and comfortable temperatures.`;
  } else if (condition === "Sunny" || condition === "Clear") {
    visitAdvice = "Good time";
    message = "Conditions are currently clear. Not peak season, but pleasant for exploration.";
  } else {
    visitAdvice = "Off-season";
    message = "Off-peak season with overcast skies. Expect fewer crowds and lower prices.";
  }

  const bestMonths = bestMonthsFromSeasons(bestTimeToVisit);

  return { condition, currentTemp, isIdealSeason, visitAdvice, message, bestMonths };
}
