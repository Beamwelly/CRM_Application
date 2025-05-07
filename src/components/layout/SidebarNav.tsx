import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  UserCheck,
  Calendar,
  Clock,
  UserCog,
  ShieldPlus,
  Mail
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useCRM } from '@/context/hooks';
import { Badge } from '@/components/ui/badge';
import { Role, UserPermissions } from '@/types';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles?: Role[];
  permission?: keyof UserPermissions | 'any';
  badge?: number | undefined;
}

export function SidebarNav() {
  const { currentUser, getPendingFollowUps, getLeadsByAssignee, getCustomersByAssignee } = useCRM();
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname.startsWith(path);
  
  // Get counts for badges
  const pendingFollowUps = currentUser ? getPendingFollowUps(currentUser.id).length : 0;
  const leadCount = currentUser?.role === 'employee' 
    ? getLeadsByAssignee(currentUser.id).length 
    : 0;
  const customerCount = currentUser?.role === 'employee' 
    ? getCustomersByAssignee(currentUser.id).length 
    : 0;
  
  // Updated Nav items with correct roles, new icons, and permission flags
  const navItems: NavItem[] = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['developer', 'employee', 'admin'],
      permission: 'any',
    },
    {
      title: 'Leads',
      href: '/leads',
      icon: UserPlus,
      roles: ['developer', 'employee', 'admin'],
      permission: 'any',
      badge: currentUser?.role === 'employee' ? leadCount : undefined,
    },
    {
      title: 'Customers',
      href: '/customers',
      icon: UserCheck,
      roles: ['developer', 'employee', 'admin'],
      permission: 'any',
      badge: currentUser?.role === 'employee' ? customerCount : undefined,
    },
    {
      title: 'Email History',
      href: '/email',
      icon: Mail,
      roles: ['developer', 'employee', 'admin'],
      permission: 'any',
    },
    {
      title: 'Follow-ups',
      href: '/follow-ups',
      icon: Clock,
      roles: ['developer', 'employee', 'admin'],
      permission: 'any',
      badge: pendingFollowUps,
    },
    {
      title: 'Renewals',
      href: '/renewals',
      icon: Calendar,
      roles: ['developer', 'employee', 'admin'],
      permission: 'any',
    },
    {
      title: 'User Management',
      href: '/users',
      icon: UserCog,
      roles: ['developer', 'admin'],
      permission: 'viewUsers',
    },
    {
      title: 'Add Admin',
      href: '/users/add-admin',
      icon: ShieldPlus,
      roles: ['developer'],
      permission: 'createAdmin',
    },
    {
      title: 'Add Employee',
      href: '/users/add-employee',
      icon: UserPlus,
      roles: ['developer', 'admin'],
      permission: 'createEmployee',
    },
  ];
  
  // Filter based on current user role and permissions
  const filteredNavItems = navItems.filter(item => {
    if (!currentUser) return false;
    const roleMatch = !item.roles || item.roles.includes(currentUser.role);
    if (!roleMatch) return false;
    const permissionMatch = !item.permission || item.permission === 'any' || (currentUser.permissions && currentUser.permissions[item.permission]);
    return permissionMatch;
  });
  
  return (
    <nav className="flex flex-col space-y-1 w-full">
      {filteredNavItems.map((item) => (
        <Link key={item.href} to={item.href}>
          <Button
            variant={isActive(item.href) ? 'secondary' : 'ghost'}
            className={cn(
              'w-full justify-start',
              isActive(item.href) ? 'font-medium' : 'font-normal'
            )}
          >
            <item.icon className="mr-2 h-4 w-4" />
            <span>{item.title}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <Badge
                variant="secondary"
                className="ml-auto bg-primary/20 text-primary"
              >
                {item.badge}
              </Badge>
            )}
          </Button>
        </Link>
      ))}
    </nav>
  );
}
