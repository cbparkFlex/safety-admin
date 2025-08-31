# Safety Admin - 안전 관리 시스템

작업자 및 장비 안전을 관리하는 웹 기반 관리자 시스템입니다.

## 🚀 기술 스택

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Prisma ORM + SQLite (개발용), PostgreSQL (프로덕션용)
- **Icons**: Lucide React
- **UI**: 모던하고 반응형 디자인

## 📋 주요 기능

### 1. 작업자 관리
- 작업자 목록 조회
- 작업자 검색 기능
- 작업자 추가/수정/삭제
- 작업자별 장비 ID 관리
- 건강 유의사항 관리

### 2. 관리자 계정 관리
- 관리자 계정 생성/수정/삭제
- 권한 관리
- 로그인/로그아웃

### 3. 가스 누출 센서 관리
- 센서 등록/관리
- 센서 상태 모니터링
- 위치별 센서 배치

### 4. CCTV 관리
- CCTV 카메라 등록/관리
- IP 주소 관리
- 카메라 상태 모니터링

### 5. 모니터링 로그
- 시스템 활동 로그
- 알림 및 경고 기록
- 로그 필터링 및 검색

## 🛠️ 설치 및 실행

### 1. 프로젝트 클론
```bash
git clone <repository-url>
cd safety-admin
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 환경 변수 설정
프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
# Database Configuration
# SQLite (Development)
DATABASE_URL="file:./safety-admin.db"

# PostgreSQL (Production)
# DATABASE_URL="postgresql://username:password@localhost:5432/safety_admin?schema=public"

# Application Configuration
NEXT_PUBLIC_APP_NAME=Safety Admin
NEXT_PUBLIC_APP_VERSION=1.0.0

# Security
JWT_SECRET=your_jwt_secret_key_here
SESSION_SECRET=your_session_secret_here
```

### 4. 데이터베이스 설정
```bash
# Prisma 클라이언트 생성
npm run db:generate

# 데이터베이스 마이그레이션
npm run db:migrate

# 샘플 데이터 삽입
npm run db:seed
```

### 5. 개발 서버 실행
```bash
npm run dev
```

### 6. 브라우저에서 확인
```
http://localhost:3000
```

## 📁 프로젝트 구조

```
safety-admin/
├── prisma/
│   ├── schema.prisma          # Prisma 스키마 정의
│   └── migrations/            # 데이터베이스 마이그레이션 파일
├── src/
│   ├── app/
│   │   ├── api/workers/       # 작업자 API 라우트
│   │   ├── layout.tsx         # 루트 레이아웃 (헤더 + 사이드바 포함)
│   │   └── page.tsx           # 메인 페이지
│   ├── components/
│   │   ├── Header.tsx         # 헤더 컴포넌트
│   │   ├── Sidebar.tsx        # 사이드바 컴포넌트
│   │   ├── WorkerManagement.tsx      # 작업자 관리 컴포넌트
│   │   ├── AdministratorManagement.tsx # 관리자 관리 컴포넌트
│   │   ├── SensorManagement.tsx       # 센서 관리 컴포넌트
│   │   └── index.ts           # 컴포넌트 인덱스
│   ├── lib/
│   │   └── prisma.ts          # Prisma 클라이언트 설정
│   └── types/                 # TypeScript 타입 정의
├── scripts/
│   ├── migrate.js             # 마이그레이션 스크립트
│   └── seed.js                # 시드 데이터 스크립트
├── safety-admin.db            # SQLite 데이터베이스 파일
└── package.json
```

## 🧩 컴포넌트 구조

### 공통 컴포넌트 (app/layout.tsx에 통합)
- **Header**: 상단 헤더 (로고, 날짜, 온도, 관리자 정보)
- **Sidebar**: 좌측 네비게이션 사이드바

### 페이지 컴포넌트
- **WorkerManagement**: 작업자 관리 페이지
- **AdministratorManagement**: 관리자 계정 관리 페이지
- **SensorManagement**: 센서 관리 페이지

### 컴포넌트 사용법
```tsx
// 메인 페이지에서 사용
import WorkerManagement from '@/components/WorkerManagement';

export default function Home() {
  return <WorkerManagement />;
}
```

## 🗄️ 데이터베이스 스키마 (Prisma)

### Worker (작업자)
```prisma
model Worker {
  id                Int      @id @default(autoincrement())
  name              String
  birthDate         DateTime @map("birth_date")
  equipmentId       String   @unique @map("equipment_id")
  workField         String   @map("work_field")
  affiliation       String
  healthPrecautions String?  @map("health_precautions")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  @@map("workers")
}
```

### Administrator (관리자)
```prisma
model Administrator {
  id           Int      @id @default(autoincrement())
  username     String   @unique
  passwordHash String   @map("password_hash")
  name         String
  role         String   @default("admin")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  @@map("administrators")
}
```

### Sensor (센서)
```prisma
model Sensor {
  id        Int      @id @default(autoincrement())
  sensorId  String   @unique @map("sensor_id")
  name      String
  type      String
  location  String
  status    String   @default("active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("sensors")
}
```

### CCTV
```prisma
model CCTV {
  id        Int      @id @default(autoincrement())
  cameraId  String   @unique @map("camera_id")
  name      String
  location  String
  ipAddress String   @map("ip_address")
  status    String   @default("active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("cctv")
}
```

### MonitoringLog (모니터링 로그)
```prisma
model MonitoringLog {
  id        Int      @id @default(autoincrement())
  type      String
  sourceId  String   @map("source_id")
  message   String
  severity  String   @default("info")
  createdAt DateTime @default(now()) @map("created_at")

  @@map("monitoring_logs")
}
```

## 🔧 API 엔드포인트

### 작업자 관리
- `GET /api/workers` - 작업자 목록 조회
- `POST /api/workers` - 작업자 추가
- `PUT /api/workers/[id]` - 작업자 수정
- `DELETE /api/workers/[id]` - 작업자 삭제

## 🎨 UI/UX 특징

- **다크 블루 사이드바**: 직관적인 네비게이션
- **반응형 디자인**: 모든 디바이스에서 최적화
- **모던한 테이블**: 정렬, 검색, 필터링 기능
- **실시간 검색**: 타이핑과 동시에 결과 업데이트
- **로딩 상태**: 사용자 경험 향상
- **컴포넌트 기반**: 재사용 가능한 모듈화된 구조
- **통합 레이아웃**: app/layout.tsx에 헤더와 사이드바 통합

## 🗄️ Prisma 명령어

### 데이터베이스 관리
```bash
# Prisma 클라이언트 생성
npm run db:generate

# 마이그레이션 생성 및 적용
npm run db:migrate

# 샘플 데이터 삽입
npm run db:seed

# Prisma Studio 실행 (데이터베이스 GUI)
npm run db:studio
```

### 스키마 변경
```bash
# 스키마 변경 후 마이그레이션
npx prisma migrate dev --name "description"

# 프로덕션 마이그레이션
npx prisma migrate deploy

# 스키마 리셋 (개발용)
npx prisma migrate reset
```

## 🔮 향후 계획

1. **PostgreSQL 마이그레이션**: 프로덕션 환경을 위한 데이터베이스 변경
2. **인증 시스템**: JWT 기반 로그인/로그아웃
3. **실시간 알림**: WebSocket을 통한 실시간 모니터링
4. **대시보드**: 통계 및 차트 추가
5. **모바일 앱**: React Native 기반 모바일 앱 개발
6. **라우팅 시스템**: Next.js App Router를 활용한 페이지 라우팅

## 🗄️ PostgreSQL 마이그레이션

### 1. PostgreSQL 설치 및 설정
```bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# macOS
brew install postgresql

# Windows
# https://www.postgresql.org/download/windows/ 에서 다운로드
```

### 2. 데이터베이스 생성
```sql
CREATE DATABASE safety_admin;
CREATE USER safety_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE safety_admin TO safety_user;
```

### 3. Prisma 스키마 변경
`prisma/schema.prisma` 파일에서 데이터베이스 프로바이더를 변경:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 4. 환경 변수 변경
`.env` 파일에서 PostgreSQL URL 설정:
```env
DATABASE_URL="postgresql://safety_user:your_password@localhost:5432/safety_admin?schema=public"
```

### 5. 마이그레이션 실행
```bash
npm run db:migrate
npm run db:seed
```

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 📞 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해 주세요.
