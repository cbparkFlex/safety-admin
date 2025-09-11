import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 비상 상황 기록 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const severity = searchParams.get('severity');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (severity) where.severity = severity;
    
    // 날짜 범위 필터
    if (dateFrom || dateTo) {
      where.startedAt = {};
      if (dateFrom) {
        where.startedAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        // 날짜 끝까지 포함하기 위해 23:59:59 추가
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.startedAt.lte = endDate;
      }
    }

    // 전체 개수 조회
    const totalCount = await prisma.emergencyIncident.count({ where });

    // 페이지네이션된 데이터 조회
    const incidents = await prisma.emergencyIncident.findMany({
      where,
      include: {
        sop: {
          select: { name: true, type: true }
        },
        executions: {
          include: {
            step: {
              select: { title: true, stepNumber: true }
            }
          }
        }
      },
      orderBy: { startedAt: 'desc' },
      skip,
      take: limit
    });

    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      data: incidents,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    console.error("비상 상황 기록 조회 실패:", error);
    return NextResponse.json(
      { error: "비상 상황 기록 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

// 새 비상 상황 기록 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sopId, type, title, description, location, severity } = body;

    // 필수 필드 검증
    if (!sopId || !type || !title) {
      return NextResponse.json(
        { error: "SOP ID, 유형, 제목은 필수 필드입니다." },
        { status: 400 }
      );
    }

    // SOP 존재 확인
    const sop = await prisma.emergencySOP.findUnique({
      where: { id: sopId },
      include: { steps: true }
    });

    if (!sop) {
      return NextResponse.json(
        { error: "SOP를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 비상 상황 기록 생성
    const incident = await prisma.emergencyIncident.create({
      data: {
        sopId,
        type,
        title,
        description,
        location,
        severity: severity || 'high'
      }
    });

    // 각 단계에 대한 실행 기록 초기화
    const stepExecutions = await Promise.all(
      sop.steps.map(step =>
        prisma.emergencyStepExecution.create({
          data: {
            incidentId: incident.id,
            stepId: step.id,
            stepNumber: step.stepNumber,
            status: 'pending'
          },
          include: {
            step: {
              select: { title: true, stepNumber: true }
            }
          }
        })
      )
    );

    // incident 객체에 executions 배열 추가
    const incidentWithExecutions = {
      ...incident,
      executions: stepExecutions
    };

    return NextResponse.json({
      success: true,
      message: "비상 상황이 기록되었습니다.",
      data: {
        incident: incidentWithExecutions,
        stepExecutions
      }
    });
  } catch (error) {
    console.error("비상 상황 기록 생성 실패:", error);
    return NextResponse.json(
      { error: "비상 상황 기록 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}

// 모든 비상 상황 기록 삭제 (테스트용)
export async function DELETE() {
  try {
    // 관련 실행 기록들도 함께 삭제 (CASCADE)
    await prisma.emergencyIncident.deleteMany();

    return NextResponse.json({
      success: true,
      message: "모든 비상 상황 기록이 삭제되었습니다."
    });
  } catch (error) {
    console.error("비상 상황 기록 삭제 실패:", error);
    return NextResponse.json(
      { error: "비상 상황 기록 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
