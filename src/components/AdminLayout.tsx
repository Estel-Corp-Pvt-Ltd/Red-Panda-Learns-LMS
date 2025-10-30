import React, { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Users, Settings, Book, TicketPercent, Building2, ShoppingBag, UserPen, PictureInPicture } from 'lucide-react';
import { Header } from './Header';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: ReactNode;
}

interface MenuItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location = useLocation();

  const menuItems: MenuItem[] = [
    {
      name: 'Dashboard',
      path: '/admin',
      icon: <LayoutDashboard className="h-5 w-5" />
    },
    {
      name: 'Courses',
      path: '/admin/courses',
      icon: <BookOpen className="h-5 w-5" />
    },
    {
      name: 'Bundles',
      path: '/admin/bundles',
      icon: <Book className="h-5 w-5" />
    },
    {
      name: 'Coupons',
      path: '/admin/coupons',
      icon: <TicketPercent className="h-5 w-5" />
    },
    {
      name: 'Orders',
      path: '/admin/orders',
      icon: <ShoppingBag className="h-5 w-5" />
    },
    {
      name: 'Pop-Ups',
      path: '/admin/pop-ups',
      icon: <PictureInPicture className="h-5 w-5" />
    },
    {
      name: 'Instructors',
      path: '/admin/instructors',
      icon: <UserPen className="h-5 w-5" />
    },
    {
      name: 'Users',
      path: '/admin/users',
      icon: <Users className="h-5 w-5" />
    },
    {
      name: 'Organizations',
      path: '/admin/organizations',
      icon: <Building2 className="h-5 w-5" />
    },
  ];

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className='flex flex-col h-screen w-full bg-background'>
      <Header />
      <div className='flex-1 flex overflow-hidden'>
        {/* Sidebar */}
        <div className='w-64 flex flex-col border-r bg-card'>
          {/* Navigation Menu */}
          <nav className="flex-1 p-4">
            <ul className="space-y-1">
              {menuItems.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground',
                      isActive(item.path)
                        ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
                        : 'text-muted-foreground'
                    )}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Main Content */}
        <div className='flex-1 flex flex-col overflow-hidden'>
          <main className='flex-1 p-6 overflow-y-auto'>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
