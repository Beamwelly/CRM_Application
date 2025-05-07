
import { Header } from "./Header";
import { SidebarNav } from "./SidebarNav";
import { useIsMobile, useSidebar } from "@/hooks/use-mobile";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const isMobile = useIsMobile();
  const { sidebarOpen } = useSidebar();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex">
        {/* Show sidebar on desktop or when open on mobile */}
        {(!isMobile || (isMobile && sidebarOpen)) && (
          <div className={`${isMobile ? 'absolute z-20 h-[calc(100vh-4rem)]' : 'w-64'} border-r bg-background p-4 ${isMobile ? 'block' : 'hidden md:block'}`}>
            <SidebarNav />
          </div>
        )}
        {/* Overlay when sidebar is open on mobile */}
        {isMobile && sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-10"
            onClick={() => useSidebar().toggleSidebar()}
          />
        )}
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
