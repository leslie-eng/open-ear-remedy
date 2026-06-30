import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./router";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import NewsletterPopup from "./components/feature/NewsletterPopup";
import { CartProvider } from "./contexts/CartContext";
import { Suspense, useEffect } from "react";

function App() {
  useEffect(() => {
    // Navigate to admin login page
    if (window.location.pathname === '/signin') {
      window.REACT_APP_NAVIGATE?.('/admin-login');
    }
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <CartProvider>
        <BrowserRouter basename={__BASE_PATH__}>
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E6F5FF] via-white to-[#E6F5FF]">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-[#0096FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-[#6B6B6B] font-medium">Loading...</p>
              </div>
            </div>
          }>
            <AppRoutes />
          </Suspense>
          <NewsletterPopup />
        </BrowserRouter>
      </CartProvider>
    </I18nextProvider>
  );
}

export default App;
