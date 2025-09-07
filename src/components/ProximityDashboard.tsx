"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, MapPin, Wifi, Clock, Users, Activity, RefreshCw, CheckCircle, XCircle, Trash2 } from "lucide-react";

interface ProximityAlert {
  id: number;
  beaconId: string;
  gatewayId: string;
  workerId?: number;
  rssi: number;
  distance: number;
  threshold: number;
  isAlert: boolean;
  alertTime?: string;
  createdAt: string;
  beacon: {
    name: string;
    location?: string;
  };
  gateway: {
    name: string;
    location: string;
  };
  worker?: {
    name: string;
  };
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
  const [alerts, setAlerts] = useState<ProximityAlert[]>([]);
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

  useEffect(() => {
    fetchData();
    checkMqttStatus();
    const interval = setInterval(fetchData, 5000); // 5초마다 업데이트
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [alertsResponse, statsResponse] = await Promise.all([
        fetch("/api/proximity-alerts"),
        fetch("/api/dashboard-stats")
      ]);

      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setAlerts(alertsData);
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

  const clearProximityAlerts = async () => {
    if (!confirm("모든 근접 알림 데이터와 모니터링 로그를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.")) {
      return;
    }

    setClearing(true);
    try {
      // 근접 알림 데이터와 모니터링 로그를 함께 삭제
      const [proximityResponse, monitoringResponse] = await Promise.all([
        fetch("/api/proximity-alerts", { method: "DELETE" }),
        fetch("/api/monitoring-logs", { method: "DELETE" })
      ]);
      
      let successMessages = [];
      let errorMessages = [];
      
      if (proximityResponse.ok) {
        const result = await proximityResponse.json();
        console.log("근접 알림 데이터 삭제 완료:", result);
        successMessages.push("근접 알림 데이터");
      } else {
        const error = await proximityResponse.json();
        errorMessages.push(`근접 알림: ${error.error || "알 수 없는 오류"}`);
      }
      
      if (monitoringResponse.ok) {
        const result = await monitoringResponse.json();
        console.log("모니터링 로그 삭제 완료:", result);
        successMessages.push("모니터링 로그");
      } else {
        const error = await monitoringResponse.json();
        errorMessages.push(`모니터링 로그: ${error.error || "알 수 없는 오류"}`);
      }
      
      if (successMessages.length > 0) {
        alert(`${successMessages.join(", ")} 삭제가 완료되었습니다.`);
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

  const getDangerLevel = (distance: number): 'safe' | 'warning' | 'danger' => {
    if (distance > 5) return 'safe';
    if (distance > 2) return 'warning';
    return 'danger';
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

  const filteredAlerts = alerts.filter(alert => {
    const dangerLevel = getDangerLevel(alert.distance);
    switch (filter) {
      case 'active': return alert.isAlert;
      case 'danger': return dangerLevel === 'danger';
      default: return true;
    }
  });

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
          {/* MQTT 연결 상태 및 버튼 */}
          <div className="flex items-center gap-2">
            {mqttStatus && (
              <div className="flex items-center gap-1">
                {mqttStatus.connected ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm font-medium ${
                  mqttStatus.connected ? 'text-green-600' : 'text-red-600'
                }`}>
                  MQTT {mqttStatus.connected ? '연결됨' : '연결 안됨'}
                </span>
              </div>
            )}
            <button
              onClick={connectMqtt}
              disabled={mqttConnecting}
              className={`px-3 py-1 rounded-md text-sm flex items-center gap-1 ${
                mqttConnecting 
                  ? 'bg-gray-400 text-white cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <RefreshCw className={`w-3 h-3 ${mqttConnecting ? 'animate-spin' : ''}`} />
              {mqttConnecting ? '연결 중...' : 'MQTT 연결'}
            </button>
          </div>
          
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
          
          {/* 개발용 초기화 버튼 */}
          <button
            onClick={clearProximityAlerts}
            disabled={clearing}
            className={`px-3 py-1 rounded-md text-sm flex items-center gap-1 ${
              clearing 
                ? 'bg-gray-400 text-white cursor-not-allowed' 
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
            title="모든 근접 알림 데이터와 모니터링 로그 삭제 (개발용)"
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

      {/* 알림 목록 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">근접 알림 목록</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  비콘 정보
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  게이트웨이
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업자
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  거리
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  위험도
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  시간
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAlerts.map((alert) => {
                const dangerLevel = getDangerLevel(alert.distance);
                return (
                  <tr key={alert.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {alert.beacon.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {alert.beaconId}
                        </div>
                        {alert.beacon.location && (
                          <div className="text-sm text-gray-500 flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {alert.beacon.location}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {alert.gateway.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {alert.gateway.location}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {alert.worker ? alert.worker.name : "미지정"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {alert.distance.toFixed(2)}m
                        </div>
                        <div className="text-sm text-gray-500">
                          RSSI: {alert.rssi} dBm
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDangerColor(dangerLevel)}`}>
                        {getDangerText(dangerLevel)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Clock className="w-4 h-4 mr-1 text-gray-400" />
                        {new Date(alert.createdAt).toLocaleString('ko-KR')}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredAlerts.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            표시할 알림이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
