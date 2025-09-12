import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 가스 센서 데이터 수신 (POST)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { timestamp, sensor, value, level } = body;

    // 필수 필드 검증
    if (!timestamp || !sensor || value === undefined || !level) {
      return NextResponse.json(
        { success: false, error: "필수 필드가 누락되었습니다. (timestamp, sensor, value, level)" },
        { status: 400 }
      );
    }

    // 센서 ID에서 건물 추출 (예: "A_1" -> building: "A")
    const building = sensor.split('_')[0] || 'Unknown';

    // 가스 센서 데이터 저장
    const gasSensorData = await prisma.gasSensorData.create({
      data: {
        sensorId: sensor,
        building: building,
        value: parseFloat(value),
        level: level,
        timestamp: new Date(timestamp)
      }
    });

    return NextResponse.json({
      success: true,
      message: "가스 센서 데이터가 성공적으로 저장되었습니다.",
      data: {
        id: gasSensorData.id,
        sensor: sensor,
        value: value,
        level: level,
        timestamp: timestamp
      }
    });
  } catch (error) {
    console.error("가스 센서 데이터 저장 실패:", error);
    return NextResponse.json(
      { success: false, error: "가스 센서 데이터 저장에 실패했습니다." },
      { status: 500 }
    );
  }
}

// 가스 센서 데이터 조회 (GET) - 최근 데이터만
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const building = searchParams.get('building');
    const limit = parseInt(searchParams.get('limit') || '100');
    const hours = parseInt(searchParams.get('hours') || '1'); // 기본 1시간

    // 시간 범위 계산
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (hours * 60 * 60 * 1000));

    // 쿼리 조건 구성
    const where: any = {
      timestamp: {
        gte: startTime,
        lte: endTime
      }
    };

    if (building) {
      where.building = building;
    }

    // 최근 데이터 조회
    const gasSensorData = await prisma.gasSensorData.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit
    });

    // 센서별 최신 데이터 집계 (DB에 저장된 가장 최근 데이터)
    const latestData = await prisma.gasSensorData.groupBy({
      by: ['building', 'sensorId'],
      _max: {
        timestamp: true,
        value: true,
        level: true
      },
      orderBy: {
        building: 'asc'
      }
    });

    // 집계 데이터를 센서별로 정리
    const sensorSummary = latestData.reduce((acc: any, item) => {
      const key = item.sensorId; // sensorId를 직접 키로 사용
      
      // level 값 정규화
      let normalizedLevel = item._max.level;
      if (normalizedLevel === 'WARN') {
        normalizedLevel = 'GAS_WARNING';
      } else if (normalizedLevel === 'DANGER') {
        normalizedLevel = 'GAS_DANGER';
      } else if (normalizedLevel === 'CRITICAL') {
        normalizedLevel = 'GAS_CRITICAL';
      } else if (normalizedLevel === 'SAFE') {
        normalizedLevel = 'GAS_SAFE';
      }
      
      acc[key] = {
        building: item.building,
        sensorId: item.sensorId,
        value: item._max.value,
        level: normalizedLevel,
        lastUpdate: item._max.timestamp
      };
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: {
        recent: gasSensorData,
        summary: sensorSummary,
        totalCount: gasSensorData.length,
        timeRange: {
          start: startTime.toISOString(),
          end: endTime.toISOString()
        }
      }
    });
  } catch (error) {
    console.error("가스 센서 데이터 조회 실패:", error);
    return NextResponse.json(
      { success: false, error: "가스 센서 데이터 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}
