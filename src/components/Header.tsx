'use client';

import { useState, useEffect } from 'react';
import { Settings, User, LogOut } from 'lucide-react';
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
