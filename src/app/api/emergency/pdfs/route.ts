import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// PDF 파일 목록 조회
export async function GET(request: NextRequest) {
  try {
    const pdfs = await prisma.emergencyPDF.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: pdfs
    });
  } catch (error) {
    console.error("PDF 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "PDF 목록을 가져올 수 없습니다." },
      { status: 500 }
    );
  }
}

// PDF 파일 업로드
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const description = formData.get("description") as string;
    const uploadedBy = formData.get("uploadedBy") as string || "관리자";

    if (!file) {
      return NextResponse.json(
        { error: "파일이 선택되지 않았습니다." },
        { status: 400 }
      );
    }

    // PDF 파일인지 확인
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "PDF 파일만 업로드 가능합니다." },
        { status: 400 }
      );
    }

    // 파일 크기 제한 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "파일 크기는 10MB를 초과할 수 없습니다." },
        { status: 400 }
      );
    }

    // 업로드 디렉토리 생성
    const uploadDir = join(process.cwd(), "public", "uploads", "emergency-pdfs");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // 고유한 파일명 생성
    const timestamp = Date.now();
    const fileName = `emergency_pdf_${timestamp}.pdf`;
    const filePath = join(uploadDir, fileName);

    // 파일 저장
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // 기존 활성 파일들을 비활성화
    await prisma.emergencyPDF.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });

    // 데이터베이스에 파일 정보 저장
    const savedPDF = await prisma.emergencyPDF.create({
      data: {
        fileName,
        originalName: file.name,
        filePath: `/uploads/emergency-pdfs/${fileName}`,
        fileSize: file.size,
        mimeType: file.type,
        description: description || null,
        version: "1.0",
        isActive: true,
        uploadedBy
      }
    });

    return NextResponse.json({
      success: true,
      data: savedPDF,
      message: "PDF 파일이 성공적으로 업로드되었습니다."
    });
  } catch (error) {
    console.error("PDF 업로드 실패:", error);
    return NextResponse.json(
      { error: "PDF 파일 업로드에 실패했습니다." },
      { status: 500 }
    );
  }
}
