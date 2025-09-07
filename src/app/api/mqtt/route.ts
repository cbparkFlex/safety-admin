import { NextRequest, NextResponse } from "next/server";
import { initializeMQTTClient, isMQTTConnected, publishTestMessage } from "@/lib/mqttClient";

export async function GET() {
  try {
    const isConnected = isMQTTConnected();
    return NextResponse.json({
      connected: isConnected,
      message: isConnected ? "MQTT 연결됨" : "MQTT 연결 안됨"
    });
  } catch (error) {
    console.error("MQTT 상태 확인 실패:", error);
    return NextResponse.json(
      { error: "MQTT 상태를 확인할 수 없습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, topic, message } = body;

    switch (action) {
      case 'connect':
        try {
          const connected = await initializeMQTTClient();
          return NextResponse.json({ 
            connected: connected,
            message: connected ? "MQTT 연결됨" : "MQTT 연결 안됨"
          });
        } catch (error) {
          return NextResponse.json({ 
            connected: false,
            message: "MQTT 연결 실패"
          });
        }

      case 'publish':
        if (!topic || !message) {
          return NextResponse.json(
            { error: "토픽과 메시지가 필요합니다." },
            { status: 400 }
          );
        }
        publishTestMessage(topic, message);
        return NextResponse.json({ message: "메시지가 발송되었습니다." });

      default:
        return NextResponse.json(
          { error: "지원하지 않는 액션입니다." },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("MQTT 작업 실패:", error);
    return NextResponse.json(
      { error: "MQTT 작업을 수행할 수 없습니다." },
      { status: 500 }
    );
  }
}
