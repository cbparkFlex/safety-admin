'use client';

import { useState, useEffect } from 'react';
import { Users, Bell, TrendingUp, TrendingDown, Clock, Wrench, Mountain, AlertTriangle } from 'lucide-react';

interface DetectionEvent {
  time: string;
  message: string;
}

interface AttendanceWorker {
  id: number;
  name: string;
  workField: string;
  checkInTime: string;
  equipmentId: string;
  createdAt: string;
}

interface AlertMessage {
  id: string;
  type: 'danger' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  isActive: boolean;
}

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState('');
  const [attendanceWorkers, setAttendanceWorkers] = useState<AttendanceWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alertMessages, setAlertMessages] = useState<AlertMessage[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(true); // 오디오 활성화 상태
  
  const [detectionEvents] = useState<DetectionEvent[]>([
    { time: '08:32', message: 'A동 4번 센서 \'주의\' 단계 감지' },
    { time: '08:32', message: 'B동 6번 센서 정상화' },
    { time: '08:32', message: '헬멧 미착용 알림 해제' },
    { time: '08:32', message: 'A동 4번 센서 정상화' },
  ]);

  // 알림 메시지 추가 함수
  const addAlertMessage = (alert: Omit<AlertMessage, 'id' | 'timestamp'>) => {
    const newAlert: AlertMessage = {
      ...alert,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setAlertMessages(prev => [newAlert, ...prev]);
    
    // 활성 알림인 경우에만 소리 재생
    if (alert.isActive) {
      playAlertSound(alert.type);
    }
  };

  // 알림 메시지 제거 함수
  const removeAlertMessage = (id: string) => {
    setAlertMessages(prev => prev.filter(alert => alert.id !== id));
  };

  // 알림 메시지 비활성화 함수
  const deactivateAlert = (id: string) => {
    setAlertMessages(prev => 
      prev.map(alert => 
        alert.id === id ? { ...alert, isActive: false } : alert
      )
    );
  };

  // 출근 작업자 데이터 가져오기
  const fetchAttendanceWorkers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/workers/attendance');
      const result = await response.json();
      
      if (result.success) {
        setAttendanceWorkers(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('출근 작업자 데이터를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formattedTime = now.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) + ' ' + now.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      setCurrentTime(formattedTime);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    
    // 출근 작업자 데이터 가져오기
    fetchAttendanceWorkers();

    // 시뮬레이션: 가스 누출 감지 알림 추가
    const alertInterval = setInterval(() => {
      const random = Math.random();
      if (random < 0.05) { // 5% 확률로 위험 알림 생성
        const buildings = ['A동', 'B동', 'C동', 'D동'];
        const building = buildings[Math.floor(Math.random() * buildings.length)];
        const sensorNumber = Math.floor(Math.random() * 20) + 1;
        
        addAlertMessage({
          type: 'danger',
          title: '가스 누출 감지',
          message: `${building} ${sensorNumber}번 센서 '위험' 단계 감지`,
          isActive: true,
        });
      } else if (random < 0.15) { // 10% 확률로 주의 알림 생성
        const buildings = ['A동', 'B동', 'C동', 'D동'];
        const building = buildings[Math.floor(Math.random() * buildings.length)];
        const sensorNumber = Math.floor(Math.random() * 20) + 1;
        
        addAlertMessage({
          type: 'warning',
          title: '가스 누출 주의',
          message: `${building} ${sensorNumber}번 센서 '주의' 단계 감지`,
          isActive: true,
        });
      }
    }, 30000); // 30초마다 체크

    // 시뮬레이션: 센서 정상화 알림
    const normalInterval = setInterval(() => {
      const random = Math.random();
      if (random < 0.1) { // 10% 확률로 정상화 알림 생성
        const buildings = ['A동', 'B동', 'C동', 'D동'];
        const building = buildings[Math.floor(Math.random() * buildings.length)];
        const sensorNumber = Math.floor(Math.random() * 20) + 1;
        
        addAlertMessage({
          type: 'info',
          title: '센서 정상화',
          message: `${building} ${sensorNumber}번 센서 정상화`,
          isActive: false,
        });
      }
    }, 45000); // 45초마다 체크

    return () => {
      clearInterval(interval);
      clearInterval(alertInterval);
      clearInterval(normalInterval);
    };
  }, []);

  // 현재 활성화된 알림 메시지
  const activeAlert = alertMessages.find(alert => alert.isActive);

  // 테스트용 알림 생성 함수
  const createTestAlert = (type: 'danger' | 'warning' | 'info') => {
    const buildings = ['A동', 'B동', 'C동', 'D동'];
    const building = buildings[Math.floor(Math.random() * buildings.length)];
    const sensorNumber = Math.floor(Math.random() * 20) + 1;
    
    const alertData = {
      type,
      title: type === 'danger' ? '가스 누출 감지' : type === 'warning' ? '가스 누출 주의' : '센서 정상화',
      message: type === 'info' 
        ? `${building} ${sensorNumber}번 센서 정상화`
        : `${building} ${sensorNumber}번 센서 '${type === 'danger' ? '위험' : '주의'}' 단계 감지`,
      isActive: type !== 'info',
    };
    
    addAlertMessage(alertData);
  };

  // 오디오 알림 재생 함수
  const playAlertSound = (type: 'danger' | 'warning' | 'info') => {
    if (!audioEnabled) return;
    
    try {
      // Web Audio API를 사용하여 알림음 생성
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // 알림 타입별 다른 주파수와 지속시간
      const frequency = type === 'danger' ? 800 : type === 'warning' ? 600 : 400;
      const duration = type === 'danger' ? 0.3 : type === 'warning' ? 0.2 : 0.1;
      const beepCount = type === 'danger' ? 3 : type === 'warning' ? 2 : 1;
      
      for (let i = 0; i < beepCount; i++) {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + duration);
        }, i * (duration * 1000 + 100));
      }
    } catch (error) {
      console.log('오디오 재생 실패:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* 테스트 버튼 (개발용) */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-800 mb-3">🧪 테스트 도구</h3>
        <div className="flex space-x-2 mb-3">
          <button 
            onClick={() => createTestAlert('danger')}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            위험 알림 생성
          </button>
          <button 
            onClick={() => createTestAlert('warning')}
            className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
          >
            주의 알림 생성
          </button>
          <button 
            onClick={() => createTestAlert('info')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            정상화 알림 생성
          </button>
          <button 
            onClick={() => setAlertMessages([])}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            모든 알림 제거
          </button>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">🔊 오디오 알림:</span>
            <button 
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                audioEnabled 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-gray-400 text-white hover:bg-gray-500'
              }`}
            >
              {audioEnabled ? '켜짐' : '꺼짐'}
            </button>
          </div>
          <button 
            onClick={() => playAlertSound('danger')}
            className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 transition-colors"
          >
            🔊 소리 테스트
          </button>
        </div>
      </div>

      {/* 알림 메시지 영역 */}
      {activeAlert && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <div>
                <h3 className="text-lg font-semibold text-red-800">{activeAlert.title}</h3>
                <p className="text-red-700">{activeAlert.message}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => deactivateAlert(activeAlert.id)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                비상 프로토콜 실행
              </button>
              <button 
                onClick={() => deactivateAlert(activeAlert.id)}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                경고 방송
              </button>
              <button 
                onClick={() => removeAlertMessage(activeAlert.id)}
                className="bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                알람 해제
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-3 gap-6 space-y-4">
          {/* 상단 카드들 - 1:1:1:2 비율 */}
          
          <div className="grid grid-cols-5 gap-6">
            <div className="text-lg font-semibold col-span-3 text-gray-900">출근자 정보</div>
            <div className="text-lg font-semibold text-gray-900">감지 기록</div>
          </div>
          <div className="grid grid-cols-5 gap-8">
            {/* 출근 작업자 */}
            <div className="bg-[#1E4E8B] text-white rounded-lg p-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-8 h-8 text-blue-200" />
                  <p className="text-blue-100 text-sm">출근 작업자</p>
                </div>
                <div className="text-[35px] font-bold">{attendanceWorkers.length}명</div>
              </div>
            </div>

            {/* 안전모 정상 착용 */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">안전모 정상 착용</span>
                <Bell className="w-[40px] h-[40px] text-white bg-[#34D399] rounded-full p-1" />
              </div>
              
              
              <div className="flex items-center justify-between space-x-2">
                <span className="text-[35px] font-bold">{attendanceWorkers.length}명</span>
                <div>
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-500">7.5% 전일 대비 감소</span>
                </div>
              </div>
            </div>

            {/* 안전모 미착용 감지 */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">안전모 미착용 감지</span>
                <Bell className="w-[40px] h-[40px] text-white bg-[#F25959] rounded-full p-1" />
              </div>
              
              
              <div className="flex items-center justify-between space-x-2">
                <span className="text-[35px] font-bold">6건</span>
                <div>
                  <TrendingUp className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-500">7.5% 전일 대비 증가</span>
                </div>
              </div>
            </div>

            {/* 감지 기록 */}
            <div className="col-span-2 bg-white rounded-lg p-6 shadow-sm">
              <div className="space-y-3">
                {detectionEvents.map((event, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <span className="text-sm text-gray-500 min-w-[40px]">{event.time}</span>
                  <span className="text-sm text-gray-700">{event.message}</span>
                </div>
                ))}
              </div>
            </div>
          </div>

          {/* 가스 누출 감지 센서 - 전체 너비 */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex justify-between">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">가스 누출 감지 센서</h3>
                {/* 범례 */}
                <div className="flex items-center space-x-4 mb-4">
                    <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">안전</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">주의</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">위험</span>
                    </div>
                </div>
            </div>
            <div className="relative">
              {/* 배경 이미지 */}
              <div className="w-full h-[603px] bg-gray-100 rounded-lg flex items-center justify-center">
                <img src="/images/drawing/wrapper.png" alt="건물 평면도" className="w-full h-full object-contain" />
              </div>
              
              {/* B동 센서들 - absolute 포지션 */}
              <div className="absolute inset-0">
                {/* B동 센서 1-4 */}
                <div className="absolute top-[7%] left-[26%]">
                  <div className="bg-green-100 border border-green-300 rounded p-2 text-center w-16 h-16 flex flex-col justify-center">
                    <div className="text-xs font-medium text-green-800">1번</div>
                    <div className="text-xs text-green-600">안전</div>
                    <div className="text-xs text-green-600">0.03ppm</div>
                  </div>
                </div>
                <div className="absolute top-[7%] left-[30%]">
                  <div className="bg-green-100 border border-green-300 rounded p-2 text-center w-16 h-16 flex flex-col justify-center">
                    <div className="text-xs font-medium text-green-800">2번</div>
                    <div className="text-xs text-green-600">안전</div>
                    <div className="text-xs text-green-600">0.03ppm</div>
                  </div>
                </div>
                <div className="absolute top-[7%] left-[34%]">
                  <div className="bg-green-100 border border-green-300 rounded p-2 text-center w-16 h-16 flex flex-col justify-center">
                    <div className="text-xs font-medium text-green-800">3번</div>
                    <div className="text-xs text-green-600">안전</div>
                    <div className="text-xs text-green-600">0.03ppm</div>
                  </div>
                </div>
                <div className="absolute top-[7%] left-[45%]">
                  <div className="bg-green-100 border border-green-300 rounded p-2 text-center w-16 h-16 flex flex-col justify-center">
                    <div className="text-xs font-medium text-green-800">4번</div>
                    <div className="text-xs text-green-600">안전</div>
                    <div className="text-xs text-green-600">0.03ppm</div>
                  </div>
                </div>

                {/* B동 센서 5-8 */}
                <div className="absolute top-[20%] left-[15%]">
                  <div className="bg-green-100 border border-green-300 rounded p-2 text-center w-16 h-16 flex flex-col justify-center">
                    <div className="text-xs font-medium text-green-800">5번</div>
                    <div className="text-xs text-green-600">안전</div>
                    <div className="text-xs text-green-600">0.03ppm</div>
                  </div>
                </div>
                <div className="absolute top-[20%] left-[25%]">
                  <div className="bg-green-100 border border-green-300 rounded p-2 text-center w-16 h-16 flex flex-col justify-center">
                    <div className="text-xs font-medium text-green-800">6번</div>
                    <div className="text-xs text-green-600">안전</div>
                    <div className="text-xs text-green-600">0.03ppm</div>
                  </div>
                </div>
                <div className="absolute top-[20%] left-[35%]">
                  <div className="bg-green-100 border border-green-300 rounded p-2 text-center w-16 h-16 flex flex-col justify-center">
                    <div className="text-xs font-medium text-green-800">7번</div>
                    <div className="text-xs text-green-600">안전</div>
                    <div className="text-xs text-green-600">0.03ppm</div>
                  </div>
                </div>
                <div className="absolute top-[20%] left-[45%]">
                  <div className="bg-green-100 border border-green-300 rounded p-2 text-center w-16 h-16 flex flex-col justify-center">
                    <div className="text-xs font-medium text-green-800">8번</div>
                    <div className="text-xs text-green-600">안전</div>
                    <div className="text-xs text-green-600">0.03ppm</div>
                  </div>
                </div>

                {/* B동 센서 9-12 */}
                <div className="absolute top-[30%] left-[15%]">
                  <div className="bg-green-100 border border-green-300 rounded p-2 text-center w-16 h-16 flex flex-col justify-center">
                    <div className="text-xs font-medium text-green-800">9번</div>
                    <div className="text-xs text-green-600">안전</div>
                    <div className="text-xs text-green-600">0.03ppm</div>
                  </div>
                </div>
                <div className="absolute top-[30%] left-[25%]">
                  <div className="bg-green-100 border border-green-300 rounded p-2 text-center w-16 h-16 flex flex-col justify-center">
                    <div className="text-xs font-medium text-green-800">10번</div>
                    <div className="text-xs text-green-600">안전</div>
                    <div className="text-xs text-green-600">0.03ppm</div>
                  </div>
                </div>
                <div className="absolute top-[30%] left-[35%]">
                  <div className="bg-green-100 border border-green-300 rounded p-2 text-center w-16 h-16 flex flex-col justify-center">
                    <div className="text-xs font-medium text-green-800">11번</div>
                    <div className="text-xs text-green-600">안전</div>
                    <div className="text-xs text-green-600">0.03ppm</div>
                  </div>
                </div>
                <div className="absolute top-[30%] left-[45%]">
                  <div className="bg-green-100 border border-green-300 rounded p-2 text-center w-16 h-16 flex flex-col justify-center">
                    <div className="text-xs font-medium text-green-800">12번</div>
                    <div className="text-xs text-green-600">안전</div>
                    <div className="text-xs text-green-600">0.03ppm</div>
                  </div>
                </div>

                {/* B동 센서 13-14 */}
                <div className="absolute top-[40%] left-[15%]">
                  <div className="bg-green-100 border border-green-300 rounded p-2 text-center w-16 h-16 flex flex-col justify-center">
                    <div className="text-xs font-medium text-green-800">13번</div>
                    <div className="text-xs text-green-600">안전</div>
                    <div className="text-xs text-green-600">0.03ppm</div>
                  </div>
                </div>
                <div className="absolute top-[40%] left-[25%]">
                  <div className="bg-green-100 border border-green-300 rounded p-2 text-center w-16 h-16 flex flex-col justify-center">
                    <div className="text-xs font-medium text-green-800">14번</div>
                    <div className="text-xs text-green-600">안전</div>
                    <div className="text-xs text-green-600">0.03ppm</div>
                  </div>
                </div>

                {/* A동 센서들 */}
                <div className="absolute top-[7%] right-[25%]">
                  <div className="bg-green-100 border border-green-300 rounded p-2 text-center w-16 h-16 flex flex-col justify-center">
                    <div className="text-xs font-medium text-green-800">1번</div>
                    <div className="text-xs text-green-600">안전</div>
                    <div className="text-xs text-green-600">0.03ppm</div>
                  </div>
                </div>
                <div className="absolute top-[7%] right-[15%]">
                  <div className="bg-green-100 border border-green-300 rounded p-2 text-center w-16 h-16 flex flex-col justify-center">
                    <div className="text-xs font-medium text-green-800">2번</div>
                    <div className="text-xs text-green-600">안전</div>
                    <div className="text-xs text-green-600">0.03ppm</div>
                  </div>
                </div>
                <div className="absolute top-[7%] right-[5%]">
                  <div className="bg-green-100 border border-green-300 rounded p-2 text-center w-16 h-16 flex flex-col justify-center">
                    <div className="text-xs font-medium text-green-800">3번</div>
                    <div className="text-xs text-green-600">안전</div>
                    <div className="text-xs text-green-600">0.03ppm</div>
                  </div>
                </div>

                <div className="absolute top-[20%] right-[25%]">
                  <div className="bg-green-100 border border-green-300 rounded p-2 text-center w-16 h-16 flex flex-col justify-center">
                    <div className="text-xs font-medium text-green-800">4번</div>
                    <div className="text-xs text-green-600">안전</div>
                    <div className="text-xs text-green-600">0.03ppm</div>
                  </div>
                </div>
                <div className="absolute top-[20%] right-[15%]">
                  <div className="bg-green-100 border border-green-300 rounded p-2 text-center w-16 h-16 flex flex-col justify-center">
                    <div className="text-xs font-medium text-green-800">5번</div>
                    <div className="text-xs text-green-600">안전</div>
                    <div className="text-xs text-green-600">0.03ppm</div>
                  </div>
                </div>
                <div className="absolute top-[20%] right-[5%]">
                  <div className="bg-green-100 border border-green-300 rounded p-2 text-center w-16 h-16 flex flex-col justify-center">
                    <div className="text-xs font-medium text-green-800">6번</div>
                    <div className="text-xs text-green-600">안전</div>
                    <div className="text-xs text-green-600">0.03ppm</div>
                  </div>
                </div>

                <div className="absolute top-[30%] right-[25%]">
                  <div className="bg-green-100 border border-green-300 rounded p-2 text-center w-16 h-16 flex flex-col justify-center">
                    <div className="text-xs font-medium text-green-800">7번</div>
                    <div className="text-xs text-green-600">안전</div>
                    <div className="text-xs text-green-600">0.03ppm</div>
                  </div>
                </div>
                <div className="absolute top-[30%] right-[15%]">
                  <div className="bg-green-100 border border-green-300 rounded p-2 text-center w-16 h-16 flex flex-col justify-center">
                    <div className="text-xs font-medium text-green-800">8번</div>
                    <div className="text-xs text-green-600">안전</div>
                    <div className="text-xs text-green-600">0.03ppm</div>
                  </div>
                </div>
                <div className="absolute top-[30%] right-[5%]">
                  <div className="bg-green-100 border border-green-300 rounded p-2 text-center w-16 h-16 flex flex-col justify-center">
                    <div className="text-xs font-medium text-green-800">9번</div>
                    <div className="text-xs text-green-600">안전</div>
                    <div className="text-xs text-green-600">0.03ppm</div>
                  </div>
                </div>

                {/* 사무동 */}
                <div className="absolute bottom-[20%] left-[20%]">
                  <div className="bg-gray-100 border border-gray-300 rounded p-4 w-24 h-16 flex items-center justify-center">
                    <span className="text-gray-500 text-xs">사무실</span>
                  </div>
                </div>

                {/* LPG 저장소 */}
                <div className="absolute bottom-[20%] right-[20%]">
                  <div className="bg-orange-100 border border-orange-300 rounded p-4 w-24 h-16 flex items-center justify-center">
                    <span className="text-orange-700 text-xs">LPG 저장소</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          {/* 실시간 CCTV */}
          <h3 className="text-lg font-semibold text-gray-900 mb-4">실시간 CCTV</h3>
          <div className="lg:col-span-2 bg-white rounded-lg p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-4">
              {/* A동 출입구 */}
              <div className="relative">
                <div className="bg-gray-200 rounded-lg h-[260px] flex items-center justify-center">
                  <span className="text-gray-500 text-sm">A동 출입구</span>
                </div>
                <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                  UNSAFETY
                </div>
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                  SAFETY
                </div>
              </div>
              {/* B동 출입구 */}
              <div className="relative">
                <div className="bg-gray-200 rounded-lg h-[260px] flex items-center justify-center">
                  <span className="text-gray-500 text-sm">B동 출입구</span>
                </div>
              </div>
                
              {/* LPG 저장소 */}
              <div className="relative">
                <div className="bg-gray-200 rounded-lg h-[260px] flex items-center justify-center">
                  <span className="text-gray-500 text-sm">LPG 저장소</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 출근 작업자 목록 - 좌우 스크롤 */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">출근 작업자 목록</h3>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">출근 작업자 정보를 불러오는 중...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-red-500">{error}</div>
          </div>
        ) : (
          <div className="flex max-w-full">
            <div className="flex overflow-x-auto gap-6">
              {attendanceWorkers.map((worker) => (
                <div key={worker.id} className="border border-gray-200 rounded-lg p-4 flex-shrink-0 bg-white shadow-sm">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <Mountain className="w-6 h-6 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{worker.name}</p>
                      <p className="text-sm text-gray-600">{worker.workField}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>출근 시간: {worker.checkInTime}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Wrench className="w-4 h-4" />
                      <span>장비 번호: {worker.equipmentId}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
