import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { siteConfig } from '../../config/site';

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

const NAV_LINKS = [
  { path: '/how-it-works', label: 'How it works' },
  { path: '/pricing', label: 'Pricing' },
];

const ACCOUNT_LINKS = [
  { path: '/dashboard', label: 'Dashboard', icon: 'ri-dashboard-line' },
  { path: '/profile', label: 'My profile', icon: 'ri-user-line' },
  { path: '/mood-tracker', label: 'Mood tracker', icon: 'ri-emotion-line' },
  { path: '/ebook-store', label: 'Store', icon: 'ri-store-2-line' },
  { path: '/library', label: 'My library', icon: 'ri-book-line' },
];

interface NavbarProps {
  /** Kept for existing callers; the Terra header is always solid. */
  transparent?: boolean;
}

/** Terra site header: logo, pill navigation, "Need urgent help?" and the account button. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function Navbar(_props: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { totalItems } = useCart();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close the user menu on outside click or Escape.
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
  const userEmail = user?.email || '';
  // Only trust the server's answer, and only for the currently signed-in user.
  const isAdmin = !!userId && adminUserId === userId;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void checkIsAdmin(userId).then((admin) => {
      if (!cancelled) setAdminUserId(admin ? userId : null);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleSignOut = () => {
    signOut();
    setShowUserMenu(false);
    setIsMobileMenuOpen(false);
    navigate('/');
  };

  const isStoreFlow =
    location.pathname === '/ebook-store' ||
    location.pathname.startsWith('/ebook/') ||
    location.pathname === '/cart' ||
    location.pathname.startsWith('/checkout');

  const isActive = (path: string) => location.pathname === path;
  const pillLink = (path: string) =>
    `rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
      isActive(path) ? 'bg-oe-primary-soft text-oe-primary-deep' : 'text-oe-muted hover:bg-oe-surface hover:text-oe-ink'
    }`;
  const accountLinks = isAdmin
    ? [...ACCOUNT_LINKS, { path: '/admin-dashboard', label: 'Admin', icon: 'ri-shield-user-line' }]
    : ACCOUNT_LINKS;

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-oe-surface/80 bg-oe-bg/85 backdrop-blur-xl">
      <nav aria-label="Main" className="mx-auto flex h-20 max-w-[1120px] items-center justify-between px-5 md:px-8">
        <Link to="/" className="group flex items-center gap-2.5">
          <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-oe-primary-tint text-oe-primary">
            <i className="ri-fire-line text-lg" />
          </span>
          <span className="font-heading text-xl font-semibold tracking-tight text-oe-ink transition-colors group-hover:text-oe-primary">
            Open Ear
          </span>
        </Link>

        <div className="hidden items-center gap-1 rounded-full bg-oe-surface px-1.5 py-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.path} to={link.path} className={pillLink(link.path)}>
              {link.label}
            </Link>
          ))}
          {!user && (
            <Link to="/signin" className={pillLink('/signin')}>
              Sign in
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to={siteConfig.crisisPath}
            className="flex items-center gap-2 rounded-full bg-oe-surface-low px-3 py-1.5 text-xs font-medium text-oe-muted transition-colors hover:bg-oe-surface hover:text-oe-ink sm:text-sm"
          >
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-oe-crisis" />
            Need urgent help?
          </Link>

          {isStoreFlow && (
            <Link to="/cart" aria-label={`Cart, ${totalItems} items`} className="relative hidden p-2 text-oe-ink hover:text-oe-primary md:block">
              <i className="ri-shopping-cart-line text-xl" aria-hidden="true" />
              {totalItems > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-oe-primary text-xs text-white">
                  {totalItems}
                </span>
              )}
            </Link>
          )}

          <div className="relative hidden md:block" ref={userMenuRef}>
            {user ? (
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                aria-label="Account menu"
                aria-expanded={showUserMenu}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-oe-primary text-sm font-bold text-white shadow-oe-sm"
              >
                {userEmail.charAt(0).toUpperCase() || <i className="ri-user-line" aria-hidden="true" />}
              </button>
            ) : (
              <Link to="/signin" aria-label="Sign in" className="flex h-9 w-9 items-center justify-center rounded-full bg-oe-primary text-white shadow-oe-sm">
                <i className="ri-user-line" aria-hidden="true" />
              </Link>
            )}

            {showUserMenu && user && (
              <div className="animate-fade-in absolute right-0 top-full z-50 mt-3 w-60 rounded-2xl border border-oe-line bg-white py-2 shadow-oe-md">
                <div className="border-b border-oe-line px-4 py-3">
                  <p className="text-xs text-oe-muted">Signed in as</p>
                  <p className="truncate text-sm font-medium text-oe-ink">{userEmail}</p>
                </div>
                {accountLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-oe-ink transition-colors hover:bg-oe-primary-tint"
                  >
                    <i className={`${link.icon} text-oe-primary`} aria-hidden="true" />
                    {link.label}
                  </Link>
                ))}
                <div className="my-2 border-t border-oe-line" />
                <button
                  onClick={handleSignOut}
                  className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-oe-crisis transition-colors hover:bg-oe-crisis-tint"
                >
                  <i className="ri-logout-box-line" aria-hidden="true" />
                  Sign out
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
            className="flex h-11 w-11 cursor-pointer items-center justify-center text-oe-ink md:hidden"
          >
            <i aria-hidden="true" className={`${isMobileMenuOpen ? 'ri-close-line' : 'ri-menu-line'} text-2xl`} />
          </button>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div id="mobile-menu" className="animate-fade-in border-t border-oe-line bg-oe-bg px-5 pb-6 pt-4 md:hidden">
          {[...NAV_LINKS, ...(user ? accountLinks : []), ...(isStoreFlow ? [{ path: '/cart', label: `Cart (${totalItems})` }] : [])].map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block rounded-xl px-3 py-3 text-base font-medium ${isActive(link.path) ? 'bg-oe-primary-tint text-oe-primary-deep' : 'text-oe-ink'}`}
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <button onClick={handleSignOut} className="block w-full cursor-pointer rounded-xl px-3 py-3 text-left text-base font-medium text-oe-crisis">
              Sign out
            </button>
          ) : (
            <Link
              to="/signin"
              onClick={() => setIsMobileMenuOpen(false)}
              className="mt-3 block rounded-xl bg-oe-primary px-6 py-3 text-center font-semibold text-white"
            >
              Sign in
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
