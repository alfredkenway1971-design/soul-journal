// Captures weather + location + time-of-day for new journal entries.
// Uses free public APIs only: Open-Meteo (weather) and Nominatim/OSM (reverse geocoding).
// All capture is opt-in via profiles.capture_context.

export interface WeatherData {
  temperature_c: number | null;
  condition: string;
  icon: string;
}

export interface LocationData {
  city: string | null;
  country: string | null;
  lat: number;
  lon: number;
}

export interface CapturedContext {
  weather: WeatherData | null;
  location: LocationData | null;
  time_of_day: "morning" | "afternoon" | "evening" | "night";
}

export const getTimeOfDay = (date = new Date()): CapturedContext["time_of_day"] => {
  const h = date.getHours();
  if (h < 5) return "night";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 21) return "evening";
  return "night";
};

const getCoords = (): Promise<GeolocationPosition> =>
  new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 7000,
      maximumAge: 1000 * 60 * 30, // 30 min cache
    });
  });

// Open-Meteo WMO weather code → friendly label + emoji
const wmoToCondition = (code: number): { condition: string; icon: string } => {
  if (code === 0) return { condition: "Clear", icon: "☀️" };
  if ([1, 2].includes(code)) return { condition: "Mostly clear", icon: "🌤️" };
  if (code === 3) return { condition: "Cloudy", icon: "☁️" };
  if ([45, 48].includes(code)) return { condition: "Foggy", icon: "🌫️" };
  if ([51, 53, 55, 56, 57].includes(code)) return { condition: "Drizzle", icon: "🌦️" };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { condition: "Rainy", icon: "🌧️" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { condition: "Snowy", icon: "❄️" };
  if ([95, 96, 99].includes(code)) return { condition: "Thunderstorm", icon: "⛈️" };
  return { condition: "Unknown", icon: "🌡️" };
};

const fetchWeather = async (lat: number, lon: number): Promise<WeatherData | null> => {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`
    );
    if (!res.ok) return null;
    const json = await res.json();
    const code = json?.current?.weather_code ?? 0;
    const meta = wmoToCondition(code);
    return {
      temperature_c: typeof json?.current?.temperature_2m === "number" ? Math.round(json.current.temperature_2m) : null,
      ...meta,
    };
  } catch {
    return null;
  }
};

const fetchCity = async (lat: number, lon: number): Promise<{ city: string | null; country: string | null }> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return { city: null, country: null };
    const json = await res.json();
    const a = json?.address || {};
    return {
      city: a.city || a.town || a.village || a.hamlet || a.municipality || null,
      country: a.country || null,
    };
  } catch {
    return { city: null, country: null };
  }
};

/**
 * Capture context for a new entry. Always returns time_of_day.
 * Returns weather + location only if `enabled` and the user grants geolocation.
 */
export const captureEntryContext = async (enabled: boolean): Promise<CapturedContext> => {
  const time_of_day = getTimeOfDay();
  if (!enabled) return { weather: null, location: null, time_of_day };

  try {
    const pos = await getCoords();
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;

    const [weather, place] = await Promise.all([fetchWeather(lat, lon), fetchCity(lat, lon)]);

    return {
      weather,
      location: { city: place.city, country: place.country, lat, lon },
      time_of_day,
    };
  } catch {
    // user declined or no signal — silently skip enrichment
    return { weather: null, location: null, time_of_day };
  }
};
