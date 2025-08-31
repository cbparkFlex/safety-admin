'use client';

import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname();
  const isDashboard = pathname === '/';

  return (
    <>
      {/* 헤더 */}
      <Header />
      <div className="flex h-screen bg-gray-50">
        {/* 사이드바 - 대시보드가 아닐 때만 표시 */}
        {!isDashboard && <Sidebar />}
        
        {/* 메인 콘텐츠 */}
        <div className={`flex-1 flex flex-col`}>
          {/* 메인 콘텐츠 영역 */}
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
