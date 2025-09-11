"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, MapPin, Wifi, Activity, Server, Target, BarChart3, Eye } from "lucide-react";
import { useRouter } from "next/navigation";

interface Gateway {
  id: number;
  gatewayId: string;
  name: string;
  location: string;
  ipAddress: string;
  mqttTopic: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface GatewayFormData {
  gatewayId: string;
  name: string;
  location: string;
  ipAddress: string;
  mqttTopic: string;
}

export default function GatewayManagement() {
  const router = useRouter();
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGateway, setEditingGateway] = useState<Gateway | null>(null);
  const [formData, setFormData] = useState<GatewayFormData>({
    gatewayId: "",
    name: "",
    location: "",
    ipAddress: "",
    mqttTopic: "",
  });
  const [loading, setLoading] = useState(false);
  const [calibrationModalOpen, setCalibrationModalOpen] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<Gateway | null>(null);
  const [calibrationData, setCalibrationData] = useState<any>(null);
  const [calibrationLoading, setCalibrationLoading] = useState(false);
  const [measurementSession, setMeasurementSession] = useState<any>(null);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurementInterval, setMeasurementInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchGateways();
  }, []);

  const fetchGateways = async () => {
    try {
      const response = await fetch("/api/gateways");
      if (response.ok) {
        const data = await response.json();
        setGateways(data);
      }
    } catch (error) {
      console.error("게이트웨이 목록 조회 실패:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingGateway 
        ? `/api/gateways/${editingGateway.id}` 
        : "/api/gateways";
      const method = editingGateway ? "PUT" : "POST";

      console.log("요청 URL:", url);
      console.log("요청 메서드:", method);
      console.log("요청 데이터:", formData);

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      console.log("응답 상태:", response.status);
      console.log("응답 OK:", response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log("성공 응답:", result);
        await fetchGateways();
        resetForm();
        setIsModalOpen(false);
        alert(result.message || "저장되었습니다.");
      } else {
        const errorData = await response.json();
        console.error("에러 응답:", errorData);
        alert(errorData.error || "저장에 실패했습니다.");
      }
    } catch (error) {
      console.error("저장 실패:", error);
      alert("저장 중 오류가 발생했습니다: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (gateway: Gateway) => {
    setEditingGateway(gateway);
    setFormData({
      gatewayId: gateway.gatewayId,
      name: gateway.name,
      location: gateway.location,
      ipAddress: gateway.ipAddress,
      mqttTopic: gateway.mqttTopic,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("정말로 삭제하시겠습니까?")) return;

    try {
      console.log("삭제 요청 ID:", id);
      const response = await fetch(`/api/gateways/${id}`, {
        method: "DELETE",
      });

      console.log("삭제 응답 상태:", response.status);
      console.log("삭제 응답 OK:", response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log("삭제 성공 응답:", result);
        await fetchGateways();
        alert(result.message || "삭제되었습니다.");
      } else {
        const errorData = await response.json();
        console.error("삭제 에러 응답:", errorData);
        alert(errorData.error || "삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("삭제 실패:", error);
      alert("삭제 중 오류가 발생했습니다: " + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      gatewayId: "",
      name: "",
      location: "",
      ipAddress: "",
      mqttTopic: "",
    });
    setEditingGateway(null);
  };

  const generateGatewayId = () => {
    const gatewayId = `GW_${Date.now()}`;
    setFormData(prev => ({ ...prev, gatewayId, name: `Gateway ${gatewayId}` }));
  };

  const generateMqttTopic = () => {
    const topic = `safety/beacon/${formData.name.toLowerCase().replace(/\s+/g, '_')}`;
    setFormData(prev => ({ ...prev, mqttTopic: topic }));
  };

  const openCalibrationModal = async (gateway: Gateway) => {
    setSelectedGateway(gateway);
    setCalibrationModalOpen(true);
    await fetchCalibrationData(gateway.gatewayId);
  };

  const fetchCalibrationData = async (gatewayId: string) => {
    setCalibrationLoading(true);
    try {
      const response = await fetch(`/api/rssi-calibration?gatewayId=${gatewayId}`);
      if (response.ok) {
        const data = await response.json();
        setCalibrationData(data);
      }
    } catch (error) {
      console.error("보정 데이터 조회 실패:", error);
    } finally {
      setCalibrationLoading(false);
    }
  };

  const startMeasurement = async (beaconId: string, distance: number) => {
    if (!selectedGateway) return;

    try {
      const response = await fetch("/api/rssi-measurement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          beaconId,
          gatewayId: selectedGateway.gatewayId,
          distance
        })
      });

      if (response.ok) {
        const result = await response.json();
        setMeasurementSession(result);
        setIsMeasuring(true);
        
        // 1초마다 측정 데이터 수집
        const interval = setInterval(async () => {
          await collectMeasurementData(result.sessionKey);
        }, 1000);
        
        setMeasurementInterval(interval);
        alert("측정이 시작되었습니다. Beacon을 지정된 위치에 놓고 10초간 기다려주세요.");
      } else {
        const error = await response.json();
        alert(`측정 시작 실패: ${error.error}`);
      }
    } catch (error) {
      console.error("측정 시작 실패:", error);
      alert("측정 시작 중 오류가 발생했습니다.");
    }
  };

  const stopMeasurement = async (saveData: boolean = false) => {
    if (!measurementSession) return;

    try {
      // 측정 간격 중지
      if (measurementInterval) {
        clearInterval(measurementInterval);
        setMeasurementInterval(null);
      }

      const response = await fetch("/api/rssi-measurement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "stop",
          sessionKey: measurementSession.sessionKey,
          saveData: saveData
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        if (saveData) {
          alert(`측정 완료! ${result.measurementCount}회 측정, 평균 RSSI: ${result.averageRSSI}dBm\n보정 데이터에 저장되었습니다.`);
          // 보정 데이터 새로고침
          await fetchCalibrationData(selectedGateway!.gatewayId);
        } else {
          alert(`측정 취소! ${result.measurementCount}회 측정 데이터가 삭제되었습니다.`);
        }
        
        // 측정 세션 초기화
        setMeasurementSession(null);
        setIsMeasuring(false);
      } else {
        const error = await response.json();
        alert(`측정 처리 실패: ${error.error}`);
      }
    } catch (error) {
      console.error("측정 처리 실패:", error);
      alert("측정 처리 중 오류가 발생했습니다.");
    }
  };

  const saveMeasurement = async () => {
    await stopMeasurement(true);
  };

  const cancelMeasurement = async () => {
    await stopMeasurement(false);
  };

  const collectMeasurementData = async (sessionKey: string) => {
    try {
      const response = await fetch("/api/rssi-measurement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_measurement",
          sessionKey
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // 측정 세션 업데이트
        setMeasurementSession(prev => ({
          ...prev,
          measurementCount: result.measurementCount,
          averageRSSI: result.averageRSSI
        }));

        // 10회 측정 완료 시 자동 저장
        if (result.measurementCount >= 10) {
          await saveMeasurement();
        }
      }
    } catch (error) {
      console.error("측정 데이터 수집 실패:", error);
    }
  };

  // 컴포넌트 언마운트 시 측정 중지
  useEffect(() => {
    return () => {
      if (measurementInterval) {
        clearInterval(measurementInterval);
      }
    };
  }, [measurementInterval]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gateway 관리</h1>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Gateway 추가
        </button>
      </div>

      {/* Gateway 목록 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gateway 정보
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  위치
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  네트워크
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  MQTT Topic
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
              {gateways.map((gateway) => (
                <tr key={gateway.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {gateway.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {gateway.gatewayId}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                      {gateway.location}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Wifi className="w-4 h-4 mr-1 text-gray-400" />
                      {gateway.ipAddress}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Server className="w-4 h-4 mr-1 text-gray-400" />
                      {gateway.mqttTopic}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      gateway.status === "active" 
                        ? "bg-green-100 text-green-800" 
                        : "bg-red-100 text-red-800"
                    }`}>
                      <Activity className="w-3 h-3 mr-1" />
                      {gateway.status === "active" ? "활성" : "비활성"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(gateway)}
                        className="text-blue-600 hover:text-blue-900"
                        title="수정"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                        <button
                          onClick={() => router.push(`/gateways/${gateway.id}`)}
                          className="text-blue-600 hover:text-blue-900"
                          title="상세보기"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openCalibrationModal(gateway)}
                          className="text-green-600 hover:text-green-900"
                          title="RSSI 보정 측정"
                        >
                          <Target className="w-4 h-4" />
                        </button>
                      <button
                        onClick={() => handleDelete(gateway.id)}
                        className="text-red-600 hover:text-red-900"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingGateway ? "Gateway 수정" : "Gateway 추가"}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Gateway ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="GW_282C02227A67"
                      value={formData.gatewayId}
                      onChange={(e) => setFormData(prev => ({ ...prev, gatewayId: e.target.value }))}
                      className="mt-1 block flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={generateGatewayId}
                      className="mt-1 px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                    >
                      생성
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Gateway 이름
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    설치 위치
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    IP 주소
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="192.168.1.100"
                    value={formData.ipAddress}
                    onChange={(e) => setFormData(prev => ({ ...prev, ipAddress: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    MQTT Topic
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="safety/beacon/gateway_name"
                      value={formData.mqttTopic}
                      onChange={(e) => setFormData(prev => ({ ...prev, mqttTopic: e.target.value }))}
                      className="mt-1 block flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={generateMqttTopic}
                      className="mt-1 px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                    >
                      생성
                    </button>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? "저장 중..." : "저장"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* RSSI 보정 측정 모달 */}
      {calibrationModalOpen && selectedGateway && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  RSSI 보정 측정 - {selectedGateway.name}
                </h3>
                <button
                  onClick={() => setCalibrationModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {calibrationLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">보정 데이터를 불러오는 중...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* 보정 상태 정보 */}
                  {calibrationData && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">보정 상태</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">측정 지점:</span>
                          <span className="ml-1 font-medium">{calibrationData.status?.measurementCount || 0}개</span>
                        </div>
                        <div>
                          <span className="text-gray-600">품질 점수:</span>
                          <span className={`ml-1 font-medium ${
                            (calibrationData.quality?.score || 0) >= 80 ? 'text-green-600' :
                            (calibrationData.quality?.score || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {calibrationData.quality?.score || 0}점
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">거리 범위:</span>
                          <span className="ml-1 font-medium">
                            {calibrationData.status?.distanceRange?.min || 0}m ~ {calibrationData.status?.distanceRange?.max || 0}m
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">RSSI 범위:</span>
                          <span className="ml-1 font-medium">
                            {calibrationData.status?.rssiRange?.min || 0} ~ {calibrationData.status?.rssiRange?.max || 0}dBm
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 실시간 측정 */}
                  <RealTimeMeasurementForm 
                    gateway={selectedGateway}
                    onStartMeasurement={startMeasurement}
                    onSaveMeasurement={saveMeasurement}
                    onCancelMeasurement={cancelMeasurement}
                    measurementSession={measurementSession}
                    isMeasuring={isMeasuring}
                  />

                  {/* 기존 측정 데이터 표시 */}
                  {calibrationData?.data?.measurements && calibrationData.data.measurements.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">기존 측정 데이터</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">거리 (m)</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">RSSI (dBm)</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">샘플 수</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">측정 시간</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {calibrationData.data.measurements.map((measurement: any, index: number) => (
                              <tr key={index}>
                                <td className="px-3 py-2 text-sm text-gray-900">{measurement.distance}</td>
                                <td className="px-3 py-2 text-sm text-gray-900">{measurement.rssi}</td>
                                <td className="px-3 py-2 text-sm text-gray-900">{measurement.samples}</td>
                                <td className="px-3 py-2 text-sm text-gray-500">
                                  {new Date(measurement.timestamp).toLocaleString('ko-KR')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 권장사항 */}
                  {calibrationData?.quality?.recommendations && calibrationData.quality.recommendations.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-medium text-yellow-800 mb-2">권장사항</h4>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        {calibrationData.quality.recommendations.map((rec: string, index: number) => (
                          <li key={index}>• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 실시간 RSSI 측정 폼 컴포넌트
function RealTimeMeasurementForm({ 
  gateway, 
  onStartMeasurement, 
  onSaveMeasurement, 
  onCancelMeasurement, 
  measurementSession, 
  isMeasuring 
}: { 
  gateway: Gateway; 
  onStartMeasurement: (beaconId: string, distance: number) => void;
  onSaveMeasurement: () => void;
  onCancelMeasurement: () => void;
  measurementSession: any;
  isMeasuring: boolean;
}) {
  const [beaconId, setBeaconId] = useState("");
  const [distance, setDistance] = useState(1.0);
  const [beacons, setBeacons] = useState<any[]>([]);

  useEffect(() => {
    fetchBeacons();
  }, []);

  const fetchBeacons = async () => {
    try {
      const response = await fetch("/api/beacons");
      if (response.ok) {
        const data = await response.json();
        setBeacons(data);
      }
    } catch (error) {
      console.error("Beacon 목록 조회 실패:", error);
    }
  };

  const handleStartMeasurement = () => {
    if (!beaconId) {
      alert("Beacon을 선택해주세요.");
      return;
    }
    onStartMeasurement(beaconId, distance);
  };

  const recommendedDistances = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];

  return (
    <div className="bg-blue-50 p-4 rounded-lg">
      <h4 className="font-medium text-gray-900 mb-3">실시간 RSSI 측정</h4>
      
      {!isMeasuring ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Beacon 선택
              </label>
              <select
                value={beaconId}
                onChange={(e) => setBeaconId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Beacon 선택</option>
                {beacons.map((beacon) => (
                  <option key={beacon.id} value={beacon.beaconId}>
                    {beacon.name} ({beacon.beaconId})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                측정 거리 (미터)
              </label>
              <select
                value={distance}
                onChange={(e) => setDistance(parseFloat(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {recommendedDistances.map((dist) => (
                  <option key={dist} value={dist}>{dist}m</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleStartMeasurement}
              className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 text-lg font-medium"
            >
              <Target className="w-5 h-5" />
              측정 시작
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 측정 진행 상태 */}
          <div className="bg-white p-4 rounded-lg border-2 border-green-200">
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-medium text-green-800">측정 진행 중...</h5>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-600">측정 중</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">측정 거리:</span>
                <span className="ml-1 font-medium">{measurementSession?.distance || distance}m</span>
              </div>
              <div>
                <span className="text-gray-600">측정 횟수:</span>
                <span className="ml-1 font-medium">{measurementSession?.measurementCount || 0}/10회</span>
              </div>
              <div>
                <span className="text-gray-600">현재 RSSI:</span>
                <span className="ml-1 font-medium">{measurementSession?.currentRSSI || 0}dBm</span>
              </div>
              <div>
                <span className="text-gray-600">평균 RSSI:</span>
                <span className="ml-1 font-medium">{measurementSession?.averageRSSI || 0}dBm</span>
              </div>
            </div>

            {/* 진행률 바 */}
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((measurementSession?.measurementCount || 0) / 10) * 100}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {measurementSession?.measurementCount || 0}/10회 측정 완료
              </p>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <button
              onClick={onCancelMeasurement}
              className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2 text-lg font-medium"
            >
              <Target className="w-5 h-5" />
              측정 취소
            </button>
            <button
              onClick={onSaveMeasurement}
              className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 text-lg font-medium"
            >
              <Target className="w-5 h-5" />
              측정 저장
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 p-3 bg-gray-100 rounded text-sm text-gray-600">
        <p className="font-medium mb-1">측정 방법:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Beacon을 Gateway에서 정확한 거리에 배치</li>
          <li>"측정 시작" 버튼을 클릭</li>
          <li>자동으로 10회 측정하여 평균값 계산</li>
          <li>10회 측정 완료 시 자동 저장 또는 수동으로 "측정 저장"/"측정 취소" 선택</li>
        </ol>
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-yellow-800 text-xs">
            <strong>주의:</strong> "측정 취소"를 누르면 측정 데이터가 삭제되고 보정 데이터에 저장되지 않습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
