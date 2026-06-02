
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';

interface NavbarProps {
  transparent?: boolean;
}

export default function Navbar({ transparent = false }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { totalItems } = useCart();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const adminSession = localStorage.getItem('admin_session');
    setIsAdminLoggedIn(!!adminSession);
    checkUserAuth();
  }, [location]);

  const checkUserAuth = () => {
    setIsUserLoggedIn(!!user);
    setUserEmail(user?.email || '');
  };

  const handleSignOut = () => {
    signOut();
    setShowUserMenu(false);
    navigate('/');
  };

  const navLinks = [
    { path: '/how-it-works', label: 'How It Works' },
    { path: '/pricing', label: 'Pricing' },
    { path: '/mood-tracker', label: 'Mood Tracker' },
    { path: '/ebook-store', label: 'Store' },
  ];
  const isStoreFlow =
    location.pathname === '/ebook-store' ||
    location.pathname.startsWith('/ebook/') ||
    location.pathname === '/cart' ||
    location.pathname === '/checkout' ||
    location.pathname === '/checkout/success';

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        transparent && !isScrolled
          ? 'bg-transparent'
          : 'bg-white/95 backdrop-blur-md shadow-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 py-4 md:py-6">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="text-2xl md:text-3xl font-bold text-[#0096FF] hover:opacity-80 transition-opacity"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Open Ear
          </Link>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden w-10 h-10 flex items-center justify-center text-[#0096FF] cursor-pointer"
          >
            <i
              className={`${
                isMobileMenuOpen ? 'ri-close-line' : 'ri-menu-line'
              } text-2xl`}
            ></i>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8 lg:gap-12">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm lg:text-base font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  isActive(link.path)
                    ? 'text-[#0096FF]'
                    : 'text-[#2A2A2A] hover:text-[#0096FF]'
                }`}
              >
                {link.label}
              </Link>
            ))}
            
            {/* Shopping Cart Widget */}
            {isStoreFlow && (
              <Link
                to="/cart"
                className="relative text-[#2A2A2A] hover:text-[#0096FF] transition-colors cursor-pointer"
              >
                <i className="ri-shopping-cart-line text-xl"></i>
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#0096FF] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Link>
            )}
            
            {isAdminLoggedIn && (
              <Link
                to="/admin-dashboard"
                className={`text-sm lg:text-base font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                  isActive('/admin-dashboard')
                    ? 'text-[#0096FF]'
                    : 'text-[#2A2A2A] hover:text-[#0096FF]'
                }`}
              >
                <i className="ri-shield-user-line"></i>
                Admin
              </Link>
            )}
            {isUserLoggedIn ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <div className="w-8 h-8 bg-[#0096FF] rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">
                      {userEmail.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <i className={`ri-arrow-${showUserMenu ? 'up' : 'down'}-s-line text-[#2A2A2A]`}></i>
                </button>
                
                {/* User Dropdown Menu */}
                {showUserMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowUserMenu(false)}
                    ></div>
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-xs text-[#6B6B6B]">Signed in as</p>
                        <p className="text-sm font-medium text-[#2A2A2A] truncate">{userEmail}</p>
                      </div>
                      <Link
                        to="/profile"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#2A2A2A] hover:bg-[#E6F5FF] transition-colors cursor-pointer"
                      >
                        <i className="ri-user-line text-[#0096FF]"></i>
                        My Profile
                      </Link>
                      <Link
                        to="/dashboard"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#2A2A2A] hover:bg-[#E6F5FF] transition-colors cursor-pointer"
                      >
                        <i className="ri-dashboard-line text-[#0096FF]"></i>
                        Dashboard
                      </Link>
                      <Link
                        to="/library"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#2A2A2A] hover:bg-[#E6F5FF] transition-colors cursor-pointer"
                      >
                        <i className="ri-book-line text-[#0096FF]"></i>
                        My Library
                      </Link>
                      <div className="border-t border-gray-100 my-2"></div>
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <i className="ri-logout-box-line"></i>
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                to="/signin"
                className={`text-sm lg:text-base font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  isActive('/signin')
                    ? 'text-[#0096FF]'
                    : 'text-[#2A2A2A] hover:text-[#0096FF]'
                }`}
              >
                Sign In
              </Link>
            )}
            <Link
              to="/get-started"
              className="px-6 lg:px-8 py-2.5 lg:py-3 bg-[#0096FF] text-white rounded-full text-sm lg:text-base font-semibold hover:bg-[#0077CC] transition-colors whitespace-nowrap cursor-pointer"
            >
              Get Started
            </Link>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-6 pb-6 space-y-4 border-t border-gray-100 pt-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block text-base font-medium transition-colors cursor-pointer ${
                  isActive(link.path)
                    ? 'text-[#0096FF]'
                    : 'text-[#2A2A2A] hover:text-[#0096FF]'
                }`}
              >
                {link.label}
              </Link>
            ))}
            
            {/* Mobile Cart Link */}
            {isStoreFlow && (
              <Link
                to="/cart"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block text-base font-medium transition-colors cursor-pointer flex items-center gap-2 ${
                  isActive('/cart')
                    ? 'text-[#0096FF]'
                    : 'text-[#2A2A2A] hover:text-[#0096FF]'
                }`}
              >
                <i className="ri-shopping-cart-line"></i>
                Cart {totalItems > 0 && `(${totalItems})`}
              </Link>
            )}
            
            {isAdminLoggedIn && (
              <Link
                to="/admin-dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block text-base font-medium transition-colors cursor-pointer flex items-center gap-2 ${
                  isActive('/admin-dashboard')
                    ? 'text-[#0096FF]'
                    : 'text-[#2A2A2A] hover:text-[#0096FF]'
                }`}
              >
                <i className="ri-shield-user-line"></i>
                Admin
              </Link>
            )}
            {isUserLoggedIn ? (
              <>
                <Link
                  to="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block text-base font-medium transition-colors cursor-pointer flex items-center gap-2 ${
                    isActive('/profile')
                      ? 'text-[#0096FF]'
                      : 'text-[#2A2A2A] hover:text-[#0096FF]'
                  }`}
                >
                  <div className="w-6 h-6 bg-[#0096FF] rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">
                      {userEmail.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  My Profile
                </Link>
                <Link
                  to="/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block text-base font-medium transition-colors cursor-pointer flex items-center gap-2 ${
                    isActive('/dashboard')
                      ? 'text-[#0096FF]'
                      : 'text-[#2A2A2A] hover:text-[#0096FF]'
                  }`}
                >
                  <i className="ri-dashboard-line"></i>
                  Dashboard
                </Link>
                <Link
                  to="/library"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block text-base font-medium transition-colors cursor-pointer flex items-center gap-2 ${
                    isActive('/library')
                      ? 'text-[#0096FF]'
                      : 'text-[#2A2A2A] hover:text-[#0096FF]'
                  }`}
                >
                  <i className="ri-book-line"></i>
                  My Library
                </Link>
                <button
                  onClick={() => {
                    handleSignOut();
                    setIsMobileMenuOpen(false);
                  }}
                  className="block w-full text-left text-base font-medium text-red-600 cursor-pointer flex items-center gap-2"
                >
                  <i className="ri-logout-box-line"></i>
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                to="/signin"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block text-base font-medium transition-colors cursor-pointer ${
                  isActive('/signin')
                    ? 'text-[#0096FF]'
                    : 'text-[#2A2A2A] hover:text-[#0096FF]'
                }`}
              >
                Sign In
              </Link>
            )}
            <Link
              to="/get-started"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-center px-6 py-3 bg-[#0096FF] text-white rounded-full font-semibold hover:bg-[#0077CC] transition-colors whitespace-nowrap cursor-pointer"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
