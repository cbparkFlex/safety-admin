import { LogCleanupService } from './logCleanupService';

export class Scheduler {
  private static dailyCleanupTimeout: NodeJS.Timeout | null = null;
  private static isRunning = false;

  /**
   * 매일 밤 12시에 로그 정리 스케줄러 시작
   */
  static startDailyLogCleanup(): void {
    if (this.isRunning) {
      console.log('⚠️ 로그 정리 스케줄러가 이미 실행 중입니다.');
      return;
    }

    console.log('🕐 매일 밤 12시 로그 정리 스케줄러 시작');
    
    // 서버 시작 시 즉시 한 번 실행
    this.runCleanup();
    
    // 매일 밤 12시에 실행되도록 스케줄링
    this.scheduleNextMidnightCleanup();
    
    this.isRunning = true;
  }

  /**
   * 다음 밤 12시까지의 시간을 계산하여 스케줄링
   */
  private static scheduleNextMidnightCleanup(): void {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0); // 다음 날 밤 12시
    
    const timeUntilMidnight = midnight.getTime() - now.getTime();
    
    console.log(`⏰ 다음 로그 정리 예정: ${midnight.toLocaleString('ko-KR')}`);
    
    this.dailyCleanupTimeout = setTimeout(() => {
      this.runCleanup();
      // 정리 후 다음 날 밤 12시를 위해 다시 스케줄링
      this.scheduleNextMidnightCleanup();
    }, timeUntilMidnight);
  }

  /**
   * 로그 정리 스케줄러 중지
   */
  static stopLogCleanup(): void {
    if (this.dailyCleanupTimeout) {
      clearTimeout(this.dailyCleanupTimeout);
      this.dailyCleanupTimeout = null;
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
    
    // 즉시 한 번 실행
    this.runCleanup();
    
    // 1분마다 실행
    this.dailyCleanupTimeout = setInterval(() => {
      this.runCleanup();
    }, 60 * 1000); // 1분
    
    this.isRunning = true;
  }
}
