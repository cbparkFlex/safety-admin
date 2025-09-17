'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, X, User, Phone, Calendar, Building, Wrench, AlertTriangle, Radio } from 'lucide-react';
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

interface Beacon {
  id: number;
  beaconId: string;
  name: string;
  macAddress: string;
  location: string;
  isActive: boolean;
}

export default function WorkerEdit() {
  const params = useParams();
  const router = useRouter();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [beacons, setBeacons] = useState<Beacon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const workerId = params.id as string;

  // 폼 데이터
  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    equipmentId: '',
    workField: '',
    affiliation: '',
    healthPrecautions: '',
    mobilePhone: '',
    emergencyContact: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 작업자 정보와 Beacon 목록을 병렬로 가져오기
        const [workerResponse, beaconsResponse] = await Promise.all([
          fetch(`/api/workers/${workerId}`),
          fetch('/api/beacons')
        ]);

        const workerResult = await workerResponse.json();
        const beaconsResult = await beaconsResponse.json();

        if (workerResult.success) {
          const workerData = workerResult.data;
          setWorker(workerData);
          setFormData({
            name: workerData.name || '',
            birthDate: workerData.birthDate ? new Date(workerData.birthDate).toISOString().split('T')[0] : '',
            equipmentId: workerData.equipmentId || '',
            workField: workerData.workField || '',
            affiliation: workerData.affiliation || '',
            healthPrecautions: workerData.healthPrecautions || '',
            mobilePhone: workerData.mobilePhone || '',
            emergencyContact: workerData.emergencyContact || ''
          });
        } else {
          setError(workerResult.error || '작업자 정보를 찾을 수 없습니다.');
        }

        if (beaconsResult.success) {
          setBeacons(beaconsResult.data || []);
        }
      } catch (err) {
        setError('데이터를 가져오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (workerId) {
      fetchData();
    }
  }, [workerId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('이름을 입력해주세요.');
      return;
    }

    if (!formData.birthDate) {
      alert('생년월일을 입력해주세요.');
      return;
    }

    if (!formData.equipmentId) {
      alert('장비 ID를 선택해주세요.');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/workers/${workerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        alert('작업자 정보가 성공적으로 수정되었습니다.');
        router.push(`/workers/${workerId}`);
      } else {
        alert(result.error || '작업자 정보 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error updating worker:', error);
      alert('작업자 정보 수정 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (confirm('수정사항이 저장되지 않습니다. 정말 취소하시겠습니까?')) {
      router.push(`/workers/${workerId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">데이터를 불러오는 중...</div>
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
            <Link href={`/workers/${workerId}`} className="hover:text-blue-600">{worker.name}</Link>
            <span>/</span>
            <span className="text-gray-900">수정</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCancel}
              className="flex items-center space-x-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <X className="w-4 h-4" />
              <span>취소</span>
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? '저장 중...' : '저장'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">작업자 정보 수정</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 기본 정보 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  기본 정보
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    이름 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="작업자 이름을 입력하세요"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    생년월일 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    작업 분야 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="workField"
                    value={formData.workField}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="작업 분야를 입력하세요"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    소속 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="affiliation"
                    value={formData.affiliation}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="소속을 입력하세요"
                    required
                  />
                </div>
              </div>

              {/* 연락처 및 장비 정보 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  연락처 및 장비 정보
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    휴대전화번호
                  </label>
                  <input
                    type="tel"
                    name="mobilePhone"
                    value={formData.mobilePhone}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="010-1234-5678"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    비상연락처
                  </label>
                  <input
                    type="tel"
                    name="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="010-1234-5678"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    장비 ID (Beacon) <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="equipmentId"
                    value={formData.equipmentId}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">장비를 선택하세요</option>
                    {beacons.map((beacon) => (
                      <option key={beacon.id} value={beacon.beaconId}>
                        {beacon.name} ({beacon.beaconId}) - {beacon.location}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    작업자와 1:1로 매칭할 Beacon을 선택하세요
                  </p>
                </div>
              </div>
            </div>

            {/* 건강 유의사항 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5" />
                건강 유의사항
              </h3>
              <textarea
                name="healthPrecautions"
                value={formData.healthPrecautions}
                onChange={handleInputChange}
                rows={4}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="건강상 주의사항이나 알레르기 등을 입력하세요"
              />
            </div>

            {/* 하단 버튼 */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

