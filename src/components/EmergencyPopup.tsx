'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Clock, MapPin } from 'lucide-react';

interface EmergencySOP {
  id: number;
  type: string;
  name: string;
  description?: string;
  steps: EmergencySOPStep[];
}

interface EmergencySOPStep {
  id: number;
  stepNumber: number;
  title: string;
  description: string;
  action?: string;
  isRequired: boolean;
}

interface EmergencyIncident {
  id: number;
  type: string;
  title: string;
  description?: string;
  location?: string;
  severity: string;
  status: string;
  startedAt: string;
  executions: EmergencyStepExecution[];
}

interface EmergencyStepExecution {
  id: number;
  stepId: number;
  stepNumber: number;
  status: string;
  executedAt?: string;
  notes?: string;
  step: {
    title: string;
    stepNumber: number;
  };
}

interface EmergencyPopupProps {
  incident: EmergencyIncident | null;
  onClose: () => void;
  onComplete: (incidentId: number) => void;
}

const EMERGENCY_TYPES = {
  lpg_gas_leak: 'LPG 센서 가스 노출',
  safety_equipment: '작업자 안전장구 미착용',
  crane_worker: '크레인 반경 내 작업자 들어옴',
  lpg_explosion: 'LPG CCTV 내 폭발감지'
};

const SEVERITY_COLORS = {
  low: 'text-green-600 bg-green-100',
  medium: 'text-yellow-600 bg-yellow-100',
  high: 'text-orange-600 bg-orange-100',
  critical: 'text-red-600 bg-red-100'
};

const STATUS_COLORS = {
  pending: 'text-gray-600 bg-gray-100',
  completed: 'text-green-600 bg-green-100',
  skipped: 'text-yellow-600 bg-yellow-100'
};

export default function EmergencyPopup({ incident, onClose, onComplete }: EmergencyPopupProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!incident) return null;

  // executions 배열이 없거나 비어있는 경우 처리
  const executions = incident.executions || [];
  const currentExecution = executions[currentStepIndex];
  const isLastStep = currentStepIndex === executions.length - 1;
  const allStepsCompleted = executions.length > 0 && executions.every(exec => exec.status === 'completed');

  const handleStepComplete = async () => {
    if (!currentExecution) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/emergency/incidents/${incident.id}/steps/${currentExecution.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          notes: notes.trim() || undefined
        })
      });

      if (response.ok) {
        setNotes('');
        // 상태 업데이트를 위해 부모 컴포넌트에 알림
        if (onComplete) {
          onComplete();
        }
        
        if (isLastStep) {
          // 모든 단계 완료 시 비상 상황 종료
          await handleCompleteIncident();
        } else {
          setCurrentStepIndex(prev => prev + 1);
        }
      }
    } catch (error) {
      console.error('단계 완료 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStepSkip = async () => {
    if (!currentExecution) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/emergency/incidents/${incident.id}/steps/${currentExecution.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'skipped',
          notes: notes.trim() || '건너뛰기'
        })
      });

      if (response.ok) {
        setNotes('');
        // 상태 업데이트를 위해 부모 컴포넌트에 알림
        if (onComplete) {
          onComplete();
        }
        
        if (isLastStep) {
          await handleCompleteIncident();
        } else {
          setCurrentStepIndex(prev => prev + 1);
        }
      }
    } catch (error) {
      console.error('단계 건너뛰기 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteIncident = async () => {
    try {
      const response = await fetch(`/api/emergency/incidents/${incident.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          completedAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        onComplete(incident.id);
        onClose();
      }
    } catch (error) {
      console.error('비상 상황 완료 실패:', error);
    }
  };

  const handleEmergencyTerminate = async () => {
    if (!confirm('모든 단계를 건너뛰고 비상 상황을 종료하시겠습니까?')) {
      return;
    }

    setLoading(true);
    try {
      // 모든 미완료 단계를 건너뛰기로 처리
      const incompleteSteps = executions.filter(exec => exec.status === 'pending');
      
      for (const step of incompleteSteps) {
        await fetch(`/api/emergency/incidents/${incident.id}/steps/${step.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'skipped',
            notes: '상황 해제로 인한 건너뛰기'
          })
        });
      }

      // 비상 상황 종료
      await handleCompleteIncident();
    } catch (error) {
      console.error('비상 상황 해제 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = () => {
    if (executions.length === 0) return 0;
    const completedSteps = executions.filter(exec => exec.status === 'completed').length;
    return (completedSteps / executions.length) * 100;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="bg-red-600 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="w-6 h-6" />
                <h2 className="text-2xl font-bold">비상 상황 발생</h2>
              </div>
              <div className="text-red-100">
                <div className="text-lg font-semibold">{incident.title}</div>
                <div className="text-sm mt-1">
                  {EMERGENCY_TYPES[incident.type as keyof typeof EMERGENCY_TYPES]}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-red-200 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* 진행 상황 */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">진행 상황</span>
            <span className="text-sm text-gray-500">
              {currentStepIndex + 1} / {executions.length} 단계
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>

        {/* 현재 단계 */}
        <div className="p-6">
          {executions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>등록된 단계가 없습니다.</p>
              <p className="text-sm">SOP에 단계를 추가해주세요.</p>
            </div>
          ) : currentExecution && currentExecution.step ? (
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center font-semibold">
                  {currentExecution.stepNumber}
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {currentExecution.step?.title || '단계 정보 없음'}
                </h3>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[currentExecution.status as keyof typeof STATUS_COLORS]}`}>
                  {currentExecution.status === 'pending' ? '대기중' : 
                   currentExecution.status === 'completed' ? '완료' : '건너뛰기'}
                </span>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-900 mb-2">조치 사항</h4>
                <p className="text-gray-700 leading-relaxed">
                  {incident.executions[currentStepIndex]?.step?.title || '단계 정보 없음'}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  실행 노트 (선택사항)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="조치 내용이나 특이사항을 기록하세요..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleStepComplete}
                  disabled={loading}
                  className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  조치 완료
                </button>
                <button
                  onClick={handleStepSkip}
                  disabled={loading}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  건너뛰기
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>현재 단계 정보를 불러올 수 없습니다.</p>
              <p className="text-sm">페이지를 새로고침해주세요.</p>
            </div>
          )}
        </div>

        {/* 단계 목록 */}
        <div className="border-t bg-gray-50 p-6">
          <h4 className="font-medium text-gray-900 mb-4">전체 단계</h4>
          {executions.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <p>등록된 단계가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {executions.map((execution, index) => (
              <div
                key={execution.id}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  index === currentStepIndex ? 'bg-blue-100 border-2 border-blue-300' : 'bg-white'
                }`}
              >
                <div className={`rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold ${
                  execution.status === 'completed' ? 'bg-green-100 text-green-800' :
                  execution.status === 'skipped' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {execution.stepNumber}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{execution.step?.title || '단계 정보 없음'}</div>
                  {execution.executedAt && (
                    <div className="text-xs text-gray-500">
                      완료: {new Date(execution.executedAt).toLocaleString()}
                    </div>
                  )}
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[execution.status as keyof typeof STATUS_COLORS]}`}>
                  {execution.status === 'pending' ? '대기중' : 
                   execution.status === 'completed' ? '완료' : '건너뛰기'}
                </span>
              </div>
              ))}
            </div>
          )}
        </div>

        {/* 상황 해제 및 완료 버튼 */}
        <div className="border-t p-6 space-y-3">
          {/* 상황 해제 버튼 */}
          <button
            onClick={handleEmergencyTerminate}
            disabled={loading}
            className="w-full bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <AlertTriangle className="w-5 h-5" />
            상황 해제 (모든 단계 건너뛰기)
          </button>
          
          {/* 완료 버튼 */}
          {allStepsCompleted && (
            <button
              onClick={handleCompleteIncident}
              className="w-full bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              비상 상황 종료
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
