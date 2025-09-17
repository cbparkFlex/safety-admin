'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, AlertTriangle, ExternalLink, Upload, Download, FileText, X } from 'lucide-react';
import Link from 'next/link';

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
}


interface EmergencyPDF {
  id: number;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  description?: string;
  version: string;
  isActive: boolean;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

const EMERGENCY_TYPES = {
  lpg_gas_leak: 'LPG 센서 가스 노출',
  safety_equipment: '작업자 안전장구 미착용',
  crane_worker: '크레인 반경 내 작업자 들어옴',
  lpg_explosion: 'LPG CCTV 내 폭발감지'
};

const SEVERITY_LEVELS = {
  low: '낮음',
  medium: '보통',
  high: '높음',
  critical: '치명적'
};


export default function EmergencyManagement() {
  const [activeTab, setActiveTab] = useState<'sops' | 'pdfs'>('sops');
  const [sops, setSops] = useState<EmergencySOP[]>([]);
  const [pdfs, setPdfs] = useState<EmergencyPDF[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSOPModal, setShowSOPModal] = useState(false);
  const [showStepModal, setShowStepModal] = useState(false);
  const [editingSOP, setEditingSOP] = useState<EmergencySOP | null>(null);
  const [editingStep, setEditingStep] = useState<EmergencySOPStep | null>(null);
  const [selectedSOPId, setSelectedSOPId] = useState<number | null>(null);
  
  // PDF 관련 상태
  const [showPDFUploadModal, setShowPDFUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    description: '',
    uploadedBy: '관리자'
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  // SOP 폼 데이터
  const [sopForm, setSopForm] = useState({
    type: 'lpg_gas_leak',
    name: '',
    description: '',
    isActive: true
  });

  // Step 폼 데이터
  const [stepForm, setStepForm] = useState({
    stepNumber: 1,
    title: '',
    description: '',
    action: '',
    isRequired: true
  });

  useEffect(() => {
    fetchSOPs();
    fetchPDFs();
  }, []);

  const fetchSOPs = async () => {
    try {
      const response = await fetch('/api/emergency/sops');
      const data = await response.json();
      setSops(data.data || []);
    } catch (error) {
      console.error('SOP 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };


  const fetchPDFs = async () => {
    try {
      const response = await fetch('/api/emergency/pdfs');
      const data = await response.json();
      setPdfs(data.data || []);
    } catch (error) {
      console.error('PDF 목록 조회 실패:', error);
    }
  };

  const handlePDFUpload = async () => {
    if (!selectedFile) {
      alert('PDF 파일을 선택해주세요.');
      return;
    }
    
    if (selectedFile.type !== 'application/pdf') {
      alert('PDF 파일만 업로드 가능합니다.');
      return;
    }
    
    if (selectedFile.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB를 초과할 수 없습니다.');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('description', uploadForm.description);
      formData.append('uploadedBy', uploadForm.uploadedBy);

      const response = await fetch('/api/emergency/pdfs', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        alert('PDF 파일이 성공적으로 업로드되었습니다.');
        setShowPDFUploadModal(false);
        setUploadForm({ description: '', uploadedBy: '관리자' });
        setSelectedFile(null);
        fetchPDFs();
      } else {
        alert(result.error || 'PDF 업로드에 실패했습니다.');
      }
    } catch (error) {
      console.error('PDF 업로드 실패:', error);
      alert('PDF 업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handlePDFDelete = async (id: number) => {
    if (!confirm('정말로 이 PDF 파일을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/emergency/pdfs/${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      
      if (result.success) {
        alert('PDF 파일이 성공적으로 삭제되었습니다.');
        fetchPDFs();
      } else {
        alert(result.error || 'PDF 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('PDF 삭제 실패:', error);
      alert('PDF 삭제 중 오류가 발생했습니다.');
    }
  };

  const handlePDFToggleActive = async (id: number, isActive: boolean) => {
    try {
      const response = await fetch(`/api/emergency/pdfs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      });

      const result = await response.json();
      
      if (result.success) {
        alert(result.message);
        fetchPDFs();
      } else {
        alert(result.error || 'PDF 상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('PDF 상태 변경 실패:', error);
      alert('PDF 상태 변경 중 오류가 발생했습니다.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSeedData = async () => {
    if (!confirm('비상상황 기본 데이터를 생성하시겠습니까?\n기존 데이터는 삭제됩니다.')) {
      return;
    }

    try {
      setIsSeeding(true);
      const response = await fetch('/api/emergency/seed', {
        method: 'POST'
      });

      const result = await response.json();
      
      if (result.success) {
        alert('비상상황 기본 데이터가 성공적으로 생성되었습니다.');
        fetchSOPs();
        fetchPDFs();
      } else {
        alert(result.error || '기본 데이터 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('기본 데이터 생성 실패:', error);
      alert('기본 데이터 생성 중 오류가 발생했습니다.');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleCreateSOP = async () => {
    try {
      const response = await fetch('/api/emergency/sops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sopForm)
      });

      if (response.ok) {
        setShowSOPModal(false);
        setSopForm({ type: 'lpg_gas_leak', name: '', description: '', isActive: true });
        fetchSOPs();
      }
    } catch (error) {
      console.error('SOP 생성 실패:', error);
    }
  };

  const handleCreateStep = async () => {
    if (!selectedSOPId) return;

    try {
      const response = await fetch(`/api/emergency/sops/${selectedSOPId}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stepForm)
      });

      if (response.ok) {
        setShowStepModal(false);
        setStepForm({ stepNumber: 1, title: '', description: '', action: '', isRequired: true });
        fetchSOPs();
      }
    } catch (error) {
      console.error('Step 생성 실패:', error);
    }
  };

  const handleDeleteSOP = async (id: number) => {
    if (!confirm('정말로 이 SOP를 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/emergency/sops/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchSOPs();
      }
    } catch (error) {
      console.error('SOP 삭제 실패:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-red-600 bg-red-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'cancelled': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">비상 상황 관리</h1>
        <p className="text-gray-600">비상 상황 SOP 및 PDF 파일을 관리합니다.</p>
      </div>

      {/* 탭 메뉴 */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('sops')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'sops'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              SOP 관리
            </button>
            <button
              onClick={() => setActiveTab('pdfs')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pdfs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              PDF 관리
            </button>
          </nav>
        </div>
      </div>

      {/* SOP 관리 탭 */}
      {activeTab === 'sops' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">비상 상황 SOP</h2>
            <div className="flex gap-2">
              {sops.length === 0 && (
                <button
                  onClick={handleSeedData}
                  disabled={isSeeding}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
                >
                  {isSeeding ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      생성 중...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      기본 데이터 생성
                    </>
                  )}
                </button>
              )}
              <button
                onClick={() => setShowSOPModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                SOP 추가
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    유형
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    이름
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    단계 수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    생성일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sops.map((sop) => (
                  <tr key={sop.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {EMERGENCY_TYPES[sop.type as keyof typeof EMERGENCY_TYPES] || sop.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Link 
                          href={`/emergency/sops/${sop.id}`}
                          className="text-sm text-gray-900 hover:text-blue-600 font-medium"
                        >
                          {sop.name}
                        </Link>
                        <Link 
                          href={`/emergency/sops/${sop.id}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>
                      {sop.description && (
                        <div className="text-sm text-gray-500 mt-1">{sop.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="font-medium">{sop.steps.length}단계</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        sop.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {sop.isActive ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(sop.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-3">
                        <Link
                          href={`/emergency/sops/${sop.id}`}
                          className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          상세보기
                        </Link>
                        <button
                          onClick={() => {
                            setSelectedSOPId(sop.id);
                            setShowStepModal(true);
                          }}
                          className="text-green-600 hover:text-green-900"
                        >
                          단계 추가
                        </button>
                        <button
                          onClick={() => handleDeleteSOP(sop.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sops.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">비상상황 SOP가 없습니다</h3>
                <p className="text-gray-500 mb-4">기본 데이터를 생성하거나 새로운 SOP를 추가해주세요.</p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={handleSeedData}
                    disabled={isSeeding}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
                  >
                    {isSeeding ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        생성 중...
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4" />
                        기본 데이터 생성
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowSOPModal(true)}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    새 SOP 추가
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}


      {/* PDF 관리 탭 */}
      {activeTab === 'pdfs' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">비상사태대비및대응 PDF 관리</h2>
            <button
              onClick={() => setShowPDFUploadModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              PDF 업로드
            </button>
          </div>
          
          {/* 최신 PDF 다운로드 버튼 */}
          {pdfs.length > 0 && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-blue-900">최신 PDF 파일</h3>
                  <p className="text-sm text-blue-700">
                    {pdfs[0].originalName} ({formatFileSize(pdfs[0].fileSize)})
                  </p>
                </div>
                <a
                  href={pdfs[0].filePath}
                  download={pdfs[0].originalName}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  다운로드
                </a>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">파일명</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">크기</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">업로드자</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">업로드일</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">액션</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pdfs.map((pdf) => (
                  <tr key={pdf.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-red-500 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{pdf.originalName}</div>
                          {pdf.description && (
                            <div className="text-sm text-gray-500">{pdf.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatFileSize(pdf.fileSize)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        pdf.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {pdf.isActive ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pdf.uploadedBy}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(pdf.createdAt).toLocaleString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <a
                        href={pdf.filePath}
                        download={pdf.originalName}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        다운로드
                      </a>
                      <button
                        onClick={() => handlePDFToggleActive(pdf.id, !pdf.isActive)}
                        className={`${
                          pdf.isActive ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'
                        }`}
                      >
                        {pdf.isActive ? '비활성화' : '활성화'}
                      </button>
                      <button
                        onClick={() => handlePDFDelete(pdf.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pdfs.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>업로드된 PDF 파일이 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SOP 생성 모달 */}
      {showSOPModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">새 SOP 생성</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">유형</label>
                <select
                  value={sopForm.type}
                  onChange={(e) => setSopForm({ ...sopForm, type: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  {Object.entries(EMERGENCY_TYPES).map(([key, value]) => (
                    <option key={key} value={key}>{value}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                <input
                  type="text"
                  value={sopForm.name}
                  onChange={(e) => setSopForm({ ...sopForm, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="SOP 이름을 입력하세요"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <textarea
                  value={sopForm.description}
                  onChange={(e) => setSopForm({ ...sopForm, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                  placeholder="SOP 설명을 입력하세요"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={sopForm.isActive}
                  onChange={(e) => setSopForm({ ...sopForm, isActive: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">활성 상태</label>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowSOPModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={handleCreateSOP}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                생성
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 생성 모달 */}
      {showStepModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">새 단계 추가</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">단계 번호</label>
                <input
                  type="number"
                  value={stepForm.stepNumber}
                  onChange={(e) => setStepForm({ ...stepForm, stepNumber: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                <input
                  type="text"
                  value={stepForm.title}
                  onChange={(e) => setStepForm({ ...stepForm, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="단계 제목을 입력하세요"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <textarea
                  value={stepForm.description}
                  onChange={(e) => setStepForm({ ...stepForm, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                  placeholder="단계 설명을 입력하세요"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">조치 사항</label>
                <textarea
                  value={stepForm.action}
                  onChange={(e) => setStepForm({ ...stepForm, action: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={2}
                  placeholder="취해야 할 조치를 입력하세요"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isRequired"
                  checked={stepForm.isRequired}
                  onChange={(e) => setStepForm({ ...stepForm, isRequired: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="isRequired" className="text-sm text-gray-700">필수 단계</label>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowStepModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={handleCreateStep}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF 업로드 모달 */}
      {showPDFUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">PDF 파일 업로드</h3>
              <button
                onClick={() => setShowPDFUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PDF 파일</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setSelectedFile(file);
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  disabled={uploading}
                />
                {selectedFile && (
                  <p className="text-sm text-green-600 mt-1">
                    선택된 파일: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)}MB)
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">PDF 파일만 업로드 가능합니다. (최대 10MB)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명 (선택사항)</label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                  placeholder="PDF 파일에 대한 설명을 입력하세요"
                  disabled={uploading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">업로드자</label>
                <input
                  type="text"
                  value={uploadForm.uploadedBy}
                  onChange={(e) => setUploadForm({ ...uploadForm, uploadedBy: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="업로드자 이름"
                  disabled={uploading}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => {
                  setShowPDFUploadModal(false);
                  setSelectedFile(null);
                  setUploadForm({ description: '', uploadedBy: '관리자' });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                disabled={uploading}
              >
                취소
              </button>
              <button
                onClick={handlePDFUpload}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                disabled={uploading || !selectedFile}
              >
                {uploading ? '업로드 중...' : '업로드'}
              </button>
            </div>
            {uploading && (
              <div className="mt-4 text-center">
                <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-lg">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-800 mr-2"></div>
                  업로드 중...
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
