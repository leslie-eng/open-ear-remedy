import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import HomePage from '../pages/home/page';
import SignInPage from '../pages/signin/page';
import { AppRoutes } from '../router';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: null } }),
      signUp: () => Promise.resolve({ 
        data: { user: { id: '123', email: 'test@example.com' } }, 
        error: null 
      }),
      signInWithPassword: () => Promise.resolve({ 
        data: { user: { id: '123', email: 'test@example.com' } }, 
        error: null 
      }),
      signInWithOAuth: () => Promise.resolve({ error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null }),
        }),
      }),
    }),
  }),
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
 * Bug Condition Exploration Test
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bugs exist
 * 
 * This test encodes the expected behavior from the design document.
 * When this test passes after fixes are implemented, it confirms the bugs are resolved.
 * 
 * The test checks for 6 specific bug conditions:
 * 1. Missing About page (expect 404 on unfixed code)
 * 2. Missing Contact page (expect 404 on unfixed code) 
 * 3. Footer links not scrolling to top (expect no scroll behavior on unfixed code)
 * 4. Poor Sign In navigation (expect limited options on unfixed code)
 * 5. Registration error messages (expect error messages on unfixed code)
 * 6. Incorrect copyright year (expect 2024 on unfixed code)
 */
describe('Bug Condition Exploration - Missing Pages and Navigation Issues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window.scrollTo mock
    window.scrollTo = vi.fn();
  });

  /**
   * Bug 1: Missing About Page
   * Expected on unfixed code: 404 error when navigating to /about
   * Expected after fix: About page loads with company information
   */
  it('should load About page with company information', async () => {
    render(
      <MemoryRouter initialEntries={['/about']}>
        <AppRoutes />
      </MemoryRouter>
    );

    // After fix: Should find About page content
    // On unfixed code: This will fail because About page doesn't exist
    await waitFor(() => {
      expect(screen.getByText('Our Mission')).toBeInTheDocument();
      expect(screen.getByText(/founded on the belief/i)).toBeInTheDocument();
    });
  });

  /**
   * Bug 2: Missing Contact Page  
   * Expected on unfixed code: 404 error when navigating to /contact
   * Expected after fix: Contact page loads with contact information
   */
  it('should load Contact page with contact information', async () => {
    render(
      <MemoryRouter initialEntries={['/contact']}>
        <AppRoutes />
      </MemoryRouter>
    );

    // After fix: Should find Contact page content
    // On unfixed code: This will fail because Contact page doesn't exist
    await waitFor(() => {
      expect(screen.getByText('We\'re Here to Help')).toBeInTheDocument();
      expect(screen.getByText('Get in Touch')).toBeInTheDocument();
    });
  });

  /**
   * Bug 3: Footer Links Navigation Behavior
   * Expected on unfixed code: Footer links don't scroll to top of target pages
   * Expected after fix: Footer links navigate and scroll to top
   */
  it('should scroll to top when clicking footer Privacy/Terms links', async () => {
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    // Find footer Privacy link
    const privacyLink = screen.getByText('Privacy Policy');
    expect(privacyLink).toBeInTheDocument();

    // Click the link
    fireEvent.click(privacyLink);

    // After fix: Should scroll to top
    // On unfixed code: This will fail because scroll behavior is not implemented
    await waitFor(() => {
      expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    });
  });

  /**
   * Bug 4: Sign In Page Navigation Options
   * Expected on unfixed code: Limited navigation options (only small "Back to Home" link)
   * Expected after fix: Improved navigation with prominent options
   */
  it('should provide clear navigation options on Sign In page', async () => {
    render(
      <BrowserRouter>
        <SignInPage />
      </BrowserRouter>
    );

    // After fix: Should have prominent navigation options
    // On unfixed code: This will fail because navigation is limited
    const backToHomeLink = screen.getByText('Back to Home');
    expect(backToHomeLink).toBeInTheDocument();
    
    // Check for improved navigation (this will fail on unfixed code)
    const logoLink = screen.getByText('Open Ear');
    expect(logoLink.closest('a')).toHaveAttribute('href', '/');
    
    // The navigation should be more prominent than just a small link
    const navigationElement = backToHomeLink.closest('div');
    expect(navigationElement).toHaveClass('text-center'); // Should be centered and prominent
  });

  /**
   * Bug 5: Registration Success Messaging
   * Expected on unfixed code: Error messages appear despite successful registration
   * Expected after fix: Clear success messaging without error messages
   */
  it('should show appropriate success messaging without errors during registration', async () => {
    render(
      <BrowserRouter>
        <SignInPage />
      </BrowserRouter>
    );

    // Switch to sign up mode
    const signUpButton = screen.getByText('Sign Up');
    fireEvent.click(signUpButton);

    // Fill out registration form
    const nameInput = screen.getByPlaceholderText('Enter your full name');
    const emailInput = screen.getByPlaceholderText('your@email.com');
    const passwordInput = screen.getByPlaceholderText(/Create a password/);
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm your password');

    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });

    // Submit form
    const createAccountButton = screen.getByRole('button', { name: 'Create Account' });
    fireEvent.click(createAccountButton);

    // After fix: Should show success message without error styling
    // On unfixed code: This will fail because error messages appear despite success
    await waitFor(() => {
      const successMessage = screen.getByText(/Account created/);
      expect(successMessage).toBeInTheDocument();
      
      // Should not have error messages when registration succeeds
      const errorElements = screen.queryAllByText(/error/i);
      expect(errorElements).toHaveLength(0);
    });
  });

  /**
   * Bug 6: Copyright Year in Footer
   * Expected on unfixed code: Shows "© 2024" instead of current year
   * Expected after fix: Shows "© 2026" (current year)
   */
  it('should display correct copyright year 2026 in footer', async () => {
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    // After fix: Should show 2026
    // On unfixed code: This will fail because it shows 2024
    await waitFor(() => {
      expect(screen.getByText(/© 2026 Open Ear/)).toBeInTheDocument();
    });
  });

  /**
   * Integration test: Navigation menu should include About and Contact links
   * Expected on unfixed code: Navigation menu missing About and Contact links
   * Expected after fix: Navigation menu includes all page links
   */
  it('should include About and Contact links in navigation menu', async () => {
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    // After fix: Should find About and Contact links in navigation
    // On unfixed code: This will fail because links are missing from navigation
    await waitFor(() => {
      const aboutLinks = screen.getAllByText('About');
      const contactLinks = screen.getAllByText('Contact');
      
      // Should have at least one About link in navigation
      expect(aboutLinks.length).toBeGreaterThan(0);
      // Should have at least one Contact link in navigation  
      expect(contactLinks.length).toBeGreaterThan(0);
      
      // Verify they are navigation links (have href attributes)
      const aboutNavLink = aboutLinks.find(link => link.closest('a')?.getAttribute('href') === '/about');
      const contactNavLink = contactLinks.find(link => link.closest('a')?.getAttribute('href') === '/contact');
      
      expect(aboutNavLink).toBeInTheDocument();
      expect(contactNavLink).toBeInTheDocument();
    });
  });
});