'use client';

import { Users, UserCheck, Wifi, Video, Monitor } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  activeItem?: string;
}

export default function Sidebar({ activeItem }: SidebarProps) {
  const pathname = usePathname();

  const menuItems = [
    {
      id: 'dashboard',
      label: '대시보드',
      icon: Monitor,
      href: '/',
    },
    {
      id: 'workers',
      label: '작업자 관리',
      icon: Users,
      href: '/workers',
    },
    {
      id: 'administrators',
      label: '관리자 계정 관리',
      icon: UserCheck,
      href: '/administrators',
    },
    {
      id: 'sensors',
      label: '가스 누출 센서 관리',
      icon: Wifi,
      href: '/sensors',
    },
    {
      id: 'cctv',
      label: 'CCTV 관리',
      icon: Video,
      href: '/cctv',
    },
    {
      id: 'logs',
      label: '모니터링 로그',
      icon: Monitor,
      href: '/logs',
    },
  ];

  const getActiveItem = () => {
    if (pathname === '/') return 'dashboard';
    if (pathname.startsWith('/workers')) return 'workers';
    if (pathname.startsWith('/administrators')) return 'administrators';
    if (pathname.startsWith('/sensors')) return 'sensors';
    if (pathname.startsWith('/cctv')) return 'cctv';
    if (pathname.startsWith('/logs')) return 'logs';
    return activeItem || 'dashboard';
  };

  const currentActiveItem = getActiveItem();

  return (
    <div className="w-64 bg-blue-800 text-white">
      <div className="p-6">
        <h2 className="text-xl font-bold">설정</h2>
      </div>
      
      <nav className="mt-6">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentActiveItem === item.id;
            
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={`flex items-center space-x-3 px-6 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-700 text-white'
                      : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
