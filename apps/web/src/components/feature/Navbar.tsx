
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import CrisisLink from '../ui/CrisisLink';

const SCROLL_THRESHOLD = 40;

// Cache the admin check per user id so navigating between pages doesn't refetch it.
const adminCheckCache = new Map<string, Promise<boolean>>();

function checkIsAdmin(userId: string): Promise<boolean> {
  let pending = adminCheckCache.get(userId);
  if (!pending) {
    pending = apiFetch('/api/admin/check')
      .then(() => true)
      .catch(() => false);
    adminCheckCache.set(userId, pending);
  }
  return pending;
}

interface NavbarProps {
  transparent?: boolean;
}

export default function Navbar({ transparent = false }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { totalItems } = useCart();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > SCROLL_THRESHOLD);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close the user menu on outside click or Escape. (A fixed backdrop would break inside
  // the transformed header row.)
  useEffect(() => {
    if (!showUserMenu) return;
    const handlePointer = (e: PointerEvent) => {
      if (!userMenuRef.current?.contains(e.target as Node)) setShowUserMenu(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowUserMenu(false);
    };
    document.addEventListener('pointerdown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [showUserMenu]);

  const userId = user?.id ?? null;
  const isUserLoggedIn = !!user;
  const userEmail = user?.email || '';
  // Only trust the server's answer, and only for the currently signed-in user.
  const isAdminLoggedIn = !!userId && adminUserId === userId;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void checkIsAdmin(userId).then((isAdmin) => {
      if (!cancelled) setAdminUserId(isAdmin ? userId : null);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

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

  const showBackground = !transparent || isScrolled || isMobileMenuOpen;
  // The header "shrinks" by sliding its background up and the content half as far
  // (transform only, so nothing reflows). Distance is --nav-shrink.
  const shrink = isScrolled ? 'translateY(calc(var(--nav-shrink) * -1))' : 'none';
  const shrinkHalf = isScrolled ? 'translateY(calc(var(--nav-shrink) / -2))' : 'none';

  return (
    <nav aria-label="Main" className="fixed top-0 left-0 right-0 z-50 [--nav-shrink:8px] md:[--nav-shrink:16px]">
      <div
        aria-hidden="true"
        style={{ transform: shrink }}
        className={`absolute inset-0 border-b transition-[opacity,transform] duration-oe-base ease-oe-out ${
          showBackground ? 'opacity-100' : 'opacity-0'
        } ${
          isScrolled
            ? 'bg-white/75 backdrop-blur-[10px] border-oe-line shadow-oe-sm'
            : 'bg-white/95 border-transparent'
        }`}
      />
      <div
        style={{ transform: shrinkHalf }}
        className="relative max-w-7xl mx-auto px-6 md:px-12 lg:px-20 py-4 md:py-6 transition-transform duration-oe-base ease-oe-out"
      >
        <div className="flex items-center justify-between">
          <Link
            to="/"
            style={{ transform: isScrolled ? 'scale(0.92)' : 'none' }}
            className="origin-left text-2xl md:text-3xl font-bold text-oe-primary hover:opacity-80 transition-[opacity,transform] duration-oe-base ease-oe-out"
          >
            Open Ear
          </Link>

          <div className="md:hidden flex items-center gap-2">
            <CrisisLink compact className="text-sm px-2 py-2" />
            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
              className="w-11 h-11 flex items-center justify-center text-oe-primary cursor-pointer"
            >
              <i
                aria-hidden="true"
                className={`${
                  isMobileMenuOpen ? 'ri-close-line' : 'ri-menu-line'
                } text-2xl`}
              ></i>
            </button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6 lg:gap-10">
            <CrisisLink compact className="text-sm lg:text-base whitespace-nowrap" />
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm lg:text-base font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  isActive(link.path)
                    ? 'text-oe-primary'
                    : 'text-oe-ink hover:text-oe-primary'
                }`}
              >
                {link.label}
              </Link>
            ))}
            
            {/* Shopping Cart Widget */}
            {isStoreFlow && (
              <Link
                to="/cart"
                className="relative text-oe-ink hover:text-oe-primary transition-colors cursor-pointer"
              >
                <i className="ri-shopping-cart-line text-xl"></i>
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-oe-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
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
                    ? 'text-oe-primary'
                    : 'text-oe-ink hover:text-oe-primary'
                }`}
              >
                <i className="ri-shield-user-line"></i>
                Admin
              </Link>
            )}
            {isUserLoggedIn ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  aria-label="Account menu"
                  aria-expanded={showUserMenu}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <div className="w-8 h-8 bg-oe-primary rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">
                      {userEmail.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <i className={`ri-arrow-${showUserMenu ? 'up' : 'down'}-s-line text-oe-ink`}></i>
                </button>
                
                {/* User Dropdown Menu */}
                {showUserMenu && (
                  <>
                    <div className="animate-fade-in absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-xs text-oe-muted">Signed in as</p>
                        <p className="text-sm font-medium text-oe-ink truncate">{userEmail}</p>
                      </div>
                      <Link
                        to="/profile"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-oe-ink hover:bg-oe-primary-tint transition-colors cursor-pointer"
                      >
                        <i className="ri-user-line text-oe-primary"></i>
                        My Profile
                      </Link>
                      <Link
                        to="/dashboard"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-oe-ink hover:bg-oe-primary-tint transition-colors cursor-pointer"
                      >
                        <i className="ri-dashboard-line text-oe-primary"></i>
                        Dashboard
                      </Link>
                      <Link
                        to="/library"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-oe-ink hover:bg-oe-primary-tint transition-colors cursor-pointer"
                      >
                        <i className="ri-book-line text-oe-primary"></i>
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
                    ? 'text-oe-primary'
                    : 'text-oe-ink hover:text-oe-primary'
                }`}
              >
                Sign In
              </Link>
            )}
            <Link
              to="/get-started"
              className="oe-btn px-6 lg:px-8 py-2.5 lg:py-3 bg-oe-primary text-white rounded-full text-sm lg:text-base font-semibold hover:bg-oe-primary-hover whitespace-nowrap cursor-pointer"
            >
              Get Started
            </Link>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div id="mobile-menu" className="animate-fade-in md:hidden mt-6 pb-6 space-y-4 border-t border-gray-100 pt-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block text-base font-medium transition-colors cursor-pointer ${
                  isActive(link.path)
                    ? 'text-oe-primary'
                    : 'text-oe-ink hover:text-oe-primary'
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
                    ? 'text-oe-primary'
                    : 'text-oe-ink hover:text-oe-primary'
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
                    ? 'text-oe-primary'
                    : 'text-oe-ink hover:text-oe-primary'
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
                      ? 'text-oe-primary'
                      : 'text-oe-ink hover:text-oe-primary'
                  }`}
                >
                  <div className="w-6 h-6 bg-oe-primary rounded-full flex items-center justify-center">
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
                      ? 'text-oe-primary'
                      : 'text-oe-ink hover:text-oe-primary'
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
                      ? 'text-oe-primary'
                      : 'text-oe-ink hover:text-oe-primary'
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
                    ? 'text-oe-primary'
                    : 'text-oe-ink hover:text-oe-primary'
                }`}
              >
                Sign In
              </Link>
            )}
            <Link
              to="/get-started"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-center px-6 py-3 bg-oe-primary text-white rounded-full font-semibold hover:bg-oe-primary-hover transition-colors whitespace-nowrap cursor-pointer"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
