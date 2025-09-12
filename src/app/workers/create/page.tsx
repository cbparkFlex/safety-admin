'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface CreateWorkerForm {
  name: string;
  workField: string;
  mobilePhone: string;
  healthPrecautions: string;
  birthDate: string;
  affiliation: string;
  emergencyContact: string;
  equipmentId: string;
}

interface Beacon {
  id: number;
  beaconId: string;
  macAddress: string;
  name: string;
  status: string;
  gateway?: {
    gatewayId: string;
    name: string;
  };
}

export default function CreateWorker() {
  const router = useRouter();
  const [formData, setFormData] = useState<CreateWorkerForm>({
    name: '',
    workField: '',
    mobilePhone: '',
    healthPrecautions: '',
    birthDate: '',
    affiliation: '',
    emergencyContact: '',
    equipmentId: ''
  });
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [beacons, setBeacons] = useState<Beacon[]>([]);
  const [beaconsLoading, setBeaconsLoading] = useState(true);

  // 비콘 목록 가져오기
  const fetchBeacons = async () => {
    try {
      setBeaconsLoading(true);
      const response = await fetch('/api/beacons');
      const data = await response.json();
      
      if (data.success) {
        setBeacons(data.beacons || []);
      } else {
        console.error('비콘 목록 조회 실패:', data.error);
      }
    } catch (error) {
      console.error('비콘 목록 조회 중 오류:', error);
    } finally {
      setBeaconsLoading(false);
    }
  };

  useEffect(() => {
    fetchBeacons();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // FormData를 사용하여 이미지와 텍스트 데이터를 함께 전송
      const formDataToSend = new FormData();
      
      // 텍스트 데이터 추가
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value);
      });

      // 이미지 추가
      if (profileImage) {
        formDataToSend.append('profileImage', profileImage);
      }

      const response = await fetch('/api/workers', {
        method: 'POST',
        body: formDataToSend,
      });

      const result = await response.json();

      if (result.success) {
        alert('작업자가 성공적으로 추가되었습니다.');
        router.push('/');
      } else {
        alert(result.error || '작업자 추가 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Error creating worker:', error);
      alert('작업자 추가 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Breadcrumbs */}
      <div className="p-6 border-b">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Link href="/" className="hover:text-blue-600">작업자 관리</Link>
          <span>/</span>
          <span className="text-gray-900">작업자 추가</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        {/* 기본 정보 섹션 */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">기본 정보</h2>
          
          <div className="flex space-x-8">
            {/* 프로필 사진 업로드 */}
            <div className="w-48">
              <div className="w-48 h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mb-4">
                {imagePreview ? (
                  <img 
                    src={imagePreview} 
                    alt="Profile preview" 
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="text-center text-gray-500">
                    <Upload className="w-12 h-12 mx-auto mb-2" />
                    <p>프로필 사진</p>
                  </div>
                )}
              </div>
              <label className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>프로필 사진 업로드</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* 입력 필드들 */}
            <div className="flex-1">
              <div className="grid grid-cols-2 gap-6">
                {/* 왼쪽 컬럼 */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      이름 *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="이름"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      작업 분야 *
                    </label>
                    <input
                      type="text"
                      name="workField"
                      value={formData.workField}
                      onChange={handleInputChange}
                      placeholder="작업 분야"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      휴대전화번호 *
                    </label>
                    <input
                      type="tel"
                      name="mobilePhone"
                      value={formData.mobilePhone}
                      onChange={handleInputChange}
                      placeholder="휴대전화번호"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      건강 유의사항
                    </label>
                    <textarea
                      name="healthPrecautions"
                      value={formData.healthPrecautions}
                      onChange={handleInputChange}
                      placeholder="건강 유의사항"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* 오른쪽 컬럼 */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      생년월일 *
                    </label>
                    <input
                      type="date"
                      name="birthDate"
                      value={formData.birthDate}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      소속 *
                    </label>
                    <input
                      type="text"
                      name="affiliation"
                      value={formData.affiliation}
                      onChange={handleInputChange}
                      placeholder="소속"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      비상연락처 *
                    </label>
                    <input
                      type="tel"
                      name="emergencyContact"
                      value={formData.emergencyContact}
                      onChange={handleInputChange}
                      placeholder="비상연락처"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      장비 ID (비콘 선택) *
                    </label>
                    {beaconsLoading ? (
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-sm text-gray-600">비콘 목록 로딩 중...</span>
                      </div>
                    ) : (
                      <select
                        name="equipmentId"
                        value={formData.equipmentId}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">비콘을 선택하세요</option>
                        {beacons
                          .filter(beacon => beacon.status === 'active')
                          .map((beacon) => (
                            <option key={beacon.id} value={beacon.beaconId}>
                              {beacon.name} ({beacon.beaconId}) - {beacon.macAddress}
                              {beacon.gateway && ` - ${beacon.gateway.name}`}
                            </option>
                          ))}
                      </select>
                    )}
                    {!beaconsLoading && beacons.filter(beacon => beacon.status === 'active').length === 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-red-600 mb-2">
                          활성화된 비콘이 없습니다.
                        </p>
                        <Link 
                          href="/beacons" 
                          className="text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                          비콘 관리 페이지에서 비콘을 등록해주세요 →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 버튼들 */}
        <div className="flex justify-end space-x-4">
          <Link
            href="/"
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>취소</span>
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? '저장 중...' : '저장'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
