"use client";

import { useState, useEffect } from "react";
import { Trash2, RefreshCw, Settings, BarChart3, Clock, AlertTriangle, CheckCircle } from "lucide-react";

interface LogStatistics {
  monitoringLogs: {
    total: number;
    bySeverity: Record<string, number>;
  };
  proximityAlerts: {
    total: number;
    active: number;
  };
  oldestLogs: {
    monitoring: string | null;
    proximity: string | null;
  };
}

interface RetentionPolicy {
  id: number;
  logType: string;
  severity: string;
  retentionDays: number;
  isActive: boolean;
  lastCleanup: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CleanupSummary {
  totalDeleted: number;
  results: Array<{
    logType: string;
    severity: string;
    deletedCount: number;
    retentionDays: number;
  }>;
  errors: string[];
  executionTime: number;
}

export default function LogManagement() {
  const [statistics, setStatistics] = useState<LogStatistics | null>(null);
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [lastCleanup, setLastCleanup] = useState<CleanupSummary | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsResponse, policiesResponse] = await Promise.all([
        fetch("/api/log-cleanup?type=statistics"),
        fetch("/api/log-cleanup?type=policies")
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStatistics(statsData.statistics);
      }

      if (policiesResponse.ok) {
        const policiesData = await policiesResponse.json();
        setPolicies(policiesData.policies);
      }
    } catch (error) {
      console.error("데이터 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const runCleanup = async () => {
    if (!confirm("로그 정리를 실행하시겠습니까?\n이 작업은 되돌릴 수 없습니다.")) {
      return;
    }

    setCleaning(true);
    try {
      const response = await fetch("/api/log-cleanup", {
        method: "POST"
      });

      if (response.ok) {
        const result = await response.json();
        setLastCleanup(result.summary);
        alert(`로그 정리 완료!\n총 ${result.summary.totalDeleted}개 로그가 삭제되었습니다.`);
        await fetchData(); // 통계 새로고침
      } else {
        const error = await response.json();
        alert(`정리 실패: ${error.error}`);
      }
    } catch (error) {
      console.error("로그 정리 실패:", error);
      alert("로그 정리 중 오류가 발생했습니다.");
    } finally {
      setCleaning(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "없음";
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'text-red-600 bg-red-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'info': return 'text-blue-600 bg-blue-100';
      case 'debug': return 'text-gray-600 bg-gray-100';
      case 'all': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">로그 정보를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">로그 관리</h2>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            새로고침
          </button>
          <button
            onClick={runCleanup}
            disabled={cleaning}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              cleaning
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            <Trash2 className={`w-4 h-4 ${cleaning ? 'animate-pulse' : ''}`} />
            {cleaning ? '정리 중...' : '로그 정리 실행'}
          </button>
        </div>
      </div>

      {/* 통계 카드 */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 모니터링 로그 통계 */}
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">모니터링 로그</h3>
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <div className="space-y-3">
              <div className="text-2xl font-bold text-gray-900">
                {statistics.monitoringLogs.total.toLocaleString()}개
              </div>
              <div className="space-y-1">
                {Object.entries(statistics.monitoringLogs.bySeverity).map(([severity, count]) => (
                  <div key={severity} className="flex justify-between items-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(severity)}`}>
                      {severity}
                    </span>
                    <span className="text-sm text-gray-600">{count.toLocaleString()}개</span>
                  </div>
                ))}
              </div>
              <div className="text-xs text-gray-500">
                가장 오래된 로그: {formatDate(statistics.oldestLogs.monitoring)}
              </div>
            </div>
          </div>

          {/* 근접 알림 통계 */}
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">근접 알림</h3>
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div className="space-y-3">
              <div className="text-2xl font-bold text-gray-900">
                {statistics.proximityAlerts.total.toLocaleString()}개
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">활성 알림</span>
                <span className="text-sm font-medium text-red-600">
                  {statistics.proximityAlerts.active.toLocaleString()}개
                </span>
              </div>
              <div className="text-xs text-gray-500">
                가장 오래된 알림: {formatDate(statistics.oldestLogs.proximity)}
              </div>
            </div>
          </div>

          {/* 마지막 정리 결과 */}
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">마지막 정리</h3>
              <Clock className="w-6 h-6 text-green-600" />
            </div>
            {lastCleanup ? (
              <div className="space-y-3">
                <div className="text-2xl font-bold text-green-600">
                  {lastCleanup.totalDeleted.toLocaleString()}개 삭제
                </div>
                <div className="text-sm text-gray-600">
                  실행 시간: {lastCleanup.executionTime}ms
                </div>
                {lastCleanup.errors.length > 0 && (
                  <div className="text-xs text-red-600">
                    오류: {lastCleanup.errors.length}개
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500">아직 정리 기록이 없습니다.</div>
            )}
          </div>
        </div>
      )}

      {/* 보존 정책 테이블 */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">로그 보존 정책</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  로그 타입
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  심각도
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  보존 기간
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  마지막 정리
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {policies.map((policy) => (
                <tr key={policy.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {policy.logType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(policy.severity)}`}>
                      {policy.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {policy.retentionDays}일
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {policy.isActive ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        활성
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        비활성
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(policy.lastCleanup)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
