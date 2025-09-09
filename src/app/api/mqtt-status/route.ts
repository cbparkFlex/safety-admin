import { NextRequest, NextResponse } from "next/server";
import { mqttClient, initializeMQTTClient, disconnectMQTTClient } from "@/lib/mqttClient";

export async function GET(request: NextRequest) {
  try {
    const isConnected = mqttClient?.connected || false;
    const connectionInfo = {
      connected: isConnected,
      host: process.env.MQTT_HOST || 'localhost',
      port: process.env.MQTT_PORT || 1883,
      clientId: mqttClient?.options?.clientId || 'unknown',
      lastConnected: isConnected ? new Date().toISOString() : null
    };

    return NextResponse.json({
      status: isConnected ? 'connected' : 'disconnected',
      ...connectionInfo
    });
  } catch (error: any) {
    console.error("MQTT 상태 조회 실패:", error);
    return NextResponse.json(
      { 
        status: 'error',
        connected: false,
        error: error.message 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'connect') {
      // MQTT 연결 시도
      if (mqttClient?.connected) {
        return NextResponse.json({
          message: "MQTT가 이미 연결되어 있습니다.",
          connected: true
        });
      } else {
        try {
          console.log("MQTT 연결 시도 중...");
          const connected = await initializeMQTTClient();
          
          if (connected) {
            return NextResponse.json({
              message: "MQTT 연결이 성공적으로 완료되었습니다.",
              connected: true
            });
          } else {
            return NextResponse.json({
              message: "MQTT 연결에 실패했습니다.",
              connected: false
            }, { status: 500 });
          }
        } catch (error: any) {
          console.error("MQTT 연결 실패:", error);
          return NextResponse.json({
            message: `MQTT 연결 실패: ${error.message}`,
            connected: false
          }, { status: 500 });
        }
      }
    } else if (action === 'disconnect') {
      // MQTT 연결 해제
      if (mqttClient && mqttClient.connected) {
        disconnectMQTTClient();
        return NextResponse.json({
          message: "MQTT 연결을 해제했습니다.",
          connected: false
        });
      } else {
        return NextResponse.json({
          message: "MQTT가 이미 연결 해제되어 있습니다.",
          connected: false
        });
      }
    } else {
      return NextResponse.json(
        { error: "지원하지 않는 액션입니다. 'connect' 또는 'disconnect'를 사용하세요." },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("MQTT 액션 실행 실패:", error);
    return NextResponse.json(
      { error: "MQTT 액션을 실행할 수 없습니다.", details: error.message },
      { status: 500 }
    );
  }
}
