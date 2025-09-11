# 감시 기록 API 사용 메뉴얼

## 개요
이 문서는 안전 관리 시스템의 감시 기록 API 엔드포인트 사용법을 설명합니다. 모든 API는 JSON 형태로 데이터를 주고받습니다.

## 기본 정보
- **Base URL**: `http://localhost:3000/api/surveillance-records`
- **Content-Type**: `application/json`
- **인코딩**: UTF-8

## 데이터 모델

### SurveillanceRecord 객체
```json
{
  "id": 1,
  "type": "safety_equipment",
  "title": "안전모 미착용 감지",
  "message": "A동 4번 센서에서 안전모를 착용하지 않은 작업자가 감지되었습니다.",
  "location": "A동 4번 센서",
  "severity": "warning",
  "status": "active",
  "source": "cctv",
  "metadata": "{\"confidence\": 0.95, \"workerCount\": 1}",
  "resolvedAt": null,
  "createdAt": "2025-01-10T08:30:00.000Z",
  "updatedAt": "2025-01-10T08:30:00.000Z"
}
```

### 필드 설명
| 필드 | 타입 | 필수 | 설명 | 가능한 값 |
|------|------|------|------|-----------|
| `id` | number | - | 고유 식별자 (자동 생성) | - |
| `type` | string | ✅ | 알람 타입 | `safety_equipment`, `fire_explosion`, `gas_leak` |
| `title` | string | ✅ | 알람 제목 | - |
| `message` | string | ✅ | 상세 메시지 | - |
| `location` | string | ✅ | 감지 위치 | - |
| `severity` | string | - | 심각도 (기본값: warning) | `info`, `warning`, `danger`, `critical` |
| `status` | string | - | 상태 (기본값: active) | `active`, `acknowledged`, `resolved` |
| `source` | string | - | 출처 (기본값: cctv) | `cctv`, `sensor`, `manual` |
| `metadata` | string | - | JSON 형태의 추가 정보 | - |
| `resolvedAt` | string | - | 해결 시간 (ISO 8601) | - |
| `createdAt` | string | - | 생성 시간 (ISO 8601) | - |
| `updatedAt` | string | - | 수정 시간 (ISO 8601) | - |

## API 엔드포인트

### 1. 감시 기록 목록 조회 (GET)

#### 요청
```http
GET /api/surveillance-records?limit=10&offset=0&type=safety_equipment&severity=warning&status=active
```

#### 쿼리 파라미터
| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| `limit` | number | 10 | 조회할 레코드 수 |
| `offset` | number | 0 | 건너뛸 레코드 수 |
| `type` | string | - | 알람 타입 필터 |
| `severity` | string | - | 심각도 필터 |
| `status` | string | - | 상태 필터 |

#### 응답
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "type": "safety_equipment",
      "title": "안전모 미착용 감지",
      "message": "A동 4번 센서에서 안전모를 착용하지 않은 작업자가 감지되었습니다.",
      "location": "A동 4번 센서",
      "severity": "warning",
      "status": "active",
      "source": "cctv",
      "metadata": "{\"confidence\": 0.95, \"workerCount\": 1}",
      "resolvedAt": null,
      "createdAt": "2025-01-10T08:30:00.000Z",
      "updatedAt": "2025-01-10T08:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

#### cURL 예제
```bash
curl -X GET "http://localhost:3000/api/surveillance-records?limit=5&type=safety_equipment" \
  -H "Content-Type: application/json"
```

#### PowerShell 예제
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/surveillance-records?limit=5&type=safety_equipment" -Method GET
```

### 2. 감시 기록 생성 (POST)

#### 요청
```http
POST /api/surveillance-records
Content-Type: application/json

{
  "type": "safety_equipment",
  "title": "안전모 미착용 감지",
  "message": "B동 2번 센서에서 안전모를 착용하지 않은 작업자가 감지되었습니다.",
  "location": "B동 2번 센서",
  "severity": "warning",
  "source": "cctv",
  "metadata": "{\"confidence\": 0.92, \"workerCount\": 2}"
}
```

#### 응답
```json
{
  "success": true,
  "data": {
    "id": 26,
    "type": "safety_equipment",
    "title": "안전모 미착용 감지",
    "message": "B동 2번 센서에서 안전모를 착용하지 않은 작업자가 감지되었습니다.",
    "location": "B동 2번 센서",
    "severity": "warning",
    "status": "active",
    "source": "cctv",
    "metadata": "{\"confidence\": 0.92, \"workerCount\": 2}",
    "resolvedAt": null,
    "createdAt": "2025-01-10T09:15:00.000Z",
    "updatedAt": "2025-01-10T09:15:00.000Z"
  },
  "message": "감시 기록이 생성되었습니다."
}
```

#### cURL 예제
```bash
curl -X POST "http://localhost:3000/api/surveillance-records" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "fire_explosion",
    "title": "LPG 저장소 화재 위험 감지",
    "message": "LPG 저장소 주변에서 비정상적인 온도 상승이 감지되었습니다.",
    "location": "LPG 저장소",
    "severity": "critical",
    "source": "sensor",
    "metadata": "{\"temperature\": 45.2, \"threshold\": 40.0}"
  }'
```

#### PowerShell 예제
```powershell
$body = @{
  type = "gas_leak"
  title = "가스 누출 감지"
  message = "작업장 내 LPG 배관 연결부에서 가스 누출이 감지되었습니다."
  location = "작업장 내 LPG 배관 연결부"
  severity = "danger"
  source = "sensor"
  metadata = '{"gasLevel": 150, "threshold": 100}'
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/surveillance-records" -Method POST -Body $body -ContentType "application/json"
```

### 3. 개별 감시 기록 조회 (GET)

#### 요청
```http
GET /api/surveillance-records/1
```

#### 응답
```json
{
  "success": true,
  "data": {
    "id": 1,
    "type": "safety_equipment",
    "title": "안전모 미착용 감지",
    "message": "A동 4번 센서에서 안전모를 착용하지 않은 작업자가 감지되었습니다.",
    "location": "A동 4번 센서",
    "severity": "warning",
    "status": "active",
    "source": "cctv",
    "metadata": "{\"confidence\": 0.95, \"workerCount\": 1}",
    "resolvedAt": null,
    "createdAt": "2025-01-10T08:30:00.000Z",
    "updatedAt": "2025-01-10T08:30:00.000Z"
  }
}
```

#### cURL 예제
```bash
curl -X GET "http://localhost:3000/api/surveillance-records/1" \
  -H "Content-Type: application/json"
```

### 4. 감시 기록 수정 (PUT)

#### 요청
```http
PUT /api/surveillance-records/1
Content-Type: application/json

{
  "status": "acknowledged",
  "severity": "info"
}
```

#### 응답
```json
{
  "success": true,
  "data": {
    "id": 1,
    "type": "safety_equipment",
    "title": "안전모 미착용 감지",
    "message": "A동 4번 센서에서 안전모를 착용하지 않은 작업자가 감지되었습니다.",
    "location": "A동 4번 센서",
    "severity": "info",
    "status": "acknowledged",
    "source": "cctv",
    "metadata": "{\"confidence\": 0.95, \"workerCount\": 1}",
    "resolvedAt": null,
    "createdAt": "2025-01-10T08:30:00.000Z",
    "updatedAt": "2025-01-10T09:20:00.000Z"
  },
  "message": "감시 기록이 업데이트되었습니다."
}
```

#### cURL 예제
```bash
curl -X PUT "http://localhost:3000/api/surveillance-records/1" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "resolved"
  }'
```

#### PowerShell 예제
```powershell
$body = @{
  status = "resolved"
  severity = "info"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/surveillance-records/1" -Method PUT -Body $body -ContentType "application/json"
```

### 5. 감시 기록 삭제 (DELETE)

#### 요청
```http
DELETE /api/surveillance-records/1
```

#### 응답
```json
{
  "success": true,
  "message": "감시 기록이 삭제되었습니다."
}
```

#### cURL 예제
```bash
curl -X DELETE "http://localhost:3000/api/surveillance-records/1" \
  -H "Content-Type: application/json"
```

#### PowerShell 예제
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/surveillance-records/1" -Method DELETE
```

### 6. 일괄 삭제 (DELETE)

#### 요청
```http
DELETE /api/surveillance-records?days=30
```

#### 쿼리 파라미터
| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| `days` | number | 30 | 삭제할 레코드의 최소 일수 |

#### 응답
```json
{
  "success": true,
  "message": "15개의 감시 기록이 삭제되었습니다.",
  "deletedCount": 15
}
```

#### cURL 예제
```bash
curl -X DELETE "http://localhost:3000/api/surveillance-records?days=7" \
  -H "Content-Type: application/json"
```

### 7. 샘플 데이터 생성 (POST)

#### 요청
```http
POST /api/surveillance-records/seed
```

#### 응답
```json
{
  "success": true,
  "message": "8개의 샘플 감시 기록이 생성되었습니다.",
  "count": 8
}
```

#### cURL 예제
```bash
curl -X POST "http://localhost:3000/api/surveillance-records/seed" \
  -H "Content-Type: application/json"
```

#### PowerShell 예제
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/surveillance-records/seed" -Method POST
```

## 에러 응답

### 일반적인 에러 형식
```json
{
  "success": false,
  "error": "에러 메시지"
}
```

### HTTP 상태 코드
| 코드 | 설명 |
|------|------|
| 200 | 성공 |
| 400 | 잘못된 요청 (필수 필드 누락 등) |
| 404 | 리소스를 찾을 수 없음 |
| 500 | 서버 내부 오류 |

### 에러 예제
```json
{
  "success": false,
  "error": "필수 필드가 누락되었습니다."
}
```

## 사용 예제

### JavaScript (Fetch API)
```javascript
// 감시 기록 생성
const createRecord = async (recordData) => {
  try {
    const response = await fetch('/api/surveillance-records', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(recordData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('감시 기록이 생성되었습니다:', result.data);
    } else {
      console.error('에러:', result.error);
    }
  } catch (error) {
    console.error('네트워크 에러:', error);
  }
};

// 사용 예제
createRecord({
  type: 'safety_equipment',
  title: '안전모 미착용 감지',
  message: 'C동 3번 센서에서 안전모를 착용하지 않은 작업자가 감지되었습니다.',
  location: 'C동 3번 센서',
  severity: 'warning',
  source: 'cctv',
  metadata: JSON.stringify({ confidence: 0.88, workerCount: 1 })
});
```

### Python (requests)
```python
import requests
import json

# 감시 기록 생성
def create_record(record_data):
    url = 'http://localhost:3000/api/surveillance-records'
    headers = {'Content-Type': 'application/json'}
    
    try:
        response = requests.post(url, json=record_data, headers=headers)
        result = response.json()
        
        if result['success']:
            print('감시 기록이 생성되었습니다:', result['data'])
        else:
            print('에러:', result['error'])
    except requests.exceptions.RequestException as e:
        print('네트워크 에러:', e)

# 사용 예제
record_data = {
    'type': 'fire_explosion',
    'title': '화재 감지',
    'message': 'D동 1번 센서에서 연기 감지',
    'location': 'D동 1번 센서',
    'severity': 'critical',
    'source': 'sensor',
    'metadata': json.dumps({'smokeLevel': 85, 'threshold': 50})
}

create_record(record_data)
```

## 주의사항

1. **JSON 형식**: 모든 요청과 응답은 JSON 형식이어야 합니다.
2. **Content-Type**: 요청 헤더에 `Content-Type: application/json`을 포함해야 합니다.
3. **인코딩**: 한글 등 유니코드 문자는 UTF-8로 인코딩됩니다.
4. **메타데이터**: `metadata` 필드는 JSON 문자열로 저장되므로 객체를 문자열로 변환해야 합니다.
5. **날짜 형식**: 모든 날짜는 ISO 8601 형식 (UTC)으로 처리됩니다.
6. **필수 필드**: `type`, `title`, `message`, `location`은 필수 필드입니다.

## 지원하는 알람 타입

| 타입 | 설명 | 예시 |
|------|------|------|
| `safety_equipment` | 안전장구 미착용 | 안전모, 안전화, 안전벨트 등 |
| `fire_explosion` | 화재/폭발 감지 | 연기, 불꽃, 온도 상승 등 |
| `gas_leak` | 가스 누출 감지 | LPG, 메탄, 프로판 등 |

이 메뉴얼을 참고하여 감시 기록 API를 활용하시기 바랍니다.
