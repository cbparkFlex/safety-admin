import { Pool } from 'pg';

// PostgreSQL 연결 풀 설정
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'safety_admin',
  password: process.env.POSTGRES_PASSWORD || 'password',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  max: 20, // 최대 연결 수
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// PostgreSQL 테이블 생성 스크립트
export const createTables = async () => {
  const client = await pool.connect();
  
  try {
    // 작업자 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS workers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        birth_date DATE NOT NULL,
        equipment_id VARCHAR(50) NOT NULL UNIQUE,
        work_field VARCHAR(100) NOT NULL,
        affiliation VARCHAR(100) NOT NULL,
        health_precautions TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 관리자 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS administrators (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 센서 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS sensors (
        id SERIAL PRIMARY KEY,
        sensor_id VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL,
        location VARCHAR(100) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // CCTV 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS cctv (
        id SERIAL PRIMARY KEY,
        camera_id VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        location VARCHAR(100) NOT NULL,
        ip_address VARCHAR(45) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 모니터링 로그 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS monitoring_logs (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        source_id VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        severity VARCHAR(20) NOT NULL DEFAULT 'info',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 인덱스 생성
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_workers_name ON workers(name);
      CREATE INDEX IF NOT EXISTS idx_workers_equipment_id ON workers(equipment_id);
      CREATE INDEX IF NOT EXISTS idx_sensors_sensor_id ON sensors(sensor_id);
      CREATE INDEX IF NOT EXISTS idx_cctv_camera_id ON cctv(camera_id);
      CREATE INDEX IF NOT EXISTS idx_logs_created_at ON monitoring_logs(created_at);
    `);

    console.log('PostgreSQL 테이블이 성공적으로 생성되었습니다.');
  } catch (error) {
    console.error('PostgreSQL 테이블 생성 중 오류:', error);
    throw error;
  } finally {
    client.release();
  }
};

// 데이터베이스 연결 테스트
export const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('PostgreSQL 연결 성공:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('PostgreSQL 연결 실패:', error);
    return false;
  }
};

export default pool;
