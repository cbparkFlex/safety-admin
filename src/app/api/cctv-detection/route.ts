import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// CCTV 감지 데이터 수신 (POST)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { timestamp, CCTV, STATUS } = body;

    // 필수 필드 검증
    if (!timestamp || !CCTV || !STATUS) {
      console.log("❌ 필수 필드 누락 - timestamp:", !!timestamp, "CCTV:", !!CCTV, "STATUS:", !!STATUS);
      return NextResponse.json(
        { success: false, error: "필수 필드가 누락되었습니다. (timestamp, CCTV, STATUS)" },
        { status: 400 }
      );
    }

    // CCTV 이름과 상태 유효성 검증
    const validCCTVNames = ['cam1', 'cam2', 'cam3'];
    const validStatuses = ['fallen', 'flame', 'head'];

    if (!validCCTVNames.includes(CCTV)) {
      console.log("❌ 유효하지 않은 CCTV 이름:", CCTV, "유효한 값:", validCCTVNames);
      return NextResponse.json(
        { success: false, error: "유효하지 않은 CCTV 이름입니다. (cam1, cam2, cam3 중 하나)" },
        { status: 400 }
      );
    }

    if (!validStatuses.includes(STATUS)) {
      console.log("❌ 유효하지 않은 STATUS:", STATUS, "유효한 값:", validStatuses);
      return NextResponse.json(
        { success: false, error: "유효하지 않은 상태입니다. (fallen, flame, head 중 하나)" },
        { status: 400 }
      );
    }

    // 시간 차이값 계산 (timestamp와 createdAt의 차이)
    const timestampDate = new Date(timestamp);
    const createdAtDate = new Date();
    const timeDiff = createdAtDate.getTime() - timestampDate.getTime();

    // CCTV 감지 데이터 저장
    const cctvDetection = await prisma.cctvDetection.create({
      data: {
        cctvName: CCTV,
        status: STATUS,
        timestamp: timestampDate,
        timeDiff: timeDiff
      }
    });

    // 비상상황 자동 생성
    if (STATUS === 'head') {
      // 작업자 안전장구 미착용 비상상황
      await createEmergencyIncident('safety_equipment', CCTV, timestamp);
    } else if (STATUS === 'flame') {
      // LPG CCTV 내 폭발감지 비상상황
      await createEmergencyIncident('lpg_explosion', CCTV, timestamp);
    }

    return NextResponse.json({
      success: true,
      message: "CCTV 감지 데이터가 성공적으로 저장되었습니다.",
      data: {
        id: cctvDetection.id,
        cctv: CCTV,
        status: STATUS,
        timestamp: timestamp
      }
    });
  } catch (error) {
    console.error("CCTV 감지 데이터 저장 실패:", error);
    return NextResponse.json(
      { success: false, error: "CCTV 감지 데이터 저장에 실패했습니다." },
      { status: 500 }
    );
  }
}

// 비상상황 자동 생성 함수
async function createEmergencyIncident(type: string, cctvName: string, timestamp: string) {
  try {
    // 해당 유형의 SOP 조회
    let sop = await prisma.emergencySOP.findFirst({
      where: {
        type: type,
        isActive: true
      }
    });

    // SOP가 없으면 자동으로 생성
    if (!sop) {
      console.log(`SOP를 찾을 수 없습니다: ${type}. 자동으로 생성합니다.`);
      sop = await createDefaultSOP(type);
    }

    // 기존에 같은 CCTV로 활성화된 비상상황이 있는지 확인
    const existingIncident = await prisma.emergencyIncident.findFirst({
      where: {
        type: type,
        status: {
          in: ['active', 'in_progress']
        },
        title: {
          contains: cctvName
        }
      }
    });

    // 기존 비상상황이 없을 때만 새로 생성
    if (!existingIncident) {
      const incident = await prisma.emergencyIncident.create({
        data: {
          sopId: sop.id,
          type: type,
          title: getEmergencyTitle(type, cctvName),
          description: getEmergencyDescription(type, cctvName),
          location: getLocationByCCTV(cctvName),
          severity: getSeverityByType(type),
          status: 'active'
        }
      });

      // SOP 단계들을 executions에 추가
      const sopSteps = await prisma.emergencySOPStep.findMany({
        where: { sopId: sop.id },
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
          type: getSurveillanceType(type),
          title: getEmergencyTitle(type, cctvName),
          message: getEmergencyDescription(type, cctvName),
          location: getLocationByCCTV(cctvName),
          severity: getSurveillanceSeverity(type),
          status: 'active',
          source: 'cctv',
          metadata: JSON.stringify({
            cctvName: cctvName,
            status: type,
            timestamp: timestamp
          })
        }
      });

      console.log(`비상상황 자동 생성: ${type} - ${cctvName}`);
    }
  } catch (error) {
    console.error('비상상황 자동 생성 실패:', error);
  }
}

// 기본 SOP 생성 함수
async function createDefaultSOP(type: string) {
  const sopData = getDefaultSOPData(type);
  
  // SOP 생성
  const sop = await prisma.emergencySOP.create({
    data: {
      type: sopData.type,
      name: sopData.name,
      description: sopData.description,
      isActive: true
    }
  });

  // SOP 단계들 생성
  for (const stepData of sopData.steps) {
    await prisma.emergencySOPStep.create({
      data: {
        sopId: sop.id,
        stepNumber: stepData.stepNumber,
        title: stepData.title,
        description: stepData.description,
        action: stepData.action,
        isRequired: stepData.isRequired
      }
    });
  }

  console.log(`기본 SOP 생성 완료: ${type}`);
  return sop;
}

// 기본 SOP 데이터
function getDefaultSOPData(type: string) {
  const sopData = {
    safety_equipment: {
      type: 'safety_equipment',
      name: '작업자 안전장구 미착용',
      description: '작업자가 안전장구를 착용하지 않은 상태로 감지되었을 때의 대응 절차',
      steps: [
        {
          stepNumber: 1,
          title: '작업 중단',
          description: '즉시 해당 작업을 중단합니다',
          action: '작업 중단 명령 전달',
          isRequired: true
        },
        {
          stepNumber: 2,
          title: '안전장구 착용',
          description: '작업자에게 안전장구 착용을 지시합니다',
          action: '안전장구 착용 확인',
          isRequired: true
        },
        {
          stepNumber: 3,
          title: '안전 교육',
          description: '안전장구 착용의 중요성에 대해 교육합니다',
          action: '안전 교육 실시',
          isRequired: true
        },
        {
          stepNumber: 4,
          title: '작업 재개',
          description: '안전장구 착용 확인 후 작업을 재개합니다',
          action: '작업 재개 승인',
          isRequired: true
        }
      ]
    },
    lpg_explosion: {
      type: 'lpg_explosion',
      name: 'LPG 폭발 위험 감지',
      description: 'CCTV에서 LPG 저장소 주변에 폭발 위험이 감지되었을 때의 대응 절차',
      steps: [
        {
          stepNumber: 1,
          title: '전체 대피',
          description: '즉시 모든 작업자를 안전한 곳으로 대피시킵니다',
          action: '비상 대피 신호 발령',
          isRequired: true
        },
        {
          stepNumber: 2,
          title: '긴급 신고',
          description: '소방서 및 관련 기관에 즉시 신고합니다',
          action: '119 신고 및 내부 보고',
          isRequired: true
        },
        {
          stepNumber: 3,
          title: '가스 공급 차단',
          description: 'LPG 가스 공급을 즉시 차단합니다',
          action: '가스 밸브 차단',
          isRequired: true
        },
        {
          stepNumber: 4,
          title: '전기 차단',
          description: '폭발 위험을 방지하기 위해 전기를 차단합니다',
          action: '전기 차단 스위치 작동',
          isRequired: true
        },
        {
          stepNumber: 5,
          title: '전문가 대기',
          description: '소방서 및 전문가의 도착을 기다립니다',
          action: '현장 대기 및 상황 보고',
          isRequired: true
        }
      ]
    }
  };

  return sopData[type as keyof typeof sopData] || {
    type: type,
    name: '기본 비상상황 대응',
    description: '기본적인 비상상황 대응 절차',
    steps: [
      {
        stepNumber: 1,
        title: '상황 파악',
        description: '현재 상황을 파악합니다',
        action: '상황 파악 및 보고',
        isRequired: true
      },
      {
        stepNumber: 2,
        title: '대응 조치',
        description: '적절한 대응 조치를 취합니다',
        action: '대응 조치 실행',
        isRequired: true
      }
    ]
  };
}

// 헬퍼 함수들
function getEmergencyTitle(type: string, cctvName: string): string {
  const titles = {
    safety_equipment: `안전장구 미착용 감지 - ${cctvName}동`,
    lpg_explosion: `LPG 폭발 위험 감지 - ${cctvName} 저장소`
  };
  return titles[type as keyof typeof titles] || 'CCTV 감지 비상상황';
}

function getEmergencyDescription(type: string, cctvName: string): string {
  const descriptions = {
    safety_equipment: `${cctvName}동 CCTV에서 작업자가 안전장구를 착용하지 않은 상태로 감지되었습니다.`,
    lpg_explosion: `${cctvName} 저장소 CCTV에서 폭발 위험이 감지되었습니다.`
  };
  return descriptions[type as keyof typeof descriptions] || 'CCTV에서 비상상황이 감지되었습니다.';
}

function getLocationByCCTV(cctvName: string): string {
  const locations = {
    A: 'A동 출입구',
    B: 'B동 출입구',
    LPG: 'LPG 저장소'
  };
  return locations[cctvName as keyof typeof locations] || `${cctvName}동`;
}

function getSeverityByType(type: string): string {
  const severities = {
    safety_equipment: 'medium',
    lpg_explosion: 'critical'
  };
  return severities[type as keyof typeof severities] || 'high';
}

function getSurveillanceType(type: string): string {
  const types = {
    safety_equipment: 'safety_equipment',
    lpg_explosion: 'fire_explosion'
  };
  return types[type as keyof typeof types] || 'cctv';
}

function getSurveillanceSeverity(type: string): string {
  const severities = {
    safety_equipment: 'warning',
    lpg_explosion: 'critical'
  };
  return severities[type as keyof typeof severities] || 'danger';
}

// CCTV 감지 데이터 조회 (GET)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cctvName = searchParams.get('cctvName');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100');
    const hours = parseInt(searchParams.get('hours') || '24');

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

    if (cctvName) where.cctvName = cctvName;
    if (status) where.status = status;

    // 최근 데이터 조회
    const cctvDetections = await prisma.cctvDetection.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit
    });

    return NextResponse.json({
      success: true,
      data: {
        detections: cctvDetections,
        totalCount: cctvDetections.length,
        timeRange: {
          start: startTime.toISOString(),
          end: endTime.toISOString()
        }
      }
    });
  } catch (error) {
    console.error("CCTV 감지 데이터 조회 실패:", error);
    return NextResponse.json(
      { success: false, error: "CCTV 감지 데이터 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}
