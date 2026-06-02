import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import { useCart } from '../../contexts/CartContext';

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    zipCode: '',
    country: 'US'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setPaymentError('');

    try {
      // Demo-only delay (production ebook checkout would use Paystack or another PSP)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate random payment success/failure for demo
      const isSuccess = Math.random() > 0.1; // 90% success rate
      
      if (!isSuccess) {
        setPaymentError('Your card was declined. Please try a different payment method.');
        return;
      }

      // Payment successful - add items to user's library
      const purchasedItems = items.map(item => ({
        id: item.ebook.id,
        title: item.ebook.title,
        author: item.ebook.author,
        file_format: item.ebook.file_format,
        file_size: 2.5 * 1024 * 1024, // Default size
        purchase_date: new Date().toISOString().split('T')[0],
        download_count: 0,
        cover_image_url: item.ebook.cover_image_url
      }));

      // Save to localStorage (in production, this would be saved to database)
      const existingLibrary = JSON.parse(localStorage.getItem('user-library') || '[]');
      const updatedLibrary = [...existingLibrary, ...purchasedItems];
      localStorage.setItem('user-library', JSON.stringify(updatedLibrary));

      // Clear cart and redirect to success page
      clearCart();
      navigate('/checkout/success');
      
    } catch (error: any) {
      console.error('Payment error:', error);
      setPaymentError('Payment processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#E6F5FF] via-white to-[#E6F5FF]">
        <Navbar />
        <div className="pt-24 pb-16">
          <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
            <div className="text-center py-16">
              <div className="bg-white rounded-xl shadow-sm p-12 max-w-md mx-auto">
                <i className="ri-shopping-cart-line text-6xl text-[#6B6B6B] mb-4"></i>
                <h3 className="text-xl font-semibold text-[#2A2A2A] mb-2">Your cart is empty</h3>
                <p className="text-[#6B6B6B] mb-6">
                  Add some ebooks to your cart before proceeding to checkout.
                </p>
                <Link
                  to="/ebook-store"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#0096FF] text-white rounded-lg hover:bg-[#0077CC] transition-colors"
                >
                  <i className="ri-book-line"></i>
                  Browse Ebooks
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E6F5FF] via-white to-[#E6F5FF]">
      <Navbar />
      
      <div className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-[#2A2A2A] mb-2">
              Checkout
            </h1>
            <p className="text-[#6B6B6B]">
              Complete your purchase to get instant access to your ebooks
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Checkout Form */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-8">
                <h2 className="text-xl font-semibold text-[#2A2A2A] mb-6">Billing Information</h2>
                
                {/* Payment Error */}
                {paymentError && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex items-center gap-2">
                      <i className="ri-error-warning-line text-red-600"></i>
                      <p className="text-red-700 text-sm">{paymentError}</p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-[#2A2A2A] mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      required
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0096FF] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#2A2A2A] mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      required
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0096FF] focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-[#2A2A2A] mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0096FF] focus:border-transparent"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-[#2A2A2A] mb-2">
                    Address *
                  </label>
                  <input
                    type="text"
                    name="address"
                    required
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0096FF] focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div>
                    <label className="block text-sm font-medium text-[#2A2A2A] mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      name="city"
                      required
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0096FF] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#2A2A2A] mb-2">
                      ZIP Code *
                    </label>
                    <input
                      type="text"
                      name="zipCode"
                      required
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0096FF] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#2A2A2A] mb-2">
                      Country *
                    </label>
                    <select
                      name="country"
                      required
                      value={formData.country}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0096FF] focus:border-transparent"
                    >
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="UK">United Kingdom</option>
                      <option value="AU">Australia</option>
                    </select>
                  </div>
                </div>

                {/* Payment Section */}
                <div className="border-t border-gray-200 pt-8">
                  <h3 className="text-lg font-semibold text-[#2A2A2A] mb-4">Payment Method</h3>
                  <div className="bg-[#E6F5FF] rounded-xl p-6 text-center">
                    <i className="ri-secure-payment-line text-4xl text-[#0096FF] mb-2"></i>
                    <p className="text-[#0096FF] font-medium mb-1">Secure Payment Processing</p>
                    <p className="text-sm text-[#6B6B6B]">
                      Payments are processed securely via Paystack when checkout is connected
                    </p>
                  </div>
                </div>
              </form>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
                <h2 className="text-xl font-semibold text-[#2A2A2A] mb-6">Order Summary</h2>
                
                {/* Items */}
                <div className="space-y-4 mb-6">
                  {items.map(item => (
                    <div key={item.ebook.id} className="flex gap-3">
                      <div className="w-12 h-16 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                        <i className="ri-book-line text-[#6B6B6B]"></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-[#2A2A2A] text-sm line-clamp-2">
                          {item.ebook.title}
                        </h4>
                        <p className="text-xs text-[#6B6B6B]">
                          by {item.ebook.author}
                        </p>
                        <p className="text-sm font-semibold text-[#0096FF] mt-1">
                          ${item.ebook.price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="space-y-3 mb-6 pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-[#6B6B6B]">
                    <span>Subtotal</span>
                    <span>${totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#6B6B6B]">
                    <span>Tax</span>
                    <span>$0.00</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold text-[#2A2A2A] pt-3 border-t border-gray-200">
                    <span>Total</span>
                    <span>${totalPrice.toFixed(2)}</span>
                  </div>
                </div>

                {/* Checkout Button */}
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={isProcessing}
                  onClick={handleSubmit}
                  className="w-full px-6 py-3 bg-[#0096FF] text-white rounded-lg hover:bg-[#0077CC] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </div>
                  ) : (
                    `Complete Purchase - $${totalPrice.toFixed(2)}`
                  )}
                </button>

                {/* Security Info */}
                <div className="mt-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-sm text-[#6B6B6B] mb-2">
                    <i className="ri-shield-check-line text-green-600"></i>
                    <span>256-bit SSL encryption</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-[#6B6B6B]">
                    <i className="ri-download-line text-[#0096FF]"></i>
                    <span>Instant digital delivery</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}