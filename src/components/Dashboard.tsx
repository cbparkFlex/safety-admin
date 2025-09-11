'use client';

import { useState, useEffect } from 'react';
import { Users, Bell, TrendingUp, TrendingDown, Clock, Wrench, Mountain, AlertTriangle, History, Eye } from 'lucide-react';
import EmergencyPopup from './EmergencyPopup';
import { useRouter } from 'next/navigation';

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

interface EmergencyRecord {
  id: number;
  type: string;
  title: string;
  description: string;
  location: string;
  severity: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  sop: {
    name: string;
    type: string;
  };
  executions: Array<{
    id: number;
    stepNumber: number;
    status: string;
    executedAt?: string;
    notes?: string;
    step: {
      title: string;
      stepNumber: number;
    };
  }>;
}

export default function Dashboard() {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState('');
  const [attendanceWorkers, setAttendanceWorkers] = useState<AttendanceWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alertMessages, setAlertMessages] = useState<AlertMessage[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(true); // 오디오 활성화 상태
  
  const [surveillanceRecords, setSurveillanceRecords] = useState<any[]>([]);
  const [gasSensors, setGasSensors] = useState<any[]>([]);
  const [gasSensorStats, setGasSensorStats] = useState({
    total: 0,
    safe: 0,
    warning: 0,
    danger: 0,
    critical: 0,
  });

  // 비상 상황 관련 상태
  const [activeEmergency, setActiveEmergency] = useState<any>(null);
  const [showEmergencyPopup, setShowEmergencyPopup] = useState(false);
  
  // 비상상황 기록 상태
  const [emergencyRecords, setEmergencyRecords] = useState<EmergencyRecord[]>([]);

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

  // 비상 상황 처리 함수들
  const handleEmergencyProtocol = async (type: string) => {
    try {
      // 먼저 해당 상황에 맞는 알림 생성
      const alertType = getAlertTypeForEmergency(type);
      addAlertMessage({
        type: alertType,
        title: getEmergencyTitle(type),
        message: getEmergencyDescription(type),
        isActive: true
      });

      // 해당 유형의 SOP 조회
      const sopResponse = await fetch(`/api/emergency/sops?type=${type}`);
      const sopData = await sopResponse.json();
      
      if (sopData.success && sopData.data.length > 0) {
        const sop = sopData.data[0]; // 첫 번째 활성 SOP 사용
        
        // 비상 상황 기록 생성
        const incidentResponse = await fetch('/api/emergency/incidents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sopId: sop.id,
            type: type,
            title: getEmergencyTitle(type),
            description: getEmergencyDescription(type),
            location: '작업장',
            severity: getSeverityForEmergency(type)
          })
        });

        if (incidentResponse.ok) {
          const incidentData = await incidentResponse.json();
          setActiveEmergency(incidentData.data.incident);
          setShowEmergencyPopup(true);
        }
      }
    } catch (error) {
      console.error('비상 상황 처리 실패:', error);
    }
  };

  const getAlertTypeForEmergency = (type: string) => {
    const alertTypes = {
      lpg_gas_leak: 'danger',
      safety_equipment: 'warning',
      crane_worker: 'warning',
      lpg_explosion: 'danger'
    };
    return alertTypes[type as keyof typeof alertTypes] || 'danger';
  };

  const getSeverityForEmergency = (type: string) => {
    const severities = {
      lpg_gas_leak: 'high',
      safety_equipment: 'medium',
      crane_worker: 'medium',
      lpg_explosion: 'critical'
    };
    return severities[type as keyof typeof severities] || 'high';
  };

  const getEmergencyTitle = (type: string) => {
    const titles = {
      lpg_gas_leak: 'LPG 가스 누출 감지',
      safety_equipment: '안전장구 미착용 감지',
      crane_worker: '크레인 작업 반경 침입',
      lpg_explosion: 'LPG 폭발 위험 감지'
    };
    return titles[type as keyof typeof titles] || '비상 상황 발생';
  };

  const getEmergencyDescription = (type: string) => {
    const descriptions = {
      lpg_gas_leak: 'LPG 센서에서 가스 누출이 감지되었습니다.',
      safety_equipment: '작업자가 안전장구를 착용하지 않은 상태로 감지되었습니다.',
      crane_worker: '크레인 작업 반경 내에 작업자가 진입했습니다.',
      lpg_explosion: 'CCTV에서 LPG 저장소 주변에 폭발 위험이 감지되었습니다.'
    };
    return descriptions[type as keyof typeof descriptions] || '비상 상황이 발생했습니다.';
  };

  const handleEmergencyComplete = async (incidentId?: number) => {
    if (incidentId) {
      // 비상 상황 완료 시
      setActiveEmergency(null);
      setShowEmergencyPopup(false);
      // 완료된 비상 상황에 대한 알림 추가
      addAlertMessage({
        type: 'info',
        title: '비상 상황 완료',
        message: '비상 상황이 성공적으로 처리되었습니다.',
        isActive: true
      });
      // 비상상황 기록 새로고침
      fetchEmergencyRecords();
    } else {
      // 단계 완료 시 - 현재 비상 상황 데이터 새로고침
      if (activeEmergency) {
        try {
          const response = await fetch(`/api/emergency/incidents/${activeEmergency.id}`);
          if (response.ok) {
            const data = await response.json();
            setActiveEmergency(data.data);
          }
        } catch (error) {
          console.error('비상 상황 데이터 새로고침 실패:', error);
        }
      }
      // 비상상황 기록도 새로고침
      fetchEmergencyRecords();
    }
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

  // 감시 기록 데이터 가져오기
  const fetchSurveillanceRecords = async () => {
    try {
      const response = await fetch('/api/surveillance-records?limit=5');
      const result = await response.json();
      
      if (result.success) {
        setSurveillanceRecords(result.data);
      }
    } catch (err) {
      console.error('감시 기록 데이터를 가져오는 중 오류가 발생했습니다:', err);
    }
  };

  // 가스 센서 데이터 가져오기
  const fetchGasSensors = async () => {
    try {
      const response = await fetch('/api/gas-sensors');
      const result = await response.json();
      
      if (result.success) {
        setGasSensors(result.data);
        setGasSensorStats(result.stats);
      }
    } catch (err) {
      console.error('가스 센서 데이터를 가져오는 중 오류가 발생했습니다:', err);
    }
  };

  const fetchEmergencyRecords = async () => {
    try {
      const response = await fetch('/api/emergency/incidents?limit=5');
      const result = await response.json();
      
      if (result.success) {
        setEmergencyRecords(result.data);
      }
    } catch (err) {
      console.error('비상상황 기록 데이터를 가져오는 중 오류가 발생했습니다:', err);
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
    // 감시 기록 데이터 가져오기
    fetchSurveillanceRecords();
    // 가스 센서 데이터 가져오기
    fetchGasSensors();
    // 비상상황 기록 데이터 가져오기
    fetchEmergencyRecords();

    // 가스 센서 데이터 실시간 업데이트 (5초마다)
    const gasSensorInterval = setInterval(() => {
      fetchGasSensors();
    }, 5000);

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
      clearInterval(gasSensorInterval);
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
        <h3 className="text-lg font-semibold text-blue-800 mb-3">🧪 비상 상황 테스트 도구</h3>
        
        {/* 비상 상황별 테스트 버튼 */}
        <div className="mb-4">
          <h4 className="text-md font-medium text-blue-700 mb-2">비상 상황 SOP 테스트</h4>
          <p className="text-xs text-gray-600 mb-3">각 버튼을 클릭하면 해당 비상 상황의 SOP 팝업이 실행됩니다.</p>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => handleEmergencyProtocol('lpg_gas_leak')}
              className="bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition-colors text-sm flex flex-col items-center group relative"
              title="LPG 센서에서 가스 누출이 감지되었을 때의 대응 절차를 테스트합니다."
            >
              <span className="font-semibold">🚨 LPG 가스 누출</span>
              <span className="text-xs opacity-90">5단계 SOP</span>
              <span className="text-xs opacity-75 mt-1">즉시 작업 중단 → 가스 차단 → 환기 → 신고 → 안전 확인</span>
            </button>
            <button 
              onClick={() => handleEmergencyProtocol('safety_equipment')}
              className="bg-orange-600 text-white px-4 py-3 rounded-lg hover:bg-orange-700 transition-colors text-sm flex flex-col items-center group relative"
              title="작업자가 안전장구를 착용하지 않은 상태로 감지되었을 때의 대응 절차를 테스트합니다."
            >
              <span className="font-semibold">⚠️ 안전장구 미착용</span>
              <span className="text-xs opacity-90">4단계 SOP</span>
              <span className="text-xs opacity-75 mt-1">작업 중단 → 안전장구 착용 → 교육 → 작업 재개</span>
            </button>
            <button 
              onClick={() => handleEmergencyProtocol('crane_worker')}
              className="bg-yellow-600 text-white px-4 py-3 rounded-lg hover:bg-yellow-700 transition-colors text-sm flex flex-col items-center group relative"
              title="크레인 작업 반경 내에 작업자가 진입했을 때의 대응 절차를 테스트합니다."
            >
              <span className="font-semibold">🏗️ 크레인 반경 침입</span>
              <span className="text-xs opacity-90">4단계 SOP</span>
              <span className="text-xs opacity-75 mt-1">크레인 중단 → 작업자 대피 → 안전 확인 → 작업 재개</span>
            </button>
            <button 
              onClick={() => handleEmergencyProtocol('lpg_explosion')}
              className="bg-red-800 text-white px-4 py-3 rounded-lg hover:bg-red-900 transition-colors text-sm flex flex-col items-center group relative"
              title="CCTV에서 LPG 저장소 주변에 폭발 위험이 감지되었을 때의 대응 절차를 테스트합니다."
            >
              <span className="font-semibold">💥 LPG 폭발 위험</span>
              <span className="text-xs opacity-90">5단계 SOP</span>
              <span className="text-xs opacity-75 mt-1">전체 대피 → 긴급 신고 → 가스 차단 → 전기 차단 → 전문가 대기</span>
            </button>
          </div>
        </div>

        {/* 기존 알림 테스트 버튼 */}
        <div className="mb-3">
          <h4 className="text-md font-medium text-blue-700 mb-2">일반 알림 테스트</h4>
          <div className="flex space-x-2">
            <button 
              onClick={() => createTestAlert('danger')}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              위험 알림 생성
            </button>
            <button 
              onClick={() => createTestAlert('warning')}
              className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm"
            >
              주의 알림 생성
            </button>
            <button 
              onClick={() => createTestAlert('info')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              정상화 알림 생성
            </button>
            <button 
              onClick={() => setAlertMessages([])}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm"
            >
              모든 알림 제거
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between">
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
          
          {/* 비상 상황 기록 상태 */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">📊 비상 상황 기록:</span>
            <button 
              onClick={() => window.open('/emergency', '_blank')}
              className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700 transition-colors"
            >
              관리 페이지 열기
            </button>
            <button 
              onClick={() => {
                // 모든 비상 상황 기록 삭제 (테스트용)
                if (confirm('모든 비상 상황 기록을 삭제하시겠습니까? (테스트용)')) {
                  fetch('/api/emergency/incidents', { method: 'DELETE' })
                    .then(() => {
                      alert('비상 상황 기록이 삭제되었습니다.');
                    })
                    .catch(() => {
                      alert('삭제에 실패했습니다.');
                    });
                }
              }}
              className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600 transition-colors"
            >
              기록 초기화
            </button>
          </div>
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
                onClick={() => handleEmergencyProtocol('lpg_gas_leak')}
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

            {/* 가스 누출 감지 */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">가스 누출 감지</span>
                <Bell className="w-[40px] h-[40px] text-white bg-[#F25959] rounded-full p-1" />
              </div>
              
              <div className="flex items-center justify-between space-x-2">
                <span className="text-[35px] font-bold">{gasSensorStats.critical + gasSensorStats.danger}</span>
                <div>
                  <TrendingUp className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-500">
                    {gasSensorStats.critical > 0 ? '치명적' : gasSensorStats.danger > 0 ? '위험' : '정상'}
                  </span>
                </div>
              </div>
            </div>
            {/* 비상상황 기록 */}
            <div className="col-span-2 bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">비상상황 기록</h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={fetchEmergencyRecords}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    새로고침
                  </button>
                  <button 
                    onClick={() => router.push('/emergency/records')}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <History className="w-4 h-4" />
                    전체보기
                  </button>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                {emergencyRecords.length > 0 ? (
                  emergencyRecords.map((record, index) => (
                    <div key={record.id || index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          record.severity === 'critical' ? 'bg-purple-500' :
                          record.severity === 'high' ? 'bg-red-500' :
                          record.severity === 'medium' ? 'bg-yellow-500' :
                          'bg-blue-500'
                        }`}></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {record.title}
                          </h4>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            record.status === 'active' ? 'bg-red-100 text-red-800' :
                            record.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                            record.status === 'completed' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {record.status === 'active' ? '진행중' :
                            record.status === 'in_progress' ? '처리중' :
                            record.status === 'completed' ? '완료' : '취소'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {record.type === 'lpg_gas_leak' ? 'LPG 가스 누출' :
                          record.type === 'safety_equipment' ? '안전장구 미착용' :
                          record.type === 'crane_worker' ? '크레인 반경 내 작업자' :
                          record.type === 'lpg_explosion' ? 'LPG 폭발 감지' : record.type}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(record.startedAt).toLocaleString('ko-KR')}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">
                            완료: {record.executions.filter(exec => exec.status === 'completed').length}/{record.executions.length}단계
                          </span>
                          <button
                            onClick={() => router.push(`/emergency/records/${record.id}`)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                          >
                            <Eye className="w-3 h-3" />
                            상세보기
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>비상상황 기록이 없습니다.</p>
                  </div>
                )}
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
                {/* <img src="/images/drawing/wrapper.png" alt="건물 평면도" className="w-full h-full object-contain" /> */}
              </div>
              
              {/* B동 센서들 - 12개 배치 */}
              <div className="absolute inset-0">
                {/* B동 센서들 - 12개 배치 */}
                <div className="absolute top-[1%] left-[22%] w-[17%] h-[98%] border-2 border-gray-300 rounded-lg">
                  {gasSensors.filter(sensor => sensor.building === 'B동').map((sensor) => {
                    const getStatusColor = (status: string) => {
                      switch (status) {
                        case 'critical':
                          return 'bg-red-100 border-red-300 text-red-800';
                        case 'danger':
                          return 'bg-orange-100 border-orange-300 text-orange-800';
                        case 'warning':
                          return 'bg-yellow-100 border-yellow-300 text-yellow-800';
                        case 'safe':
                        default:
                          return 'bg-green-100 border-green-300 text-green-800';
                      }
                    };

                    const getStatusText = (status: string) => {
                      switch (status) {
                        case 'critical':
                          return '치명적';
                        case 'danger':
                          return '위험';
                        case 'warning':
                          return '주의';
                        case 'safe':
                        default:
                          return '안전';
                      }
                    };

                    return (
                      <div
                        key={sensor.id}
                        className="absolute"
                        style={{
                          top: sensor.position.top,
                          ...(sensor.position.left ? { left: sensor.position.left } : { right: sensor.position.right })
                        }}
                      >
                        <div className={`border rounded p-2 text-center w-16 h-16 flex flex-col justify-center ${getStatusColor(sensor.status)}`}>
                          <div className="text-xs font-medium">{sensor.name}</div>
                          <div className="text-xs">{getStatusText(sensor.status)}</div>
                          <div className="text-xs">{sensor.ppm.toFixed(3)}ppm</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* A동 센서들 - 11개 배치 */}
                <div>
                {gasSensors.filter(sensor => sensor.building === 'A동').map((sensor) => {
                    const getStatusColor = (status: string) => {
                      switch (status) {
                        case 'critical':
                          return 'bg-red-100 border-red-300 text-red-800';
                        case 'danger':
                          return 'bg-orange-100 border-orange-300 text-orange-800';
                        case 'warning':
                          return 'bg-yellow-100 border-yellow-300 text-yellow-800';
                        case 'safe':
                        default:
                          return 'bg-green-100 border-green-300 text-green-800';
                      }
                    };

                    const getStatusText = (status: string) => {
                      switch (status) {
                        case 'critical':
                          return '치명적';
                        case 'danger':
                          return '위험';
                        case 'warning':
                          return '주의';
                        case 'safe':
                        default:
                          return '안전';
                      }
                    };

                    return (
                      <div
                        key={sensor.id}
                        className="absolute"
                        style={{
                          top: sensor.position.top,
                          ...(sensor.position.left ? { left: sensor.position.left } : { right: sensor.position.right })
                        }}
                      >
                        <div className={`border rounded p-2 text-center w-16 h-16 flex flex-col justify-center ${getStatusColor(sensor.status)}`}>
                          <div className="text-xs font-medium">{sensor.name}</div>
                          <div className="text-xs">{getStatusText(sensor.status)}</div>
                          <div className="text-xs">{sensor.ppm.toFixed(3)}ppm</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* A동 라인 */}
                <div className="absolute top-[1%] right-[22%] w-[17%] h-[98%] border-2 border-gray-300 rounded-lg rotate-53">
                </div>

                {/* 사무동 */}
                <div className="absolute bottom-[1%] left-[39.1%]">
                  <div className="bg-gray-100 border border-gray-300 rounded p-4 w-24 h-36 flex items-center justify-center">
                    <span className="text-gray-500 text-xs">사무실</span>
                  </div>
                </div>

                {/* LPG 저장소 */}
                <div className="absolute top-[7%] right-[43%]">
                  <div className="bg-orange-100 border border-orange-300 rounded p-4 w-24 h-16 flex items-center justify-center">
                    <span className="text-orange-700 text-xs">LPG 저장소</span>
                  </div>
                </div>

                {/* 카메라 1번*/}
                <div className="absolute top-[10%] right-[37%]">
                  <div className="p-4 w-24 h-16 flex items-center justify-center">
                    <img src="/images/cctv.svg" alt="cctv_1" className="w-full h-full object-contain" />
                  </div>
                </div>
                
                
                {/* 카메라 2번*/}
                <div className="absolute top-[67%] right-[54%]">
                  <div className="p-4 w-24 h-16 flex items-center justify-center">
                    <img src="/images/cctv.svg" alt="cctv_2" className="w-full h-full object-contain" />
                  </div>
                </div>

                
                {/* 카메라 3번*/}
                <div className="absolute top-[90%] right-[38%]">
                  <div className="p-4 w-24 h-16 flex items-center justify-center">
                    <img src="/images/cctv.svg" alt="cctv_3" className="w-full h-full object-contain" />
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

      {/* 비상 상황 팝업 */}
      {showEmergencyPopup && (
        <EmergencyPopup
          incident={activeEmergency}
          onClose={() => setShowEmergencyPopup(false)}
          onComplete={handleEmergencyComplete}
        />
      )}
    </div>
  );
}
