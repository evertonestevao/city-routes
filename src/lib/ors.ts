type Coordenadas = [number, number]; // [lat, lng]

const cache: Record<string, number> = {};

export async function calcularTempoRota(
  origem: Coordenadas,
  destino: Coordenadas
): Promise<number | null> {
  const chaveCache = `${origem[0]},${origem[1]}|${destino[0]},${destino[1]}`;
  if (cache[chaveCache]) {
    return cache[chaveCache];
  }

  const apiKey = process.env.NEXT_PUBLIC_ORS_KEY;
  if (!apiKey) {
    console.error("ORS API key não configurada");
    return null;
  }

  const coords = `${origem[1]},${origem[0]}|${destino[1]},${destino[0]}`;

  try {
    const res = await fetch(
      `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&coordinates=${coords}`
    );
    if (!res.ok) {
      console.error("Erro ao chamar OpenRouteService:", res.statusText);
      return null;
    }
    const json = await res.json();
    const duracaoSegundos = json.features?.[0]?.properties?.summary?.duration;
    if (!duracaoSegundos) return null;

    const duracaoMinutos = Math.round(duracaoSegundos / 60);
    cache[chaveCache] = duracaoMinutos;
    return duracaoMinutos;
  } catch (error) {
    console.error("Erro na requisição ORS:", error);
    return null;
  }
}
