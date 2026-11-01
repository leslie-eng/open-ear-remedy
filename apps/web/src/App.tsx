import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./router";
import { CartProvider } from "./contexts/CartContext";
import { AuthProvider } from "./contexts/AuthContext";
import { Suspense } from "react";

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter basename={__BASE_PATH__}>
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-oe-bg">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-oe-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-oe-muted font-medium">Loading...</p>
              </div>
            </div>
          }>
            <AppRoutes />
          </Suspense>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
