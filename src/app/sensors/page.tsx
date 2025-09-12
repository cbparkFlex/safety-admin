'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, RefreshCw } from 'lucide-react';

interface SensorMapping {
  id: number;
  sensorId: string;
  building: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SensorFormData {
  sensorId: string;
  building: string;
  isActive: boolean;
}

export default function SensorManagementPage() {
  const [sensors, setSensors] = useState<SensorMapping[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSensor, setEditingSensor] = useState<SensorMapping | null>(null);
  const [formData, setFormData] = useState<SensorFormData>({
    sensorId: '',
    building: '',
    isActive: true
  });
  const [loading, setLoading] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    fetchSensors();
  }, []);

  const fetchSensors = async () => {
    try {
      const response = await fetch('/api/sensors');
      if (response.ok) {
        const data = await response.json();
        setSensors(data.data || []);
      }
    } catch (error) {
      console.error('센서 매칭 목록 조회 실패:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingSensor ? `/api/sensors/${editingSensor.id}` : '/api/sensors';
      const method = editingSensor ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchSensors();
        setIsModalOpen(false);
        setEditingSensor(null);
        setFormData({
          sensorId: '',
          building: '',
          isActive: true
        });
      } else {
        const errorData = await response.json();
        alert(`오류: ${errorData.error || '센서 매칭 저장에 실패했습니다.'}`);
      }
    } catch (error) {
      console.error('센서 매칭 저장 실패:', error);
      alert('센서 매칭 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (sensor: SensorMapping) => {
    setEditingSensor(sensor);
    setFormData({
      sensorId: sensor.sensorId,
      building: sensor.building,
      isActive: sensor.isActive
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('이 센서 매칭을 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/sensors/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchSensors();
      } else {
        const errorData = await response.json();
        alert(`오류: ${errorData.error || '센서 매칭 삭제에 실패했습니다.'}`);
      }
    } catch (error) {
      console.error('센서 매칭 삭제 실패:', error);
      alert('센서 매칭 삭제에 실패했습니다.');
    }
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/sensors/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        await fetchSensors();
      } else {
        const errorData = await response.json();
        alert(`오류: ${errorData.error || '상태 변경에 실패했습니다.'}`);
      }
    } catch (error) {
      console.error('상태 변경 실패:', error);
      alert('상태 변경에 실패했습니다.');
    }
  };

  const handleSeed = async () => {
    if (!confirm('기본 센서 매칭 데이터를 생성하시겠습니까? 기존 데이터는 삭제됩니다.')) return;

    setIsSeeding(true);
    try {
      const response = await fetch('/api/sensors/seed', {
        method: 'POST',
      });

      if (response.ok) {
        await fetchSensors();
        alert('기본 센서 매칭 데이터가 생성되었습니다.');
      } else {
        const errorData = await response.json();
        alert(`오류: ${errorData.error || '데이터 생성에 실패했습니다.'}`);
      }
    } catch (error) {
      console.error('데이터 생성 실패:', error);
      alert('데이터 생성에 실패했습니다.');
    } finally {
      setIsSeeding(false);
    }
  };

  const openModal = () => {
    setEditingSensor(null);
    setFormData({
      sensorId: '',
      building: '',
      isActive: true
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSensor(null);
    setFormData({
      sensorId: '',
      building: '',
      isActive: true
    });
  };

  const getBuildingColor = (building: string) => {
    switch (building) {
      case 'A':
        return 'bg-blue-100 text-blue-800';
      case 'B':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">가스 누출 센서 관리</h1>
        <div className="flex space-x-3">
          <button
            onClick={handleSeed}
            disabled={isSeeding}
            className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isSeeding ? 'animate-spin' : ''}`} />
            <span>{isSeeding ? '생성 중...' : '기본 데이터 생성'}</span>
          </button>
          <button
            onClick={openModal}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>새 센서 추가</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                센서 ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                건물
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sensors.map((sensor) => (
              <tr key={sensor.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{sensor.sensorId}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getBuildingColor(sensor.building)}`}>
                    {sensor.building}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleToggleActive(sensor.id, sensor.isActive)}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      sensor.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {sensor.isActive ? (
                      <>
                        <Eye className="w-3 h-3 mr-1" />
                        활성
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3 mr-1" />
                        비활성
                      </>
                    )}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => handleEdit(sensor)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(sensor.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sensors.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">등록된 센서 매칭이 없습니다.</div>
            <button
              onClick={handleSeed}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              기본 데이터를 생성하시겠습니까?
            </button>
          </div>
        )}
      </div>

      {/* 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingSensor ? '센서 매칭 수정' : '새 센서 매칭 추가'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    센서 ID *
                  </label>
                  <input
                    type="text"
                    value={formData.sensorId}
                    onChange={(e) => setFormData({ ...formData, sensorId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="A_1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    건물 *
                  </label>
                  <select
                    value={formData.building}
                    onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">건물 선택</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                    활성 상태
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? '저장 중...' : editingSensor ? '수정' : '추가'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
