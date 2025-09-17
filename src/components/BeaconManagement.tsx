"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, MapPin, Wifi, Activity } from "lucide-react";

interface Beacon {
  id: number;
  beaconId: string;
  name: string;
  macAddress: string;
  uuid: string;
  major: number;
  minor: number;
  txPower: number;
  location?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface BeaconFormData {
  name: string;
  macAddress: string;
  uuid: string;
  major: number;
  minor: number;
  txPower: number;
  location: string;
}

export default function BeaconManagement() {
  const [beacons, setBeacons] = useState<Beacon[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBeacon, setEditingBeacon] = useState<Beacon | null>(null);
  const [formData, setFormData] = useState<BeaconFormData>({
    name: "",
    macAddress: "",
    uuid: "",
    major: 0,
    minor: 0,
    txPower: -59,
    location: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBeacons();
  }, []);

  const fetchBeacons = async () => {
    try {
      const response = await fetch("/api/beacons");
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setBeacons(result.data || []);
        } else {
          console.error("API 응답 오류:", result.error);
          setBeacons([]);
        }
      } else {
        console.error("HTTP 오류:", response.status);
        setBeacons([]);
      }
    } catch (error) {
      console.error("비콘 목록 조회 실패:", error);
      setBeacons([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingBeacon 
        ? `/api/beacons/${editingBeacon.id}` 
        : "/api/beacons";
      const method = editingBeacon ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchBeacons();
        resetForm();
        setIsModalOpen(false);
      } else {
        alert("저장에 실패했습니다.");
      }
    } catch (error) {
      console.error("저장 실패:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (beacon: Beacon) => {
    setEditingBeacon(beacon);
    setFormData({
      name: beacon.name,
      macAddress: beacon.macAddress,
      uuid: beacon.uuid,
      major: beacon.major,
      minor: beacon.minor,
      txPower: beacon.txPower,
      location: beacon.location || "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("정말로 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(`/api/beacons/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchBeacons();
      } else {
        alert("삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("삭제 실패:", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      macAddress: "",
      uuid: "",
      major: 0,
      minor: 0,
      txPower: -59,
      location: "",
    });
    setEditingBeacon(null);
  };

  const generateUUID = () => {
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    setFormData(prev => ({ ...prev, uuid }));
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">BLE Beacon 관리</h1>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          비콘 추가
        </button>
      </div>

      {/* 비콘 목록 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  비콘 정보
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  위치
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  신호 강도
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
              {beacons.length > 0 ? (
                beacons.map((beacon) => (
                  <tr key={beacon.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {beacon.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {beacon.beaconId}
                        </div>
                        <div className="text-sm text-gray-500">
                          MAC: {beacon.macAddress}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                        {beacon.location || "미설정"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Wifi className="w-4 h-4 mr-1 text-gray-400" />
                        {beacon.txPower} dBm
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        beacon.status === "active" 
                          ? "bg-green-100 text-green-800" 
                          : "bg-red-100 text-red-800"
                      }`}>
                        <Activity className="w-3 h-3 mr-1" />
                        {beacon.status === "active" ? "활성" : "비활성"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(beacon)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(beacon.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <Wifi className="w-12 h-12 text-gray-300 mb-4" />
                      <p className="text-lg font-medium text-gray-900 mb-2">등록된 Beacon이 없습니다</p>
                      <p className="text-sm text-gray-500 mb-4">새로운 Beacon을 추가해보세요</p>
                      <button
                        onClick={() => {
                          resetForm();
                          setIsModalOpen(true);
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Beacon 추가
                      </button>
                    </div>
                  </td>
                </tr>
              )}
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
                {editingBeacon ? "비콘 수정" : "비콘 추가"}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    비콘 이름
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
                    MAC 주소
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="AA:BB:CC:DD:EE:FF"
                    value={formData.macAddress}
                    onChange={(e) => setFormData(prev => ({ ...prev, macAddress: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    UUID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={formData.uuid}
                      onChange={(e) => setFormData(prev => ({ ...prev, uuid: e.target.value }))}
                      className="mt-1 block flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={generateUUID}
                      className="mt-1 px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                    >
                      생성
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Major
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.major}
                      onChange={(e) => setFormData(prev => ({ ...prev, major: parseInt(e.target.value) }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Minor
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.minor}
                      onChange={(e) => setFormData(prev => ({ ...prev, minor: parseInt(e.target.value) }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    전송 전력 (dBm)
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.txPower}
                    onChange={(e) => setFormData(prev => ({ ...prev, txPower: parseInt(e.target.value) }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    설치 위치
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
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
    </div>
  );
}
