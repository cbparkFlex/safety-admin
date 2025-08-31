const { execSync } = require('child_process');

async function migrate() {
  try {
    console.log('Prisma 마이그레이션을 시작합니다...');
    
    // Prisma 마이그레이션 실행
    execSync('npx prisma migrate dev --name init', { stdio: 'inherit' });
    
    console.log('마이그레이션이 성공적으로 완료되었습니다!');
    process.exit(0);
  } catch (error) {
    console.error('마이그레이션 중 오류가 발생했습니다:', error);
    process.exit(1);
  }
}

migrate();
