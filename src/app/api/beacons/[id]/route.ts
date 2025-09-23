import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();
    const { name, macAddress, uuid, major, minor, txPower, location } = body;

    // MAC 주소 중복 확인 (자기 자신 제외)
    const existingBeacon = await prisma.beacon.findFirst({
      where: { 
        macAddress,
        NOT: { id }
      },
    });

    if (existingBeacon) {
      return NextResponse.json(
        { error: "이미 등록된 MAC 주소입니다." },
        { status: 400 }
      );
    }

    const beacon = await prisma.beacon.update({
      where: { id },
      data: {
        name,
        macAddress,
        uuid,
        major,
        minor,
        txPower,
        location,
      },
    });

    return NextResponse.json(beacon);
  } catch (error) {
    console.error("비콘 수정 실패:", error);
    return NextResponse.json(
      { error: "비콘을 수정할 수 없습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    // 비콘 정보 조회
    const beacon = await prisma.beacon.findUnique({
      where: { id },
    });

    if (!beacon) {
      return NextResponse.json(
        { error: "비콘을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 트랜잭션으로 관련 데이터들을 함께 삭제
    await prisma.$transaction(async (tx) => {
      // 1. 관련된 ProximityAlert 삭제
      await tx.proximityAlert.deleteMany({
        where: { beaconId: beacon.beaconId },
      });

      // 2. 관련된 RssiCalibration 삭제
      await tx.rssiCalibration.deleteMany({
        where: { beaconId: beacon.beaconId },
      });

      // 3. 관련된 RealtimeRSSI 삭제
      await tx.realtimeRSSI.deleteMany({
        where: { beaconId: beacon.beaconId },
      });

      // 4. 비콘 삭제
      await tx.beacon.delete({
        where: { id },
      });
    });

    return NextResponse.json({ 
      message: "비콘과 관련된 모든 데이터가 삭제되었습니다.",
      deletedBeaconId: beacon.beaconId 
    });
  } catch (error) {
    console.error("비콘 삭제 실패:", error);
    return NextResponse.json(
      { error: "비콘을 삭제할 수 없습니다." },
      { status: 500 }
    );
  }
}
