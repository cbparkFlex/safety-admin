"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import GatewayDetailView from "@/components/GatewayDetailView";

interface GatewayData {
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
}

export default function GatewayDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<GatewayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGatewayData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/gateways/${params.id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError("Gateway를 찾을 수 없습니다.");
          } else {
            setError("데이터를 불러오는 중 오류가 발생했습니다.");
          }
          return;
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error("Gateway 데이터 조회 실패:", err);
        setError("서버 연결에 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchGatewayData();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">오류 발생</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            뒤로가기
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">📊</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">데이터 없음</h1>
          <p className="text-gray-600 mb-4">이 Gateway에는 측정 데이터가 없습니다.</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            뒤로가기
          </button>
        </div>
      </div>
    );
  }

  return <GatewayDetailView data={data} />;
}
