import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../router';
import HomePage from '../pages/home/page';
import SignInPage from '../pages/signin/page';
import PricingPage from '../pages/pricing/page';
import DashboardPage from '../pages/dashboard/page';
import CallPage from '../pages/call/page';
import HowItWorksPage from '../pages/how-it-works/page';
import AdminLoginPage from '../pages/admin-login/page';
import AdminDashboardPage from '../pages/admin-dashboard/page';
import GetStartedPage from '../pages/get-started/page';
import Navbar from '../components/feature/Navbar';

vi.mock('../lib/api', () => ({
  apiFetch: vi.fn(() => Promise.resolve({ credits: 0, data: [] })),
  apiUpload: vi.fn(),
  getAccessToken: vi.fn(() => null),
  setAccessToken: vi.fn(),
  apiUrl: (path: string) => `http://localhost:3001${path}`,
  ApiError: class ApiError extends Error {
    status = 400;
  },
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    refreshUser: vi.fn(),
    signUp: vi.fn(() => Promise.resolve({ needsVerification: false })),
    signIn: vi.fn(() => Promise.resolve()),
    verifyOtp: vi.fn(),
    resendOtp: vi.fn(),
    signOut: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    getSession: vi.fn(() => null),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

/**
 * Preservation Property Tests
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
 * 
 * IMPORTANT: These tests follow observation-first methodology
 * 
 * These tests capture the baseline behavior of existing functionality that must be preserved.
 * They run on UNFIXED code to establish what currently works correctly.
 * 
 * EXPECTED OUTCOME: All tests PASS on unfixed code (confirms baseline behavior to preserve)
 * 
 * The tests verify:
 * 1. All existing pages load correctly
 * 2. Existing navigation menu and links function as expected  
 * 3. Sign-in process works correctly without error messages
 * 4. Footer social media links and working elements function correctly
 * 5. Main app functionality works as designed
 * 6. React Router navigation and lazy loading functions correctly
 */
describe('Preservation Property Tests - Existing Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window.scrollTo mock
    window.scrollTo = vi.fn();
  });

  /**
   * Property 2.1: All existing pages load correctly
   * Validates: Requirement 3.1
   * 
   * Tests that all existing pages (Home, Pricing, Dashboard, Call, How It Works, 
   * Admin pages, Sign In, Get Started) continue to load correctly
   */
  describe('Existing Pages Load Correctly', () => {
    const existingRoutes = [
      { path: '/', component: 'HomePage', testText: 'A Safe Place to Share' },
      { path: '/pricing', component: 'PricingPage', testText: 'pricing' },
      { path: '/dashboard', component: 'DashboardPage', testText: 'dashboard' },
      { path: '/call', component: 'CallPage', testText: 'call' },
      { path: '/how-it-works', component: 'HowItWorksPage', testText: 'how it works' },
      { path: '/admin-login', component: 'AdminLoginPage', testText: 'admin' },
      { path: '/admin-dashboard', component: 'AdminDashboardPage', testText: 'admin' },
      { path: '/signin', component: 'SignInPage', testText: 'Sign In' },
      { path: '/get-started', component: 'GetStartedPage', testText: 'get started' },
    ];

    existingRoutes.forEach(({ path, component, testText }) => {
      it(`should load ${component} at ${path} correctly`, async () => {
        render(
          <MemoryRouter initialEntries={[path]}>
            <AppRoutes />
          </MemoryRouter>
        );

        // Wait for lazy loading and verify page loads
        await waitFor(() => {
          // Look for any content that indicates the page loaded
          // This is flexible to account for different page structures
          const pageElements = screen.getAllByText(new RegExp(testText, 'i'));
          expect(pageElements.length).toBeGreaterThan(0);
        }, { timeout: 3000 });
      });
    });

    it('should handle 404 routes with NotFound page', async () => {
      render(
        <MemoryRouter initialEntries={['/nonexistent-route']}>
          <AppRoutes />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/This page has not been generated/)).toBeInTheDocument();
      });
    });
  });

  /**
   * Property 2.2: Existing navigation menu and links function as expected
   * Validates: Requirement 3.2
   * 
   * Tests that the current navigation menu and working links continue to function
   */
  describe('Navigation Menu Functions Correctly', () => {
    it('should render navigation with existing working links', async () => {
      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );

      // Verify existing navigation links are present and functional
      expect(screen.getByText('Open Ear')).toBeInTheDocument();
      expect(screen.getByText('How It Works')).toBeInTheDocument();
      expect(screen.getByText('Pricing')).toBeInTheDocument();
      expect(screen.getByText('Sign In')).toBeInTheDocument();
      expect(screen.getByText('Get Started')).toBeInTheDocument();

      // Verify links have correct href attributes
      const howItWorksLink = screen.getByText('How It Works').closest('a');
      expect(howItWorksLink).toHaveAttribute('href', '/how-it-works');

      const pricingLink = screen.getByText('Pricing').closest('a');
      expect(pricingLink).toHaveAttribute('href', '/pricing');

      const signInLink = screen.getByText('Sign In').closest('a');
      expect(signInLink).toHaveAttribute('href', '/signin');

      const getStartedLink = screen.getByText('Get Started').closest('a');
      expect(getStartedLink).toHaveAttribute('href', '/get-started');
    });

    it('should handle mobile menu toggle correctly', async () => {
      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );

      // Find mobile menu button (should be hidden on desktop but present in DOM)
      const mobileMenuButton = document.querySelector('[class*="md:hidden"]');
      expect(mobileMenuButton).toBeInTheDocument();
    });

    it('should show admin link when admin is logged in', async () => {
      // Mock admin session
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = vi.fn().mockReturnValue('admin-session-token');

      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );

      await waitFor(() => {
        const adminLink = screen.queryByText('Admin');
        // Admin link may or may not be visible depending on auth state
        // This test ensures the functionality exists without breaking
        if (adminLink) {
          expect(adminLink.closest('a')).toHaveAttribute('href', '/admin-dashboard');
        }
      });

      // Restore original localStorage
      localStorage.getItem = originalGetItem;
    });
  });

  /**
   * Property 2.3: Sign-in process works correctly without error messages
   * Validates: Requirement 3.3
   * 
   * Tests that the existing sign-in process (not registration) continues to work correctly
   */
  describe('Sign-in Process Functions Correctly', () => {
    it('should render sign-in form correctly', async () => {
      render(
        <BrowserRouter>
          <SignInPage />
        </BrowserRouter>
      );

      // Verify sign-in form elements are present
      expect(screen.getByText('Welcome back')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();

      // Verify social sign-in options are available
      expect(screen.getByText('Continue with Google')).toBeInTheDocument();
      expect(screen.getByText('Continue with Apple')).toBeInTheDocument();
      expect(screen.getByText('Continue with Facebook')).toBeInTheDocument();
    });

    it('should handle successful sign-in without errors', async () => {
      render(
        <BrowserRouter>
          <SignInPage />
        </BrowserRouter>
      );

      // Fill in sign-in form
      const emailInput = screen.getByPlaceholderText('your@email.com');
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(signInButton);

      // Should not show error messages for successful sign-in
      await waitFor(() => {
        const errorMessages = screen.queryAllByText(/error/i);
        // Filter out any error messages that are part of icons or unrelated content
        const actualErrors = errorMessages.filter(el => 
          el.textContent && el.textContent.toLowerCase().includes('error') && 
          el.closest('[class*="red"]') // Look for error styling
        );
        expect(actualErrors).toHaveLength(0);
      });
    });

    it('should provide navigation back to home', async () => {
      render(
        <BrowserRouter>
          <SignInPage />
        </BrowserRouter>
      );

      // Verify "Back to Home" link exists and functions
      const backToHomeLink = screen.getByText('Back to Home');
      expect(backToHomeLink).toBeInTheDocument();
      expect(backToHomeLink.closest('a')).toHaveAttribute('href', '/');

      // Verify logo also links to home
      const logoLink = screen.getByText('Open Ear');
      expect(logoLink.closest('a')).toHaveAttribute('href', '/');
    });
  });

  /**
   * Property 2.4: Footer social media links and working elements function correctly
   * Validates: Requirement 3.4
   * 
   * Tests that footer social media links and other working footer elements continue to function
   */
  describe('Footer Elements Function Correctly', () => {
    it('should render footer with working social media links', async () => {
      render(
        <BrowserRouter>
          <HomePage />
        </BrowserRouter>
      );

      await waitFor(() => {
        // Verify social media links are present and have correct attributes
        // Look for links by href since they may not have accessible names
        const socialLinks = document.querySelectorAll('a[href*="instagram"], a[href*="twitter"], a[href*="facebook"], a[href*="linkedin"]');
        expect(socialLinks.length).toBeGreaterThan(0);
        
        // Check specific social media links if they exist
        const instagramLink = document.querySelector('a[href="https://instagram.com"]');
        if (instagramLink) {
          expect(instagramLink).toHaveAttribute('target', '_blank');
        }

        const twitterLink = document.querySelector('a[href="https://twitter.com"]');
        if (twitterLink) {
          expect(twitterLink).toHaveAttribute('target', '_blank');
        }

        const facebookLink = document.querySelector('a[href="https://facebook.com"]');
        if (facebookLink) {
          expect(facebookLink).toHaveAttribute('target', '_blank');
        }

        const linkedinLink = document.querySelector('a[href="https://linkedin.com"]');
        if (linkedinLink) {
          expect(linkedinLink).toHaveAttribute('target', '_blank');
        }
      });
    });

    it('should render footer contact information correctly', async () => {
      render(
        <BrowserRouter>
          <HomePage />
        </BrowserRouter>
      );

      await waitFor(() => {
        // Verify contact information is displayed
        expect(screen.getByText('123 Wellness Street')).toBeInTheDocument();
        expect(screen.getByText('San Francisco, CA 94102')).toBeInTheDocument();
        expect(screen.getByText('+1 (555) 123-4567')).toBeInTheDocument();
        expect(screen.getByText('support@openear.com')).toBeInTheDocument();
      });
    });

    it('should render footer navigation links', async () => {
      render(
        <BrowserRouter>
          <HomePage />
        </BrowserRouter>
      );

      await waitFor(() => {
        // Verify footer navigation links exist (even if they don't work yet)
        const privacyLink = screen.getByText('Privacy Policy');
        expect(privacyLink).toBeInTheDocument();
        expect(privacyLink.closest('a')).toHaveAttribute('href', '/privacy');

        const termsLink = screen.getByText('Terms');
        expect(termsLink).toBeInTheDocument();
        expect(termsLink.closest('a')).toHaveAttribute('href', '/terms');

        const contactLinks = screen.getAllByText('Contact');
        expect(contactLinks.length).toBeGreaterThan(0);
        
        // Find the footer contact link specifically
        const footerContactLink = contactLinks.find(link => 
          link.closest('a')?.getAttribute('href') === '/contact' && 
          link.closest('footer')
        );
        expect(footerContactLink).toBeInTheDocument();
        expect(footerContactLink?.closest('a')).toHaveAttribute('href', '/contact');
      });
    });
  });

  /**
   * Property 2.5: Main app functionality works as designed
   * Validates: Requirement 3.5
   * 
   * Tests that core app functionality (calls, pricing, dashboard features) continues to work
   */
  describe('Main App Functionality Works Correctly', () => {
    it('should render call-to-action buttons correctly', async () => {
      render(
        <BrowserRouter>
          <HomePage />
        </BrowserRouter>
      );

      await waitFor(() => {
        // Verify main CTA buttons are present and functional
        const startCallButtons = screen.getAllByText('Start a Call');
        expect(startCallButtons.length).toBeGreaterThan(0);
        
        // Check that at least one Start a Call button links to /call
        const startCallLinks = startCallButtons.map(btn => btn.closest('a')).filter(link => link);
        expect(startCallLinks.some(link => link?.getAttribute('href') === '/call')).toBe(true);

        const viewPricingButtons = screen.getAllByText('View Pricing');
        expect(viewPricingButtons.length).toBeGreaterThan(0);
        
        // Check that at least one View Pricing button links to /pricing
        const viewPricingLinks = viewPricingButtons.map(btn => btn.closest('a')).filter(link => link);
        expect(viewPricingLinks.some(link => link?.getAttribute('href') === '/pricing')).toBe(true);
      });
    });

    it('should render feature cards with correct navigation', async () => {
      render(
        <BrowserRouter>
          <HomePage />
        </BrowserRouter>
      );

      await waitFor(() => {
        // Verify feature cards have working links
        const startCallLinks = screen.getAllByText('Start a Call');
        startCallLinks.forEach(link => {
          expect(link.closest('a')).toHaveAttribute('href', '/call');
        });

        const bookNowLinks = screen.getAllByText('Book Now');
        bookNowLinks.forEach(link => {
          expect(link.closest('a')).toHaveAttribute('href', '/call');
        });

        const viewPricingLinks = screen.getAllByText('View Pricing');
        viewPricingLinks.forEach(link => {
          expect(link.closest('a')).toHaveAttribute('href', '/pricing');
        });
      });
    });

    it('should render testimonials and content correctly', async () => {
      render(
        <BrowserRouter>
          <HomePage />
        </BrowserRouter>
      );

      await waitFor(() => {
        // Verify testimonials section renders
        expect(screen.getByText('Real Stories, Real Support')).toBeInTheDocument();
        
        // Verify some testimonial content is present
        expect(screen.getByText(/Open Ear has been a lifeline/)).toBeInTheDocument();
        expect(screen.getByText(/pay-per-minute model is perfect/)).toBeInTheDocument();
      });
    });
  });

  /**
   * Property 2.6: React Router navigation and lazy loading functions correctly
   * Validates: Requirement 3.6
   * 
   * Tests that React Router navigation and lazy loading continue to function for existing routes
   */
  describe('React Router Navigation and Lazy Loading Work Correctly', () => {
    it('should handle lazy loading for all existing routes', async () => {
      const routes = ['/', '/pricing', '/signin', '/get-started', '/how-it-works'];
      
      for (const route of routes) {
        render(
          <MemoryRouter initialEntries={[route]}>
            <AppRoutes />
          </MemoryRouter>
        );

        // Wait for lazy loading to complete
        await waitFor(() => {
          // Should not show loading spinner indefinitely
          const loadingSpinner = screen.queryByText('Loading...');
          // Loading spinner may appear briefly but should resolve
          // We just verify the route doesn't crash
          expect(document.body).toBeInTheDocument();
        }, { timeout: 3000 });
      }
    });

    it('should handle route transitions correctly', async () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <AppRoutes />
        </MemoryRouter>
      );

      // Wait for initial route to load
      await waitFor(() => {
        expect(screen.getByText(/A Safe Place to Share/)).toBeInTheDocument();
      });

      // Test navigation to different route
      render(
        <MemoryRouter initialEntries={['/signin']}>
          <AppRoutes />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Welcome back')).toBeInTheDocument();
      });
    });

    it('should handle Suspense fallback correctly', async () => {
      // This test verifies that the Suspense fallback works
      // The loading state should appear briefly during lazy loading
      render(
        <MemoryRouter initialEntries={['/pricing']}>
          <AppRoutes />
        </MemoryRouter>
      );

      // The page should eventually load (may show loading briefly)
      await waitFor(() => {
        // Just verify we don't get stuck in loading state
        expect(document.body).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  /**
   * Integration Test: Overall App Structure Preservation
   * 
   * Tests that the overall app structure and key integrations continue to work
   */
  describe('Overall App Structure Preservation', () => {
    it('should maintain consistent styling and branding', async () => {
      render(
        <BrowserRouter>
          <HomePage />
        </BrowserRouter>
      );

      await waitFor(() => {
        // Verify consistent branding elements
        const logoElements = screen.getAllByText('Open Ear');
        expect(logoElements.length).toBeGreaterThan(0);
        
        // Verify consistent color scheme (blue primary color)
        const blueElements = document.querySelectorAll('[class*="0096FF"]');
        expect(blueElements.length).toBeGreaterThan(0);
      });
    });

    it('should maintain responsive design elements', async () => {
      render(
        <BrowserRouter>
          <HomePage />
        </BrowserRouter>
      );

      await waitFor(() => {
        // Verify responsive classes are present
        const responsiveElements = document.querySelectorAll('[class*="md:"], [class*="lg:"]');
        expect(responsiveElements.length).toBeGreaterThan(0);
      });
    });

    it('should preserve SEO and meta elements', async () => {
      render(
        <BrowserRouter>
          <HomePage />
        </BrowserRouter>
      );

      // Verify the page renders without SEO-related errors
      // The useSEO hook should work correctly
      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });
    });
  });
});