# Safety Admin 서버 시작 가이드

## 개요
이 가이드는 Safety Admin 서버를 안전하게 시작하는 방법을 설명합니다.

## 주요 변경사항
1. **package.json**: `npm run dev`가 이제 프로덕션 모드(`next start`)로 실행됩니다.
2. **next.config.ts**: 프로덕션 환경에 최적화된 설정이 추가되었습니다.
3. **start-server.bat**: MQTT Broker와 서버를 순차적으로 실행하는 통합 스크립트입니다.
4. **start-foreground.bat**: 두 서비스를 모두 포그라운드에서 실행하는 스크립트입니다.

## 실행 방법

### 1. 설정 파일 백업 (권장)
```bash
backup-config.bat
```
이 스크립트는 중요한 설정 파일들을 백업합니다.

### 2. 서버 시작 옵션

#### 옵션 A: 포그라운드 실행 (권장)
```bash
start-foreground.bat
```
- MQTT Broker와 서버가 각각 별도 창에서 포그라운드로 실행됩니다
- 두 서비스의 로그를 실시간으로 확인할 수 있습니다
- 각 창에서 Ctrl+C로 개별 종료 가능합니다

#### 옵션 B: 기존 방식
```bash
start-server.bat
```
- MQTT Broker는 새 창에서 포그라운드로 실행
- Safety Admin 서버는 현재 창에서 포그라운드로 실행

## 스크립트 설명

### start-foreground.bat (권장)
- **목적**: MQTT Broker와 서버를 모두 포그라운드에서 실행
- **특징**: 
  - 두 서비스가 각각 별도 창에서 실행
  - 실시간 로그 확인 가능
  - 개별 서비스 종료 가능

### start-server.bat
- **목적**: MQTT Broker와 서버를 순차적으로 실행
- **특징**: 
  - 포그라운드에서 서버 실행 (로그 확인 가능)
  - 자동 의존성 설치 및 빌드
  - 오류 처리 및 상태 확인

### check-status.bat
- **목적**: 실행 중인 서비스 상태 확인
- **확인 항목**: MQTT Broker, Node.js 프로세스, 포트 사용 상태

### stop-all.bat
- **목적**: 모든 서비스 강제 종료
- **기능**: MQTT Broker, Node.js 프로세스, 포트 해제

### backup-config.bat
- **목적**: 중요 설정 파일 백업
- **백업 파일**: package.json, next.config.ts, tsconfig.json, mosquitto-custom.conf

## 문제 해결

### 1. Node.js 관련 오류
- Node.js가 설치되어 있는지 확인
- PATH 환경변수에 Node.js가 등록되어 있는지 확인

### 2. MQTT Broker 관련 오류
- Mosquitto가 설치되어 있는지 확인
- 포트 1883이 사용 가능한지 확인

### 3. 빌드 오류
- `npm install`을 수동으로 실행
- `npm run build`를 수동으로 실행

## 주의사항
- 서버는 포그라운드에서 실행되므로 Ctrl+C로 종료할 수 있습니다.
- MQTT Broker는 백그라운드에서 실행됩니다.
- 설정 파일은 정기적으로 백업하는 것을 권장합니다.

## 로그 확인
서버가 포그라운드에서 실행되므로 콘솔에서 실시간 로그를 확인할 수 있습니다.
