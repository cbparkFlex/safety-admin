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

    // DANGER 또는 CRITICAL 레벨 감지 시 비상상황 자동 생성
    if (level === 'DANGER' || level === 'CRITICAL') {
      try {
        // LPG 가스 누출 SOP 조회
        const lpgSOP = await prisma.emergencySOP.findFirst({
          where: {
            type: 'lpg_gas_leak',
            isActive: true
          }
        });

        if (lpgSOP) {
          // 기존에 같은 센서로 활성화된 비상상황이 있는지 확인
          const existingIncident = await prisma.emergencyIncident.findFirst({
            where: {
              type: 'lpg_gas_leak',
              status: {
                in: ['active', 'in_progress']
              },
              title: {
                contains: sensor
              }
            }
          });

          // 기존 비상상황이 없을 때만 새로 생성
          if (!existingIncident) {
            const incident = await prisma.emergencyIncident.create({
              data: {
                sopId: lpgSOP.id,
                type: 'lpg_gas_leak',
                title: `LPG 가스 누출 감지 - ${sensor}`,
                description: `${sensor} 센서에서 ${level} 레벨의 가스 누출이 감지되었습니다. (PPM: ${value})`,
                location: `${building}동 ${sensor.split('_')[1]}번 센서`,
                severity: level === 'CRITICAL' ? 'critical' : 'high',
                status: 'active'
              }
            });

            // SOP 단계들을 executions에 추가
            const sopSteps = await prisma.emergencySOPStep.findMany({
              where: { sopId: lpgSOP.id },
              orderBy: { stepNumber: 'asc' }
            });

            for (const step of sopSteps) {
              await prisma.emergencyStepExecution.create({
                data: {
                  incidentId: incident.id,
                  stepId: step.id,
                  stepNumber: step.stepNumber,
                  status: 'pending'
                }
              });
            }

            // 감시 기록에도 추가
            await prisma.surveillanceRecord.create({
              data: {
                type: 'gas_leak',
                title: `LPG 가스 누출 감지 - ${sensor}`,
                message: `${sensor} 센서에서 ${level} 레벨의 가스 누출이 감지되었습니다. (PPM: ${value})`,
                location: `${building}동 ${sensor.split('_')[1]}번 센서`,
                severity: level === 'CRITICAL' ? 'critical' : 'danger',
                status: 'active',
                source: 'sensor',
                metadata: JSON.stringify({
                  sensorId: sensor,
                  building: building,
                  value: value,
                  level: level,
                  timestamp: timestamp
                })
              }
            });

            console.log(`비상상황 자동 생성: LPG 가스 누출 - ${sensor} (${level})`);
          }
        }
      } catch (emergencyError) {
        console.error('비상상황 자동 생성 실패:', emergencyError);
        // 비상상황 생성 실패해도 가스 센서 데이터는 정상 저장
      }
    }

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

    // 한국 시간대 고려한 시간 범위 계산 (UTC 데이터와의 호환성을 위해 더 넓은 범위)
    const now = new Date();
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC + 9시간
    const endTime = koreaTime;
    // 한국 시간 기준으로 조회하되, UTC 데이터도 포함하도록 더 넓은 범위 설정
    const startTime = new Date(koreaTime.getTime() - (hours * 60 * 60 * 1000) - (9 * 60 * 60 * 1000));

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
      
      acc[key] = {
        building: item.building,
        sensorId: item.sensorId,
        value: item._max.value,
        level: item._max.level, // 원본 level 값 그대로 사용
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
