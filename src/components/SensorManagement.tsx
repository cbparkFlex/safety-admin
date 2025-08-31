'use client';

import { useState } from 'react';
import { Search, Plus, Wifi } from 'lucide-react';

export default function SensorManagement() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">가스 누출 센서 관리</h2>
            <p className="text-gray-600 mt-1">전체 3개</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="센서 이름으로 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              <Plus className="w-5 h-5" />
              <span>센서 추가</span>
            </button>
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                아이콘
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                센서 ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                이름
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                타입
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                위치
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <Wifi className="w-6 h-6 text-gray-500" />
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                SENSOR001
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                가스 센서 1
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                가스
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                1층 작업장
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  활성
                </span>
              </td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <Wifi className="w-6 h-6 text-gray-500" />
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                SENSOR002
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                가스 센서 2
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                가스
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                2층 작업장
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  활성
                </span>
              </td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <Wifi className="w-6 h-6 text-gray-500" />
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                SENSOR003
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                온도 센서 1
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                온도
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                1층 작업장
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  활성
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
