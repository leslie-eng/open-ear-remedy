import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';

const HomePage = lazy(() => import('../pages/home/page'));
const PricingPage = lazy(() => import('../pages/pricing/page'));
const DashboardPage = lazy(() => import('../pages/dashboard/page'));
const CallPage = lazy(() => import('../pages/call/page'));
const ChatPage = lazy(() => import('../pages/chat/page'));
const HowItWorksPage = lazy(() => import('../pages/how-it-works/page'));
const AdminLoginPage = lazy(() => import('../pages/admin-login/page'));
const AdminDashboardPage = lazy(() => import('../pages/admin-dashboard/page'));
const SignInPage = lazy(() => import('../pages/signin/page'));
const GetStartedPage = lazy(() => import('../pages/get-started/page'));
const ProfilePage = lazy(() => import('../pages/profile/page'));
const PrivacyPage = lazy(() => import('../pages/privacy/page'));
const TermsPage = lazy(() => import('../pages/terms/page'));
const MoodTrackerPage = lazy(() => import('../pages/mood-tracker/page'));
const ForgotPasswordPage = lazy(() => import('../pages/forgot-password/page'));
const ResetPasswordPage = lazy(() => import('../pages/reset-password/page'));
const EbookStorePage = lazy(() => import('../pages/ebook-store/page'));
const EbookDetailPage = lazy(() => import('../pages/ebook-detail/page'));
const CartPage = lazy(() => import('../pages/cart/page'));
const LibraryPage = lazy(() => import('../pages/library/page'));
const PurchaseHistoryPage = lazy(() => import('../pages/purchase-history/page'));
const CheckoutPage = lazy(() => import('../pages/checkout/page'));
const CheckoutSuccessPage = lazy(() => import('../pages/checkout/success'));
const ContactPage = lazy(() => import('../pages/contact/page'));
const AboutPage = lazy(() => import('../pages/about/page'));
const EbookManagementPage = lazy(() => import('../pages/admin/ebook-management/page'));
const NotFound = lazy(() => import('../pages/NotFound'));

const routes: RouteObject[] = [
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/pricing',
    element: <PricingPage />,
  },
  {
    path: '/dashboard',
    element: <DashboardPage />,
  },
  {
    path: '/call',
    element: <CallPage />,
  },
  {
    path: '/chat',
    element: <ChatPage />,
  },
  {
    path: '/how-it-works',
    element: <HowItWorksPage />,
  },
  {
    path: '/admin-login',
    element: <AdminLoginPage />,
  },
  {
    path: '/admin-dashboard',
    element: <AdminDashboardPage />,
  },
  {
    path: '/signin',
    element: <SignInPage />,
  },
  {
    path: '/get-started',
    element: <GetStartedPage />,
  },
  {
    path: '/profile',
    element: <ProfilePage />,
  },
  {
    path: '/privacy',
    element: <PrivacyPage />,
  },
  {
    path: '/terms',
    element: <TermsPage />,
  },
  {
    path: '/mood-tracker',
    element: <MoodTrackerPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },
  {
    path: '/ebook-store',
    element: <EbookStorePage />,
  },
  {
    path: '/ebook/:id',
    element: <EbookDetailPage />,
  },
  {
    path: '/cart',
    element: <CartPage />,
  },
  {
    path: '/library',
    element: <LibraryPage />,
  },
  {
    path: '/purchase-history',
    element: <PurchaseHistoryPage />,
  },
  {
    path: '/checkout',
    element: <CheckoutPage />,
  },
  {
    path: '/checkout/success',
    element: <CheckoutSuccessPage />,
  },
  {
    path: '/contact',
    element: <ContactPage />,
  },
  {
    path: '/about',
    element: <AboutPage />,
  },
  {
    path: '/admin/ebook-management',
    element: <EbookManagementPage />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
];

export default routes;
