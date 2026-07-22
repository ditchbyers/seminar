'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  FlaskConical,
  BookMarked,
  Cpu,
  Gauge,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';

const NAV_GROUPS = [
  {
    title: 'Analyze',
    items: [
      { href: '/', label: 'Overview Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Knowledge Base',
    items: [
      { href: '/wiki', label: 'Wiki Home', icon: BookOpen },
      { href: '/wiki/metrics', label: 'Metrics', icon: BarChart3 },
      { href: '/wiki/statistics', label: 'Statistics', icon: FlaskConical },
      { href: '/wiki/frameworks', label: 'Frameworks', icon: Cpu },
      { href: '/wiki/methodology', label: 'Methodology', icon: BookMarked },
    ],
  },
];

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="py-3 px-3">
        <div className="flex items-center gap-2.5 px-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 border border-cyan-400/25">
            <Gauge className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-300/60 leading-none">Lighthouse</p>
            <p className="mt-0.5 text-sm font-semibold text-foreground leading-tight truncate">Evaluation Dashboard</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent className="gap-0">
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
              {group.title}
            </SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className={
                        active
                          ? 'bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15 hover:text-cyan-100'
                          : 'text-sidebar-foreground hover:bg-white/5 hover:text-foreground'
                      }
                    >
                      <Link href={item.href}>
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarSeparator />
    </Sidebar>
  );
}
