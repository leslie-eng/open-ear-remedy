import { Link } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import { useCart } from '../../contexts/CartContext';
import { formatMoney } from '../../lib/api';

export default function CartPage() {
  const { items, removeItem, totalItems, totalPrice } = useCart();
  const currency = items[0]?.ebook.currency || 'USD';

  return (
    <div className="min-h-screen bg-oe-bg">
      <Navbar />
      
      <div className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-oe-ink mb-2">
              Shopping Cart
            </h1>
            <p className="text-oe-muted">
              {items.length > 0 
                ? `${totalItems} item${totalItems !== 1 ? 's' : ''} in your cart`
                : 'Your cart is empty'
              }
            </p>
          </div>

          {items.length === 0 ? (
            /* Empty Cart */
            <div className="text-center py-16">
              <div className="bg-white rounded-xl shadow-sm p-12 max-w-md mx-auto">
                <i className="ri-shopping-cart-line text-6xl text-oe-muted mb-4"></i>
                <h3 className="text-xl font-semibold text-oe-ink mb-2">Your cart is empty</h3>
                <p className="text-oe-muted mb-6">
                  Discover our collection of mental wellness ebooks to get started.
                </p>
                <Link
                  to="/ebook-store"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-oe-primary text-white rounded-lg hover:bg-oe-primary-hover transition-colors"
                >
                  <i className="ri-book-line"></i>
                  Browse Ebooks
                </Link>
              </div>
            </div>
          ) : (
            /* Cart with Items */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                {items.map(item => (
                  <div key={item.ebook.id} className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex gap-4">
                      {/* Cover Image */}
                      <div className="w-20 h-28 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {item.ebook.cover_image_url ? (
                          <img src={item.ebook.cover_image_url} alt={item.ebook.title} className="w-full h-full object-cover" />
                        ) : (
                          <i className="ri-book-line text-2xl text-oe-muted"></i>
                        )}
                      </div>

                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 min-w-0 pr-4">
                            <h3 className="font-semibold text-oe-ink mb-1 line-clamp-2">
                              {item.ebook.title}
                            </h3>
                            {item.ebook.author && (
                              <p className="text-sm text-oe-muted mb-2">
                                by {item.ebook.author}
                              </p>
                            )}
                            {item.ebook.file_format && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs bg-oe-primary-tint text-oe-primary px-2 py-1 rounded-full">
                                  {item.ebook.file_format}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {/* Remove Button */}
                          <button
                            onClick={() => removeItem(item.ebook.id)}
                            className="text-red-500 hover:text-red-700 transition-colors p-1"
                            title="Remove from cart"
                          >
                            <i className="ri-delete-bin-line text-lg"></i>
                          </button>
                        </div>

                        {/* Price and Quantity */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-oe-muted">Qty: {item.quantity}</span>
                          </div>
                          <span className="text-lg font-bold text-oe-primary">
                            {formatMoney(item.ebook.price, item.ebook.currency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Continue Shopping */}
                <div className="pt-4">
                  <Link
                    to="/ebook-store"
                    className="inline-flex items-center gap-2 text-oe-primary hover:text-oe-primary-hover transition-colors"
                  >
                    <i className="ri-arrow-left-line"></i>
                    Continue Shopping
                  </Link>
                </div>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
                  <h2 className="text-xl font-semibold text-oe-ink mb-6">Order Summary</h2>
                  
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between text-oe-muted">
                      <span>Subtotal ({totalItems} items)</span>
                      <span>{formatMoney(totalPrice, currency)}</span>
                    </div>
                    <div className="flex justify-between text-oe-muted">
                      <span>Tax</span>
                      <span>{formatMoney(0, currency)}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex justify-between text-lg font-semibold text-oe-ink">
                        <span>Total</span>
                        <span>{formatMoney(totalPrice, currency)}</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    to="/checkout"
                    className="block w-full px-6 py-3 bg-oe-primary text-white rounded-lg hover:bg-oe-primary-hover transition-colors font-medium mb-4 text-center"
                  >
                    Proceed to Checkout
                  </Link>

                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 text-sm text-oe-muted mb-2">
                      <i className="ri-shield-check-line text-forest-600"></i>
                      <span>Secure checkout</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-sm text-oe-muted">
                      <i className="ri-download-line text-oe-primary"></i>
                      <span>Instant digital delivery</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}