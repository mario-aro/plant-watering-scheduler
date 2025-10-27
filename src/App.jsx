import React, { useEffect, useState, useMemo } from "react";

// 🌱 Plant Watering Scheduler
// Smart watering schedule based on interval and local weather
// Default location: Juan de Acosta, Atlántico, Colombia

const DEFAULT_LOCATION = {
  lat: 10.82,
  lon: -75.03,
  label: "Juan de Acosta, Atlántico, Colombia",
};

const pad = (n) => String(n).padStart(2, "0");
const toISODate = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
};
const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};
const todayISO = () => toISODate(new Date());

async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code,precipitation&daily=precipitation_sum&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Error al obtener el clima");
  const data = await res.json();
  const rain = data?.daily?.precipitation_sum?.[0] ?? 0;
  return { rain, label: rain > 0 ? "Lluvioso" : "Despejado" };
}

export default function App() {
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [spots, setSpots] = useState([
    { id: 1, name: "Patio Frontal", intervalDays: 7, lastWatered: null },
    { id: 2, name: "Hierbas Cocina", intervalDays: 2, lastWatered: null },
    { id: 3, name: "Jardín Trasero", intervalDays: 3, lastWatered: null },
    { id: 4, name: "Orquídeas", intervalDays: 7, lastWatered: null },
    { id: 5, name: "Cactus", intervalDays: 14, lastWatered: null },
  ]);
  const [weather, setWeather] = useState({ rain: 0, label: "Cargando..." });
  const [cityInput, setCityInput] = useState("");

  const nextDueDate = (spot) => {
    const base = spot.lastWatered ? new Date(spot.lastWatered) : new Date();
    return toISODate(addDays(base, spot.intervalDays));
  };

  const daysUntil = (iso) => {
    const t = new Date(todayISO());
    const d = new Date(iso);
    return Math.round((d - t) / (1000 * 60 * 60 * 24));
  };

  useEffect(() => {
    fetchWeather(location.lat, location.lon).then(setWeather).catch(console.error);
  }, [location]);

  const enriched = useMemo(
    () =>
      spots.map((s) => ({ ...s, nextDue: nextDueDate(s), dueIn: daysUntil(nextDueDate(s)) })),
    [spots]
  );

  const dueToday = enriched.filter((s) => s.dueIn === 0);

  const waterNow = (id) =>
    setSpots((prev) => prev.map((s) => (s.id === id ? { ...s, lastWatered: todayISO() } : s)));

  const updateLocation = async () => {
    if (!cityInput) return;
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityInput)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data?.results?.length > 0) {
        const c = data.results[0];
        setLocation({ lat: c.latitude, lon: c.longitude, label: `${c.name}, ${c.country}` });
      } else alert("Ciudad no encontrada");
    } catch (e) {
      alert("Error buscando ciudad");
    }
  };

  return (
    <div className="min-h-screen bg-green-50 p-6">
      <h1 className="text-2xl font-bold mb-2">🌿 Planificador de Riego de Plantas</h1>
      <p className="text-sm text-slate-600 mb-4">
        Ubicación actual: <strong>{location.label}</strong> | Clima: {weather.label} ({weather.rain.toFixed(1)} mm)
      </p>

      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Escribe una ciudad (ej. Barranquilla)"
          value={cityInput}
          onChange={(e) => setCityInput(e.target.value)}
          className="border px-3 py-2 rounded-xl flex-1"
        />
        <button onClick={updateLocation} className="bg-emerald-600 text-white px-4 py-2 rounded-xl">
          Cambiar ubicación
        </button>
      </div>

      {weather.rain > 0 ? (
        <div className="bg-blue-100 text-blue-800 p-3 rounded-xl mb-4">
          🌧️ Hoy está lloviendo en {location.label}. Puedes posponer el riego de tus plantas exteriores.
        </div>
      ) : (
        <div className="bg-yellow-100 text-yellow-800 p-3 rounded-xl mb-4">
          ☀️ Día despejado en {location.label}. Ideal para regar las plantas.
        </div>
      )}

      <h2 className="text-lg font-semibold mb-2">Plantas para regar hoy</h2>
      {dueToday.length === 0 ? (
        <p>No hay plantas que necesiten agua hoy.</p>
      ) : (
        <ul className="space-y-2">
          {dueToday.map((s) => (
            <li key={s.id} className="flex justify-between items-center bg-white border rounded-xl p-3">
              <span>{s.name}</span>
              <button onClick={() => waterNow(s.id)} className="bg-emerald-500 text-white px-3 py-1 rounded-xl">
                Marcar regado
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
