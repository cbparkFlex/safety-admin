import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const gateways = await prisma.gateway.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(gateways);
  } catch (error) {
    console.error("게이트웨이 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "게이트웨이 목록을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gatewayId, name, location, ipAddress, mqttTopic } = body;

    // Gateway ID 중복 확인
    if (gatewayId) {
      const existingGatewayId = await prisma.gateway.findFirst({
        where: { gatewayId },
      });

      if (existingGatewayId) {
        return NextResponse.json(
          { error: "이미 등록된 Gateway ID입니다." },
          { status: 400 }
        );
      }
    }

    // IP 주소 중복 확인
    const existingGateway = await prisma.gateway.findFirst({
      where: { ipAddress },
    });

    if (existingGateway) {
      return NextResponse.json(
        { error: "이미 등록된 IP 주소입니다." },
        { status: 400 }
      );
    }

    // MQTT Topic 중복 확인
    const existingTopic = await prisma.gateway.findFirst({
      where: { mqttTopic },
    });

    if (existingTopic) {
      return NextResponse.json(
        { error: "이미 사용 중인 MQTT Topic입니다." },
        { status: 400 }
      );
    }

    // Gateway ID 생성 (제공되지 않은 경우)
    const finalGatewayId = gatewayId || `GW_${Date.now()}`;

    const gateway = await prisma.gateway.create({
      data: {
        gatewayId: finalGatewayId,
        name,
        location,
        ipAddress,
        mqttTopic,
        status: "active",
      },
    });

    return NextResponse.json(gateway, { status: 201 });
  } catch (error) {
    console.error("게이트웨이 생성 실패:", error);
    return NextResponse.json(
      { error: "게이트웨이를 생성할 수 없습니다." },
      { status: 500 }
    );
  }
}
