import { LogCleanupService } from './logCleanupService';

export class Scheduler {
  private static cleanupInterval: NodeJS.Timeout | null = null;
  private static isRunning = false;

  /**
   * 로그 정리 스케줄러 시작
   * @param intervalHours 정리 주기 (시간 단위, 기본값: 24시간)
   */
  static startLogCleanup(intervalHours: number = 24): void {
    if (this.isRunning) {
      console.log('⚠️ 로그 정리 스케줄러가 이미 실행 중입니다.');
      return;
    }

    const intervalMs = intervalHours * 60 * 60 * 1000; // 시간을 밀리초로 변환
    
    console.log(`🕐 로그 정리 스케줄러 시작: ${intervalHours}시간마다 실행`);
    
    // 즉시 한 번 실행
    this.runCleanup();
    
    // 주기적으로 실행
    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, intervalMs);
    
    this.isRunning = true;
  }

  /**
   * 로그 정리 스케줄러 중지
   */
  static stopLogCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      this.isRunning = false;
      console.log('🛑 로그 정리 스케줄러 중지');
    }
  }

  /**
   * 스케줄러 상태 확인
   */
  static isSchedulerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * 로그 정리 실행
   */
  private static async runCleanup(): Promise<void> {
    try {
      console.log('🧹 스케줄된 로그 정리 시작...');
      const summary = await LogCleanupService.cleanupLogs();
      
      if (summary.totalDeleted > 0) {
        console.log(`✅ 스케줄된 정리 완료: ${summary.totalDeleted}개 로그 삭제`);
      } else {
        console.log('ℹ️ 삭제할 로그가 없습니다.');
      }
      
      if (summary.errors.length > 0) {
        console.error('⚠️ 정리 중 오류 발생:', summary.errors);
      }
    } catch (error) {
      console.error('❌ 스케줄된 로그 정리 실패:', error);
    }
  }

  /**
   * 개발 환경에서 테스트용 - 1분마다 실행
   */
  static startTestCleanup(): void {
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️ 테스트 스케줄러는 프로덕션 환경에서 실행할 수 없습니다.');
      return;
    }
    
    console.log('🧪 테스트 로그 정리 스케줄러 시작: 1분마다 실행');
    this.startLogCleanup(1 / 60); // 1분
  }
}
