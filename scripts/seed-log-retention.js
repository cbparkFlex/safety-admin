const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedLogRetentionPolicies() {
  console.log('로그 보존 정책 시드 데이터 생성 시작...');

  try {
    // 기본 로그 보존 정책 설정
    const policies = [
      // 모니터링 로그 정책
      { logType: 'monitoring', severity: 'error', retentionDays: 90 },    // 에러 로그: 90일
      { logType: 'monitoring', severity: 'warning', retentionDays: 30 },  // 경고 로그: 30일
      { logType: 'monitoring', severity: 'info', retentionDays: 7 },      // 정보 로그: 7일
      { logType: 'monitoring', severity: 'debug', retentionDays: 3 },     // 디버그 로그: 3일
      
      // 근접 알림 로그 정책
      { logType: 'proximity', severity: 'all', retentionDays: 30 },        // 모든 근접 알림: 30일
      
      // 시스템 로그 정책
      { logType: 'system', severity: 'error', retentionDays: 180 },       // 시스템 에러: 180일
      { logType: 'system', severity: 'warning', retentionDays: 60 },      // 시스템 경고: 60일
      { logType: 'system', severity: 'info', retentionDays: 14 },         // 시스템 정보: 14일
    ];

    for (const policy of policies) {
      await prisma.logRetentionPolicy.upsert({
        where: {
          logType_severity: {
            logType: policy.logType,
            severity: policy.severity
          }
        },
        update: {
          retentionDays: policy.retentionDays,
          isActive: true
        },
        create: {
          logType: policy.logType,
          severity: policy.severity,
          retentionDays: policy.retentionDays,
          isActive: true
        }
      });
      
      console.log(`✅ ${policy.logType} (${policy.severity || 'all'}) 정책 설정: ${policy.retentionDays}일`);
    }

    console.log('🎉 로그 보존 정책 시드 데이터 생성 완료!');
    
  } catch (error) {
    console.error('❌ 시드 데이터 생성 실패:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트가 직접 실행된 경우에만 실행
if (require.main === module) {
  seedLogRetentionPolicies()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { seedLogRetentionPolicies };
