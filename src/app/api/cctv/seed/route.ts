import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    // 기존 데이터 삭제
    await prisma.cctvStream.deleteMany();

    // 기본 CCTV 스트림 데이터 생성
    const defaultStreams = [
      {
        name: "A동 출입구",
        description: "A동 출입구 실시간 모니터링",
        streamUrl: "http://210.99.70.120:1935/live/cctv001.stream/playlist.m3u8",
        location: "A동 출입구",
        isActive: true,
        order: 1
      },
      {
        name: "B동 출입구",
        description: "B동 출입구 실시간 모니터링",
        streamUrl: "http://210.99.70.120:1935/live/cctv002.stream/playlist.m3u8",
        location: "B동 출입구",
        isActive: true,
        order: 2
      },
      {
        name: "LPG 저장소",
        description: "LPG 저장소 실시간 모니터링",
        streamUrl: "http://210.99.70.120:1935/live/cctv003.stream/playlist.m3u8",
        location: "LPG 저장소",
        isActive: true,
        order: 3
      }
    ];

    const createdStreams = await prisma.cctvStream.createMany({
      data: defaultStreams
    });

    return NextResponse.json({
      success: true,
      message: `${createdStreams.count}개의 CCTV 스트림이 생성되었습니다.`,
      streams: defaultStreams
    });
  } catch (error) {
    console.error("CCTV 스트림 시드 실패:", error);
    return NextResponse.json(
      { success: false, error: "CCTV 스트림 시드에 실패했습니다." },
      { status: 500 }
    );
  }
}
