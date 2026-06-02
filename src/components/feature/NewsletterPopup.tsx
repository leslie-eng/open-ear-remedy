import { useState, useEffect } from 'react';

export default function NewsletterPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    // Check if user has already seen the popup
    const hasSeenPopup = localStorage.getItem('newsletter_popup_seen');
    
    if (!hasSeenPopup) {
      // Show popup after 3 seconds
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('newsletter_popup_seen', 'true');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const formData = new URLSearchParams();
      formData.append('email', email);

      const response = await fetch('https://readdy.ai/api/form/d5flh7aeekkptfh8l100', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (response.ok) {
        setSubmitStatus('success');
        setEmail('');
        localStorage.setItem('newsletter_popup_seen', 'true');
        
        // Close popup after 2 seconds
        setTimeout(() => {
          setIsVisible(false);
        }, 2000);
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 transition-opacity duration-300"
        onClick={handleClose}
      />

      {/* Popup */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative pointer-events-auto transform transition-all duration-300 scale-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            aria-label="Close popup"
          >
            <i className="ri-close-line text-2xl"></i>
          </button>

          {/* Icon */}
          <div className="w-16 h-16 flex items-center justify-center bg-teal-100 rounded-full mx-auto mb-4">
            <i className="ri-mail-line text-3xl text-teal-600"></i>
          </div>

          {/* Content */}
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Stay Connected
          </h2>
          <p className="text-gray-600 text-center mb-6">
            Get exclusive mental health tips, updates, and special offers delivered to your inbox.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} data-readdy-form id="newsletter-popup-form">
            <div className="mb-4">
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                required
                disabled={isSubmitting || submitStatus === 'success'}
              />
            </div>

            {/* Status Messages */}
            {submitStatus === 'success' && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <i className="ri-checkbox-circle-fill text-green-600"></i>
                <span className="text-sm text-green-800">Successfully subscribed! Thank you.</span>
              </div>
            )}

            {submitStatus === 'error' && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <i className="ri-error-warning-fill text-red-600"></i>
                <span className="text-sm text-red-800">Please enter a valid email address.</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || submitStatus === 'success'}
              className="w-full bg-teal-600 text-white py-3 rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <i className="ri-loader-4-line animate-spin"></i>
                  Subscribing...
                </span>
              ) : submitStatus === 'success' ? (
                <span className="flex items-center justify-center gap-2">
                  <i className="ri-check-line"></i>
                  Subscribed!
                </span>
              ) : (
                'Subscribe Now'
              )}
            </button>
          </form>

          {/* Privacy Note */}
          <p className="text-xs text-gray-500 text-center mt-4">
            We respect your privacy. Unsubscribe anytime.
          </p>

          {/* Trust Badges */}
          <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <i className="ri-shield-check-line text-teal-600"></i>
              <span>Secure</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <i className="ri-spam-2-line text-teal-600"></i>
              <span>No Spam</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <i className="ri-lock-line text-teal-600"></i>
              <span>Private</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
