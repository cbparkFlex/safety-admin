import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    // 기존 데이터 삭제
    await prisma.gasSensorMapping.deleteMany();

    // 기본 센서 매칭 데이터 생성
    const defaultMappings = [
      // A동 센서들 (1번~10번)
      { sensorId: "A_01", building: "A" },
      { sensorId: "A_02", building: "A" },
      { sensorId: "A_03", building: "A" },
      { sensorId: "A_04", building: "A" },
      { sensorId: "A_05", building: "A" },
      { sensorId: "A_06", building: "A" },
      { sensorId: "A_07", building: "A" },
      { sensorId: "A_08", building: "A" },
      { sensorId: "A_09", building: "A" },
      { sensorId: "A_10", building: "A" },
      
      // B동 센서들 (1번~12번)
      { sensorId: "B_01", building: "B" },
      { sensorId: "B_02", building: "B" },
      { sensorId: "B_03", building: "B" },
      { sensorId: "B_04", building: "B" },
      { sensorId: "B_05", building: "B" },
      { sensorId: "B_06", building: "B" },
      { sensorId: "B_07", building: "B" },
      { sensorId: "B_08", building: "B" },
      { sensorId: "B_09", building: "B" },
      { sensorId: "B_10", building: "B" },
      { sensorId: "B_11", building: "B" },
      { sensorId: "B_12", building: "B" }
    ];

    const createdMappings = await prisma.gasSensorMapping.createMany({
      data: defaultMappings
    });

    return NextResponse.json({
      success: true,
      message: `${createdMappings.count}개의 센서 매칭이 생성되었습니다.`,
      data: defaultMappings
    });
  } catch (error) {
    console.error("센서 매칭 시드 실패:", error);
    return NextResponse.json(
      { success: false, error: "센서 매칭 시드에 실패했습니다." },
      { status: 500 }
    );
  }
}
