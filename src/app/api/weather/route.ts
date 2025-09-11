import { NextRequest, NextResponse } from "next/server";

// 경남 창원시 마산합포구 진북면의 날씨 정보를 가져오는 API
export async function GET(request: NextRequest) {
  try {
    // 실제 사용 시에는 공공데이터포털의 기상청 API나 OpenWeatherMap API를 사용
    // 현재는 시뮬레이션 데이터를 제공
    
    const now = new Date();
    const hour = now.getHours();
    
    // 시간대별로 다른 온도 범위 설정 (현실적인 시뮬레이션)
    let baseTemp = 20;
    if (hour >= 6 && hour < 12) {
      baseTemp = 22; // 오전
    } else if (hour >= 12 && hour < 18) {
      baseTemp = 28; // 오후 (가장 더운 시간)
    } else if (hour >= 18 && hour < 22) {
      baseTemp = 25; // 저녁
    } else {
      baseTemp = 18; // 밤/새벽
    }
    
    // 계절별 온도 조정 (현재 9월 기준)
    const month = now.getMonth() + 1;
    if (month >= 6 && month <= 8) {
      baseTemp += 5; // 여름
    } else if (month >= 12 || month <= 2) {
      baseTemp -= 8; // 겨울
    }
    
    // 랜덤 변동 (-3 ~ +3도)
    const temperature = baseTemp + Math.floor(Math.random() * 7) - 3;
    
    // 날씨 상태 (계절과 시간 고려)
    const weatherConditions = [
      { type: '맑음', emoji: '☀️', probability: 0.4 },
      { type: '구름많음', emoji: '⛅', probability: 0.3 },
      { type: '흐림', emoji: '☁️', probability: 0.2 },
      { type: '비', emoji: '🌧️', probability: 0.1 }
    ];
    
    const random = Math.random();
    let selectedWeather = weatherConditions[0];
    let cumulativeProbability = 0;
    
    for (const weather of weatherConditions) {
      cumulativeProbability += weather.probability;
      if (random <= cumulativeProbability) {
        selectedWeather = weather;
        break;
      }
    }
    
    // 습도 (날씨에 따라 조정)
    let humidity = 50;
    if (selectedWeather.type === '비') {
      humidity = 80 + Math.floor(Math.random() * 15);
    } else if (selectedWeather.type === '흐림') {
      humidity = 65 + Math.floor(Math.random() * 20);
    } else if (selectedWeather.type === '구름많음') {
      humidity = 55 + Math.floor(Math.random() * 15);
    } else {
      humidity = 40 + Math.floor(Math.random() * 20);
    }
    
    // 풍속 (일반적인 범위)
    const windSpeed = Math.floor(Math.random() * 8) + 1;
    
    const weatherData = {
      temperature,
      description: selectedWeather.type,
      emoji: selectedWeather.emoji,
      humidity,
      windSpeed,
      location: '경남 창원시 마산합포구 진북면',
      lastUpdated: now.toISOString(),
      coordinates: {
        lat: 35.2044,
        lon: 128.6811
      }
    };
    
    return NextResponse.json({
      success: true,
      data: weatherData
    });
  } catch (error) {
    console.error("날씨 정보 조회 실패:", error);
    return NextResponse.json(
      { error: "날씨 정보를 가져올 수 없습니다." },
      { status: 500 }
    );
  }
}
