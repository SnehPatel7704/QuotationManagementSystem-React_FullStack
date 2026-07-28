import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Switch from '@radix-ui/react-switch';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { FiSun, FiMoon, FiLogOut, FiMenu, FiChevronDown, FiUser } from 'react-icons/fi';

const Header = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md transition-colors duration-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/dashboard" className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              Quotation System
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-4">
            <Link 
              to="/dashboard" 
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Dashboard
            </Link>
            <Link 
              to="/quotations" 
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Quotations
            </Link>
            
            {(user?.role === 'SUPERADMIN' || user?.role === 'ADMIN') && (
              <>
                <Link 
                  to="/companies" 
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Companies
                </Link>
                <Link 
                  to="/products" 
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Products
                </Link>
              </>
            )}
            
            {user?.role === 'SUPERADMIN' && (
              <Link 
                to="/users" 
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Users
              </Link>
            )}
          </nav>

          {/* Right side - User info and actions */}
          <div className="flex items-center space-x-6">
            {/* Theme Toggle (Radix Switch) */}
            <div className="flex items-center space-x-2">
              <span className="text-gray-500 dark:text-gray-400">
                <FiSun size={16} />
              </span>
              <Switch.Root
                checked={theme === 'dark'}
                onCheckedChange={toggleTheme}
                className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full relative focus:outline-none cursor-pointer transition-colors"
                aria-label="Toggle theme"
              >
                <Switch.Thumb className="block w-5 h-5 bg-white rounded-full shadow-md transform translate-x-0.5 checked:translate-x-5.5 transition-transform duration-100 will-change-transform dark:bg-primary-400" style={{ transform: theme === 'dark' ? 'translateX(22px)' : 'translateX(2px)' }} />
              </Switch.Root>
              <span className="text-gray-500 dark:text-gray-400">
                <FiMoon size={16} />
              </span>
            </div>

            {/* Radix User Dropdown (Desktop) */}
            <div className="hidden md:block">
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 flex items-center justify-center font-bold">
                      {user?.username?.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 leading-none">
                        {user?.username}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-none">
                        {user?.role}
                      </p>
                    </div>
                    <FiChevronDown className="text-gray-500" size={16} />
                  </button>
                </DropdownMenu.Trigger>

                <DropdownMenu.Portal>
                  <DropdownMenu.Content 
                    className="min-w-[180px] bg-white dark:bg-gray-800 rounded-lg p-1.5 shadow-xl border border-gray-100 dark:border-gray-700 z-50 animate-in fade-in slide-in-from-top-1 duration-100"
                    align="end"
                  >
                    <DropdownMenu.Label className="px-2.5 py-1.5 text-xs text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider">
                      My Account
                    </DropdownMenu.Label>
                    
                    <DropdownMenu.Item className="flex items-center space-x-2 px-2.5 py-2 text-sm text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-default focus:outline-none">
                      <FiUser size={16} />
                      <span>Profile info</span>
                    </DropdownMenu.Item>

                    <DropdownMenu.Separator className="h-px bg-gray-100 dark:bg-gray-700 my-1" />

                    <DropdownMenu.Item 
                      onClick={handleLogout}
                      className="flex items-center space-x-2 px-2.5 py-2 text-sm text-red-600 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-950/30 cursor-default focus:outline-none font-medium"
                    >
                      <FiLogOut size={16} />
                      <span>Logout</span>
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FiMenu size={24} />
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <Link 
              to="/dashboard" 
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => setMobileMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link 
              to="/quotations" 
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => setMobileMenuOpen(false)}
            >
              Quotations
            </Link>
            
            {(user?.role === 'SUPERADMIN' || user?.role === 'ADMIN') && (
              <>
                <Link 
                  to="/companies" 
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Companies
                </Link>
                <Link 
                  to="/products" 
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Products
                </Link>
              </>
            )}
            
            {user?.role === 'SUPERADMIN' && (
              <Link 
                to="/users" 
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                Users
              </Link>
            )}
            
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="px-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                {user?.username} ({user?.role})
              </p>
              <button
                onClick={handleLogout}
                className="mt-2 w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                <FiLogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
