'use client';

import { useState, useEffect } from 'react';
import { Settings, User, LogOut, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  currentDate?: string;
  temperature?: string;
  adminName?: string;
}

export default function Header({ 
  currentDate, 
  temperature = "37°C", 
  adminName = "관리자 001" 
}: HeaderProps) {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState('');
  const [mqttStatus, setMqttStatus] = useState<{
    connected: boolean;
    status: string;
    host?: string;
    port?: number;
  }>({ connected: false, status: 'disconnected' });
  const [mqttLoading, setMqttLoading] = useState(false);

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

    // 초기 시간 설정
    updateTime();
    
    // 1초마다 시간 업데이트
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  // MQTT 상태 확인
  const fetchMqttStatus = async () => {
    try {
      const response = await fetch('/api/mqtt-status');
      if (response.ok) {
        const data = await response.json();
        setMqttStatus(data);
      }
    } catch (error) {
      console.error('MQTT 상태 확인 실패:', error);
    }
  };

  // MQTT 연결/해제 처리
  const handleMqttAction = async (action: 'connect' | 'disconnect') => {
    setMqttLoading(true);
    try {
      const response = await fetch('/api/mqtt-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      
      if (response.ok) {
        const data = await response.json();
        setMqttStatus(prev => ({ ...prev, connected: data.connected }));
        
        // 성공 메시지 표시
        if (action === 'connect' && data.connected) {
          console.log('✅ MQTT 연결 성공:', data.message);
        } else if (action === 'disconnect') {
          console.log('🔌 MQTT 연결 해제:', data.message);
        }
        
        // 상태 업데이트 후 다시 확인
        setTimeout(fetchMqttStatus, 2000);
      } else {
        const errorData = await response.json();
        console.error('❌ MQTT 액션 실패:', errorData.message);
        // 실패 시에도 상태 다시 확인
        setTimeout(fetchMqttStatus, 1000);
      }
    } catch (error) {
      console.error('❌ MQTT 액션 실행 실패:', error);
      // 네트워크 오류 시에도 상태 다시 확인
      setTimeout(fetchMqttStatus, 1000);
    } finally {
      setMqttLoading(false);
    }
  };

  // 컴포넌트 마운트 시 MQTT 상태 확인 및 주기적 업데이트
  useEffect(() => {
    fetchMqttStatus();
    const interval = setInterval(fetchMqttStatus, 10000); // 10초마다 상태 확인
    return () => clearInterval(interval);
  }, []);

  const formattedDate = currentDate || currentTime;

  const handleSettingsClick = () => {
    router.push('/workers');
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-6">
          <Link href="/" className="text-2xl font-bold hover:text-blue-600 transition-colors">
            LOGO
          </Link>
          <div className="text-gray-600">
            {formattedDate}
          </div>
          <div className="text-gray-600">
            현재 온도: {temperature}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* MQTT 연결 상태 */}
          <div className="flex items-center space-x-2">
            {mqttStatus.connected ? (
              <div className="flex items-center space-x-2 px-3 py-1 bg-green-50 rounded-lg">
                <Wifi className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">MQTT 연결됨</span>
                <button
                  onClick={() => handleMqttAction('disconnect')}
                  disabled={mqttLoading}
                  className="text-green-600 hover:text-green-800 disabled:opacity-50"
                  title="MQTT 연결 해제"
                >
                  <WifiOff className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 px-3 py-1 bg-red-50 rounded-lg">
                <WifiOff className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-700">MQTT 연결 안됨</span>
                <button
                  onClick={() => handleMqttAction('connect')}
                  disabled={mqttLoading}
                  className="text-red-600 hover:text-red-800 disabled:opacity-50"
                  title="MQTT 재연결"
                >
                  {mqttLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wifi className="w-4 h-4" />
                  )}
                </button>
              </div>
            )}
          </div>
          
          <button 
            onClick={handleSettingsClick}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <Settings className="w-5 h-5" />
            <span>설정</span>
          </button>
          <div className="flex items-center space-x-2 text-gray-600">
            <User className="w-5 h-5" />
            <span>{adminName}</span>
          </div>
          <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-800">
            <LogOut className="w-5 h-5" />
            <span>로그아웃</span>
          </button>
        </div>
      </div>
    </header>
  );
}
