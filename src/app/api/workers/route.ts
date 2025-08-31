import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    let whereClause = {};
    if (search) {
      whereClause = {
        name: {
          contains: search,
          mode: 'insensitive' as const,
        },
      };
    }

    const workers = await prisma.worker.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return NextResponse.json({ 
      success: true, 
      data: workers,
      total: workers.length 
    });
  } catch (error) {
    console.error('Error fetching workers:', error);
    return NextResponse.json(
      { success: false, error: '작업자 데이터를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // 텍스트 데이터 추출
    const name = formData.get('name') as string;
    const birthDate = formData.get('birthDate') as string;
    const equipmentId = formData.get('equipmentId') as string;
    const workField = formData.get('workField') as string;
    const affiliation = formData.get('affiliation') as string;
    const healthPrecautions = formData.get('healthPrecautions') as string;
    const mobilePhone = formData.get('mobilePhone') as string;
    const emergencyContact = formData.get('emergencyContact') as string;

    // 필수 필드 검증
    if (!name || !birthDate || !equipmentId || !workField || !affiliation) {
      return NextResponse.json(
        { success: false, error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 이미지 파일 처리
    const profileImage = formData.get('profileImage') as File;
    let imagePath = null;

    if (profileImage) {
      try {
        // 업로드 디렉토리 생성
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        await mkdir(uploadDir, { recursive: true });

        // 파일명 생성 (timestamp + original name)
        const timestamp = Date.now();
        const fileName = `${timestamp}_${profileImage.name}`;
        const filePath = path.join(uploadDir, fileName);

        // 파일 저장
        const bytes = await profileImage.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        imagePath = `/uploads/${fileName}`;
      } catch (imageError) {
        console.error('Error saving image:', imageError);
        // 이미지 저장 실패해도 계속 진행
      }
    }

    // 데이터베이스에 저장
    const worker = await prisma.worker.create({
      data: {
        name,
        birthDate: new Date(birthDate),
        equipmentId,
        workField,
        affiliation,
        healthPrecautions: healthPrecautions || '-',
        mobilePhone: mobilePhone || null,
        emergencyContact: emergencyContact || null,
        profileImage: imagePath,
      },
    });

    return NextResponse.json({ 
      success: true, 
      data: worker,
      message: '작업자가 성공적으로 추가되었습니다.' 
    });
  } catch (error) {
    console.error('Error creating worker:', error);
    return NextResponse.json(
      { success: false, error: '작업자 추가 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
