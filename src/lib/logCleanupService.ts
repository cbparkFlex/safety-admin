import { prisma } from './prisma';

export interface CleanupResult {
  logType: string;
  severity: string;
  deletedCount: number;
  retentionDays: number;
}

export interface CleanupSummary {
  totalDeleted: number;
  results: CleanupResult[];
  errors: string[];
  executionTime: number;
}

export class LogCleanupService {
  /**
   * 모든 활성화된 로그 보존 정책에 따라 로그 정리 실행
   */
  static async cleanupLogs(): Promise<CleanupSummary> {
    const startTime = Date.now();
    const summary: CleanupSummary = {
      totalDeleted: 0,
      results: [],
      errors: [],
      executionTime: 0
    };

    try {
      console.log('🧹 로그 정리 작업 시작...');

      // 활성화된 보존 정책 조회
      const policies = await prisma.logRetentionPolicy.findMany({
        where: { isActive: true },
        orderBy: [{ logType: 'asc' }, { severity: 'asc' }]
      });

      console.log(`📋 ${policies.length}개의 활성 보존 정책 발견`);

      for (const policy of policies) {
        try {
          const result = await this.cleanupByPolicy(policy);
          summary.results.push(result);
          summary.totalDeleted += result.deletedCount;
          
          // 마지막 정리 시간 업데이트
          await prisma.logRetentionPolicy.update({
            where: { id: policy.id },
            data: { lastCleanup: new Date() }
          });

          console.log(`✅ ${policy.logType} (${policy.severity}): ${result.deletedCount}개 삭제`);
        } catch (error: any) {
          const errorMsg = `${policy.logType} (${policy.severity}) 정리 실패: ${error.message}`;
          summary.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }

      summary.executionTime = Date.now() - startTime;
      console.log(`🎉 로그 정리 완료: 총 ${summary.totalDeleted}개 삭제, ${summary.executionTime}ms 소요`);

      return summary;
    } catch (error: any) {
      summary.errors.push(`전체 정리 작업 실패: ${error.message}`);
      summary.executionTime = Date.now() - startTime;
      console.error('❌ 로그 정리 작업 실패:', error);
      return summary;
    }
  }

  /**
   * 특정 정책에 따라 로그 정리
   */
  private static async cleanupByPolicy(policy: any): Promise<CleanupResult> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

    let deletedCount = 0;

    switch (policy.logType) {
      case 'monitoring':
        deletedCount = await this.cleanupMonitoringLogs(policy.severity, cutoffDate);
        break;
      case 'proximity':
        deletedCount = await this.cleanupProximityAlerts(cutoffDate);
        break;
      case 'system':
        // 시스템 로그는 현재 별도 테이블이 없으므로 모니터링 로그에서 처리
        deletedCount = await this.cleanupMonitoringLogs(policy.severity, cutoffDate);
        break;
      default:
        throw new Error(`지원하지 않는 로그 타입: ${policy.logType}`);
    }

    return {
      logType: policy.logType,
      severity: policy.severity,
      deletedCount,
      retentionDays: policy.retentionDays
    };
  }

  /**
   * 모니터링 로그 정리
   */
  private static async cleanupMonitoringLogs(severity: string, cutoffDate: Date): Promise<number> {
    const whereClause: any = {
      createdAt: { lt: cutoffDate }
    };

    if (severity !== 'all') {
      whereClause.severity = severity;
    }

    const result = await prisma.monitoringLog.deleteMany({
      where: whereClause
    });

    return result.count;
  }

  /**
   * 근접 알림 로그 정리
   */
  private static async cleanupProximityAlerts(cutoffDate: Date): Promise<number> {
    const result = await prisma.proximityAlert.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    });

    return result.count;
  }

  /**
   * 로그 통계 조회
   */
  static async getLogStatistics(): Promise<{
    monitoringLogs: { total: number; bySeverity: Record<string, number> };
    proximityAlerts: { total: number; active: number };
    oldestLogs: { monitoring: Date | null; proximity: Date | null };
  }> {
    const [monitoringTotal, monitoringBySeverity, proximityTotal, proximityActive, oldestMonitoring, oldestProximity] = await Promise.all([
      prisma.monitoringLog.count(),
      prisma.monitoringLog.groupBy({
        by: ['severity'],
        _count: { severity: true }
      }),
      prisma.proximityAlert.count(),
      prisma.proximityAlert.count({ where: { isAlert: true } }),
      prisma.monitoringLog.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true }
      }),
      prisma.proximityAlert.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true }
      })
    ]);

    const severityCounts: Record<string, number> = {};
    monitoringBySeverity.forEach(item => {
      severityCounts[item.severity] = item._count.severity;
    });

    return {
      monitoringLogs: {
        total: monitoringTotal,
        bySeverity: severityCounts
      },
      proximityAlerts: {
        total: proximityTotal,
        active: proximityActive
      },
      oldestLogs: {
        monitoring: oldestMonitoring?.createdAt || null,
        proximity: oldestProximity?.createdAt || null
      }
    };
  }

  /**
   * 보존 정책 조회
   */
  static async getRetentionPolicies() {
    return await prisma.logRetentionPolicy.findMany({
      orderBy: [{ logType: 'asc' }, { severity: 'asc' }]
    });
  }

  /**
   * 보존 정책 업데이트
   */
  static async updateRetentionPolicy(
    id: number, 
    updates: { retentionDays?: number; isActive?: boolean }
  ) {
    return await prisma.logRetentionPolicy.update({
      where: { id },
      data: updates
    });
  }
}
