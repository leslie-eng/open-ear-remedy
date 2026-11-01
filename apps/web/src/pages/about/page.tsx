import Navbar from '../../components/feature/Navbar';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-oe-bg">
      <Navbar />
      
      <div className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-6 md:px-12 lg:px-20">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-oe-ink mb-4">
              About Open Ear
            </h1>
            <p className="text-lg text-oe-muted max-w-2xl mx-auto">
              Your trusted companion for emotional support and mental wellness resources.
            </p>
          </div>

          {/* Content */}
          <div className="bg-white rounded-xl shadow-sm p-8 md:p-12">
            <div className="prose prose-gray max-w-none">
              <h2 className="text-2xl font-semibold text-oe-ink mb-4">Our Mission</h2>
              <p className="text-oe-muted leading-relaxed mb-6">
                At Open Ear, we believe that everyone deserves access to quality mental health resources and emotional support. 
                Our platform combines AI-powered assistance with carefully curated educational content to help you on your 
                journey toward better mental wellness.
              </p>

              <h2 className="text-2xl font-semibold text-oe-ink mb-4">What We Offer</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-oe-primary-tint rounded-xl p-6">
                  <div className="w-12 h-12 bg-oe-primary rounded-full flex items-center justify-center mb-4">
                    <i className="ri-phone-line text-white text-xl"></i>
                  </div>
                  <h3 className="font-semibold text-oe-ink mb-2">AI Support Calls</h3>
                  <p className="text-sm text-oe-muted">
                    Connect with our AI assistant for immediate emotional support and guidance whenever you need it.
                  </p>
                </div>

                <div className="bg-oe-primary-tint rounded-xl p-6">
                  <div className="w-12 h-12 bg-oe-primary rounded-full flex items-center justify-center mb-4">
                    <i className="ri-book-line text-white text-xl"></i>
                  </div>
                  <h3 className="font-semibold text-oe-ink mb-2">Mental Wellness Ebooks</h3>
                  <p className="text-sm text-oe-muted">
                    Access our curated collection of ebooks on mental health, self-help, and emotional wellness.
                  </p>
                </div>

                <div className="bg-oe-primary-tint rounded-xl p-6">
                  <div className="w-12 h-12 bg-oe-primary rounded-full flex items-center justify-center mb-4">
                    <i className="ri-heart-pulse-line text-white text-xl"></i>
                  </div>
                  <h3 className="font-semibold text-oe-ink mb-2">Mood Tracking</h3>
                  <p className="text-sm text-oe-muted">
                    Monitor your emotional well-being with our intuitive mood tracking tools and insights.
                  </p>
                </div>

                <div className="bg-oe-primary-tint rounded-xl p-6">
                  <div className="w-12 h-12 bg-oe-primary rounded-full flex items-center justify-center mb-4">
                    <i className="ri-shield-check-line text-white text-xl"></i>
                  </div>
                  <h3 className="font-semibold text-oe-ink mb-2">Privacy & Security</h3>
                  <p className="text-sm text-oe-muted">
                    Your privacy is our priority. All conversations and data are kept secure and confidential.
                  </p>
                </div>
              </div>

              <h2 className="text-2xl font-semibold text-oe-ink mb-4">Our Commitment</h2>
              <p className="text-oe-muted leading-relaxed mb-6">
                We are committed to providing accessible, affordable, and effective mental health resources. Our team 
                works continuously to improve our services and ensure that you have the support you need, when you need it.
              </p>

              <div className="bg-oe-surface-low rounded-xl p-6 border-l-4 border-oe-primary">
                <p className="text-oe-muted italic">
                  "Mental health is not a destination, but a process. It's about how you drive, not where you're going."
                </p>
                <p className="text-sm text-oe-primary mt-2 font-medium">- Noam Shpancer</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}