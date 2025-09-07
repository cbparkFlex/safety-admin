"use client";

import { useState } from "react";
import { ArrowLeft, MapPin, Wifi, Activity, Calendar, BarChart3, Target, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

interface GatewayDetailViewProps {
  data: {
    gateway: {
      id: number;
      name: string;
      gatewayId: string;
      location: string;
      mqttTopic: string;
      proximityAlerts: any[];
    };
    beaconGroups: Array<{
      beacon: {
        id: number;
        name: string;
        beaconId: string;
        mac: string;
      };
      measurements: Array<{
        id: number;
        distance: number;
        rssi: number;
        samples: number;
        timestamp: string;
      }>;
    }>;
  };
}

export default function GatewayDetailView({ data }: GatewayDetailViewProps) {
  const router = useRouter();
  const [selectedBeacon, setSelectedBeacon] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { gateway, beaconGroups } = data;

  const handleRefresh = async () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRSSIQuality = (rssi: number) => {
    if (rssi >= -50) return { level: "Excellent", color: "text-green-600", bg: "bg-green-50" };
    if (rssi >= -60) return { level: "Good", color: "text-blue-600", bg: "bg-blue-50" };
    if (rssi >= -70) return { level: "Fair", color: "text-yellow-600", bg: "bg-yellow-50" };
    return { level: "Poor", color: "text-red-600", bg: "bg-red-50" };
  };

  const selectedBeaconData = selectedBeacon 
    ? beaconGroups.find(group => group.beacon.beaconId === selectedBeacon)
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>뒤로가기</span>
              </button>
              <div className="h-6 w-px bg-gray-300" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{gateway.name}</h1>
                <p className="text-sm text-gray-500">Gateway ID: {gateway.gatewayId}</p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              새로고침
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Gateway 정보 카드 */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">위치</p>
                <p className="text-lg font-semibold text-gray-900">{gateway.location}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Wifi className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">MQTT Topic</p>
                <p className="text-lg font-semibold text-gray-900 font-mono text-sm">{gateway.mqttTopic}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">근접 알림</p>
                <p className="text-lg font-semibold text-gray-900">{gateway.proximityAlerts.length}건</p>
              </div>
            </div>
          </div>
        </div>

        {/* Beacon 목록 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Beacon 선택 패널 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  측정된 Beacon 목록
                </h2>
                <p className="text-sm text-gray-500 mt-1">{beaconGroups.length}개 Beacon</p>
              </div>
              <div className="p-4">
                {beaconGroups.length === 0 ? (
                  <div className="text-center py-8">
                    <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">측정된 Beacon이 없습니다</p>
                    <p className="text-sm text-gray-400 mt-1">RSSI 보정 측정을 수행해주세요</p>
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-700">
                        💡 <strong>측정 방법:</strong> Gateway 관리에서 Target 아이콘을 클릭하여 RSSI 보정 측정을 시작하세요.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {beaconGroups.map((group) => (
                      <button
                        key={group.beacon.beaconId}
                        onClick={() => setSelectedBeacon(
                          selectedBeacon === group.beacon.beaconId ? null : group.beacon.beaconId
                        )}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedBeacon === group.beacon.beaconId
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{group.beacon.name}</p>
                            <p className="text-sm text-gray-500 font-mono">{group.beacon.beaconId}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">{group.measurements.length}개 측정</p>
                            <p className="text-xs text-gray-500">
                              {group.measurements[0] && formatDate(group.measurements[0].timestamp)}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 측정 데이터 상세 */}
          <div className="lg:col-span-2">
            {selectedBeaconData ? (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    {selectedBeaconData.beacon.name} 측정 데이터
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Beacon ID: {selectedBeaconData.beacon.beaconId} | MAC: {selectedBeaconData.beacon.mac}
                  </p>
                </div>
                <div className="p-4">
                  {selectedBeaconData.measurements.length === 0 ? (
                    <div className="text-center py-8">
                      <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">측정 데이터가 없습니다</p>
                      <p className="text-sm text-gray-400 mt-1">이 Beacon에 대한 RSSI 측정을 수행해주세요</p>
                      <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                        <p className="text-sm text-yellow-700">
                          📏 <strong>측정 권장:</strong> 0.5m, 1.0m, 1.5m, 2.0m, 2.5m, 3.0m 거리에서 측정하세요.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 font-medium text-gray-700">거리</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">RSSI</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">품질</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">샘플 수</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">측정 일시</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedBeaconData.measurements.map((measurement, index) => {
                            const quality = getRSSIQuality(measurement.rssi);
                            return (
                              <tr key={measurement.id} className="border-b hover:bg-gray-50">
                                <td className="py-3 px-4">
                                  <span className="font-medium text-gray-900">{measurement.distance}m</span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="font-mono font-medium text-gray-900">
                                    {measurement.rssi}dBm
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${quality.bg} ${quality.color}`}>
                                    {quality.level}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="text-gray-600">{measurement.samples}회</span>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Calendar className="w-4 h-4" />
                                    {formatDate(measurement.timestamp)}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-8 text-center">
                  <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Beacon을 선택하세요</h3>
                  <p className="text-gray-500 mb-4">왼쪽에서 Beacon을 선택하면 해당 Beacon의 측정 데이터를 확인할 수 있습니다.</p>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      📊 <strong>측정 데이터:</strong> 거리별 RSSI 값, 측정 품질, 샘플 수, 측정 일시를 확인할 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
