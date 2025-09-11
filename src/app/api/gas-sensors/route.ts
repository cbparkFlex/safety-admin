import { NextRequest, NextResponse } from 'next/server';

// 가스 센서 위치 데이터 (B동 12개, A동 11개)
const GAS_SENSOR_POSITIONS = [
  // B동 (왼쪽) - 12개
  { id: 1, name: '1번',   building: 'B동', position: { top: '5%', left: '13%' } },
  { id: 2, name: '2번',   building: 'B동', position: { top: '5%', left: '65%' } },
  { id: 3, name: '3번',   building: 'B동', position: { top: '18%', left: '13%' } },
  { id: 4, name: '4번',   building: 'B동', position: { top: '18%', left: '65%' } },
  { id: 5, name: '5번',   building: 'B동', position: { top: '31%', left: '13%' } },
  { id: 6, name: '6번',   building: 'B동', position: { top: '31%', left: '65%' } },
  { id: 7, name: '7번',   building: 'B동', position: { top: '44%', left: '13%' } },
  { id: 8, name: '8번',   building: 'B동', position: { top: '44%', left: '65%' } },
  { id: 9, name: '9번',   building: 'B동', position: { top: '57%', left: '13%' } },
  { id: 10, name: '10번', building: 'B동', position: { top: '57%', left: '65%' } },
  { id: 11, name: '11번', building: 'B동', position: { top: '70%', left: '13%' } },
  { id: 12, name: '12번', building: 'B동', position: { top: '70%', left: '65%' } },
  { id: 13, name: '13번', building: 'B동', position: { top: '83%', left: '13%' } },
  
  // A동 (오른쪽) - 11개
  { id: 14, name: '1번', building: 'A동', position:  { top: '10%', right: '20%' } },
  { id: 15, name: '2번', building: 'A동', position:  { top: '20%', right: '24%' } },
  { id: 16, name: '3번', building: 'A동', position:  { top: '30%', right: '28%' } },
  { id: 17, name: '4번', building: 'A동', position:  { top: '40%', right: '32%' } },
  { id: 18, name: '5번', building: 'A동', position:  { top: '50%', right: '36%' } },
  { id: 19, name: '6번', building: 'A동', position:  { top: '60%', right: '40%' } },
  { id: 20, name: '7번', building: 'A동', position:  { top: '80%', right: '36%' } },
  { id: 21, name: '8번', building: 'A동', position:  { top: '70%', right: '32%' } },
  { id: 22, name: '9번', building: 'A동', position:  { top: '60%', right: '28%' } },
  { id: 23, name: '10번', building: 'A동', position: { top: '50%', right: '24%' } }
];

// 가스 센서 상태 데이터 (메모리 저장)
let gasSensorData = new Map<number, {
  id: number;
  name: string;
  building: string;
  position: { top: string; left?: string; right?: string };
  status: 'safe' | 'warning' | 'danger' | 'critical';
  ppm: number;
  threshold: number;
  lastUpdate: string;
}>();

// 초기 데이터 설정
const initializeGasSensorData = () => {
  GAS_SENSOR_POSITIONS.forEach(sensor => {
    gasSensorData.set(sensor.id, {
      ...sensor,
      status: 'safe',
      ppm: Math.random() * 0.1, // 0-0.1ppm 사이의 랜덤 값
      threshold: 0.5, // 0.5ppm 임계값
      lastUpdate: new Date().toISOString(),
    });
  });
};

// 초기화
if (gasSensorData.size === 0) {
  initializeGasSensorData();
}

// 가스 센서 데이터 조회 (GET)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const building = searchParams.get('building'); // 'A동' 또는 'B동'
    const status = searchParams.get('status'); // 'safe', 'warning', 'danger', 'critical'

    let filteredData = Array.from(gasSensorData.values());

    // 건물별 필터링
    if (building) {
      filteredData = filteredData.filter(sensor => sensor.building === building);
    }

    // 상태별 필터링
    if (status) {
      filteredData = filteredData.filter(sensor => sensor.status === status);
    }

    // 상태별 통계 계산
    const stats = {
      total: gasSensorData.size,
      safe: Array.from(gasSensorData.values()).filter(s => s.status === 'safe').length,
      warning: Array.from(gasSensorData.values()).filter(s => s.status === 'warning').length,
      danger: Array.from(gasSensorData.values()).filter(s => s.status === 'danger').length,
      critical: Array.from(gasSensorData.values()).filter(s => s.status === 'critical').length,
    };

    return NextResponse.json({
      success: true,
      data: filteredData,
      stats,
      lastUpdate: new Date().toISOString(),
    });
  } catch (error) {
    console.error('가스 센서 데이터 조회 실패:', error);
    return NextResponse.json(
      { success: false, error: '가스 센서 데이터 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// 가스 센서 데이터 업데이트 (POST)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sensorId, ppm, status, threshold } = body;

    if (!sensorId || ppm === undefined) {
      return NextResponse.json(
        { success: false, error: '센서 ID와 PPM 값은 필수입니다.' },
        { status: 400 }
      );
    }

    const sensor = gasSensorData.get(sensorId);
    if (!sensor) {
      return NextResponse.json(
        { success: false, error: '존재하지 않는 센서입니다.' },
        { status: 404 }
      );
    }

    // PPM 값에 따른 상태 자동 결정
    let newStatus = status;
    if (!status) {
      const currentThreshold = threshold || sensor.threshold;
      if (ppm >= currentThreshold * 2) {
        newStatus = 'critical';
      } else if (ppm >= currentThreshold * 1.5) {
        newStatus = 'danger';
      } else if (ppm >= currentThreshold) {
        newStatus = 'warning';
      } else {
        newStatus = 'safe';
      }
    }

    // 센서 데이터 업데이트
    gasSensorData.set(sensorId, {
      ...sensor,
      ppm: parseFloat(ppm.toFixed(3)),
      status: newStatus,
      threshold: threshold || sensor.threshold,
      lastUpdate: new Date().toISOString(),
    });

    const updatedSensor = gasSensorData.get(sensorId);

    return NextResponse.json({
      success: true,
      data: updatedSensor,
      message: '가스 센서 데이터가 업데이트되었습니다.',
    });
  } catch (error) {
    console.error('가스 센서 데이터 업데이트 실패:', error);
    return NextResponse.json(
      { success: false, error: '가스 센서 데이터 업데이트에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// 가스 센서 데이터 시뮬레이션 (POST)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { simulate = true } = body;

    if (simulate) {
      // 모든 센서에 랜덤 데이터 생성
      gasSensorData.forEach((sensor, id) => {
        const randomPpm = Math.random() * 1.0; // 0-1.0ppm 사이의 랜덤 값
        let newStatus: 'safe' | 'warning' | 'danger' | 'critical' = 'safe';
        
        if (randomPpm >= sensor.threshold * 2) {
          newStatus = 'critical';
        } else if (randomPpm >= sensor.threshold * 1.5) {
          newStatus = 'danger';
        } else if (randomPpm >= sensor.threshold) {
          newStatus = 'warning';
        }

        gasSensorData.set(id, {
          ...sensor,
          ppm: parseFloat(randomPpm.toFixed(3)),
          status: newStatus,
          lastUpdate: new Date().toISOString(),
        });
      });
    }

    const allData = Array.from(gasSensorData.values());
    const stats = {
      total: gasSensorData.size,
      safe: allData.filter(s => s.status === 'safe').length,
      warning: allData.filter(s => s.status === 'warning').length,
      danger: allData.filter(s => s.status === 'danger').length,
      critical: allData.filter(s => s.status === 'critical').length,
    };

    return NextResponse.json({
      success: true,
      data: allData,
      stats,
      message: simulate ? '가스 센서 데이터 시뮬레이션이 실행되었습니다.' : '가스 센서 데이터가 조회되었습니다.',
    });
  } catch (error) {
    console.error('가스 센서 시뮬레이션 실패:', error);
    return NextResponse.json(
      { success: false, error: '가스 센서 시뮬레이션에 실패했습니다.' },
      { status: 500 }
    );
  }
}
