export interface WeatherData {
  tempC: number;
  pressureMb: number;
  windSpeedMs: number;
  windDeg: number;
  fetchedAt: string;
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,surface_pressure,wind_speed_10m,wind_direction_10m&wind_speed_unit=ms&forecast_days=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
  const data = await res.json();
  const c = data.current;
  return {
    tempC:       c.temperature_2m,
    pressureMb:  c.surface_pressure,
    windSpeedMs: c.wind_speed_10m,
    windDeg:     c.wind_direction_10m,
    fetchedAt:   new Date().toLocaleTimeString(),
  };
}
