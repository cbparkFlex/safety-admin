import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 특정 CCTV 스트림 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    const cctvStream = await prisma.cctvStream.findUnique({
      where: { id }
    });

    if (!cctvStream) {
      return NextResponse.json(
        { success: false, error: "CCTV 스트림을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      stream: cctvStream
    });
  } catch (error) {
    console.error("CCTV 스트림 조회 실패:", error);
    return NextResponse.json(
      { success: false, error: "CCTV 스트림을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

// CCTV 스트림 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    const body = await request.json();
    const { name, description, streamUrl, location, isActive, order } = body;

    // CCTV 스트림 존재 확인
    const existingStream = await prisma.cctvStream.findUnique({
      where: { id }
    });

    if (!existingStream) {
      return NextResponse.json(
        { success: false, error: "CCTV 스트림을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const cctvStream = await prisma.cctvStream.update({
      where: { id },
      data: {
        name: name || existingStream.name,
        description: description !== undefined ? description : existingStream.description,
        streamUrl: streamUrl || existingStream.streamUrl,
        location: location !== undefined ? location : existingStream.location,
        isActive: isActive !== undefined ? isActive : existingStream.isActive,
        order: order !== undefined ? order : existingStream.order
      }
    });

    return NextResponse.json({
      success: true,
      stream: cctvStream
    });
  } catch (error) {
    console.error("CCTV 스트림 수정 실패:", error);
    return NextResponse.json(
      { success: false, error: "CCTV 스트림을 수정할 수 없습니다." },
      { status: 500 }
    );
  }
}

// CCTV 스트림 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    // CCTV 스트림 존재 확인
    const existingStream = await prisma.cctvStream.findUnique({
      where: { id }
    });

    if (!existingStream) {
      return NextResponse.json(
        { success: false, error: "CCTV 스트림을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await prisma.cctvStream.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: "CCTV 스트림이 삭제되었습니다."
    });
  } catch (error) {
    console.error("CCTV 스트림 삭제 실패:", error);
    return NextResponse.json(
      { success: false, error: "CCTV 스트림을 삭제할 수 없습니다." },
      { status: 500 }
    );
  }
}
