'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Play, Pause, Eye, EyeOff, ArrowUp, ArrowDown } from 'lucide-react';

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

interface CctvFormData {
  name: string;
  description: string;
  streamUrl: string;
  location: string;
  isActive: boolean;
}

export default function CctvManagementPage() {
  const [streams, setStreams] = useState<CctvStream[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStream, setEditingStream] = useState<CctvStream | null>(null);
  const [formData, setFormData] = useState<CctvFormData>({
    name: '',
    description: '',
    streamUrl: '',
    location: '',
    isActive: true
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStreams();
  }, []);

  const fetchStreams = async () => {
    try {
      const response = await fetch('/api/cctv');
      if (response.ok) {
        const data = await response.json();
        setStreams(data.streams || []);
      }
    } catch (error) {
      console.error('CCTV 스트림 목록 조회 실패:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingStream ? `/api/cctv/${editingStream.id}` : '/api/cctv';
      const method = editingStream ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchStreams();
        setIsModalOpen(false);
        setEditingStream(null);
        setFormData({
          name: '',
          description: '',
          streamUrl: '',
          location: '',
          isActive: true
        });
      } else {
        const errorData = await response.json();
        alert(`오류: ${errorData.error || 'CCTV 스트림 저장에 실패했습니다.'}`);
      }
    } catch (error) {
      console.error('CCTV 스트림 저장 실패:', error);
      alert('CCTV 스트림 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (stream: CctvStream) => {
    setEditingStream(stream);
    setFormData({
      name: stream.name,
      description: stream.description || '',
      streamUrl: stream.streamUrl,
      location: stream.location || '',
      isActive: stream.isActive
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('이 CCTV 스트림을 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/cctv/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchStreams();
      } else {
        const errorData = await response.json();
        alert(`오류: ${errorData.error || 'CCTV 스트림 삭제에 실패했습니다.'}`);
      }
    } catch (error) {
      console.error('CCTV 스트림 삭제 실패:', error);
      alert('CCTV 스트림 삭제에 실패했습니다.');
    }
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/cctv/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        await fetchStreams();
      } else {
        const errorData = await response.json();
        alert(`오류: ${errorData.error || '상태 변경에 실패했습니다.'}`);
      }
    } catch (error) {
      console.error('상태 변경 실패:', error);
      alert('상태 변경에 실패했습니다.');
    }
  };

  const handleMoveOrder = async (id: number, direction: 'up' | 'down') => {
    const currentIndex = streams.findIndex(s => s.id === id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= streams.length) return;

    const newOrder = streams[newIndex].order;
    const currentOrder = streams[currentIndex].order;

    try {
      // 두 스트림의 순서를 바꿈
      await Promise.all([
        fetch(`/api/cctv/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: newOrder }),
        }),
        fetch(`/api/cctv/${streams[newIndex].id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: currentOrder }),
        })
      ]);

      await fetchStreams();
    } catch (error) {
      console.error('순서 변경 실패:', error);
      alert('순서 변경에 실패했습니다.');
    }
  };

  const openModal = () => {
    setEditingStream(null);
    setFormData({
      name: '',
      description: '',
      streamUrl: '',
      location: '',
      isActive: true
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingStream(null);
    setFormData({
      name: '',
      description: '',
      streamUrl: '',
      location: '',
      isActive: true
    });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">CCTV 스트림 관리</h1>
        <button
          onClick={openModal}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>새 스트림 추가</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                순서
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                이름
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                위치
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                스트림 URL
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
            {streams.map((stream, index) => (
              <tr key={stream.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleMoveOrder(stream.id, 'up')}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium text-gray-900">{stream.order}</span>
                    <button
                      onClick={() => handleMoveOrder(stream.id, 'down')}
                      disabled={index === streams.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{stream.name}</div>
                    {stream.description && (
                      <div className="text-sm text-gray-500">{stream.description}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {stream.location || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div className="max-w-xs truncate" title={stream.streamUrl}>
                    {stream.streamUrl}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleToggleActive(stream.id, stream.isActive)}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      stream.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {stream.isActive ? (
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
                    onClick={() => handleEdit(stream)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(stream.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {streams.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">등록된 CCTV 스트림이 없습니다.</div>
          </div>
        )}
      </div>

      {/* 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingStream ? 'CCTV 스트림 수정' : '새 CCTV 스트림 추가'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    이름 *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    설명
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    스트림 URL *
                  </label>
                  <input
                    type="url"
                    value={formData.streamUrl}
                    onChange={(e) => setFormData({ ...formData, streamUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="http://210.99.70.120:1935/live/cctv001.stream/playlist.m3u8"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    위치
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="A동 출입구"
                  />
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
                    {loading ? '저장 중...' : editingStream ? '수정' : '추가'}
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
