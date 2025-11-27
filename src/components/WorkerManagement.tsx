'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Mountain, Vibrate, Smartphone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Worker {
  id: number;
  name: string;
  birthDate: string;
  equipmentId: string;
  workField: string;
  affiliation: string;
  healthPrecautions: string;
  mobilePhone?: string;
  emergencyContact?: string;
  profileImage?: string;
  createdAt: string;
  updatedAt: string;
}

export default function WorkerManagement() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vibratingBeacons, setVibratingBeacons] = useState<Set<string>>(new Set());

  // 작업자 데이터 가져오기
  const fetchWorkers = async (search?: string) => {
    try {
      setLoading(true);
      const url = search 
        ? `/api/workers?search=${encodeURIComponent(search)}`
        : '/api/workers';
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success) {
        setWorkers(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('데이터를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 검색어 변경 시 데이터 다시 가져오기
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchWorkers(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // 초기 데이터 로드
  useEffect(() => {
    fetchWorkers();
  }, []);

  const handleAddWorker = () => {
    router.push('/workers/create');
  };

  // 진동 신호 보내기
  const handleVibrate = async (equipmentId: string, workerName: string) => {
    try {
      // 진동 중인 비콘 목록에 추가
      setVibratingBeacons(prev => new Set(prev).add(equipmentId));
      
      const response = await fetch('/api/beacon-vibrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          equipmentId,
          ringType: 4, // 0x4: vibration
          ringTime: 4000, // 1초
        }),
      });

      if (response.ok) {
        console.log(`장비 ${equipmentId} 진동 명령 전송 완료`);
      } else {
        const error = await response.json();
        console.error(`장비 ${equipmentId} 진동 명령 실패:`, error.message);
        alert(`진동 명령 전송 실패: ${error.message}`);
      }
    } catch (error) {
      console.error('진동 명령 전송 중 오류:', error);
      alert('진동 명령 전송 중 오류가 발생했습니다.');
    } finally {
      // 1초 후 진동 중인 비콘 목록에서 제거
      setTimeout(() => {
        setVibratingBeacons(prev => {
          const newSet = new Set(prev);
          newSet.delete(equipmentId);
          return newSet;
        });
      }, 1000);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">작업자 관리</h2>
            <p className="text-gray-600 mt-1">전체 {workers.length}명</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="작업자 이름으로 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <button 
              onClick={handleAddWorker}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              <span>작업자 추가</span>
            </button>
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">데이터를 불러오는 중...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-red-500">{error}</div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  프로필
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  이름
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  생년월일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  장비 ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업 분야
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  소속
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  연락처
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  건강 유의사항
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  진동 신호
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {workers.map((worker) => (
                <tr key={worker.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {worker.profileImage ? (
                        <img 
                          src={worker.profileImage} 
                          alt={worker.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <Mountain className="w-6 h-6 text-gray-500" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link 
                      href={`/workers/${worker.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      {worker.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(worker.birthDate).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {worker.equipmentId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {worker.workField}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {worker.affiliation}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {worker.mobilePhone || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {worker.healthPrecautions}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleVibrate(worker.equipmentId, worker.name)}
                      disabled={vibratingBeacons.has(worker.equipmentId)}
                      className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md transition-colors ${
                        vibratingBeacons.has(worker.equipmentId)
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500'
                      }`}
                      title="비콘 진동 (1초)"
                    >
                      <Smartphone className="w-3 h-3 mr-1" />
                      {vibratingBeacons.has(worker.equipmentId) ? '진동 중...' : '진동'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
