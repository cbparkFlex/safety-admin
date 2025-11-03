'use client';

import { useState, useEffect, useRef } from 'react';
import { Users, Bell, TrendingUp, TrendingDown, Clock, Wrench, Mountain, AlertTriangle, History, Eye, Vibrate } from 'lucide-react';
import EmergencyPopup from './EmergencyPopup';
import { useRouter } from 'next/navigation';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Chart.js 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

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

interface CctvStream {
  id: number;
  name: string;
  description?: string;
  streamUrl: string;
  location?: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
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

  // 센서 매칭 정보와 위치 정보 (고정 데이터)
  const [sensorMappings, setSensorMappings] = useState<any[]>([]);
  const [sensorPositions, setSensorPositions] = useState<any[]>([]);

  // 비상 상황 관련 상태
  const [activeEmergency, setActiveEmergency] = useState<any>(null);
  const [showEmergencyPopup, setShowEmergencyPopup] = useState(false);
  
  // 비상상황 기록 상태
  const [emergencyRecords, setEmergencyRecords] = useState<EmergencyRecord[]>([]);
  
  // 센서 차트 팝업 상태
  const [showSensorChart, setShowSensorChart] = useState(false);
  const [selectedSensor, setSelectedSensor] = useState<any>(null);
  const [sensorChartData, setSensorChartData] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(''); // 선택된 날짜 (YYYY-MM-DD 형식)
  
  // CCTV 스트림 상태 (고정 URL 사용)
  const [cctvStreams, setCctvStreams] = useState<CctvStream[]>([]);
  
  // 고정 CCTV 스트림 URL 정의
  const fixedCctvStreams: CctvStream[] = [
    {
      id: 1,
      name: 'A동 출입구',
      description: 'A동 출입구 CCTV',
      streamUrl: 'http://192.168.31.168:5000/video/cam1',
      location: 'A동 출입구',
      isActive: true,
      order: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 2,
      name: 'B동 출입구',
      description: 'B동 출입구 CCTV',
      streamUrl: 'http://192.168.31.168:5000/video/cam2',
      location: 'B동 출입구',
      isActive: true,
      order: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 3,
      name: 'LPG 저장소',
      description: 'LPG 저장소 CCTV',
      streamUrl: 'http://192.168.31.168:5000/video/cam2',
      location: 'LPG 저장소',
      isActive: true,
      order: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  
  // 날씨 정보 상태
  const [weatherInfo, setWeatherInfo] = useState<{
    temperature: number;
    description: string;
    emoji: string;
    humidity: number;
    windSpeed: number;
    location: string;
  } | null>(null);
  
  // 테스트 도구 토글 상태
  const [isTestToolsExpanded, setIsTestToolsExpanded] = useState(false);
  
  // 이미지 스트림 관련 상태
  const [streamError, setStreamError] = useState<{[key: string]: string | null}>({
    cctv001: null,
    cctv002: null,
    cctv003: null
  });
  const [isStreamLoading, setIsStreamLoading] = useState<{[key: string]: boolean}>({
    cctv001: true,
    cctv002: true,
    cctv003: true
  });
  const [isStreamPaused, setIsStreamPaused] = useState<{[key: string]: boolean}>({
    cctv001: false,
    cctv002: false,
    cctv003: false
  });
  const imageRefs = useRef<{[key: string]: HTMLImageElement | null}>({
    cctv001: null,
    cctv002: null,
    cctv003: null
  });

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

  const getAlertTypeForEmergency = (type: string): 'danger' | 'warning' | 'info' => {
    const alertTypes = {
      lpg_gas_leak: 'danger',
      safety_equipment: 'warning',
      crane_worker: 'warning',
      lpg_explosion: 'danger'
    };
    return (alertTypes[type as keyof typeof alertTypes] || 'danger') as 'danger' | 'warning' | 'info';
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

  // 진행중인 비상상황 클릭 시 EmergencyPopup 열기
  const handleContinueEmergency = async (record: EmergencyRecord) => {
    try {
      // 해당 비상상황의 최신 데이터를 가져와서 EmergencyPopup에 표시
      const response = await fetch(`/api/emergency/incidents/${record.id}`);
      if (response.ok) {
        const data = await response.json();
        setActiveEmergency(data.data);
        setShowEmergencyPopup(true);
      }
    } catch (error) {
      console.error('비상상황 데이터 조회 실패:', error);
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

  // 센서 매칭 정보와 위치 정보 가져오기 (초기 1회만)
  const fetchSensorConfig = async () => {
    try {
      // 센서 매칭 정보 가져오기
      const sensorsResponse = await fetch('/api/sensors');
      const sensorsResult = await sensorsResponse.json();
      
      // 기존 가스 센서 위치 정보 가져오기 (시각적 배치용)
      const positionsResponse = await fetch('/api/gas-sensors');
      const positionsResult = await positionsResponse.json();
      
      if (sensorsResult.success && positionsResult.success) {
        setSensorMappings(sensorsResult.data);
        setSensorPositions(positionsResult.data);
      }
    } catch (err) {
      console.error('센서 설정 정보를 가져오는 중 오류가 발생했습니다:', err);
    }
  };

  // 가스 센서 데이터 가져오기 (실시간 데이터만)
  const fetchGasSensors = async () => {
    try {
      // 실시간 가스 센서 데이터만 가져오기
      const gasResponse = await fetch('/api/gas?hours=1&limit=1000');
      const gasResult = await gasResponse.json();
      
      if (gasResult.success && sensorMappings.length > 0 && sensorPositions.length > 0) {
        // 센서 매칭 데이터와 실시간 데이터 결합
        const combinedData = sensorMappings.map((sensorMapping: any) => {
          const realtimeData = gasResult.data.summary[sensorMapping.sensorId];
          const positionData = sensorPositions.find((pos: any) => {
            // 센서 ID에서 번호 추출 (A_01 -> 01, A_1 -> 1)
            const sensorNumber = sensorMapping.sensorId.split('_')[1];
            // 위치 데이터의 name에서 번호 추출 (1번 -> 1, 01번 -> 01)
            const positionNumber = pos.name.replace('번', '');
            
            // 건물 매칭 (A vs A동, B vs B동)
            const buildingMatch = (sensorMapping.building === 'A' && pos.building === 'A동') ||
                                 (sensorMapping.building === 'B' && pos.building === 'B동');
            
            // 번호 매칭 (01 vs 1, 02 vs 2 등)
            const numberMatch = sensorNumber === positionNumber || 
                               parseInt(sensorNumber) === parseInt(positionNumber);
            
            return buildingMatch && numberMatch;
          });
          
          return {
            id: sensorMapping.id,
            name: sensorMapping.sensorId.split('_')[1], // A_01 -> 01
            building: sensorMapping.building,
            position: positionData?.position || { top: '0%', left: '0%' },
            ppm: realtimeData?.value || 0,
            status: realtimeData?.level || 'COMMON',
            realtime: realtimeData ? {
              value: realtimeData.value,
              level: realtimeData.level,
              lastUpdate: realtimeData.lastUpdate
            } : null,
            isActive: sensorMapping.isActive
          };
        }).filter((sensor: any) => sensor.isActive); // 활성 센서만 표시
        
        setGasSensors(combinedData);
        
        // 통계 계산
        const stats = {
          total: combinedData.length,
          safe: combinedData.filter((s: any) => s.realtime?.level === 'COMMON').length,
          warning: combinedData.filter((s: any) => s.realtime?.level === 'WARN').length,
          danger: combinedData.filter((s: any) => s.realtime?.level === 'DANGER').length,
          critical: combinedData.filter((s: any) => s.realtime?.level === 'CRITICAL').length,
        };
        setGasSensorStats(stats);
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
        
        // 활성화된 비상상황이 있고 현재 팝업이 열려있지 않으면 자동으로 팝업 표시
        const activeEmergency = result.data.find((record: any) => 
          record.status === 'active' && !showEmergencyPopup
        );
        
        if (activeEmergency) {
          setActiveEmergency(activeEmergency);
          setShowEmergencyPopup(true);
        }
      }
    } catch (err) {
      console.error('비상상황 기록 데이터를 가져오는 중 오류가 발생했습니다:', err);
    }
  };

  const fetchWeatherInfo = async () => {
    try {
      const response = await fetch('/api/weather');
      const result = await response.json();
      
      if (result.success) {
        setWeatherInfo(result.data);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('날씨 정보를 가져오는 중 오류가 발생했습니다:', err);
      // 에러 시 기본값 설정
      setWeatherInfo({
        temperature: 25,
        description: '맑음',
        emoji: '☀️',
        humidity: 60,
        windSpeed: 3,
        location: '경남 창원시 마산합포구 진북면'
      });
    }
  };

  // CCTV 스트림 데이터 가져오기
  const fetchCctvStreams = async () => {
    try {
      const response = await fetch('/api/cctv');
      const result = await response.json();
      
      if (result.success) {
        setCctvStreams(result.streams);
      }
    } catch (error) {
      console.error('CCTV 스트림 데이터 가져오기 실패:', error);
    }
  };

  // 진동 신호 보내기
  const handleVibrate = async (equipmentId: string, workerName: string) => {
    try {
      const response = await fetch('/api/beacon-vibrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ equipmentId }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`${workerName}님의 장비(${equipmentId})에 진동 신호를 보냈습니다.`);
      } else {
        alert(`진동 신호 전송 실패: ${result.message || result.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('진동 신호 전송 오류:', error);
      alert('진동 신호 전송 중 오류가 발생했습니다.');
    }
  };

  // 스트림 일시정지/재개 (이미지 스트림용)
  const toggleStreamPause = (cameraId: string) => {
    const img = imageRefs.current[cameraId];
    if (!img) return;

    const isPaused = isStreamPaused[cameraId];
    
    if (isPaused) {
      // 재개 - 이미지 새로고침 재시작
      const stream = cctvStreams.find(s => s.isActive && s.order === parseInt(cameraId.replace('cctv', '')));
      if (stream) {
        const refreshInterval = setInterval(() => {
          if (img.parentNode) {
            img.src = stream.streamUrl + '?t=' + Date.now();
          } else {
            clearInterval(refreshInterval);
          }
        }, 1000);
        (img as any).refreshInterval = refreshInterval;
      }
      setIsStreamPaused(prev => ({ ...prev, [cameraId]: false }));
      console.log(`스트림 재개: ${cameraId}`);
    } else {
      // 일시정지 - 이미지 새로고침 중지
      if ((img as any).refreshInterval) {
        clearInterval((img as any).refreshInterval);
        (img as any).refreshInterval = null;
      }
      setIsStreamPaused(prev => ({ ...prev, [cameraId]: true }));
      console.log(`스트림 일시정지: ${cameraId}`);
    }
  };

  // 스트림 정리 (메모리 절약)
  const cleanupStream = (cameraId: string) => {
    const img = imageRefs.current[cameraId];
    
    if (img) {
      try {
        // 새로고침 인터벌 정리
        if ((img as any).refreshInterval) {
          clearInterval((img as any).refreshInterval);
        }
        
        // 이미지 소스 제거
        img.src = '';
        
        // ref에서 제거
        imageRefs.current[cameraId] = null;
        
        console.log(`이미지 스트림 정리 완료: ${cameraId}`);
      } catch (error) {
        console.error(`스트림 정리 오류 (${cameraId}):`, error);
      }
    }
  };


  // 이미지 스트림 초기화 (실시간 이미지)
  const initializeImageStream = (cameraId: string) => {
    // 데이터베이스에서 가져온 CCTV 스트림 사용
    const stream = cctvStreams.find(s => s.isActive && s.order === parseInt(cameraId.replace('cctv', '')));
    if (!stream) {
      console.warn(`CCTV 스트림을 찾을 수 없습니다: ${cameraId}`);
      setStreamError(prev => ({ ...prev, [cameraId]: '스트림을 찾을 수 없습니다' }));
      setIsStreamLoading(prev => ({ ...prev, [cameraId]: false }));
      return;
    }

    const streamUrl = stream.streamUrl;

    // 이미지 요소 생성
    const img = document.createElement('img');
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.display = 'block';
    img.style.margin = 'auto';
    img.style.backgroundColor = 'hsl(0, 0%, 25%)';
    img.alt = `CCTV ${cameraId}`;
    
    // ref에 저장
    imageRefs.current[cameraId] = img;

    // 이미지 로드 이벤트
    img.onload = () => {
      console.log(`이미지 스트림 로드 완료: ${cameraId}`);
      setIsStreamLoading(prev => ({ ...prev, [cameraId]: false }));
      setStreamError(prev => ({ ...prev, [cameraId]: null }));
      setIsStreamPaused(prev => ({ ...prev, [cameraId]: false }));
    };

    img.onerror = () => {
      console.error(`이미지 스트림 오류 (${cameraId}):`, streamUrl);
      setStreamError(prev => ({ ...prev, [cameraId]: '이미지 스트림을 로드할 수 없습니다' }));
      setIsStreamLoading(prev => ({ ...prev, [cameraId]: false }));
    };

    // 이미지 소스 설정
    img.src = streamUrl;
    
    // 실시간 업데이트를 위한 주기적 새로고침 (1초마다)
    const refreshInterval = setInterval(() => {
      if (img.parentNode) {
        img.src = streamUrl + '?t=' + Date.now();
      } else {
        clearInterval(refreshInterval);
      }
    }, 1000);

    // 정리 함수 저장
    (img as any).refreshInterval = refreshInterval;
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
    // 센서 설정 정보 가져오기 (초기 1회만)
    fetchSensorConfig();
    // 비상상황 기록 데이터 가져오기
    fetchEmergencyRecords();
    // 날씨 정보 가져오기
    fetchWeatherInfo();
    // CCTV 스트림 데이터 가져오기
    fetchCctvStreams();

    // 가스 센서 데이터 실시간 업데이트 (5초마다)
    const gasSensorInterval = setInterval(() => {
      fetchGasSensors();
      // 비상상황도 함께 체크
      fetchEmergencyRecords();
    }, 5000);

    // 날씨 정보 업데이트 (10분마다)
    const weatherInterval = setInterval(() => {
      fetchWeatherInfo();
    }, 600000); // 10분 = 600,000ms

    // HLS 스트림 초기화 (CCTV 스트림 데이터 로드 후)
    const streamInitTimeout = setTimeout(() => {
      // 활성화된 CCTV 스트림들을 순서대로 초기화
      cctvStreams
        .filter(stream => stream.isActive)
        .sort((a, b) => a.order - b.order)
        .forEach((stream, index) => {
          const cameraId = `cctv${String(index + 1).padStart(3, '0')}`;
          initializeImageStream(cameraId);
        });
    }, 2000); // 2초 후 스트림 초기화 (CCTV 데이터 로드 대기)

     // 시뮬레이션: 가스 누출 감지 알림 추가 (테스트 도구가 펼쳐져 있을 때만)
     const alertInterval = setInterval(() => {
       if (isTestToolsExpanded) {
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
       }
     }, 30000); // 30초마다 체크

     // 시뮬레이션: 센서 정상화 알림 (테스트 도구가 펼쳐져 있을 때만)
     const normalInterval = setInterval(() => {
       if (isTestToolsExpanded) {
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
       }
     }, 45000); // 45초마다 체크

    return () => {
      clearInterval(interval);
      clearInterval(alertInterval);
      clearInterval(normalInterval);
      clearInterval(gasSensorInterval);
      clearInterval(weatherInterval);
      clearTimeout(streamInitTimeout);
      
      // 이미지 스트림 정리
      Object.keys(imageRefs.current).forEach(cameraId => {
        if (imageRefs.current[cameraId]) {
          cleanupStream(cameraId);
        }
      });
     };
   }, [isTestToolsExpanded]);

  // 센서 설정이 로드된 후 가스 센서 데이터 가져오기
  useEffect(() => {
    if (sensorMappings.length > 0 && sensorPositions.length > 0) {
      fetchGasSensors();
    }
  }, [sensorMappings, sensorPositions]);

  // CCTV 스트림 데이터 가져오기
  useEffect(() => {
    fetchCctvStreams();
  }, []);

  // CCTV 스트림 변경 시 스트림 재초기화
  useEffect(() => {
    if (cctvStreams.length > 0) {
      setTimeout(() => {
        cctvStreams
          .filter(stream => stream.isActive)
          .sort((a, b) => a.order - b.order)
          .forEach((stream, index) => {
            const cameraId = `cctv${String(index + 1).padStart(3, '0')}`;
            initializeImageStream(cameraId);
          });
      }, 1000);
    }
  }, [cctvStreams]); // cctvStreams가 변경될 때마다 실행

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

  // 상태 텍스트 변환 함수
  const getStatusText = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return '치명적';
      case 'DANGER':
        return '위험';
      case 'WARN':
        return '주의';
      case 'COMMON':
        return '정상';
      default:
        return '정상';
    }
  };

  // 센서 클릭 핸들러 추가
  const handleSensorClick = async (sensor: any, date?: string) => {
    setSelectedSensor(sensor);
    setShowSensorChart(true);
    setChartLoading(true);
    
    // 날짜가 지정되지 않았으면 오늘 날짜로 설정
    const targetDate = date || selectedDate || new Date().toISOString().split('T')[0];
    setSelectedDate(targetDate);
    
    try {
      // 선택된 날짜의 시작 시간과 종료 시간 계산
      const selectedDateObj = new Date(targetDate);
      const startOfDay = new Date(
        selectedDateObj.getFullYear(),
        selectedDateObj.getMonth(),
        selectedDateObj.getDate(),
        0, 0, 0
      );
      const endOfDay = new Date(
        selectedDateObj.getFullYear(),
        selectedDateObj.getMonth(),
        selectedDateObj.getDate(),
        23, 59, 59
      );
      
      // 현재 시간까지의 시간 차이 계산 (hours 파라미터용)
      const now = new Date();
      const hoursDiff = Math.ceil((now.getTime() - startOfDay.getTime()) / (1000 * 60 * 60));
      const hours = Math.max(1, Math.min(hoursDiff, 168)); // 최소 1시간, 최대 7일(168시간)
      
      const response = await fetch(
        `/api/gas?building=${sensor.building}&hours=${hours}&limit=10000`
      );
      const result = await response.json();
      
      if (result.success) {
        // 해당 센서의 데이터만 필터링하고 선택된 날짜 범위 내의 데이터만 포함
        const sensorData = result.data.recent.filter((data: any) => {
          const dataTimestamp = new Date(data.timestamp);
          return data.sensorId === `${sensor.building}_${sensor.name}` &&
                 dataTimestamp >= startOfDay &&
                 dataTimestamp <= endOfDay;
        });
        
        // 시간순으로 정렬
        sensorData.sort((a: any, b: any) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        setSensorChartData(sensorData);
      }
    } catch (error) {
      console.error('센서 데이터 조회 실패:', error);
    } finally {
      setChartLoading(false);
    }
  };

  // 날짜 변경 핸들러
  const handleDateChange = async (date: string) => {
    setSelectedDate(date);
    if (selectedSensor) {
      // 날짜가 변경되면 해당 날짜의 데이터를 다시 로드
      await handleSensorClick(selectedSensor, date);
    }
  };

  // 차트 데이터 준비
  const prepareChartData = () => {
    if (!sensorChartData.length) return null;

    // 시간순으로 정렬된 데이터 사용 (이미 정렬되어 있지만 확실히 하기 위해)
    const sortedData = [...sensorChartData].sort((a: any, b: any) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const labels = sortedData.map((data: any) => {
      const date = new Date(data.timestamp);
      // 선택된 날짜가 오늘이 아니면 날짜와 시간 모두 표시
      const today = new Date().toISOString().split('T')[0];
      const isToday = selectedDate === today || (!selectedDate && date.toISOString().split('T')[0] === today);
      
      if (isToday) {
        return date.toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit'
        });
      } else {
        return date.toLocaleString('ko-KR', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    });

    const values = sortedData.map((data: any) => data.value);

    return {
      labels,
      datasets: [
        {
          label: '가스 농도 (PPM)',
          data: values,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1,
        },
      ],
    };
  };

  const chartData = prepareChartData();

  return (
    <div className="space-y-6">
      {/* 테스트 버튼 (개발용) */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-blue-800">🧪 비상 상황 테스트 도구</h3>
          <button
            onClick={() => setIsTestToolsExpanded(!isTestToolsExpanded)}
            className="flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
          >
            <span>{isTestToolsExpanded ? '접기' : '펼치기'}</span>
            <span className={`transform transition-transform ${isTestToolsExpanded ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
        </div>
        
        {isTestToolsExpanded && (
          <>
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
          </>
        )}
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
          
          <div className="grid grid-cols-6 gap-6">
            <div className="text-lg font-semibold col-span-3 text-gray-900">출근자 정보</div>
            <div className="col-span-3 flex items-center">
              <div className="text-lg font-semibold text-gray-900">비상상황 기록</div>
              <div className="flex ml-4">
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
            </div>
          </div>
          <div className="grid grid-cols-6 gap-8">
            {/* 출근 작업자 */}
            <div className="bg-[#1E4E8B] text-white rounded-lg p-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-8 h-8 text-blue-200" />
                  <p className="text-blue-100 text-sm">출근 작업자</p>
                </div>
                <div className="text-[35px] font-bold">{attendanceWorkers.length} <span className="text-[20px]">명</span></div>
              </div>
            </div>

            {/* 안전모 정상 착용 */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">안전모 착용</span>
                <Bell className="w-[40px] h-[40px] text-white bg-[#34D399] rounded-full p-1" />
              </div>
              
              
              <div className="flex items-center justify-between space-x-2">
                <span className="text-[35px] font-bold">{attendanceWorkers.length} <span className="text-[20px] text-gray-600">명</span></span>
                {/* <div>
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-500">7.5% 전일 대비 감소</span>
                </div> */}
              </div>
            </div>

            {/* 가스 누출 감지 */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">안전모 미착용 감지</span>
                <Bell className="w-[40px] h-[40px] text-white bg-[#F25959] rounded-full p-1" />
              </div>
              
              <div className="flex items-center justify-between space-x-2">
                <span className="text-[35px] font-bold">{gasSensorStats.critical + gasSensorStats.danger} <span className="text-[20px] text-gray-600">건</span></span>
                {/* <div>
                  <TrendingUp className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-500">
                    {gasSensorStats.critical > 0 ? '치명적' : gasSensorStats.danger > 0 ? '위험' : '정상'}
                  </span>
                </div> */}
              </div>
            </div>

            {/* 비상상황 기록 */}
            <div className="col-span-3 bg-white rounded-lg p-6 shadow-sm">
              <div className="max-h-48 overflow-y-auto space-y-3 pr-2">
                {emergencyRecords.length > 0 ? (
                  emergencyRecords.map((record, index) => {
                    const isActive = record.status === 'active' || record.status === 'in_progress';
                    const completedSteps = record.executions.filter(exec => exec.status === 'completed').length;
                    const totalSteps = record.executions.length;
                    
                    return (
                      <div 
                        key={record.id || index} 
                        className={`flex items-start space-x-3 p-3 rounded-lg transition-colors ${
                          isActive 
                            ? 'bg-gray-50 hover:bg-gray-100 cursor-pointer border-l-4 border-red-500' 
                            : 'bg-gray-50'
                        }`}
                        onClick={isActive ? () => handleContinueEmergency(record) : undefined}
                      >
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
                            <h4 className={`text-sm font-medium truncate ${
                              isActive ? 'text-red-900' : 'text-gray-900'
                            }`}>
                              {record.title}
                              {isActive && (
                                <span className="ml-2 text-xs text-red-600 font-normal">
                                  (클릭하여 계속 진행)
                                </span>
                              )}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(record.startedAt).toLocaleString('ko-KR')}
                            </p>
                            <span className="text-xs text-gray-500">
                              완료: {completedSteps}/{totalSteps}단계
                            </span>
                            {!isActive && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/emergency/records/${record.id}`);
                                }}
                                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                              >
                                <Eye className="w-3 h-3" />
                                상세보기
                              </button>
                            )}
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

                          <div className="flex items-center justify-between mt-2">
                            
                          </div>
                        </div>
                      </div>
                    );
                  })
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
                <h3 className="text-lg font-semibold text-gray-900 mb-4">가스 누출 감지 센서 현황</h3>
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
                  {gasSensors.filter(sensor => sensor.building === 'B').map((sensor) => {
                    // 실시간 데이터가 있으면 사용, 없으면 기본값
                    const currentStatus = sensor.realtime?.level || 'COMMON';
                    const currentValue = sensor.realtime?.value || 0;
                    const lastUpdate = sensor.realtime?.lastUpdate;
                    
                    const getStatusColor = (level: string) => {
                      switch (level) {
                        case 'CRITICAL':
                          return 'bg-red-100 border-red-300 text-red-800';
                        case 'DANGER':
                          return 'bg-red-100 border-red-300 text-red-800';
                        case 'WARN':
                          return 'bg-yellow-100 border-yellow-300 text-yellow-800';
                        case 'COMMON':
                        default:
                          return 'bg-green-100 border-green-300 text-green-800';
                      }
                    };

                    return (
                      <div
                        key={sensor.id}
                        className="absolute cursor-pointer hover:scale-105 transition-transform"
                        style={{
                          top: sensor.position.top,
                          ...(sensor.position.left ? { left: sensor.position.left } : { right: sensor.position.right })
                        }}
                        onClick={() => handleSensorClick(sensor)}
                        title={`${sensor.building}동 ${sensor.name}번 센서 - 클릭하여 상세 데이터 보기`}
                      >
                        <div className={`border rounded p-2 text-center w-16 h-16 flex flex-col justify-center ${getStatusColor(currentStatus)}`}>
                          <div className="text-xs font-medium">{sensor.name}</div>
                          <div className="text-xs">{getStatusText(currentStatus)}</div>
                          <div className="text-xs">{currentValue}ppm</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* A동 센서들 - 11개 배치 */}
                {/* A동 라인 */}
                <div className="absolute top-[1%] right-[22%] w-[17%] h-[98%] border-2 border-gray-500 rounded-lg rotate-53">
                </div>

                <div>
                {gasSensors.filter(sensor => sensor.building === 'A').map((sensor) => {
                    // 실시간 데이터가 있으면 사용, 없으면 기본값
                    const currentStatus = sensor.realtime?.level || 'COMMON';
                    const currentValue = sensor.realtime?.value || 0;
                    const lastUpdate = sensor.realtime?.lastUpdate;
                    
                    const getStatusColor = (level: string) => {
                      switch (level) {
                        case 'CRITICAL':
                          return 'bg-red-100 border-red-300 text-red-800';
                        case 'DANGER':
                          return 'bg-red-100 border-red-300 text-red-800';
                        case 'WARN':
                          return 'bg-yellow-100 border-yellow-300 text-yellow-800';
                        case 'COMMON':
                        default:
                          return 'bg-green-100 border-green-300 text-green-800';
                      }
                    };

                    return (
                      <div
                        key={sensor.id}
                        className="absolute cursor-pointer hover:scale-105 transition-transform"
                        style={{
                          top: sensor.position.top,
                          ...(sensor.position.left ? { left: sensor.position.left } : { right: sensor.position.right })
                        }}
                        onClick={() => handleSensorClick(sensor)}
                        title={`${sensor.building}동 ${sensor.name}번 센서 - 클릭하여 상세 데이터 보기`}
                      >
                        <div className={`border rounded p-2 text-center w-16 h-16 flex flex-col justify-center ${getStatusColor(currentStatus)}`}>
                          <div className="text-xs font-medium">{sensor.name}</div>
                          <div className="text-xs">{getStatusText(currentStatus)}</div>
                          <div className="text-xs">{currentValue}ppm</div>
                        </div>
                      </div>
                    );
                  })}
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

        <div className="flex flex-col h-full">
          {/* 실시간 CCTV */}
          <h3 className="text-lg font-semibold text-gray-900 mb-4">실시간 CCTV</h3>
          <div className="lg:col-span-2 bg-white rounded-lg p-6 shadow-sm flex-1">
            <div className="grid grid-cols-1 gap-4 h-full">
              {/* A동 출입구 - RTSP 스트림 */}
              <div className="relative">
                <div className="bg-gray-900 rounded-lg h-[260px] flex items-center justify-center relative overflow-hidden">
                  {isStreamLoading.cctv001 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                      <div className="text-white text-sm">스트림 로딩 중...</div>
                    </div>
                  )}
                  
                  {streamError.cctv001 ? (
                    <div className="text-red-400 text-sm text-center">
                      <div className="mb-2">스트림 연결 실패</div>
                      <div className="text-xs text-gray-400">{streamError.cctv001}</div>
                      <button 
                        onClick={() => {
                          // 기존 스트림 완전 정리
                          cleanupStream('cctv001');
                          // 상태 초기화
                          setStreamError(prev => ({ ...prev, cctv001: null }));
                          setIsStreamLoading(prev => ({ ...prev, cctv001: true }));
                          setIsStreamPaused(prev => ({ ...prev, cctv001: false }));
                          // 1초 후 재연결
                          setTimeout(() => {
                            initializeImageStream('cctv001');
                          }, 1000);
                        }}
                        className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                      >
                        재연결
                      </button>
                    </div>
                  ) : (
                    <div
                      ref={(el) => { 
                        if (el && imageRefs.current.cctv001) {
                          el.appendChild(imageRefs.current.cctv001);
                        }
                      }}
                      className="w-full h-full"
                    />
                  )}
                </div>
                <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                  UNSAFETY
                </div>
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                  SAFETY
                </div>
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                  {cctvStreams.find(s => s.order === 1)?.name || 'A동 출입구'}
                </div>
                <div className="absolute top-2 left-2 flex space-x-1">
                  <button
                    onClick={() => toggleStreamPause('cctv001')}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                    title={isStreamPaused.cctv001 ? '재개' : '일시정지'}
                  >
                    {isStreamPaused.cctv001 ? '▶️' : '⏸️'}
                  </button>
                  <button
                    onClick={() => {
                      // 기존 스트림 완전 정리
                      cleanupStream('cctv001');
                      // 상태 초기화
                      setStreamError(prev => ({ ...prev, cctv001: null }));
                      setIsStreamLoading(prev => ({ ...prev, cctv001: true }));
                      setIsStreamPaused(prev => ({ ...prev, cctv001: false }));
                      // 1초 후 재연결
                      setTimeout(() => {
                        initializeImageStream('cctv001');
                      }, 1000);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                    title="재연결"
                  >
                    🔄
                  </button>
                  <button
                    onClick={() => cleanupStream('cctv001')}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded"
                    title="정리"
                  >
                    🗑️
                  </button>
                </div>
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                  실시간 스트림
                </div>
              </div>
              
              {/* B동 출입구 - RTSP 스트림 */}
              <div className="relative">
                <div className="bg-gray-900 rounded-lg h-[260px] flex items-center justify-center relative overflow-hidden">
                  {isStreamLoading.cctv002 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                      <div className="text-white text-sm">스트림 로딩 중...</div>
                    </div>
                  )}
                  
                  {streamError.cctv002 ? (
                    <div className="text-red-400 text-sm text-center">
                      <div className="mb-2">스트림 연결 실패</div>
                      <div className="text-xs text-gray-400">{streamError.cctv002}</div>
                      <button 
                        onClick={() => {
                          // 기존 스트림 완전 정리
                          cleanupStream('cctv002');
                          // 상태 초기화
                          setStreamError(prev => ({ ...prev, cctv002: null }));
                          setIsStreamLoading(prev => ({ ...prev, cctv002: true }));
                          setIsStreamPaused(prev => ({ ...prev, cctv002: false }));
                          // 1초 후 재연결
                          setTimeout(() => {
                            initializeImageStream('cctv002');
                          }, 1000);
                        }}
                        className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                      >
                        재연결
                      </button>
                    </div>
                  ) : (
                    <div
                      ref={(el) => { 
                        if (el && imageRefs.current.cctv002) {
                          el.appendChild(imageRefs.current.cctv002);
                        }
                      }}
                      className="w-full h-full"
                    />
                  )}
                </div>
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                  {cctvStreams.find(s => s.order === 2)?.name || 'B동 출입구'}
                </div>
                <div className="absolute top-2 left-2 flex space-x-1">
                  <button
                    onClick={() => toggleStreamPause('cctv002')}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                    title={isStreamPaused.cctv002 ? '재개' : '일시정지'}
                  >
                    {isStreamPaused.cctv002 ? '▶️' : '⏸️'}
                  </button>
                  <button
                    onClick={() => {
                      // 기존 스트림 완전 정리
                      cleanupStream('cctv002');
                      // 상태 초기화
                      setStreamError(prev => ({ ...prev, cctv002: null }));
                      setIsStreamLoading(prev => ({ ...prev, cctv002: true }));
                      setIsStreamPaused(prev => ({ ...prev, cctv002: false }));
                      // 1초 후 재연결
                      setTimeout(() => {
                        initializeImageStream('cctv002');
                      }, 1000);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                    title="재연결"
                  >
                    🔄
                  </button>
                  <button
                    onClick={() => cleanupStream('cctv002')}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded"
                    title="정리"
                  >
                    🗑️
                  </button>
                </div>
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                  실시간 스트림
                </div>
              </div>
                
              {/* LPG 저장소 - RTSP 스트림 */}
              <div className="relative">
                <div className="bg-gray-900 rounded-lg h-[260px] flex items-center justify-center relative overflow-hidden">
                  {isStreamLoading.cctv003 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                      <div className="text-white text-sm">스트림 로딩 중...</div>
                    </div>
                  )}
                  
                  {streamError.cctv003 ? (
                    <div className="text-red-400 text-sm text-center">
                      <div className="mb-2">스트림 연결 실패</div>
                      <div className="text-xs text-gray-400">{streamError.cctv003}</div>
                      <button 
                        onClick={() => {
                          // 기존 스트림 완전 정리
                          cleanupStream('cctv003');
                          // 상태 초기화
                          setStreamError(prev => ({ ...prev, cctv003: null }));
                          setIsStreamLoading(prev => ({ ...prev, cctv003: true }));
                          setIsStreamPaused(prev => ({ ...prev, cctv003: false }));
                          // 1초 후 재연결
                          setTimeout(() => {
                            initializeImageStream('cctv003');
                          }, 1000);
                        }}
                        className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                      >
                        재연결
                      </button>
                    </div>
                  ) : (
                    <div
                      ref={(el) => { 
                        if (el && imageRefs.current.cctv003) {
                          el.appendChild(imageRefs.current.cctv003);
                        }
                      }}
                      className="w-full h-full"
                    />
                  )}
                </div>
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                  {cctvStreams.find(s => s.order === 3)?.name || 'LPG 저장소'}
                </div>
                <div className="absolute top-2 left-2 flex space-x-1">
                  <button
                    onClick={() => toggleStreamPause('cctv003')}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                    title={isStreamPaused.cctv003 ? '재개' : '일시정지'}
                  >
                    {isStreamPaused.cctv003 ? '▶️' : '⏸️'}
                  </button>
                  <button
                    onClick={() => {
                      // 기존 스트림 완전 정리
                      cleanupStream('cctv003');
                      // 상태 초기화
                      setStreamError(prev => ({ ...prev, cctv003: null }));
                      setIsStreamLoading(prev => ({ ...prev, cctv003: true }));
                      setIsStreamPaused(prev => ({ ...prev, cctv003: false }));
                      // 1초 후 재연결
                      setTimeout(() => {
                        initializeImageStream('cctv003');
                      }, 1000);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                    title="재연결"
                  >
                    🔄
                  </button>
                  <button
                    onClick={() => cleanupStream('cctv003')}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded"
                    title="정리"
                  >
                    🗑️
                  </button>
                </div>
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                  실시간 스트림
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
                      <span>장비 번호: {worker.equipmentId?.replace('BEACON_', '') || worker.equipmentId}</span>
                    </div>
                    <div className="flex items-center justify-center pt-2">
                      <button
                        onClick={() => handleVibrate(worker.equipmentId, worker.name)}
                        className="flex items-center space-x-1 bg-orange-500 text-white px-3 py-1 rounded-md hover:bg-orange-600 transition-colors text-sm"
                        title={`${worker.name}님의 장비에 진동 신호 보내기`}
                      >
                        <Vibrate className="w-4 h-4" />
                        <span>진동</span>
                      </button>
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

      {showSensorChart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                {selectedSensor?.building}동 {selectedSensor?.name}번 센서 데이터
              </h2>
              <button
                onClick={() => setShowSensorChart(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            {/* 날짜 선택 캘린더 */}
            <div className="mb-4 flex items-center space-x-4">
              <label htmlFor="datePicker" className="text-sm font-medium text-gray-700">
                날짜 선택:
              </label>
              <input
                id="datePicker"
                type="date"
                value={selectedDate || new Date().toISOString().split('T')[0]}
                onChange={(e) => handleDateChange(e.target.value)}
                max={new Date().toISOString().split('T')[0]} // 오늘 이후 날짜 선택 불가
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  handleDateChange(today);
                }}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                오늘
              </button>
              <button
                onClick={() => {
                  if (selectedDate) {
                    const date = new Date(selectedDate);
                    date.setDate(date.getDate() - 1);
                    handleDateChange(date.toISOString().split('T')[0]);
                  }
                }}
                className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                disabled={!selectedDate}
              >
                이전 날짜
              </button>
              <button
                onClick={() => {
                  if (selectedDate) {
                    const date = new Date(selectedDate);
                    date.setDate(date.getDate() + 1);
                    const today = new Date().toISOString().split('T')[0];
                    if (date.toISOString().split('T')[0] <= today) {
                      handleDateChange(date.toISOString().split('T')[0]);
                    }
                  }
                }}
                className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
                disabled={!selectedDate || selectedDate >= new Date().toISOString().split('T')[0]}
              >
                다음 날짜
              </button>
            </div>
            
            {chartLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">데이터를 불러오는 중...</div>
              </div>
            ) : chartData ? (
              <div className="space-y-4">
                {/* 현재 상태 정보 */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-600">현재 상태</div>
                    <div className={`font-semibold ${
                      selectedSensor?.realtime?.level === 'DANGER' ? 'text-red-600' :
                      selectedSensor?.realtime?.level === 'WARN' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {getStatusText(selectedSensor?.realtime?.level || 'COMMON')}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">현재 값</div>
                    <div className="font-semibold">{selectedSensor?.realtime?.value || 0} PPM</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">마지막 업데이트</div>
                    <div className="font-semibold text-sm">
                      {selectedSensor?.realtime?.lastUpdate ? 
                        new Date(selectedSensor.realtime.lastUpdate).toLocaleString('ko-KR') : 
                        '데이터 없음'
                      }
                    </div>
                  </div>
                </div>
                
                {/* 차트 */}
                <div className="h-96">
                  <Line 
                    data={chartData} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        title: {
                          display: true,
                          text: '시간별 가스 농도 변화',
                        },
                        legend: {
                          display: true,
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: '가스 농도 (PPM)',
                          },
                        },
                        x: {
                          title: {
                            display: true,
                            text: '시간',
                          },
                          ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                          },
                        },
                      },
                    }}
                  />
                </div>
                
                {/* 데이터 테이블 */}
                <div className="max-h-64 overflow-y-auto">
                  <h3 className="text-lg font-medium mb-2">
                    상세 데이터 ({selectedDate ? new Date(selectedDate).toLocaleDateString('ko-KR', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) : '오늘'} - 총 {sensorChartData.length}개)
                  </h3>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left">시간</th>
                        <th className="px-4 py-2 text-left">값 (PPM)</th>
                        <th className="px-4 py-2 text-left">상태</th>
                        <th className="px-4 py-2 text-left">IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sensorChartData.length > 0 ? [...sensorChartData].reverse().map((data: any, index: number) => (
                        <tr key={index} className="border-b">
                          <td className="px-4 py-2">
                            {new Date(data.timestamp).toLocaleString('ko-KR')}
                          </td>
                          <td className="px-4 py-2 font-medium">{data.value}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              data.level === 'DANGER' ? 'bg-red-100 text-red-800' :
                              data.level === 'WARN' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {getStatusText(data.level)}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-gray-500">{data.ip || '-'}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-4 text-center text-gray-500">
                            선택한 날짜에 데이터가 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">데이터가 없습니다.</div>
              </div>
            )}
          </div>
        </div>
      )}

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
