import { useState } from 'react';
import Navbar from '../../components/feature/Navbar';
import { apiFetch } from '../../lib/api';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    try {
      await apiFetch('/api/contact', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          subject: formData.subject,
          message: formData.message.trim(),
        }),
      });
      setIsSubmitted(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setSubmitError(
        err instanceof Error && err.message
          ? err.message
          : 'We could not send your message. Please try again or email us directly.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E6F5FF] via-white to-[#E6F5FF]">
      <Navbar />
      
      <div className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-[#2A2A2A] mb-4">
              Contact Us
            </h1>
            <p className="text-lg text-[#6B6B6B] max-w-2xl mx-auto">
              Have questions about our ebooks or need support? We're here to help you on your mental wellness journey.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Contact Info */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm p-8">
                <h2 className="text-xl font-semibold text-[#2A2A2A] mb-6">Get in Touch</h2>
                
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#E6F5FF] rounded-full flex items-center justify-center flex-shrink-0">
                      <i className="ri-mail-line text-[#0096FF] text-xl"></i>
                    </div>
                    <div>
                      <h3 className="font-medium text-[#2A2A2A] mb-1">Email Support</h3>
                      <p className="text-[#6B6B6B] text-sm mb-2">
                        Get help with your ebook purchases and downloads
                      </p>
                      <a href="mailto:support@openear.com" className="text-[#0096FF] hover:text-[#0077CC] transition-colors">
                        support@openear.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#E6F5FF] rounded-full flex items-center justify-center flex-shrink-0">
                      <i className="ri-question-line text-[#0096FF] text-xl"></i>
                    </div>
                    <div>
                      <h3 className="font-medium text-[#2A2A2A] mb-1">FAQ</h3>
                      <p className="text-[#6B6B6B] text-sm mb-2">
                        Find answers to common questions
                      </p>
                      <a href="#" className="text-[#0096FF] hover:text-[#0077CC] transition-colors">
                        View FAQ
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#E6F5FF] rounded-full flex items-center justify-center flex-shrink-0">
                      <i className="ri-time-line text-[#0096FF] text-xl"></i>
                    </div>
                    <div>
                      <h3 className="font-medium text-[#2A2A2A] mb-1">Response Time</h3>
                      <p className="text-[#6B6B6B] text-sm">
                        We typically respond within 24 hours
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Links */}
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <h3 className="font-medium text-[#2A2A2A] mb-4">Quick Links</h3>
                  <div className="space-y-2">
                    <a href="/library" className="block text-sm text-[#0096FF] hover:text-[#0077CC] transition-colors">
                      My Library
                    </a>
                    <a href="/purchase-history" className="block text-sm text-[#0096FF] hover:text-[#0077CC] transition-colors">
                      Purchase History
                    </a>
                    <a href="/ebook-store" className="block text-sm text-[#0096FF] hover:text-[#0077CC] transition-colors">
                      Browse Ebooks
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm p-8">
                {isSubmitted ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="ri-check-line text-2xl text-green-600"></i>
                    </div>
                    <h3 className="text-xl font-semibold text-[#2A2A2A] mb-2">
                      Message Sent Successfully!
                    </h3>
                    <p className="text-[#6B6B6B] mb-6">
                      Thank you for contacting us. We'll get back to you within 24 hours.
                    </p>
                    <button
                      onClick={() => setIsSubmitted(false)}
                      className="px-6 py-3 bg-[#0096FF] text-white rounded-lg hover:bg-[#0077CC] transition-colors"
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl font-semibold text-[#2A2A2A] mb-6">Send us a Message</h2>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-[#2A2A2A] mb-2">
                            Name *
                          </label>
                          <input
                            type="text"
                            name="name"
                            required
                            value={formData.name}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0096FF] focus:border-transparent"
                            placeholder="Your full name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#2A2A2A] mb-2">
                            Email *
                          </label>
                          <input
                            type="email"
                            name="email"
                            required
                            value={formData.email}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0096FF] focus:border-transparent"
                            placeholder="your.email@example.com"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[#2A2A2A] mb-2">
                          Subject *
                        </label>
                        <select
                          name="subject"
                          required
                          value={formData.subject}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0096FF] focus:border-transparent"
                        >
                          <option value="">Select a subject</option>
                          <option value="ebook-support">Ebook Download/Access Issues</option>
                          <option value="purchase-help">Purchase & Payment Help</option>
                          <option value="technical-issue">Technical Issues</option>
                          <option value="refund-request">Refund Request</option>
                          <option value="general-inquiry">General Inquiry</option>
                          <option value="feedback">Feedback & Suggestions</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[#2A2A2A] mb-2">
                          Message *
                        </label>
                        <textarea
                          name="message"
                          required
                          rows={6}
                          value={formData.message}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0096FF] focus:border-transparent resize-none"
                          placeholder="Please describe your question or issue in detail..."
                        />
                      </div>

                      {submitError && (
                        <div className="px-4 py-3 rounded-xl text-sm bg-red-50 border border-red-200 text-red-700 flex items-start gap-2" role="alert">
                          <i className="ri-error-warning-fill mt-0.5"></i>
                          <span>{submitError}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full px-6 py-3 bg-[#0096FF] text-white rounded-xl hover:bg-[#0077CC] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Sending...
                          </div>
                        ) : (
                          'Send Message'
                        )}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}