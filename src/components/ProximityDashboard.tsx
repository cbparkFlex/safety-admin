"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, MapPin, Wifi, Clock, Users, Activity, RefreshCw, CheckCircle, XCircle, Trash2, Settings } from "lucide-react";

interface BeaconStatus {
  beaconId: string;
  beaconName: string;
  beaconLocation?: string;
  currentRSSI: number | null;
  currentDistance: number | null;
  lastUpdate: Date | null;
  isAlert: boolean;
  dangerLevel: 'safe' | 'warning' | 'danger';
  calibrationInfo?: {
    method: string;
    confidence: string;
    isCalibrated: boolean;
  };
}

interface GatewayBeaconStatus {
  gatewayId: string;
  gatewayName: string;
  gatewayLocation: string;
  beacons: BeaconStatus[];
  lastUpdate: Date;
}

interface DashboardStats {
  totalAlerts: number;
  activeAlerts: number;
  totalBeacons: number;
  activeBeacons: number;
  totalGateways: number;
  activeGateways: number;
}

export default function ProximityDashboard() {
  const [gatewayStatuses, setGatewayStatuses] = useState<GatewayBeaconStatus[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalAlerts: 0,
    activeAlerts: 0,
    totalBeacons: 0,
    activeBeacons: 0,
    totalGateways: 0,
    activeGateways: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'danger'>('all');
  const [mqttStatus, setMqttStatus] = useState<{connected: boolean, message: string} | null>(null);
  const [mqttConnecting, setMqttConnecting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [reloadingCalibration, setReloadingCalibration] = useState(false);

  useEffect(() => {
    fetchData();
    checkMqttStatus();
    const interval = setInterval(fetchData, 5000); // 5초마다 업데이트
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [gatewayStatusResponse, statsResponse] = await Promise.all([
        fetch("/api/gateway-beacon-status"),
        fetch("/api/dashboard-stats")
      ]);

      if (gatewayStatusResponse.ok) {
        const gatewayStatusData = await gatewayStatusResponse.json();
        setGatewayStatuses(gatewayStatusData.data);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error("데이터 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkMqttStatus = async () => {
    try {
      const response = await fetch("/api/mqtt");
      if (response.ok) {
        const status = await response.json();
        setMqttStatus(status);
      }
    } catch (error) {
      console.error("MQTT 상태 확인 실패:", error);
      setMqttStatus({ connected: false, message: "상태 확인 실패" });
    }
  };

  const connectMqtt = async () => {
    setMqttConnecting(true);
    try {
      const response = await fetch("/api/mqtt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "connect" })
      });
      
      if (response.ok) {
        const result = await response.json();
        setMqttStatus(result);
        console.log("MQTT 연결 결과:", result);
      } else {
        const error = await response.json();
        setMqttStatus({ connected: false, message: error.message || "연결 실패" });
      }
    } catch (error) {
      console.error("MQTT 연결 실패:", error);
      setMqttStatus({ connected: false, message: "연결 실패" });
    } finally {
      setMqttConnecting(false);
    }
  };

  const reloadCalibrationData = async () => {
    setReloadingCalibration(true);
    try {
      const response = await fetch("/api/rssi-calibration/reload", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`보정 데이터 재로드 완료!\n로드된 조합: ${result.loadedCombinations}개\n새로운 거리 계산이 적용됩니다.`);
        console.log("보정 데이터 재로드 완료:", result);
      } else {
        const error = await response.json();
        alert(`보정 데이터 재로드 실패: ${error.error || "알 수 없는 오류"}`);
      }
    } catch (error) {
      console.error("보정 데이터 재로드 실패:", error);
      alert("보정 데이터 재로드 중 오류가 발생했습니다.");
    } finally {
      setReloadingCalibration(false);
    }
  };

  const clearProximityAlerts = async () => {
    if (!confirm("모든 근접 알림 데이터와 모니터링 로그를 삭제하고 autoincrement를 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.")) {
      return;
    }

    setClearing(true);
    try {
      // 근접 알림 데이터와 모니터링 로그를 함께 삭제 (TRUNCATE)
      const [proximityResponse, monitoringResponse] = await Promise.all([
        fetch("/api/proximity-alerts", { method: "DELETE" }),
        fetch("/api/monitoring-logs", { method: "DELETE" })
      ]);
      
      let successMessages = [];
      let errorMessages = [];
      
      if (proximityResponse.ok) {
        const result = await proximityResponse.json();
        console.log("근접 알림 데이터 TRUNCATE 완료:", result);
        successMessages.push("근접 알림 데이터 (autoincrement 초기화)");
      } else {
        const error = await proximityResponse.json();
        errorMessages.push(`근접 알림: ${error.error || "알 수 없는 오류"}`);
      }
      
      if (monitoringResponse.ok) {
        const result = await monitoringResponse.json();
        console.log("모니터링 로그 TRUNCATE 완료:", result);
        successMessages.push("모니터링 로그 (autoincrement 초기화)");
      } else {
        const error = await monitoringResponse.json();
        errorMessages.push(`모니터링 로그: ${error.error || "알 수 없는 오류"}`);
      }
      
      if (successMessages.length > 0) {
        alert(`${successMessages.join(", ")} 삭제가 완료되었습니다.\nautoincrement index가 초기화되었습니다.`);
      }
      
      if (errorMessages.length > 0) {
        alert(`일부 삭제 실패:\n${errorMessages.join("\n")}`);
      }
      
      // 데이터 새로고침
      await fetchData();
    } catch (error) {
      console.error("데이터 삭제 실패:", error);
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setClearing(false);
    }
  };

  const getDangerColor = (level: 'safe' | 'warning' | 'danger') => {
    switch (level) {
      case 'danger': return 'text-red-600 bg-red-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-green-600 bg-green-100';
    }
  };

  const getDangerText = (level: 'safe' | 'warning' | 'danger') => {
    switch (level) {
      case 'danger': return '위험';
      case 'warning': return '주의';
      default: return '안전';
    }
  };

  const filteredGatewayStatuses = gatewayStatuses.map(gateway => ({
    ...gateway,
    beacons: gateway.beacons.filter(beacon => {
      switch (filter) {
        case 'active': return beacon.isAlert;
        case 'danger': return beacon.dangerLevel === 'danger';
        default: return true;
      }
    })
  })).filter(gateway => gateway.beacons.length > 0);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">근접 알림 대시보드</h1>
        <div className="flex items-center gap-4">
          
          {/* 필터 버튼들 */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-md text-sm ${
                filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1 rounded-md text-sm ${
                filter === 'active' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              활성 알림
            </button>
            <button
              onClick={() => setFilter('danger')}
              className={`px-3 py-1 rounded-md text-sm ${
                filter === 'danger' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              위험
            </button>
          </div>
          
          {/* 보정 데이터 재로드 버튼 */}
          <button
            onClick={reloadCalibrationData}
            disabled={reloadingCalibration}
            className={`px-3 py-1 rounded-md text-sm flex items-center gap-1 ${
              reloadingCalibration 
                ? 'bg-gray-400 text-white cursor-not-allowed' 
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
            title="데이터베이스에서 RSSI 보정 데이터를 다시 로드하여 거리 계산 정확도 향상"
          >
            <Settings className={`w-3 h-3 ${reloadingCalibration ? 'animate-spin' : ''}`} />
            {reloadingCalibration ? '로드 중...' : '보정 데이터 적용'}
          </button>
          
          {/* 개발용 초기화 버튼 */}
          <button
            onClick={clearProximityAlerts}
            disabled={clearing}
            className={`px-3 py-1 rounded-md text-sm flex items-center gap-1 ${
              clearing 
                ? 'bg-gray-400 text-white cursor-not-allowed' 
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
            title="모든 근접 알림 데이터와 모니터링 로그 삭제 및 autoincrement 초기화 (개발용)"
          >
            <Trash2 className={`w-3 h-3 ${clearing ? 'animate-pulse' : ''}`} />
            {clearing ? '삭제 중...' : '데이터 초기화'}
          </button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">활성 알림</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeAlerts}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">총 알림</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalAlerts}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Wifi className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">활성 비콘</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeBeacons}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">활성 게이트웨이</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeGateways}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gateway별 Beacon 상태 테이블 */}
      <div className="space-y-6">
        {filteredGatewayStatuses.map((gateway) => (
          <div key={gateway.gatewayId} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">{gateway.gatewayName}</h2>
                  <p className="text-sm text-gray-500 flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    {gateway.gatewayLocation}
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  마지막 업데이트: {new Date(gateway.lastUpdate).toLocaleString('ko-KR')}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      비콘 정보
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      현재 거리
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      RSSI
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      위험도
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      보정 상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      마지막 업데이트
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {gateway.beacons.map((beacon) => (
                    <tr key={beacon.beaconId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {beacon.beaconName}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {beacon.beaconId}
                          </div>
                          {beacon.beaconLocation && (
                            <div className="text-sm text-gray-500 flex items-center">
                              <MapPin className="w-3 h-3 mr-1" />
                              {beacon.beaconLocation}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {beacon.currentDistance !== null 
                            ? `${beacon.currentDistance.toFixed(2)}m`
                            : "측정 없음"
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {beacon.currentRSSI !== null 
                            ? `${beacon.currentRSSI} dBm`
                            : "측정 없음"
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDangerColor(beacon.dangerLevel)}`}>
                          {getDangerText(beacon.dangerLevel)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {beacon.calibrationInfo ? (
                          <div className="text-sm">
                            <div className={`font-medium ${
                              beacon.calibrationInfo.isCalibrated ? 'text-green-600' : 'text-gray-500'
                            }`}>
                              {beacon.calibrationInfo.isCalibrated ? '보정됨' : '기본 모델'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {beacon.calibrationInfo.method} ({beacon.calibrationInfo.confidence})
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">알 수 없음</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Clock className="w-4 h-4 mr-1 text-gray-400" />
                          {beacon.lastUpdate 
                            ? new Date(beacon.lastUpdate).toLocaleString('ko-KR')
                            : "업데이트 없음"
                          }
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {gateway.beacons.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                표시할 비콘이 없습니다.
              </div>
            )}
          </div>
        ))}
        {filteredGatewayStatuses.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            표시할 Gateway가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
