'use client';

import { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Shield, 
  Flame, 
  Wind, 
  Eye, 
  CheckCircle, 
  Clock,
  Filter,
  RefreshCw,
  Trash2
} from 'lucide-react';

interface SurveillanceRecord {
  id: number;
  type: string;
  title: string;
  message: string;
  location: string;
  severity: string;
  status: string;
  source: string;
  metadata?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function SurveillancePage() {
  const [records, setRecords] = useState<SurveillanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    type: '',
    severity: '',
    status: '',
  });
  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    total: 0,
    hasMore: false,
  });

  // 감시 기록 데이터 가져오기
  const fetchRecords = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString(),
        ...(filters.type && { type: filters.type }),
        ...(filters.severity && { severity: filters.severity }),
        ...(filters.status && { status: filters.status }),
      });

      const response = await fetch(`/api/surveillance-records?${params}`);
      const result = await response.json();

      if (result.success) {
        setRecords(result.data);
        setPagination(prev => ({
          ...prev,
          total: result.pagination.total,
          hasMore: result.pagination.hasMore,
        }));
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('감시 기록을 가져오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 기록 상태 업데이트
  const updateRecordStatus = async (id: number, status: string) => {
    try {
      const response = await fetch(`/api/surveillance-records/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      const result = await response.json();
      if (result.success) {
        fetchRecords(); // 데이터 새로고침
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('상태 업데이트에 실패했습니다.');
    }
  };

  // 기록 삭제
  const deleteRecord = async (id: number) => {
    if (!confirm('이 기록을 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/surveillance-records/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        fetchRecords(); // 데이터 새로고침
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('삭제에 실패했습니다.');
    }
  };

  // 필터 변경 핸들러
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, offset: 0 })); // 필터 변경 시 첫 페이지로
  };

  // 페이지네이션 핸들러
  const handleLoadMore = () => {
    setPagination(prev => ({
      ...prev,
      offset: prev.offset + prev.limit,
    }));
  };

  useEffect(() => {
    fetchRecords();
  }, [filters, pagination.offset]);

  // 타입별 아이콘 및 색상
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'safety_equipment':
        return <Shield className="w-4 h-4" />;
      case 'fire_explosion':
        return <Flame className="w-4 h-4" />;
      case 'gas_leak':
        return <Wind className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'safety_equipment':
        return 'bg-blue-100 text-blue-800';
      case 'fire_explosion':
        return 'bg-red-100 text-red-800';
      case 'gas_leak':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'safety_equipment':
        return '안전장구';
      case 'fire_explosion':
        return '화재/폭발';
      case 'gas_leak':
        return '가스누출';
      default:
        return type;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500';
      case 'danger':
        return 'bg-red-400';
      case 'warning':
        return 'bg-yellow-500';
      case 'info':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-red-100 text-red-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'acknowledged':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return '활성';
      case 'resolved':
        return '해결됨';
      case 'acknowledged':
        return '확인됨';
      default:
        return status;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">감시 기록 관리</h1>
        <p className="text-gray-600">CCTV 및 센서에서 감지된 안전 관련 알람을 관리합니다.</p>
      </div>

      {/* 필터 및 액션 */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">필터:</span>
          </div>
          
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">모든 타입</option>
            <option value="safety_equipment">안전장구</option>
            <option value="fire_explosion">화재/폭발</option>
            <option value="gas_leak">가스누출</option>
          </select>

          <select
            value={filters.severity}
            onChange={(e) => handleFilterChange('severity', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">모든 심각도</option>
            <option value="critical">치명적</option>
            <option value="danger">위험</option>
            <option value="warning">경고</option>
            <option value="info">정보</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">모든 상태</option>
            <option value="active">활성</option>
            <option value="acknowledged">확인됨</option>
            <option value="resolved">해결됨</option>
          </select>

          <button
            onClick={fetchRecords}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span>새로고침</span>
          </button>
        </div>

        <div className="text-sm text-gray-600">
          총 {pagination.total}개의 기록이 있습니다.
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* 기록 목록 */}
      <div className="bg-white rounded-lg shadow-sm">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">로딩 중...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Eye className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>감시 기록이 없습니다.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {records.map((record) => (
              <div key={record.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className={`w-3 h-3 rounded-full ${getSeverityColor(record.severity)}`}></div>
                      <h3 className="text-lg font-semibold text-gray-900">{record.title}</h3>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(record.type)}`}>
                          {getTypeIcon(record.type)}
                          <span className="ml-1">{getTypeLabel(record.type)}</span>
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                          {getStatusLabel(record.status)}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 mb-2">{record.message}</p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center space-x-1">
                        <Eye className="w-4 h-4" />
                        <span>{record.location}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(record.createdAt).toLocaleString('ko-KR')}</span>
                      </span>
                      {record.source && (
                        <span>출처: {record.source}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {record.status === 'active' && (
                      <>
                        <button
                          onClick={() => updateRecordStatus(record.id, 'acknowledged')}
                          className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 text-sm"
                        >
                          확인
                        </button>
                        <button
                          onClick={() => updateRecordStatus(record.id, 'resolved')}
                          className="px-3 py-1 bg-green-100 text-green-800 rounded-md hover:bg-green-200 text-sm"
                        >
                          해결
                        </button>
                      </>
                    )}
                    {record.status === 'acknowledged' && (
                      <button
                        onClick={() => updateRecordStatus(record.id, 'resolved')}
                        className="px-3 py-1 bg-green-100 text-green-800 rounded-md hover:bg-green-200 text-sm"
                      >
                        해결
                      </button>
                    )}
                    <button
                      onClick={() => deleteRecord(record.id)}
                      className="px-3 py-1 bg-red-100 text-red-800 rounded-md hover:bg-red-200 text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 더 보기 버튼 */}
        {pagination.hasMore && (
          <div className="p-6 border-t border-gray-200 text-center">
            <button
              onClick={handleLoadMore}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              더 보기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
