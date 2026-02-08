import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter } from "@/components/ui/sidebar"
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Plus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConversations } from "@/hooks/use-conversations";
import { useState } from "react";
import { CreateChatDialog } from "@/components/CreateChatDialog";

export function AppSidebar() {
  const [location] = useLocation();
  const { data: conversations } = useConversations();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <div className="p-4 mb-2">
            <Link href="/" className="text-2xl font-bold font-display text-primary flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center text-lg">FL</span>
              FluentAI
            </Link>
          </div>
          
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem className="px-2 mb-4">
                <Button 
                  className="w-full justify-center gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
                  size="lg"
                  onClick={() => setIsCreateOpen(true)}
                >
                  <span>
                    <Plus size={18} /> New Chat
                  </span>
                </Button>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === '/'}>
                  <Link href="/">
                    <LayoutDashboard size={20} />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Recent Conversations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {conversations?.map((chat) => (
                <SidebarMenuItem key={chat.id}>
                  <SidebarMenuButton asChild isActive={location === `/chat/${chat.id}`}>
                    <Link href={`/chat/${chat.id}`}>
                      <MessageSquare size={18} />
                      <span className="truncate">{chat.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white font-bold text-sm shadow-md">
            GU
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              Guest User
            </p>
            <p className="text-xs text-slate-500 truncate">No login required</p>
          </div>
        </div>
      </SidebarFooter>
      <CreateChatDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </Sidebar>
  );
}
