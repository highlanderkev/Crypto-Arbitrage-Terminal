import React from "react";
import { Link, useLocation } from "wouter";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from "@/components/ui/sidebar";
import { LayoutDashboard, ArrowRightLeft, BookOpen, Activity, Eye, MessageSquareCode } from "lucide-react";

export function AppSidebar() {
  const [location] = useLocation();

  const isCurrent = (path: string) => {
    if (path === "/" && location !== "/") return false;
    return location.startsWith(path);
  };

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar h-screen">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-primary font-bold">
            AX
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-sidebar-foreground">ArbitrageX</h2>
            <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-widest font-mono">Terminal</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-sidebar-foreground/50 font-mono mt-4 mb-2 px-4">Core</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/"} data-testid="nav-dashboard">
                  <Link href="/">
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isCurrent("/opportunities")} data-testid="nav-opportunities">
                  <Link href="/opportunities">
                    <ArrowRightLeft className="w-4 h-4 mr-2" />
                    <span>Opportunities</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-sidebar-foreground/50 font-mono mt-4 mb-2 px-4">Intelligence</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isCurrent("/research")} data-testid="nav-research">
                  <Link href="/research">
                    <BookOpen className="w-4 h-4 mr-2" />
                    <span>Research Reports</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isCurrent("/chat")} data-testid="nav-chat">
                  <Link href="/chat">
                    <MessageSquareCode className="w-4 h-4 mr-2" />
                    <span>AI Chat</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-sidebar-foreground/50 font-mono mt-4 mb-2 px-4">Markets</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isCurrent("/prices")} data-testid="nav-prices">
                  <Link href="/prices">
                    <Activity className="w-4 h-4 mr-2" />
                    <span>Price Monitor</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isCurrent("/watchlist")} data-testid="nav-watchlist">
                  <Link href="/watchlist">
                    <Eye className="w-4 h-4 mr-2" />
                    <span>Watchlist</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}