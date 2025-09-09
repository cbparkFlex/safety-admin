import { NextRequest, NextResponse } from "next/server";
import { mqttClient } from "@/lib/mqttClient";

export async function POST(request: NextRequest) {
  try {
    if (!mqttClient || !mqttClient.connected) {
      return NextResponse.json(
        { error: "MQTT 클라이언트가 연결되지 않았습니다." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { topic, message } = body;

    if (!topic || !message) {
      return NextResponse.json(
        { error: "topic과 message가 필요합니다." },
        { status: 400 }
      );
    }

    // MQTT 메시지 발행
    mqttClient.publish(topic, JSON.stringify(message), (error) => {
      if (error) {
        console.error(`MQTT 메시지 발행 실패 (${topic}):`, error);
      } else {
        console.log(`MQTT 메시지 발행 성공 (${topic}):`, message);
      }
    });

    return NextResponse.json({
      message: "MQTT 테스트 메시지가 발행되었습니다.",
      topic,
      publishedMessage: message
    });
  } catch (error: any) {
    console.error("MQTT 테스트 메시지 발행 실패:", error);
    return NextResponse.json(
      { error: "MQTT 테스트 메시지 발행에 실패했습니다.", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'status') {
      return NextResponse.json({
        connected: mqttClient?.connected || false,
        clientId: mqttClient?.options?.clientId || 'unknown'
      });
    }

    // 기본 테스트 메시지 발행
    if (!mqttClient || !mqttClient.connected) {
      return NextResponse.json(
        { error: "MQTT 클라이언트가 연결되지 않았습니다." },
        { status: 400 }
      );
    }

    // 테스트용 Beacon 메시지 생성
    const testMessage = {
      beaconId: "BEACON_BC5729055F5A",
      gatewayId: "GW_282C02227A67",
      rssi: -45,
      timestamp: Date.now(),
      uuid: "12345678-1234-1234-1234-123456789012",
      major: 1,
      minor: 1
    };

    const topic = "safety/beacon/test";
    
    mqttClient.publish(topic, JSON.stringify(testMessage), (error) => {
      if (error) {
        console.error(`테스트 메시지 발행 실패 (${topic}):`, error);
      } else {
        console.log(`테스트 메시지 발행 성공 (${topic}):`, testMessage);
      }
    });

    return NextResponse.json({
      message: "테스트 Beacon 메시지가 발행되었습니다.",
      topic,
      testMessage
    });
  } catch (error: any) {
    console.error("MQTT 테스트 실패:", error);
    return NextResponse.json(
      { error: "MQTT 테스트에 실패했습니다.", details: error.message },
      { status: 500 }
    );
  }
}
