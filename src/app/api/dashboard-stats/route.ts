import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [
      totalAlerts,
      activeAlerts,
      totalBeacons,
      activeBeacons,
      totalGateways,
      activeGateways
    ] = await Promise.all([
      prisma.proximityAlert.count(),
      prisma.proximityAlert.count({
        where: { isAlert: true }
      }),
      prisma.beacon.count(),
      prisma.beacon.count({
        where: { status: 'active' }
      }),
      prisma.gateway.count(),
      prisma.gateway.count({
        where: { status: 'active' }
      })
    ]);

    return NextResponse.json({
      totalAlerts,
      activeAlerts,
      totalBeacons,
      activeBeacons,
      totalGateways,
      activeGateways
    });
  } catch (error) {
    console.error("대시보드 통계 조회 실패:", error);
    return NextResponse.json(
      { error: "대시보드 통계를 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}
