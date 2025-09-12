'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  AlertTriangle, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  MapPin,
  User,
  FileText,
  RefreshCw
} from 'lucide-react';

interface EmergencyIncident {
  id: number;
  type: string;
  title: string;
  description: string;
  location: string;
  severity: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
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

const STATUS_COLORS = {
  active: 'bg-red-100 text-red-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800'
};

const SEVERITY_COLORS = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
  critical: 'bg-purple-100 text-purple-800'
};

const TYPE_LABELS = {
  lpg_gas_leak: 'LPG 가스 누출',
  safety_equipment: '안전장구 미착용',
  crane_worker: '크레인 반경 내 작업자',
  lpg_explosion: 'LPG 폭발 감지'
};

export default function EmergencyRecordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [incident, setIncident] = useState<EmergencyIncident | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (resolvedParams.id) {
      fetchIncident();
    }
  }, [resolvedParams.id]);

  const fetchIncident = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/emergency/incidents/${resolvedParams.id}`);
      if (response.ok) {
        const data = await response.json();
        setIncident(data.data);
      } else {
        console.error('비상 상황 기록 조회 실패');
      }
    } catch (error) {
      console.error('비상 상황 기록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'skipped': return <XCircle className="w-5 h-5 text-yellow-600" />;
      case 'pending': return <Clock className="w-5 h-5 text-gray-400" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '완료';
      case 'skipped': return '건너뛰기';
      case 'pending': return '대기중';
      default: return '알 수 없음';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getDuration = (startedAt: string, completedAt?: string) => {
    const start = new Date(startedAt);
    const end = completedAt ? new Date(completedAt) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays}일 ${diffHours % 24}시간 ${diffMins % 60}분`;
    } else if (diffHours > 0) {
      return `${diffHours}시간 ${diffMins % 60}분`;
    }
    return `${diffMins}분`;
  };

  const getProgressPercentage = () => {
    if (!incident || incident.executions.length === 0) return 0;
    const completedSteps = incident.executions.filter(exec => exec.status === 'completed').length;
    return (completedSteps / incident.executions.length) * 100;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">데이터를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">비상 상황 기록을 찾을 수 없습니다.</p>
            <button
              onClick={() => router.push('/emergency/records')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              목록으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/emergency/records')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          목록으로 돌아가기
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              비상 상황 기록 #{incident.id}
            </h1>
            <p className="text-gray-600">{incident.title}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[incident.status as keyof typeof STATUS_COLORS]}`}>
              <AlertTriangle className="w-4 h-4" />
              {incident.status === 'active' ? '진행중' :
               incident.status === 'in_progress' ? '처리중' :
               incident.status === 'completed' ? '완료' : '취소'}
            </span>
            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${SEVERITY_COLORS[incident.severity as keyof typeof SEVERITY_COLORS]}`}>
              {incident.severity === 'low' ? '낮음' :
               incident.severity === 'medium' ? '보통' :
               incident.severity === 'high' ? '높음' : '매우 높음'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 기본 정보 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">기본 정보</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">유형</label>
                <p className="text-gray-900">
                  {TYPE_LABELS[incident.type as keyof typeof TYPE_LABELS] || incident.type}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">위치</label>
                <div className="flex items-center gap-2 text-gray-900">
                  <MapPin className="w-4 h-4" />
                  {incident.location}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">발생 시간</label>
                <div className="flex items-center gap-2 text-gray-900">
                  <Calendar className="w-4 h-4" />
                  {formatDate(incident.startedAt)}
                </div>
              </div>
              
              {incident.completedAt && (
                <div>
                  <label className="text-sm font-medium text-gray-500">완료 시간</label>
                  <div className="flex items-center gap-2 text-gray-900">
                    <Calendar className="w-4 h-4" />
                    {formatDate(incident.completedAt)}
                  </div>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-gray-500">소요 시간</label>
                <div className="flex items-center gap-2 text-gray-900">
                  <Clock className="w-4 h-4" />
                  {getDuration(incident.startedAt, incident.completedAt)}
                </div>
              </div>
            </div>
          </div>

          {/* 진행률 */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">진행률</h3>
            
            <div className="mb-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>완료된 단계</span>
                <span>{incident.executions.filter(exec => exec.status === 'completed').length} / {incident.executions.length}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
            </div>
            
            <div className="text-sm text-gray-600">
              {Math.round(getProgressPercentage())}% 완료
            </div>
          </div>
        </div>

        {/* 상세 정보 및 단계별 진행 */}
        <div className="lg:col-span-2">
          {/* 설명 */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">상황 설명</h3>
            <p className="text-gray-700 leading-relaxed">{incident.description}</p>
          </div>

          {/* 단계별 진행 상황 */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">단계별 진행 상황</h3>
            
            {incident.executions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>등록된 단계가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {incident.executions
                  .sort((a, b) => a.stepNumber - b.stepNumber)
                  .map((execution, index) => (
                    <div
                      key={execution.id}
                      className={`border rounded-lg p-4 ${
                        execution.status === 'completed' ? 'border-green-200 bg-green-50' :
                        execution.status === 'skipped' ? 'border-yellow-200 bg-yellow-50' :
                        'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                          execution.status === 'completed' ? 'bg-green-100 text-green-800' :
                          execution.status === 'skipped' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {execution.stepNumber}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">
                              {execution.step?.title || '단계 정보 없음'}
                            </h4>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(execution.status)}
                              <span className={`text-sm font-medium ${
                                execution.status === 'completed' ? 'text-green-600' :
                                execution.status === 'skipped' ? 'text-yellow-600' :
                                'text-gray-500'
                              }`}>
                                {getStatusText(execution.status)}
                              </span>
                            </div>
                          </div>
                          
                          {execution.executedAt && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                              <Clock className="w-4 h-4" />
                              실행 시간: {formatDate(execution.executedAt)}
                            </div>
                          )}
                          
                          {execution.notes && (
                            <div className="mt-3 p-3 bg-white rounded border">
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="w-4 h-4 text-gray-500" />
                                <span className="text-sm font-medium text-gray-700">실행 노트</span>
                              </div>
                              <p className="text-sm text-gray-600">{execution.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
