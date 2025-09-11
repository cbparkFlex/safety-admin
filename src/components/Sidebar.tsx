'use client';

import { Users, UserCheck, Wifi, Video, Monitor, AlertTriangle, Router, FileText, Shield, History } from 'lucide-react';
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
      id: 'proximity',
      label: '근접 알림',
      icon: AlertTriangle,
      href: '/proximity',
    },
    {
      id: 'beacons',
      label: 'BLE Beacon 관리',
      icon: Wifi,
      href: '/beacons',
    },
    {
      id: 'gateways',
      label: 'Gateway 관리',
      icon: Router,
      href: '/gateways',
    },
    {
      id: 'logs',
      label: '로그 관리',
      icon: FileText,
      href: '/logs',
    },
    {
      id: 'emergency',
      label: '비상 상황 관리',
      icon: Shield,
      href: '/emergency',
    },
    {
      id: 'emergency-records',
      label: '비상 상황 기록',
      icon: History,
      href: '/emergency/records',
    },
  ];

  const getActiveItem = () => {
    if (pathname === '/') return 'dashboard';
    if (pathname.startsWith('/workers')) return 'workers';
    if (pathname.startsWith('/administrators')) return 'administrators';
    if (pathname.startsWith('/sensors')) return 'sensors';
    if (pathname.startsWith('/cctv')) return 'cctv';
    if (pathname.startsWith('/proximity')) return 'proximity';
    if (pathname.startsWith('/beacons')) return 'beacons';
    if (pathname.startsWith('/gateways')) return 'gateways';
    if (pathname.startsWith('/logs')) return 'logs';
    if (pathname.startsWith('/emergency/records')) return 'emergency-records';
    if (pathname.startsWith('/emergency')) return 'emergency';
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
