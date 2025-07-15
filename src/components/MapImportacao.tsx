import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";
import L from "leaflet";

interface Ponto {
  identificacao: string;
  latitude: number;
  longitude: number;
  contato?: string;
}

export default function MapImportacao({
  pontos,
  tipoRota,
  setRotaCalculada,
}: {
  pontos: Ponto[];
  tipoRota: "otimizada" | "excel" | "manual";
  setRotaCalculada: (pontos: Ponto[]) => void;
}) {
  const [rotaOtimizada, setRotaOtimizada] = useState<[number, number][]>([]);
  const [ordemOtimizada, setOrdemOtimizada] = useState<number[]>([]);
  const [tempoOtimizado, setTempoOtimizado] = useState<number | null>(null);

  const [rotaExcel, setRotaExcel] = useState<[number, number][]>([]);
  const [tempoExcel, setTempoExcel] = useState<number | null>(null);

  const centro =
    pontos.length > 0
      ? [pontos[0].latitude, pontos[0].longitude]
      : [-21.625874, -49.790554];

  useEffect(() => {
    async function carregarRotas() {
      if (pontos.length < 2) {
        setRotaOtimizada([]);
        setOrdemOtimizada([]);
        setTempoOtimizado(null);
        setRotaExcel([]);
        setTempoExcel(null);
        setRotaCalculada([]);
        return;
      }

      try {
        const coords = pontos.map((p) => [p.latitude, p.longitude]) as [
          number,
          number
        ][];

        if (tipoRota === "manual") {
          setRotaCalculada(pontos);
          return;
        }

        const {
          rota: rotaOtimaCoords,
          ordem,
          tempo: tempoOtimo,
        } = await buscarRotaORS(coords);

        const rotaOtimizadaLatLng = rotaOtimaCoords.map(
          ([lng, lat]) => [lat, lng] as [number, number]
        );

        setRotaOtimizada(rotaOtimizadaLatLng);
        setOrdemOtimizada(ordem);
        setTempoOtimizado(tempoOtimo);

        const { rota: rotaOrigCoords, tempo: tempoOrig } =
          await buscarRotaOriginalORS(coords);

        const rotaExcelLatLng = rotaOrigCoords.map(
          ([lng, lat]) => [lat, lng] as [number, number]
        );

        setRotaExcel(rotaExcelLatLng);
        setTempoExcel(tempoOrig);

        if (tipoRota === "otimizada") {
          const indicesOrdenados = ordem
            .map((ordemValor, idx) => ({ idx, ordemValor }))
            .sort((a, b) => a.ordemValor - b.ordemValor)
            .map(({ idx }) => idx);

          const pontosOrdenados = indicesOrdenados.map((i) => pontos[i]);
          setRotaCalculada(pontosOrdenados);
        } else {
          setRotaCalculada(pontos);
        }
      } catch (error) {
        console.error("Erro ao carregar rotas:", error);
        setRotaOtimizada([]);
        setOrdemOtimizada([]);
        setTempoOtimizado(null);
        setRotaExcel([]);
        setTempoExcel(null);
        setRotaCalculada([]);
      }
    }
    carregarRotas();
  }, [pontos, tipoRota, setRotaCalculada]);

  return (
    <div className="h-full w-full relative">
      <MapContainer
        center={centro as [number, number]}
        zoom={13}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {pontos.map((p, i) => {
          const ordemO = ordemOtimizada[i] ?? "-";

          const iconComNumero = new L.DivIcon({
            html: `
              <div style="
                position: relative;
                font-size: 10px;
                font-weight: bold;
                color: white;
                background: blue;
                border-radius: 50%;
                width: 50px;
                height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
              ">
                <div style="font-size: 8px;">${i + 1}º Excel</div>
                <div style="font-size: 8px;">${ordemO}º Ot.</div>
                        
                <div style="
                  content: '';
                  position: absolute;
                  bottom: -6px;
                  left: 50%;
                  transform: translateX(-50%);
                  width: 0;
                  height: 0;
                  border-left: 6px solid transparent;
                  border-right: 6px solid transparent;
                  border-top: 6px solid blue;
                "></div>
              </div>
            `,
            className: "",
            iconAnchor: [26, 36],
          });

          return (
            <Marker
              key={i}
              position={[p.latitude, p.longitude]}
              icon={iconComNumero}
            >
              <Popup>
                <strong>{p.identificacao}</strong>
                <br />
                {p.contato}
              </Popup>
            </Marker>
          );
        })}

        {tipoRota === "otimizada" && rotaOtimizada.length > 1 && (
          <Polyline positions={rotaOtimizada} color="blue" weight={4} />
        )}

        {tipoRota === "excel" && rotaExcel.length > 1 && (
          <Polyline positions={rotaExcel} color="red" weight={4} />
        )}

        {tipoRota === "manual" && pontos.length > 1 && (
          <Polyline
            positions={pontos.map((p) => [p.latitude, p.longitude])}
            color="green"
            weight={4}
          />
        )}
      </MapContainer>

      {(tempoOtimizado !== null || tempoExcel !== null) && (
        <div className="absolute top-2 border-2 border-black left-12 bg-white p-2 rounded shadow text-sm font-semibold space-y-1">
          {tempoOtimizado !== null && (
            <div>Rota otimizada: {formatarTempo(tempoOtimizado)}</div>
          )}
          {tempoExcel !== null && (
            <div>Rota original (excel): {formatarTempo(tempoExcel)}</div>
          )}
        </div>
      )}
    </div>
  );
}

function formatarTempo(segundos: number): string {
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.round((segundos % 3600) / 60);
  return `${horas}h ${minutos}min`;
}

async function buscarRotaORS(pontos: [number, number][]) {
  const key = process.env.NEXT_PUBLIC_ORS_KEY || "";

  const jobs = pontos.slice(1).map(([lat, lng], index) => ({
    id: index + 1,
    location: [lng, lat],
  }));

  const vehicle = {
    id: 1,
    start: [pontos[0][1], pontos[0][0]],
    profile: "driving-car",
  };

  const body = {
    jobs,
    vehicles: [vehicle],
  };

  const res = await fetch("https://api.openrouteservice.org/optimization", {
    method: "POST",
    headers: {
      Authorization: key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Erro ORS Optimization:", errorText);
    throw new Error("Erro ao otimizar rota: " + errorText);
  }

  const data = await res.json();
  const steps = data.routes[0].steps;

  const coordenadasOrdenadas: [number, number][] = [pontos[0]];
  const ordemORS: number[] = Array(pontos.length).fill(0);
  ordemORS[0] = 1;

  let ordemAtual = 2;
  for (const step of steps) {
    if (step.type === "job") {
      const idx = step.id - 1;
      coordenadasOrdenadas.push(pontos[idx + 1]);
      ordemORS[idx + 1] = ordemAtual;
      ordemAtual++;
    }
  }

  const coordsParaRota = coordenadasOrdenadas.map(([lat, lng]) => [lng, lat]);

  const rotaRes = await fetch(
    "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
    {
      method: "POST",
      headers: {
        Authorization: key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ coordinates: coordsParaRota }),
    }
  );

  if (!rotaRes.ok) {
    const erroRota = await rotaRes.text();
    console.error("Erro ao buscar rota otimizada:", erroRota);
    throw new Error("Erro ao buscar rota otimizada");
  }

  const rotaData = await rotaRes.json();
  const duration = rotaData.features[0].properties.summary.duration;

  return {
    rota: rotaData.features[0].geometry.coordinates as [number, number][],
    ordem: ordemORS,
    tempo: duration,
  };
}

async function buscarRotaOriginalORS(pontos: [number, number][]) {
  const key = process.env.NEXT_PUBLIC_ORS_KEY || "";

  const coords = pontos.map(([lat, lng]) => [lng, lat]);

  const res = await fetch(
    "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
    {
      method: "POST",
      headers: {
        Authorization: key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ coordinates: coords }),
    }
  );

  if (!res.ok) {
    const erro = await res.text();
    console.error("Erro ao buscar rota original:", erro);
    throw new Error("Erro ao buscar rota original");
  }

  const data = await res.json();
  const duration = data.features[0].properties.summary.duration;

  return {
    rota: data.features[0].geometry.coordinates as [number, number][],
    tempo: duration,
  };
}
