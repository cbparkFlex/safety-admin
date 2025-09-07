import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const beacons = await prisma.beacon.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(beacons);
  } catch (error) {
    console.error("비콘 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "비콘 목록을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, macAddress, uuid, major, minor, txPower, location } = body;

    // MAC 주소 중복 확인
    const existingBeacon = await prisma.beacon.findFirst({
      where: { macAddress },
    });

    if (existingBeacon) {
      return NextResponse.json(
        { error: "이미 등록된 MAC 주소입니다." },
        { status: 400 }
      );
    }

    // Beacon ID 생성 (MAC 주소 기반)
    const beaconId = `BEACON_${macAddress.replace(/:/g, "").toUpperCase()}`;

    const beacon = await prisma.beacon.create({
      data: {
        beaconId,
        name,
        macAddress,
        uuid,
        major,
        minor,
        txPower,
        location,
        status: "active",
      },
    });

    return NextResponse.json(beacon, { status: 201 });
  } catch (error) {
    console.error("비콘 생성 실패:", error);
    return NextResponse.json(
      { error: "비콘을 생성할 수 없습니다." },
      { status: 500 }
    );
  }
}
