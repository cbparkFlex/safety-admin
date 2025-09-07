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

    // 관련된 ProximityAlert가 있는지 확인
    const relatedAlerts = await prisma.proximityAlert.findFirst({
      where: { beaconId: { in: await prisma.beacon.findUnique({ where: { id } }).then(b => b ? [b.beaconId] : []) } },
    });

    if (relatedAlerts) {
      return NextResponse.json(
        { error: "관련된 근접 알림이 있어 삭제할 수 없습니다." },
        { status: 400 }
      );
    }

    await prisma.beacon.delete({
      where: { id },
    });

    return NextResponse.json({ message: "비콘이 삭제되었습니다." });
  } catch (error) {
    console.error("비콘 삭제 실패:", error);
    return NextResponse.json(
      { error: "비콘을 삭제할 수 없습니다." },
      { status: 500 }
    );
  }
}
