import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'safety-admin.db');
const db = new Database(dbPath);

// 데이터베이스 초기화
export function initializeDatabase() {
  // 작업자 테이블 생성
  db.exec(`
    CREATE TABLE IF NOT EXISTS workers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      birth_date TEXT NOT NULL,
      equipment_id TEXT NOT NULL UNIQUE,
      work_field TEXT NOT NULL,
      affiliation TEXT NOT NULL,
      health_precautions TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 관리자 테이블 생성
  db.exec(`
    CREATE TABLE IF NOT EXISTS administrators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 센서 테이블 생성
  db.exec(`
    CREATE TABLE IF NOT EXISTS sensors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sensor_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      location TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // CCTV 테이블 생성
  db.exec(`
    CREATE TABLE IF NOT EXISTS cctv (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      camera_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 모니터링 로그 테이블 생성
  db.exec(`
    CREATE TABLE IF NOT EXISTS monitoring_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      message TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'info',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 샘플 데이터 삽입 (테이블이 비어있을 때만)
  const workerCount = db.prepare('SELECT COUNT(*) as count FROM workers').get() as { count: number };
  if (workerCount.count === 0) {
    const insertWorker = db.prepare(`
      INSERT INTO workers (name, birth_date, equipment_id, work_field, affiliation, health_precautions)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const sampleWorkers = [
      ['김철수', '2020-03-18', 'A0001', '용접', 'Axis Building', '-'],
      ['김철수', '2020-03-18', 'A0002', '용접', 'Axis Building', '-'],
      ['김철수', '2020-03-18', 'A0003', '용접', 'Axis Building', '-'],
      ['김철수', '2020-03-18', 'A0004', '용접', 'Axis Building', '-'],
      ['김철수', '2020-03-18', 'A0005', '용접', 'Axis Building', '-'],
      ['김철수', '2020-03-18', 'A0006', '용접', 'Axis Building', '-'],
      ['김철수', '2020-03-18', 'A0007', '용접', 'Axis Building', '-'],
      ['김철수', '2020-03-18', 'A0008', '용접', 'Axis Building', '-'],
    ];

    for (const worker of sampleWorkers) {
      insertWorker.run(worker);
    }
  }

  // 관리자 계정 생성 (테이블이 비어있을 때만)
  const adminCount = db.prepare('SELECT COUNT(*) as count FROM administrators').get() as { count: number };
  if (adminCount.count === 0) {
    const insertAdmin = db.prepare(`
      INSERT INTO administrators (username, password_hash, name, role)
      VALUES (?, ?, ?, ?)
    `);
    
    // 실제 프로덕션에서는 bcrypt 등을 사용해야 합니다
    insertAdmin.run('admin001', 'password123', '관리자 001', 'admin');
  }
}

// 데이터베이스 인스턴스 내보내기
export default db;
