import { UserNav } from "./UserNav";
import { ThemeModeToggle } from "@/components/layout/ThemeModeToggle";
import { useSidebar } from "@/hooks/use-mobile";
import { Menu, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCRM } from '@/context/hooks';

// Default logo path (used when logged out or if user has no logo)
const DEFAULT_LOGO_PATH = "/lovable-uploads/9215e11f-487e-43e0-be13-0675923d1c22.png";

export function Header() {
  const { toggleSidebar } = useSidebar();
  const { currentUser } = useCRM();

  const logoUrlFromUser = currentUser?.logoUrl;

  // Determine the source for the image tag.
  // Prioritize user's logo, then fall back to the default path.
  const imageSrcToTry = logoUrlFromUser || DEFAULT_LOGO_PATH;

  console.log("[Header] currentUser:", currentUser);
  console.log("[Header] logoUrlFromUser:", logoUrlFromUser);
  console.log("[Header] imageSrcToTry:", imageSrcToTry);

  return (
    <div className="sticky top-0 z-30 flex h-22 items-center justify-between border-b bg-background/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={toggleSidebar}
        >
          <Menu className="h-8 w-8" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
        
        <div className="flex items-center gap-3 ml-4 md:ml-0">
          <div className="logo-placeholder">
            {/* Always render an img tag. 
                The src will be the user's logo or the default logo path.
                The onError handler will attempt to load the DEFAULT_LOGO_PATH if the initial src fails.
            */}
            <img 
              src={imageSrcToTry} // Use the determined source
              alt="Application Logo"
              key={imageSrcToTry} // Keying by src can help React re-render if the src changes
              className="" // Tailwind classes for img are in index.css under .logo-placeholder img
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                // If the error source is already the default path, it means the default image itself is broken.
                // In this case, we might want to hide the image or show a different placeholder.
                // For now, just log an error to avoid an infinite loop if DEFAULT_LOGO_PATH is bad.
                if (target.src === DEFAULT_LOGO_PATH) {
                  console.error(`Failed to load default logo ${DEFAULT_LOGO_PATH}. Ensure the file exists and path is correct.`);
                  // Optionally hide the image or replace with a very basic placeholder if default is broken
                  // target.style.display = 'none'; 
                } else {
                  // If the user's logo failed, attempt to load the default logo path.
                  console.warn(`Failed to load logo from ${target.src}, falling back to default system logo: ${DEFAULT_LOGO_PATH}`);
                  target.src = DEFAULT_LOGO_PATH;
                }
              }}
            />
          </div>
          <h1 className="hidden text-4xl font-semibold md:inline-block">
            Wealth & Training CRM
          </h1>
        </div>
      </div>
      
      <div className="flex items-center gap-3 mr-2">
        <ThemeModeToggle />
        <UserNav />
      </div>
    </div>
  );
}
