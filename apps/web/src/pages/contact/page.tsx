import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import SiteFooter from '../../components/feature/SiteFooter';
import { siteConfig } from '../../config/site';
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

  const inputClass =
    'w-full rounded-xl border border-oe-line bg-oe-surface-low px-4 py-3 text-oe-ink focus:border-oe-primary focus:outline-none focus:ring-2 focus:ring-oe-primary/30';

  return (
    <div className="min-h-screen bg-oe-bg text-oe-ink">
      <Navbar />

      <main className="oe-route mx-auto max-w-[1120px] px-5 pb-20 pt-28 md:px-8">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-oe-primary-soft px-3 py-1 text-xs font-medium uppercase tracking-wide text-oe-primary-deep">
          <i className="ri-mail-line" aria-hidden="true" /> Contact
        </p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">Get in touch</h1>
        <p className="mt-3 max-w-2xl text-lg text-oe-muted">
          Questions about your account, credits, a payment or an ebook? Send us a note and a person will reply.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {/* Contact info */}
          <aside className="space-y-4 lg:col-span-1">
            <div className="rounded-3xl border border-oe-line bg-white p-6">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-oe-primary-soft text-oe-primary-deep">
                    <i className="ri-mail-line" />
                  </span>
                  <div>
                    <h2 className="font-sans text-base font-semibold">Email us</h2>
                    <p className="mt-1 text-sm text-oe-muted">For accounts, payments and ebooks</p>
                    <a
                      href="mailto:support@openearemedy.com"
                      className="oe-link mt-1 inline-block text-sm font-semibold text-oe-primary hover:text-oe-primary-hover"
                    >
                      support@openearemedy.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-oe-primary-soft text-oe-primary-deep">
                    <i className="ri-question-line" />
                  </span>
                  <div>
                    <h2 className="font-sans text-base font-semibold">Common questions</h2>
                    <p className="mt-1 text-sm text-oe-muted">How talking, booking and paying work</p>
                    <Link
                      to="/how-it-works"
                      className="oe-link mt-1 inline-block text-sm font-semibold text-oe-primary hover:text-oe-primary-hover"
                    >
                      Read how it works
                    </Link>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-oe-accent-tint text-oe-accent">
                    <i className="ri-time-line" />
                  </span>
                  <div>
                    <h2 className="font-sans text-base font-semibold">Reply time</h2>
                    <p className="mt-1 text-sm text-oe-muted">We usually reply within 24 hours</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-oe-surface-low p-4">
                <h2 className="font-sans text-sm font-semibold">Quick links</h2>
                <ul className="mt-2 space-y-1.5 text-sm">
                  <li>
                    <Link to="/library" className="oe-link text-oe-primary hover:text-oe-primary-hover">
                      My library
                    </Link>
                  </li>
                  <li>
                    <Link to="/purchase-history" className="oe-link text-oe-primary hover:text-oe-primary-hover">
                      Purchase history
                    </Link>
                  </li>
                  <li>
                    <Link to="/ebook-store" className="oe-link text-oe-primary hover:text-oe-primary-hover">
                      Browse ebooks
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            <p className="rounded-2xl border border-oe-crisis/30 bg-oe-crisis-tint px-5 py-4 text-sm text-oe-crisis">
              <i className="ri-alarm-warning-line mr-1.5" aria-hidden="true" />
              This form is not watched around the clock. If you are in danger, call{' '}
              <a href="tel:999" className="font-semibold underline">999</a> or{' '}
              <a href="tel:112" className="font-semibold underline">112</a>, or see{' '}
              <Link to={siteConfig.crisisPath} className="font-semibold underline">
                Crisis help
              </Link>
              .
            </p>
          </aside>

          {/* Contact form */}
          <section aria-labelledby="contact-form-heading" className="lg:col-span-2">
            <div className="rounded-3xl border border-oe-line bg-white p-6 md:p-8">
              {isSubmitted ? (
                <div className="py-10 text-center" role="status">
                  <span aria-hidden="true" className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-oe-primary-soft text-2xl text-oe-primary-deep">
                    <i className="ri-check-line" />
                  </span>
                  <h2 id="contact-form-heading" className="mt-4 text-2xl font-semibold">
                    Message sent
                  </h2>
                  <p className="mt-2 text-oe-muted">Thank you for writing to us. We&rsquo;ll get back to you within 24 hours.</p>
                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="oe-btn mt-6 cursor-pointer rounded-full bg-oe-surface px-6 py-3 font-semibold text-oe-ink"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <>
                  <h2 id="contact-form-heading" className="text-2xl font-semibold">
                    Send us a message
                  </h2>

                  <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <label htmlFor="contact-name" className="mb-2 block text-sm font-medium">
                          Name *
                        </label>
                        <input
                          id="contact-name"
                          type="text"
                          name="name"
                          required
                          value={formData.name}
                          onChange={handleInputChange}
                          className={inputClass}
                          placeholder="What should we call you?"
                        />
                      </div>
                      <div>
                        <label htmlFor="contact-email" className="mb-2 block text-sm font-medium">
                          Email *
                        </label>
                        <input
                          id="contact-email"
                          type="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleInputChange}
                          className={inputClass}
                          placeholder="your.email@example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="contact-subject" className="mb-2 block text-sm font-medium">
                        Subject *
                      </label>
                      <select
                        id="contact-subject"
                        name="subject"
                        required
                        value={formData.subject}
                        onChange={handleInputChange}
                        className={inputClass}
                      >
                        <option value="">Select a subject</option>
                        <option value="conversation-help">Calls, text chats or bookings</option>
                        <option value="purchase-help">Credits, Monthly Pass or payments</option>
                        <option value="ebook-support">Ebook download or access</option>
                        <option value="technical-issue">Something isn&rsquo;t working</option>
                        <option value="refund-request">Refund request</option>
                        <option value="general-inquiry">General question</option>
                        <option value="feedback">Feedback and ideas</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="contact-message" className="mb-2 block text-sm font-medium">
                        Message *
                      </label>
                      <textarea
                        id="contact-message"
                        name="message"
                        required
                        rows={6}
                        value={formData.message}
                        onChange={handleInputChange}
                        className={`${inputClass} resize-none`}
                        placeholder="Tell us what's going on..."
                      />
                    </div>

                    {submitError && (
                      <div className="flex items-start gap-2 rounded-2xl bg-oe-crisis-tint px-5 py-3 text-sm text-oe-crisis" role="alert">
                        <i className="ri-error-warning-line mt-0.5" aria-hidden="true" />
                        <span>{submitError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="oe-btn w-full cursor-pointer rounded-full bg-oe-primary px-6 py-3.5 font-semibold text-white hover:bg-oe-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Sending...
                        </span>
                      ) : (
                        'Send message'
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
