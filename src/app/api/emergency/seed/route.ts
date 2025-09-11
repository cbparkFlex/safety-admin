import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    // 기존 데이터 삭제
    await prisma.emergencyStepExecution.deleteMany();
    await prisma.emergencyIncident.deleteMany();
    await prisma.emergencySOPStep.deleteMany();
    await prisma.emergencySOP.deleteMany();

    // 1. LPG 센서 가스 노출 SOP
    const lpgGasLeakSOP = await prisma.emergencySOP.create({
      data: {
        type: 'lpg_gas_leak',
        name: 'LPG 가스 누출 대응 절차',
        description: 'LPG 센서에서 가스 누출이 감지되었을 때의 대응 절차',
        isActive: true
      }
    });

    // LPG 가스 누출 단계들
    const lpgSteps = [
      {
        stepNumber: 1,
        title: '즉시 작업 중단',
        description: '모든 작업을 즉시 중단하고 작업자들을 안전한 곳으로 대피시킵니다.',
        action: '작업 중단 알림 방송 및 대피 명령',
        isRequired: true
      },
      {
        stepNumber: 2,
        title: '가스 공급 차단',
        description: 'LPG 공급 라인의 메인 밸브를 즉시 차단합니다.',
        action: '메인 밸브 위치 확인 및 차단 작업',
        isRequired: true
      },
      {
        stepNumber: 3,
        title: '환기 시스템 가동',
        description: '강제 환기 시스템을 가동하여 가스 농도를 낮춥니다.',
        action: '환기 시스템 작동 확인',
        isRequired: true
      },
      {
        stepNumber: 4,
        title: '소방서 신고',
        description: '119에 가스 누출 상황을 신고하고 전문가 지원을 요청합니다.',
        action: '119 신고 및 상황 설명',
        isRequired: true
      },
      {
        stepNumber: 5,
        title: '안전 확인',
        description: '가스 농도가 안전 수준으로 떨어질 때까지 대기합니다.',
        action: '가스 농도 모니터링',
        isRequired: true
      }
    ];

    for (const step of lpgSteps) {
      await prisma.emergencySOPStep.create({
        data: {
          sopId: lpgGasLeakSOP.id,
          ...step
        }
      });
    }

    // 2. 작업자 안전장구 미착용 SOP
    const safetyEquipmentSOP = await prisma.emergencySOP.create({
      data: {
        type: 'safety_equipment',
        name: '안전장구 미착용 대응 절차',
        description: '작업자가 안전장구를 착용하지 않은 상태로 감지되었을 때의 대응 절차',
        isActive: true
      }
    });

    const safetySteps = [
      {
        stepNumber: 1,
        title: '작업 중단 요청',
        description: '해당 작업자에게 즉시 작업을 중단하도록 요청합니다.',
        action: '작업 중단 알림 및 안전장구 착용 요구',
        isRequired: true
      },
      {
        stepNumber: 2,
        title: '안전장구 착용 확인',
        description: '작업자가 적절한 안전장구를 착용했는지 확인합니다.',
        action: '안전장구 착용 상태 점검',
        isRequired: true
      },
      {
        stepNumber: 3,
        title: '안전 교육 실시',
        description: '안전장구 착용의 중요성에 대한 교육을 실시합니다.',
        action: '안전 교육 및 서명 확인',
        isRequired: false
      },
      {
        stepNumber: 4,
        title: '작업 재개 승인',
        description: '안전장구 착용 확인 후 작업 재개를 승인합니다.',
        action: '작업 재개 승인 및 기록',
        isRequired: true
      }
    ];

    for (const step of safetySteps) {
      await prisma.emergencySOPStep.create({
        data: {
          sopId: safetyEquipmentSOP.id,
          ...step
        }
      });
    }

    // 3. 크레인 반경 내 작업자 들어옴 SOP
    const craneWorkerSOP = await prisma.emergencySOP.create({
      data: {
        type: 'crane_worker',
        name: '크레인 작업 반경 침입 대응 절차',
        description: '크레인 작업 반경 내에 작업자가 진입했을 때의 대응 절차',
        isActive: true
      }
    });

    const craneSteps = [
      {
        stepNumber: 1,
        title: '크레인 작업 즉시 중단',
        description: '크레인 작업을 즉시 중단하고 모든 움직임을 정지시킵니다.',
        action: '크레인 작업 중단 및 정지',
        isRequired: true
      },
      {
        stepNumber: 2,
        title: '작업자 대피 지시',
        description: '위험 구역에 있는 모든 작업자에게 즉시 대피를 지시합니다.',
        action: '대피 알림 방송 및 대피 지시',
        isRequired: true
      },
      {
        stepNumber: 3,
        title: '안전 구역 확인',
        description: '크레인 작업 반경 내에 작업자가 남아있지 않은지 확인합니다.',
        action: '작업 반경 내 안전 확인',
        isRequired: true
      },
      {
        stepNumber: 4,
        title: '작업 재개 승인',
        description: '안전 확인 후 크레인 작업 재개를 승인합니다.',
        action: '작업 재개 승인 및 기록',
        isRequired: true
      }
    ];

    for (const step of craneSteps) {
      await prisma.emergencySOPStep.create({
        data: {
          sopId: craneWorkerSOP.id,
          ...step
        }
      });
    }

    // 4. LPG CCTV 내 폭발감지 SOP
    const lpgExplosionSOP = await prisma.emergencySOP.create({
      data: {
        type: 'lpg_explosion',
        name: 'LPG 폭발 위험 대응 절차',
        description: 'CCTV에서 LPG 저장소 주변에 폭발 위험이 감지되었을 때의 대응 절차',
        isActive: true
      }
    });

    const explosionSteps = [
      {
        stepNumber: 1,
        title: '전체 작업장 비상 대피',
        description: '전체 작업장에 비상 대피를 발령하고 모든 인원을 대피시킵니다.',
        action: '비상 대피 알림 및 대피 지시',
        isRequired: true
      },
      {
        stepNumber: 2,
        title: '소방서 긴급 신고',
        description: '119에 폭발 위험 상황을 긴급 신고합니다.',
        action: '119 긴급 신고 및 상황 설명',
        isRequired: true
      },
      {
        stepNumber: 3,
        title: '가스 공급 완전 차단',
        description: '모든 LPG 공급 라인을 완전히 차단합니다.',
        action: '모든 가스 공급 차단',
        isRequired: true
      },
      {
        stepNumber: 4,
        title: '전기 공급 차단',
        description: '폭발 위험을 방지하기 위해 전기 공급을 차단합니다.',
        action: '전기 공급 차단',
        isRequired: true
      },
      {
        stepNumber: 5,
        title: '전문가 대기',
        description: '소방서 및 가스 전문가의 도착을 기다립니다.',
        action: '전문가 도착 대기 및 상황 모니터링',
        isRequired: true
      }
    ];

    for (const step of explosionSteps) {
      await prisma.emergencySOPStep.create({
        data: {
          sopId: lpgExplosionSOP.id,
          ...step
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: "비상 상황 SOP 시드 데이터가 성공적으로 생성되었습니다.",
      data: {
        sops: 4,
        steps: lpgSteps.length + safetySteps.length + craneSteps.length + explosionSteps.length
      }
    });
  } catch (error) {
    console.error("SOP 시드 데이터 생성 실패:", error);
    return NextResponse.json(
      { error: "SOP 시드 데이터 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
