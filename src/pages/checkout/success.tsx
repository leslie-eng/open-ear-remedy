import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';

export default function CheckoutSuccessPage() {
  useEffect(() => {
    // Scroll to top on page load
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E6F5FF] via-white to-[#E6F5FF]">
      <Navbar />
      
      <div className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="text-center">
            {/* Success Icon */}
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8">
              <i className="ri-check-line text-4xl text-green-600"></i>
            </div>

            {/* Success Message */}
            <h1 className="text-3xl md:text-4xl font-bold text-[#2A2A2A] mb-4">
              Purchase Successful!
            </h1>
            <p className="text-lg text-[#6B6B6B] mb-8 max-w-2xl mx-auto">
              Thank you for your purchase! Your ebooks have been added to your library and you should receive a confirmation email shortly.
            </p>

            {/* Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 max-w-2xl mx-auto">
              <Link
                to="/library"
                className="bg-white rounded-xl shadow-sm p-8 hover:shadow-md transition-shadow text-center group"
              >
                <div className="w-16 h-16 bg-[#E6F5FF] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-[#D6EFFF] transition-colors">
                  <i className="ri-book-open-line text-2xl text-[#0096FF]"></i>
                </div>
                <h3 className="text-lg font-semibold text-[#2A2A2A] mb-2">
                  Access Your Library
                </h3>
                <p className="text-sm text-[#6B6B6B]">
                  Download and read your purchased ebooks
                </p>
              </Link>

              <Link
                to="/ebook-store"
                className="bg-white rounded-xl shadow-sm p-8 hover:shadow-md transition-shadow text-center group"
              >
                <div className="w-16 h-16 bg-[#E6F5FF] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-[#D6EFFF] transition-colors">
                  <i className="ri-shopping-bag-line text-2xl text-[#0096FF]"></i>
                </div>
                <h3 className="text-lg font-semibold text-[#2A2A2A] mb-2">
                  Continue Shopping
                </h3>
                <p className="text-sm text-[#6B6B6B]">
                  Discover more mental wellness ebooks
                </p>
              </Link>
            </div>

            {/* Order Details */}
            <div className="bg-white rounded-xl shadow-sm p-8 max-w-2xl mx-auto">
              <h2 className="text-xl font-semibold text-[#2A2A2A] mb-6">What happens next?</h2>
              
              <div className="space-y-4 text-left">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i className="ri-mail-line text-green-600"></i>
                  </div>
                  <div>
                    <h4 className="font-medium text-[#2A2A2A] mb-1">
                      Confirmation Email
                    </h4>
                    <p className="text-sm text-[#6B6B6B]">
                      You'll receive a confirmation email with your purchase details and download instructions.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i className="ri-download-line text-blue-600"></i>
                  </div>
                  <div>
                    <h4 className="font-medium text-[#2A2A2A] mb-1">
                      Instant Access
                    </h4>
                    <p className="text-sm text-[#6B6B6B]">
                      Your ebooks are now available in your library for unlimited downloads.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i className="ri-customer-service-line text-purple-600"></i>
                  </div>
                  <div>
                    <h4 className="font-medium text-[#2A2A2A] mb-1">
                      Support Available
                    </h4>
                    <p className="text-sm text-[#6B6B6B]">
                      Need help? Our support team is here to assist you with any questions.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Actions */}
            <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/purchase-history"
                className="inline-flex items-center gap-2 px-6 py-3 border border-[#0096FF] text-[#0096FF] rounded-lg hover:bg-[#E6F5FF] transition-colors"
              >
                <i className="ri-history-line"></i>
                View Purchase History
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-[#6B6B6B] rounded-lg hover:bg-gray-50 transition-colors"
              >
                <i className="ri-customer-service-line"></i>
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}