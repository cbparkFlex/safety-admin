'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Edit, Trash2, Save, X, AlertTriangle } from 'lucide-react';

interface EmergencySOP {
  id: number;
  type: string;
  name: string;
  description?: string;
  isActive: boolean;
  steps: EmergencySOPStep[];
  createdAt: string;
  updatedAt: string;
}

interface EmergencySOPStep {
  id: number;
  stepNumber: number;
  title: string;
  description: string;
  action?: string;
  isRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

const EMERGENCY_TYPES = {
  lpg_gas_leak: 'LPG 센서 가스 노출',
  safety_equipment: '작업자 안전장구 미착용',
  crane_worker: '크레인 반경 내 작업자 들어옴',
  lpg_explosion: 'LPG CCTV 내 폭발감지'
};

export default function SOPDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sopId = params.id as string;

  const [sop, setSop] = useState<EmergencySOP | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [showAddStep, setShowAddStep] = useState(false);
  const [newStep, setNewStep] = useState({
    stepNumber: 1,
    title: '',
    description: '',
    action: '',
    isRequired: true
  });

  useEffect(() => {
    if (sopId) {
      fetchSOP();
    }
  }, [sopId]);

  const fetchSOP = async () => {
    try {
      const response = await fetch(`/api/emergency/sops/${sopId}`);
      const data = await response.json();
      
      if (data.success) {
        setSop(data.data);
        // 다음 단계 번호 설정
        const maxStepNumber = Math.max(...data.data.steps.map((step: EmergencySOPStep) => step.stepNumber), 0);
        setNewStep(prev => ({ ...prev, stepNumber: maxStepNumber + 1 }));
      } else {
        setError('SOP를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('SOP 조회 실패:', error);
      setError('SOP 조회에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStep = async () => {
    try {
      const response = await fetch(`/api/emergency/sops/${sopId}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStep)
      });

      if (response.ok) {
        setShowAddStep(false);
        setNewStep({
          stepNumber: newStep.stepNumber + 1,
          title: '',
          description: '',
          action: '',
          isRequired: true
        });
        fetchSOP();
      }
    } catch (error) {
      console.error('단계 추가 실패:', error);
    }
  };

  const handleUpdateStep = async (stepId: number, updatedStep: Partial<EmergencySOPStep>) => {
    try {
      const response = await fetch(`/api/emergency/sops/${sopId}/steps/${stepId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedStep)
      });

      if (response.ok) {
        setEditingStep(null);
        fetchSOP();
      }
    } catch (error) {
      console.error('단계 수정 실패:', error);
    }
  };

  const handleDeleteStep = async (stepId: number) => {
    if (!confirm('정말로 이 단계를 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/emergency/sops/${sopId}/steps/${stepId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchSOP();
      }
    } catch (error) {
      console.error('단계 삭제 실패:', error);
    }
  };

  const handleUpdateSOP = async (updatedSOP: Partial<EmergencySOP>) => {
    try {
      const response = await fetch(`/api/emergency/sops/${sopId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSOP)
      });

      if (response.ok) {
        fetchSOP();
      }
    } catch (error) {
      console.error('SOP 수정 실패:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  if (error || !sop) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            뒤로 가기
          </button>
          <h1 className="text-2xl font-bold text-gray-900">SOP 상세 보기</h1>
        </div>

        {/* SOP 정보 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{sop.name}</h2>
              <p className="text-gray-600 mb-2">
                <span className="font-medium">유형:</span> {EMERGENCY_TYPES[sop.type as keyof typeof EMERGENCY_TYPES]}
              </p>
              {sop.description && (
                <p className="text-gray-600 mb-2">
                  <span className="font-medium">설명:</span> {sop.description}
                </p>
              )}
              <p className="text-sm text-gray-500">
                생성일: {new Date(sop.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                sop.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {sop.isActive ? '활성' : '비활성'}
              </span>
              <button
                onClick={() => handleUpdateSOP({ isActive: !sop.isActive })}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                {sop.isActive ? '비활성화' : '활성화'}
              </button>
            </div>
          </div>
        </div>

        {/* 단계 목록 */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">단계 목록 ({sop.steps.length}개)</h3>
              <button
                onClick={() => setShowAddStep(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                단계 추가
              </button>
            </div>
          </div>

          <div className="p-6">
            {sop.steps.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>등록된 단계가 없습니다.</p>
                <p className="text-sm">새 단계를 추가해보세요.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sop.steps.map((step) => (
                  <div key={step.id} className="border rounded-lg p-4">
                    {editingStep === step.id ? (
                      <StepEditForm
                        step={step}
                        onSave={(updatedStep) => handleUpdateStep(step.id, updatedStep)}
                        onCancel={() => setEditingStep(null)}
                      />
                    ) : (
                      <StepView
                        step={step}
                        onEdit={() => setEditingStep(step.id)}
                        onDelete={() => handleDeleteStep(step.id)}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 새 단계 추가 폼 */}
            {showAddStep && (
              <div className="border rounded-lg p-4 mt-4 bg-gray-50">
                <h4 className="font-medium text-gray-900 mb-4">새 단계 추가</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">단계 번호</label>
                      <input
                        type="number"
                        value={newStep.stepNumber}
                        onChange={(e) => setNewStep({ ...newStep, stepNumber: parseInt(e.target.value) })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        min="1"
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isRequired"
                        checked={newStep.isRequired}
                        onChange={(e) => setNewStep({ ...newStep, isRequired: e.target.checked })}
                        className="mr-2"
                      />
                      <label htmlFor="isRequired" className="text-sm text-gray-700">필수 단계</label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                    <input
                      type="text"
                      value={newStep.title}
                      onChange={(e) => setNewStep({ ...newStep, title: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="단계 제목을 입력하세요"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                    <textarea
                      value={newStep.description}
                      onChange={(e) => setNewStep({ ...newStep, description: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      rows={3}
                      placeholder="단계 설명을 입력하세요"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">조치 사항</label>
                    <textarea
                      value={newStep.action}
                      onChange={(e) => setNewStep({ ...newStep, action: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      rows={2}
                      placeholder="취해야 할 조치를 입력하세요"
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowAddStep(false)}
                      className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleAddStep}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      추가
                    </button>
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

// 단계 보기 컴포넌트
function StepView({ step, onEdit, onDelete }: {
  step: EmergencySOPStep;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center font-semibold">
            {step.stepNumber}
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{step.title}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                step.isRequired ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {step.isRequired ? '필수' : '선택'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="text-blue-600 hover:text-blue-900 p-1"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="text-red-600 hover:text-red-900 p-1"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="ml-11">
        <p className="text-gray-700 mb-2">{step.description}</p>
        {step.action && (
          <div className="bg-gray-50 rounded p-3">
            <p className="text-sm font-medium text-gray-900 mb-1">조치 사항:</p>
            <p className="text-sm text-gray-700">{step.action}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// 단계 편집 폼 컴포넌트
function StepEditForm({ step, onSave, onCancel }: {
  step: EmergencySOPStep;
  onSave: (updatedStep: Partial<EmergencySOPStep>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    stepNumber: step.stepNumber,
    title: step.title,
    description: step.description,
    action: step.action || '',
    isRequired: step.isRequired
  });

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">단계 번호</label>
          <input
            type="number"
            value={formData.stepNumber}
            onChange={(e) => setFormData({ ...formData, stepNumber: parseInt(e.target.value) })}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            min="1"
          />
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isRequired"
            checked={formData.isRequired}
            onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
            className="mr-2"
          />
          <label htmlFor="isRequired" className="text-sm text-gray-700">필수 단계</label>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full border border-gray-300 rounded-md px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full border border-gray-300 rounded-md px-3 py-2"
          rows={3}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">조치 사항</label>
        <textarea
          value={formData.action}
          onChange={(e) => setFormData({ ...formData, action: e.target.value })}
          className="w-full border border-gray-300 rounded-md px-3 py-2"
          rows={2}
        />
      </div>
      <div className="flex justify-end space-x-3">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
        >
          <X className="w-4 h-4" />
          취소
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Save className="w-4 h-4" />
          저장
        </button>
      </div>
    </div>
  );
}
