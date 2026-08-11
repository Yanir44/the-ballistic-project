export async function fetchTerrainProfile(
  path: Array<{ lat: number; lon: number }>
): Promise<number[]> {
  try {
    const locations = path.map(p => ({ latitude: p.lat, longitude: p.lon }));
    const res = await fetch('https://api.open-elevation.com/api/v1/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locations }),
    });
    if (!res.ok) throw new Error('Elevation API error');
    const data = await res.json();
    return (data.results as Array<{ elevation: number }>).map(r => r.elevation);
  } catch {
    // Graceful offline fallback — return zeros
    return path.map(() => 0);
  }
}
