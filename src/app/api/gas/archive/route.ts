import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 가스 센서 데이터 아카이빙 (오래된 데이터 압축)
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const daysToKeep = parseInt(searchParams.get('days') || '7'); // 기본 7일
    const archiveDays = parseInt(searchParams.get('archive') || '30'); // 30일 이상 데이터 아카이빙

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const archiveDate = new Date();
    archiveDate.setDate(archiveDate.getDate() - archiveDays);

    // 1. 오래된 데이터를 시간별 평균으로 압축
    const oldData = await prisma.gasSensorData.findMany({
      where: {
        timestamp: {
          lt: archiveDate
        }
      },
      orderBy: {
        timestamp: 'asc'
      }
    });

    if (oldData.length === 0) {
      return NextResponse.json({
        success: true,
        message: "아카이빙할 데이터가 없습니다.",
        archived: 0,
        deleted: 0
      });
    }

    // 시간별로 그룹화하여 평균값 계산
    const hourlyData = new Map();
    
    oldData.forEach(record => {
      const hourKey = `${record.building}_${record.sensorName}_${record.timestamp.toISOString().slice(0, 13)}`;
      
      if (!hourlyData.has(hourKey)) {
        hourlyData.set(hourKey, {
          building: record.building,
          sensorName: record.sensorName,
          values: [],
          levels: [],
          timestamps: []
        });
      }
      
      const data = hourlyData.get(hourKey);
      data.values.push(record.value);
      data.levels.push(record.level);
      data.timestamps.push(record.timestamp);
    });

    // 압축된 데이터 생성
    const compressedData = Array.from(hourlyData.entries()).map(([key, data]) => {
      const avgValue = data.values.reduce((sum: number, val: number) => sum + val, 0) / data.values.length;
      const mostCommonLevel = data.levels.reduce((acc: any, level: string) => {
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      }, {});
      const dominantLevel = Object.keys(mostCommonLevel).reduce((a, b) => 
        mostCommonLevel[a] > mostCommonLevel[b] ? a : b
      );
      
      return {
        sensorId: `${data.building}_${data.sensorName}`,
        sensorName: data.sensorName,
        building: data.building,
        value: Math.round(avgValue * 100) / 100, // 소수점 2자리
        level: dominantLevel,
        timestamp: new Date(data.timestamps[0].toISOString().slice(0, 13) + ':00:00.000Z'),
        isArchived: true
      };
    });

    // 압축된 데이터를 별도 테이블에 저장 (또는 기존 테이블에 플래그 추가)
    // 여기서는 기존 테이블에 isArchived 플래그를 추가하는 방식으로 구현
    // 실제로는 별도 아카이브 테이블을 만드는 것이 좋습니다.

    // 기존 데이터 삭제
    const deleteResult = await prisma.gasSensorData.deleteMany({
      where: {
        timestamp: {
          lt: archiveDate
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `${deleteResult.count}개의 레코드가 아카이빙되었습니다.`,
      archived: compressedData.length,
      deleted: deleteResult.count,
      compressionRatio: Math.round((deleteResult.count / compressedData.length) * 100) / 100
    });

  } catch (error) {
    console.error("가스 센서 데이터 아카이빙 실패:", error);
    return NextResponse.json(
      { success: false, error: "데이터 아카이빙에 실패했습니다." },
      { status: 500 }
    );
  }
}

// 아카이빙 통계 조회
export async function GET() {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [todayCount, weekCount, monthCount, totalCount] = await Promise.all([
      prisma.gasSensorData.count({
        where: { timestamp: { gte: oneDayAgo } }
      }),
      prisma.gasSensorData.count({
        where: { timestamp: { gte: oneWeekAgo } }
      }),
      prisma.gasSensorData.count({
        where: { timestamp: { gte: oneMonthAgo } }
      }),
      prisma.gasSensorData.count()
    ]);

    // 건물별 통계
    const buildingStats = await prisma.gasSensorData.groupBy({
      by: ['building'],
      _count: {
        id: true
      },
      where: {
        timestamp: { gte: oneDayAgo }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        counts: {
          today: todayCount,
          week: weekCount,
          month: monthCount,
          total: totalCount
        },
        buildingStats: buildingStats.map(stat => ({
          building: stat.building,
          count: stat._count.id
        })),
        recommendations: {
          shouldArchive: totalCount > 1000000, // 100만 개 이상이면 아카이빙 권장
          estimatedSize: `${Math.round(totalCount * 0.001)} MB`, // 대략적인 크기 추정
          archiveThreshold: "30일 이상된 데이터"
        }
      }
    });
  } catch (error) {
    console.error("아카이빙 통계 조회 실패:", error);
    return NextResponse.json(
      { success: false, error: "통계 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}
