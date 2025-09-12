# 가스 센서 대량 데이터 처리를 위한 데이터베이스 마이그레이션 가이드

## 현재 상황 분석

### 데이터량 계산
- **23개 센서** × **1초 간격** = **1,987,200 레코드/일**
- **월간**: 약 **60,000,000 레코드**
- **연간**: 약 **720,000,000 레코드**

### SQLite의 한계
- **파일 크기 제한**: 281TB (이론적), 실제로는 1GB 이상에서 성능 저하
- **동시 접근 제한**: 단일 쓰기 작업만 가능
- **인덱싱 성능**: 대량 데이터에서 인덱스 성능 저하
- **백업/복구**: 대용량 파일 처리 어려움

## 권장 솔루션: PostgreSQL + TimescaleDB

### 1. TimescaleDB (PostgreSQL 확장)
```sql
-- 시계열 데이터에 최적화된 PostgreSQL 확장
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 하이퍼테이블 생성 (자동 파티셔닝)
CREATE TABLE gas_sensor_data (
    id BIGSERIAL,
    sensor_id VARCHAR(50) NOT NULL,
    sensor_name VARCHAR(50) NOT NULL,
    building VARCHAR(20) NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    level VARCHAR(20) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 하이퍼테이블로 변환 (1일 단위 파티셔닝)
SELECT create_hypertable('gas_sensor_data', 'timestamp', chunk_time_interval => INTERVAL '1 day');

-- 인덱스 생성
CREATE INDEX idx_gas_sensor_building_time ON gas_sensor_data (building, timestamp DESC);
CREATE INDEX idx_gas_sensor_sensor_time ON gas_sensor_data (sensor_id, timestamp DESC);
CREATE INDEX idx_gas_sensor_level ON gas_sensor_data (level, timestamp DESC);
```

### 2. 데이터 압축 정책
```sql
-- 7일 후 자동 압축 (TimescaleDB 기능)
SELECT add_compression_policy('gas_sensor_data', INTERVAL '7 days');

-- 30일 후 데이터 보관 정책
SELECT add_retention_policy('gas_sensor_data', INTERVAL '30 days');
```

### 3. 실시간 집계 뷰
```sql
-- 실시간 집계를 위한 연속 집계 뷰
CREATE MATERIALIZED VIEW gas_sensor_hourly_avg
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', timestamp) AS hour,
    building,
    sensor_name,
    AVG(value) as avg_value,
    MAX(value) as max_value,
    MIN(value) as min_value,
    COUNT(*) as sample_count
FROM gas_sensor_data
GROUP BY hour, building, sensor_name;

-- 1시간마다 자동 갱신
SELECT add_continuous_aggregate_policy('gas_sensor_hourly_avg',
    start_offset => INTERVAL '1 hour',
    end_offset => INTERVAL '1 minute',
    schedule_interval => INTERVAL '1 hour');
```

## 마이그레이션 단계

### 1단계: PostgreSQL 설정
```bash
# Docker로 PostgreSQL + TimescaleDB 실행
docker run -d \
  --name timescaledb \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=safety_admin \
  -p 5432:5432 \
  timescale/timescaledb:latest-pg15
```

### 2단계: Prisma 스키마 업데이트
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model GasSensorData {
  id        BigInt   @id @default(autoincrement())
  sensorId  String   @map("sensor_id")
  sensorName String  @map("sensor_name")
  building  String
  value     Decimal  @db.Decimal(10, 2)
  level     String
  timestamp DateTime @db.Timestamptz
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@index([building, timestamp])
  @@index([sensorId, timestamp])
  @@index([timestamp])
  @@map("gas_sensor_data")
}
```

### 3단계: 환경 변수 설정
```env
# .env
DATABASE_URL="postgresql://username:password@localhost:5432/safety_admin?schema=public"
```

## 성능 최적화 전략

### 1. 배치 삽입
```typescript
// 100개씩 배치로 삽입
const batchSize = 100;
const batches = [];

for (let i = 0; i < sensorData.length; i += batchSize) {
  batches.push(sensorData.slice(i, i + batchSize));
}

for (const batch of batches) {
  await prisma.gasSensorData.createMany({
    data: batch,
    skipDuplicates: true
  });
}
```

### 2. 연결 풀링
```typescript
// lib/database.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // 연결 풀 설정
  __internal: {
    engine: {
      connectTimeout: 60000,
      queryTimeout: 60000,
    },
  },
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### 3. 읽기 전용 복제본
```typescript
// 분석 쿼리는 읽기 전용 DB 사용
const readOnlyPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.READ_ONLY_DATABASE_URL,
    },
  },
});
```

## 모니터링 및 알림

### 1. 성능 모니터링
```sql
-- 쿼리 성능 모니터링
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements
WHERE query LIKE '%gas_sensor_data%'
ORDER BY total_time DESC;
```

### 2. 디스크 사용량 모니터링
```sql
-- 테이블 크기 확인
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE tablename = 'gas_sensor_data';
```

## 예상 성능 개선

| 항목 | SQLite | PostgreSQL + TimescaleDB |
|------|--------|---------------------------|
| **쓰기 성능** | 1,000 rows/sec | 10,000+ rows/sec |
| **읽기 성능** | 100 queries/sec | 1,000+ queries/sec |
| **동시 접근** | 1 writer | 100+ concurrent |
| **압축률** | 수동 | 자동 (90%+ 압축) |
| **백업** | 파일 복사 | 스트리밍 백업 |

## 비용 분석

### 클라우드 옵션
1. **AWS RDS PostgreSQL**: $50-200/월
2. **Google Cloud SQL**: $40-150/월  
3. **Azure Database**: $45-180/월
4. **Self-hosted**: $20-50/월 (VPS)

### ROI 계산
- **개발 시간 절약**: 50% 감소
- **성능 향상**: 10배 개선
- **유지보수 비용**: 70% 감소
