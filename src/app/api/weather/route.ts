import { NextRequest, NextResponse } from "next/server";

// 진북신촌로63 (경남 창원시 마산합포구 진북면) — 좌표는 주소 기준
const LOCATION = "경남 창원시 마산합포구 진북면 진북신촌로63";
const COORDS = { lat: 35.2044, lon: 128.6811 };

/** OpenWeatherMap weather id → 이모지 */
function weatherIdToEmoji(id: number): string {
  if (id >= 200 && id < 300) return "⛈️";
  if (id >= 300 && id < 400) return "🌦️";
  if (id >= 500 && id < 600) return "🌧️";
  if (id >= 600 && id < 700) return "❄️";
  if (id >= 700 && id < 800) return "🌫️";
  if (id === 800) return "☀️";
  if (id === 801) return "⛅";
  if (id === 802 || id === 803) return "⛅";
  if (id === 804) return "☁️";
  return "🌤️";
}

/** 실제 날씨 조회 (OpenWeatherMap) */
async function fetchRealWeather() {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return null;
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${COORDS.lat}&lon=${COORDS.lon}&appid=${apiKey}&units=metric&lang=kr`;
  const res = await fetch(url, { next: { revalidate: 600 } });
  if (!res.ok) return null;
  const json = await res.json();
  const w = json.weather?.[0];
  const main = json.main ?? {};
  const wind = json.wind ?? {};
  return {
    temperature: Math.round(Number(main.temp) ?? 0),
    description: w?.description ?? "알 수 없음",
    emoji: weatherIdToEmoji(Number(w?.id) ?? 0),
    humidity: Number(main.humidity) ?? 0,
    windSpeed: Math.round(Number(wind.speed) ?? 0),
    location: LOCATION,
    lastUpdated: new Date().toISOString(),
    coordinates: COORDS,
  };
}

/** 시뮬레이션 날씨 (API 키 없거나 실패 시) */
function getSimulatedWeather() {
  const now = new Date();
  const hour = now.getHours();
  const month = now.getMonth() + 1;
  let baseTemp = 20;
  if (hour >= 6 && hour < 12) baseTemp = 22;
  else if (hour >= 12 && hour < 18) baseTemp = 28;
  else if (hour >= 18 && hour < 22) baseTemp = 25;
  else baseTemp = 18;
  if (month >= 6 && month <= 8) baseTemp += 5;
  else if (month >= 12 || month <= 2) baseTemp -= 8;
  const temperature = baseTemp + Math.floor(Math.random() * 7) - 3;
  const conditions = [
    { type: "맑음", emoji: "☀️", probability: 0.4 },
    { type: "구름많음", emoji: "⛅", probability: 0.3 },
    { type: "흐림", emoji: "☁️", probability: 0.2 },
    { type: "비", emoji: "🌧️", probability: 0.1 },
  ];
  const r = Math.random();
  let acc = 0;
  let selected = conditions[0];
  for (const c of conditions) {
    acc += c.probability;
    if (r <= acc) {
      selected = c;
      break;
    }
  }
  let humidity = 50;
  if (selected.type === "비") humidity = 80 + Math.floor(Math.random() * 15);
  else if (selected.type === "흐림") humidity = 65 + Math.floor(Math.random() * 20);
  else if (selected.type === "구름많음") humidity = 55 + Math.floor(Math.random() * 15);
  else humidity = 40 + Math.floor(Math.random() * 20);
  return {
    temperature,
    description: selected.type,
    emoji: selected.emoji,
    humidity,
    windSpeed: Math.floor(Math.random() * 8) + 1,
    location: LOCATION,
    lastUpdated: now.toISOString(),
    coordinates: COORDS,
  };
}

// 경남 창원시 마산합포구 진북면 진북신촌로63 날씨 정보 API
export async function GET(request: NextRequest) {
  try {
    const real = await fetchRealWeather();
    const weatherData = real ?? getSimulatedWeather();

    return NextResponse.json({
      success: true,
      data: weatherData,
    });
  } catch (error) {
    console.error("날씨 정보 조회 실패:", error);
    return NextResponse.json(
      { error: "날씨 정보를 가져올 수 없습니다." },
      { status: 500 }
    );
  }
}
