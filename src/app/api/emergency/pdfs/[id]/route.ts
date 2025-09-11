import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import { join } from "path";

// 특정 PDF 파일 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    const pdf = await prisma.emergencyPDF.findUnique({
      where: { id }
    });

    if (!pdf) {
      return NextResponse.json(
        { error: "PDF 파일을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: pdf
    });
  } catch (error) {
    console.error("PDF 조회 실패:", error);
    return NextResponse.json(
      { error: "PDF 파일 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

// PDF 파일 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    const pdf = await prisma.emergencyPDF.findUnique({
      where: { id }
    });

    if (!pdf) {
      return NextResponse.json(
        { error: "PDF 파일을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 파일 시스템에서 파일 삭제
    try {
      const filePath = join(process.cwd(), "public", pdf.filePath);
      await unlink(filePath);
    } catch (fileError) {
      console.warn("파일 삭제 실패 (파일이 존재하지 않을 수 있음):", fileError);
    }

    // 데이터베이스에서 레코드 삭제
    await prisma.emergencyPDF.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: "PDF 파일이 성공적으로 삭제되었습니다."
    });
  } catch (error) {
    console.error("PDF 삭제 실패:", error);
    return NextResponse.json(
      { error: "PDF 파일 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}

// PDF 파일 활성화/비활성화
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const { isActive } = await request.json();
    
    const pdf = await prisma.emergencyPDF.findUnique({
      where: { id }
    });

    if (!pdf) {
      return NextResponse.json(
        { error: "PDF 파일을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 활성화하는 경우, 다른 모든 파일을 비활성화
    if (isActive) {
      await prisma.emergencyPDF.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      });
    }

    // 해당 파일의 상태 업데이트
    const updatedPDF = await prisma.emergencyPDF.update({
      where: { id },
      data: { isActive }
    });

    return NextResponse.json({
      success: true,
      data: updatedPDF,
      message: `PDF 파일이 ${isActive ? '활성화' : '비활성화'}되었습니다.`
    });
  } catch (error) {
    console.error("PDF 상태 업데이트 실패:", error);
    return NextResponse.json(
      { error: "PDF 파일 상태 업데이트에 실패했습니다." },
      { status: 500 }
    );
  }
}
