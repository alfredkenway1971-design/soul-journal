import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";

interface WeatherInfo {
  city: string;
  temperature_c: number | null;
  condition: string;
  icon: string;
}

const CACHE_KEY = "weatherBadge:v1";
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 min

const wmoToCondition = (code: number): { condition: string; icon: string } => {
  if (code === 0) return { condition: "Clear", icon: "☀️" };
  if ([1, 2].includes(code)) return { condition: "Mostly clear", icon: "🌤️" };
  if (code === 3) return { condition: "Cloudy", icon: "☁️" };
  if ([45, 48].includes(code)) return { condition: "Foggy", icon: "🌫️" };
  if ([51, 53, 55, 56, 57].includes(code)) return { condition: "Drizzle", icon: "🌦️" };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { condition: "Rainy", icon: "🌧️" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { condition: "Snowy", icon: "❄️" };
  if ([95, 96, 99].includes(code)) return { condition: "Storm", icon: "⛈️" };
  return { condition: "—", icon: "🌡️" };
};

const WeatherBadge = () => {
  const [info, setInfo] = useState<WeatherInfo | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.t < CACHE_TTL_MS) {
            setInfo(parsed.data);
            return;
          }
        }
        if (!("geolocation" in navigator)) return;
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude: lat, longitude: lon } = pos.coords;
            const [wRes, gRes] = await Promise.all([
              fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`),
              fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`, { headers: { Accept: "application/json" } }),
            ]);
            const wJson = await wRes.json().catch(() => null);
            const gJson = await gRes.json().catch(() => null);
            const code = wJson?.current?.weather_code ?? 0;
            const meta = wmoToCondition(code);
            const a = gJson?.address || {};
            const city = a.city || a.town || a.village || a.hamlet || a.municipality || a.state || "Your area";
            const data: WeatherInfo = {
              city,
              temperature_c: typeof wJson?.current?.temperature_2m === "number" ? Math.round(wJson.current.temperature_2m) : null,
              condition: meta.condition,
              icon: meta.icon,
            };
            setInfo(data);
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data }));
          },
          () => {/* permission denied — silent */},
          { enableHighAccuracy: false, timeout: 7000, maximumAge: 1000 * 60 * 30 }
        );
      } catch {
        /* silent */
      }
    };
    load();
  }, []);

  if (!info) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
      <MapPin className="w-3 h-3" />
      <span>{info.city}</span>
      <span>•</span>
      <span>{info.icon}</span>
      {info.temperature_c !== null && <span>{info.temperature_c}°C</span>}
      <span className="hidden sm:inline">{info.condition}</span>
    </div>
  );
};

export default WeatherBadge;
