'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Trash2, Mountain, Phone, Calendar, Building, Wrench, AlertTriangle } from 'lucide-react';
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

export default function WorkerDetail() {
  const params = useParams();
  const router = useRouter();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const workerId = params.id as string;

  useEffect(() => {
    const fetchWorker = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/workers/${workerId}`);
        const result = await response.json();
        
        if (result.success) {
          setWorker(result.data);
        } else {
          setError(result.error || '작업자 정보를 찾을 수 없습니다.');
        }
      } catch (err) {
        setError('작업자 정보를 가져오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (workerId) {
      fetchWorker();
    }
  }, [workerId]);

  const handleDelete = async () => {
    if (!confirm('정말로 이 작업자를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/workers/${workerId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        alert('작업자가 성공적으로 삭제되었습니다.');
        router.push('/');
      } else {
        alert(result.error || '작업자 삭제 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Error deleting worker:', error);
      alert('작업자 삭제 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">작업자 정보를 불러오는 중...</div>
      </div>
    );
  }

  if (error || !worker) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-500">{error || '작업자를 찾을 수 없습니다.'}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Breadcrumbs */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/" className="hover:text-blue-600">작업자 관리</Link>
            <span>/</span>
            <span className="text-gray-900">{worker.name}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Link
              href={`/workers/${workerId}/edit`}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Edit className="w-4 h-4" />
              <span>수정</span>
            </Link>
            <button
              onClick={handleDelete}
              className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4" />
              <span>삭제</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="flex space-x-8">
          {/* 프로필 사진 */}
          <div className="w-64">
            <div className="w-64 h-64 border-2 border-gray-200 rounded-lg overflow-hidden mb-4">
              {worker.profileImage ? (
                <img 
                  src={worker.profileImage} 
                  alt={worker.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <Mountain className="w-16 h-16 text-gray-400" />
                </div>
              )}
            </div>
          </div>

          {/* 기본 정보 */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">{worker.name}</h1>
            
            <div className="grid grid-cols-2 gap-6">
              {/* 왼쪽 컬럼 */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">생년월일</p>
                    <p className="font-medium">{new Date(worker.birthDate).toLocaleDateString('ko-KR')}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Wrench className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">작업 분야</p>
                    <p className="font-medium">{worker.workField}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">휴대전화번호</p>
                    <p className="font-medium">{worker.mobilePhone || '-'}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">비상연락처</p>
                    <p className="font-medium">{worker.emergencyContact || '-'}</p>
                  </div>
                </div>
              </div>

              {/* 오른쪽 컬럼 */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Building className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">소속</p>
                    <p className="font-medium">{worker.affiliation}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Wrench className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">장비 ID</p>
                    <p className="font-medium">{worker.equipmentId}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">건강 유의사항</p>
                    <p className="font-medium">{worker.healthPrecautions || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 추가 정보 */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">추가 정보</h3>
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div>
                  <p className="text-gray-500">등록일</p>
                  <p className="font-medium">{new Date(worker.createdAt).toLocaleDateString('ko-KR')}</p>
                </div>
                <div>
                  <p className="text-gray-500">최종 수정일</p>
                  <p className="font-medium">{new Date(worker.updatedAt).toLocaleDateString('ko-KR')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <Link
            href="/"
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>목록으로 돌아가기</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
