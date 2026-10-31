import { Link } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import { useSEO, generateWebPageSchema, generateFAQSchema } from '../../utils/seo';

export default function HowItWorksPage() {
  // SEO Configuration
  const faqData = [
    {
      question: 'Is this the same as therapy?',
      answer: 'No, Open Ear is not a replacement for professional therapy. We provide emotional support and a safe space to talk, but we don\'t diagnose conditions or provide clinical treatment. If you\'re dealing with serious mental health issues, we encourage you to seek professional help.'
    },
    {
      question: 'How private are my conversations?',
      answer: 'Completely private. We use end-to-end encryption for all communications. Your conversations are never shared, sold, or used for any purpose other than providing you support. We take your privacy extremely seriously.'
    },
    {
      question: 'Can I use both voice and chat?',
      answer: 'Absolutely! You can switch between voice calls and chat based on your needs and preferences. Some users prefer calls during the day and chat at night, or vice versa. Use whatever feels right in the moment.'
    },
    {
      question: 'How long can a session last?',
      answer: 'There\'s no set time limit. Sessions can be as short as a few minutes or as long as you need. You\'re in control—end the session whenever you feel ready. Most users find 15-30 minutes helpful, but everyone\'s needs are different.'
    },
    {
      question: 'What if I need help in a crisis?',
      answer: 'If you\'re in crisis or having thoughts of self-harm, please contact emergency services (911) or a crisis hotline immediately. Open Ear provides emotional support but is not equipped for crisis intervention. We can provide resources and encourage you to seek immediate professional help.'
    },
    {
      question: 'How does pricing work?',
      answer: 'We offer flexible pricing options. Voice calls use a credit-based system where you pay per minute. Chat support is available through monthly subscriptions or pay-per-session options. Check our pricing page for detailed information and choose what works best for your budget.'
    }
  ];

  useSEO({
    title: 'How It Works - Simple Steps to Emotional Support | Open Ear',
    description: 'Getting emotional support is simple and fast with Open Ear. Choose your method, connect instantly, share freely, and feel supported. No appointments needed, available 24/7 with complete privacy.',
    keywords: 'how emotional support works, online therapy process, mental health support steps, AI chat support, voice call therapy, instant counseling',
    canonical: '/how-it-works',
    ogType: 'website',
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        generateWebPageSchema('How It Works', 'Learn how to get emotional support through Open Ear', '/how-it-works'),
        generateFAQSchema(faqData),
      ],
    },
  });

  return (
    <div className="min-h-screen bg-white">
      <Navbar transparent={false} />

      {/* Hero Section */}
      <section className="relative pt-24 md:pt-28 pb-12 md:pb-16 px-4 md:px-8 lg:px-14 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#E6F5FF] via-white to-[#E6F5FF]/30"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0096FF]/10 rounded-full mb-4">
            <i className="ri-lightbulb-flash-fill text-[#0096FF] text-sm"></i>
            <span className="text-xs font-medium text-[#0096FF]">Simple Process</span>
          </div>
          
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#2A2A2A] mb-4 leading-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
            Getting Support<br />Is Simple &amp; Fast
          </h1>
          
          <p className="text-sm md:text-base text-[#6B6B6B] mb-6 max-w-2xl mx-auto leading-relaxed">
            No complicated sign-ups or long wait times. Connect with emotional support in just a few clicks, whenever you need it.
          </p>
        </div>
      </section>

      {/* Main Process Steps */}
      <section className="py-10 md:py-16 px-4 md:px-8 lg:px-14">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-[#0096FF] mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Your Journey to Support
            </h2>
            <p className="text-xs md:text-sm text-[#6B6B6B] max-w-xl mx-auto">
              From first visit to feeling supported, here's how Open Ear works
            </p>
          </div>

          {/* Step 1 */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-10 items-center mb-12 md:mb-16">
            <div className="order-2 md:order-1">
              <div className="inline-flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-[#0096FF] text-white rounded-full flex items-center justify-center text-base font-bold">
                  1
                </div>
                <span className="text-xs font-semibold text-[#0096FF] uppercase tracking-wider">Choose Your Method</span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-[#2A2A2A] mb-4">
                Pick What Feels Right
              </h3>
              <p className="text-xs md:text-sm text-[#6B6B6B] leading-relaxed mb-5">
                Start by choosing how you'd like to connect. Prefer talking things through? Select a voice call. More comfortable typing? Choose our AI chat. Both options provide the same level of support.
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#0096FF]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="ri-phone-fill text-[#0096FF] text-sm"></i>
                  </div>
                  <div>
                    <p className="font-semibold text-[#2A2A2A] text-xs mb-0.5">Voice Call Support</p>
                    <p className="text-xs text-[#6B6B6B]">Real-time conversation with empathetic AI</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#0096FF]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="ri-message-3-fill text-[#0096FF] text-sm"></i>
                  </div>
                  <div>
                    <p className="font-semibold text-[#2A2A2A] text-xs mb-0.5">AI Chat Assistant</p>
                    <p className="text-xs text-[#6B6B6B]">Text-based support available instantly</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2 relative h-[280px] md:h-[320px] rounded-2xl overflow-hidden">
              <img 
                src="https://readdy.ai/api/search-image?query=Modern%20smartphone%20interface%20showing%20two%20options%20for%20emotional%20support%20communication%2C%20clean%20minimalist%20app%20design%20with%20call%20and%20chat%20buttons%2C%20soft%20blue%20and%20white%20color%20scheme%2C%20user-friendly%20interface%20with%20gentle%20lighting%2C%20professional%20mental%20health%20app%20screenshot%2C%20contemporary%20digital%20wellness%20platform&width=600&height=700&seq=step-one-interface-001&orientation=portrait"
                alt="Choose your method"
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0096FF]/10 to-transparent"></div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-10 items-center mb-12 md:mb-16">
            <div className="relative h-[280px] md:h-[320px] rounded-2xl overflow-hidden">
              <img 
                src="https://readdy.ai/api/search-image?query=Person%20using%20smartphone%20or%20laptop%20for%20instant%20connection%2C%20quick%20and%20easy%20access%20to%20support%20services%2C%20modern%20technology%20enabling%20immediate%20help%2C%20comfortable%20home%20environment%20with%20warm%20lighting%2C%20seamless%20digital%20experience%2C%20user%20feeling%20relieved%20and%20ready%20to%20connect&width=600&height=700&seq=step-two-connect-001&orientation=portrait"
                alt="Connect instantly"
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0096FF]/10 to-transparent"></div>
            </div>
            <div>
              <div className="inline-flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-[#0096FF] text-white rounded-full flex items-center justify-center text-base font-bold">
                  2
                </div>
                <span className="text-xs font-semibold text-[#0096FF] uppercase tracking-wider">Connect Instantly</span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-[#2A2A2A] mb-4">
                No Waiting Required
              </h3>
              <p className="text-xs md:text-sm text-[#6B6B6B] leading-relaxed mb-5">
                Once you've chosen your preferred method, you're ready to connect. No appointment scheduling, no waiting rooms, no forms to fill out. Click to start and you'll be connected within seconds.
              </p>
              <div className="bg-[#E6F5FF] rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <i className="ri-time-line text-[#0096FF] text-lg"></i>
                  <div>
                    <p className="font-semibold text-[#2A2A2A] text-xs mb-1">Available 24/7</p>
                    <p className="text-xs text-[#6B6B6B]">Whether it's 3 AM or 3 PM, support is always just a click away.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-10 items-center mb-12 md:mb-16">
            <div className="order-2 md:order-1">
              <div className="inline-flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-[#0096FF] text-white rounded-full flex items-center justify-center text-base font-bold">
                  3
                </div>
                <span className="text-xs font-semibold text-[#0096FF] uppercase tracking-wider">Share Freely</span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-[#2A2A2A] mb-4">
                Express Without Judgment
              </h3>
              <p className="text-xs md:text-sm text-[#6B6B6B] leading-relaxed mb-5">
                This is your safe space. Share what's on your mind, talk about your feelings, express your concerns—whatever you need to get off your chest.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <i className="ri-shield-check-line text-[#0096FF] text-base"></i>
                  <span className="text-[#2A2A2A] text-xs">Completely confidential and private</span>
                </div>
                <div className="flex items-center gap-2">
                  <i className="ri-heart-3-line text-[#0096FF] text-base"></i>
                  <span className="text-[#2A2A2A] text-xs">Empathetic and understanding responses</span>
                </div>
                <div className="flex items-center gap-2">
                  <i className="ri-chat-smile-3-line text-[#0096FF] text-base"></i>
                  <span className="text-[#2A2A2A] text-xs">Zero judgment, just support</span>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2 relative h-[280px] md:h-[320px] rounded-2xl overflow-hidden">
              <img 
                src="https://readdy.ai/api/search-image?query=Person%20having%20meaningful%20conversation%20expressing%20emotions%20freely%2C%20comfortable%20and%20safe%20environment%20for%20sharing%20feelings%2C%20warm%20supportive%20atmosphere%20with%20soft%20natural%20lighting%2C%20genuine%20emotional%20expression%20and%20relief%2C%20peaceful%20private%20space%20for%20opening%20up%2C%20authentic%20moment%20of%20vulnerability%20and%20trust&width=600&height=700&seq=step-three-share-001&orientation=portrait"
                alt="Share freely"
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0096FF]/10 to-transparent"></div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-10 items-center">
            <div className="relative h-[280px] md:h-[320px] rounded-2xl overflow-hidden">
              <img 
                src="https://readdy.ai/api/search-image?query=Person%20feeling%20emotionally%20lighter%20and%20supported%20after%20conversation%2C%20peaceful%20relieved%20expression%20showing%20emotional%20wellness%2C%20calm%20serene%20environment%20with%20gentle%20natural%20lighting%2C%20sense%20of%20comfort%20and%20understanding%20achieved%2C%20positive%20mental%20health%20outcome%2C%20authentic%20moment%20of%20feeling%20heard%20and%20validated&width=600&height=700&seq=step-four-supported-001&orientation=portrait"
                alt="Feel supported"
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0096FF]/10 to-transparent"></div>
            </div>
            <div>
              <div className="inline-flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-[#0096FF] text-white rounded-full flex items-center justify-center text-base font-bold">
                  4
                </div>
                <span className="text-xs font-semibold text-[#0096FF] uppercase tracking-wider">Feel Supported</span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-[#2A2A2A] mb-4">
                Leave Feeling Lighter
              </h3>
              <p className="text-xs md:text-sm text-[#6B6B6B] leading-relaxed mb-5">
                After your session, you'll feel heard, understood, and emotionally lighter. You can end the session whenever you're ready, and return anytime you need support again.
              </p>
              <div className="bg-[#E6F5FF] rounded-xl p-4">
                <p className="text-[#2A2A2A] font-semibold text-xs mb-2">What happens after?</p>
                <ul className="space-y-1.5 text-xs text-[#6B6B6B]">
                  <li className="flex items-start gap-2">
                    <i className="ri-check-line text-[#0096FF] text-sm mt-0.5"></i>
                    <span>Your conversation remains completely private</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="ri-check-line text-[#0096FF] text-sm mt-0.5"></i>
                    <span>Return anytime for more support</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="ri-check-line text-[#0096FF] text-sm mt-0.5"></i>
                    <span>No follow-up required unless you want it</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Comparison */}
      <section className="py-10 md:py-16 px-4 md:px-8 lg:px-14 bg-[#F8FCFF]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 md:mb-10">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-[#0096FF] mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Voice Call vs AI Chat
            </h2>
            <p className="text-xs md:text-sm text-[#6B6B6B] max-w-xl mx-auto">
              Both methods provide excellent support. Choose based on your preference.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {/* Voice Call */}
            <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm">
              <div className="w-12 h-12 bg-[#0096FF]/10 rounded-full flex items-center justify-center mb-4">
                <i className="ri-phone-fill text-xl text-[#0096FF]"></i>
              </div>
              <h3 className="text-lg md:text-xl font-bold text-[#2A2A2A] mb-3">Voice Call Support</h3>
              <p className="text-[#6B6B6B] text-xs mb-4 leading-relaxed">
                Perfect for when you need to talk things through out loud.
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <i className="ri-check-line text-[#0096FF] text-base mt-0.5"></i>
                  <div>
                    <p className="font-semibold text-[#2A2A2A] text-xs">Real-time conversation</p>
                    <p className="text-xs text-[#6B6B6B]">Natural back-and-forth dialogue</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <i className="ri-check-line text-[#0096FF] text-base mt-0.5"></i>
                  <div>
                    <p className="font-semibold text-[#2A2A2A] text-xs">Vocal expression</p>
                    <p className="text-xs text-[#6B6B6B]">Express emotions through tone</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <i className="ri-check-line text-[#0096FF] text-base mt-0.5"></i>
                  <div>
                    <p className="font-semibold text-[#2A2A2A] text-xs">Credit-based pricing</p>
                    <p className="text-xs text-[#6B6B6B]">Pay per minute of conversation</p>
                  </div>
                </div>
              </div>
              <Link to="/call">
                <button className="w-full mt-5 px-6 py-3 bg-[#0096FF] text-white rounded-xl text-sm font-semibold hover:bg-[#0077CC] transition-all whitespace-nowrap cursor-pointer">
                  Try Voice Call
                </button>
              </Link>
            </div>

            {/* AI Chat */}
            <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm">
              <div className="w-12 h-12 bg-[#0096FF]/10 rounded-full flex items-center justify-center mb-4">
                <i className="ri-message-3-fill text-xl text-[#0096FF]"></i>
              </div>
              <h3 className="text-lg md:text-xl font-bold text-[#2A2A2A] mb-3">AI Chat Assistant</h3>
              <p className="text-[#6B6B6B] text-xs mb-4 leading-relaxed">
                Ideal for when you prefer typing or need support quietly.
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <i className="ri-check-line text-[#0096FF] text-base mt-0.5"></i>
                  <div>
                    <p className="font-semibold text-[#2A2A2A] text-xs">Text-based support</p>
                    <p className="text-xs text-[#6B6B6B]">Type at your own pace</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <i className="ri-check-line text-[#0096FF] text-base mt-0.5"></i>
                  <div>
                    <p className="font-semibold text-[#2A2A2A] text-xs">Discreet and quiet</p>
                    <p className="text-xs text-[#6B6B6B]">Perfect for public spaces</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <i className="ri-check-line text-[#0096FF] text-base mt-0.5"></i>
                  <div>
                    <p className="font-semibold text-[#2A2A2A] text-xs">Flexible pricing</p>
                    <p className="text-xs text-[#6B6B6B]">Multiple subscription options</p>
                  </div>
                </div>
              </div>
              <Link to="/chat">
                <button className="w-full mt-5 px-6 py-3 bg-white text-[#0096FF] border-2 border-[#0096FF] rounded-xl text-sm font-semibold hover:bg-[#0096FF] hover:text-white transition-all whitespace-nowrap cursor-pointer">
                  Try AI Chat
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-10 md:py-16 px-4 md:px-8 lg:px-14">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8 md:mb-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0096FF]/10 rounded-full mb-4">
              <i className="ri-question-line text-[#0096FF] text-sm"></i>
              <span className="text-xs font-medium text-[#0096FF]">Common Questions</span>
            </div>
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-[#0096FF]" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqData.map((faq, index) => (
              <div key={index} className="bg-[#E6F5FF] rounded-xl p-4 md:p-5">
                <h3 className="text-sm font-bold text-[#2A2A2A] mb-2">
                  {faq.question}
                </h3>
                <p className="text-[#6B6B6B] text-xs leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-10 md:py-14 px-4 md:px-8 lg:px-14 bg-gradient-to-br from-[#E6F5FF] via-white to-[#E6F5FF]/30">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-[#0096FF] mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Ready to Get Started?
          </h2>
          <p className="text-xs md:text-sm text-[#6B6B6B] mb-6 leading-relaxed max-w-xl mx-auto">
            Join thousands who've found comfort and support through Open Ear.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/call">
              <button className="w-full sm:w-auto px-6 py-3 bg-[#0096FF] text-white rounded-xl text-sm font-semibold hover:bg-[#0077CC] transition-all shadow-lg flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer">
                <i className="ri-phone-fill text-base"></i>
                Start a Call
              </button>
            </Link>
            <Link to="/chat">
              <button className="w-full sm:w-auto px-6 py-3 bg-white text-[#0096FF] border-2 border-[#0096FF] rounded-xl text-sm font-semibold hover:bg-[#0096FF] hover:text-white transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer">
                <i className="ri-message-3-fill text-base"></i>
                Open Chat
              </button>
            </Link>
          </div>
          <p className="text-xs text-[#6B6B6B] mt-4">
            No credit card required to start • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0096FF] text-white py-10 md:py-12 px-4 md:px-8 lg:px-14">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8 mb-8">
            <div className="md:col-span-2">
              <h3 className="text-xl md:text-2xl font-bold mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Open Ear
              </h3>
              <p className="text-xs text-white/80 leading-relaxed mb-4">
                We provide a safe, judgment-free space for emotional support. Whether you need to talk or chat, we're here to listen.
              </p>
              <div className="flex items-center gap-3">
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-8 h-8 border border-white/40 rounded-full flex items-center justify-center hover:border-white hover:bg-white/10 transition-all cursor-pointer">
                  <i className="ri-instagram-line text-sm"></i>
                </a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="w-8 h-8 border border-white/40 rounded-full flex items-center justify-center hover:border-white hover:bg-white/10 transition-all cursor-pointer">
                  <i className="ri-twitter-x-line text-sm"></i>
                </a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="w-8 h-8 border border-white/40 rounded-full flex items-center justify-center hover:border-white hover:bg-white/10 transition-all cursor-pointer">
                  <i className="ri-facebook-fill text-sm"></i>
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="w-8 h-8 border border-white/40 rounded-full flex items-center justify-center hover:border-white hover:bg-white/10 transition-all cursor-pointer">
                  <i className="ri-linkedin-fill text-sm"></i>
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-3">Product</h4>
              <ul className="space-y-2 text-white/80 text-xs">
                <li>
                  <Link to="/" className="hover:text-white transition-colors cursor-pointer">
                    Home
                  </Link>
                </li>
                <li>
                  <Link to="/call" className="hover:text-white transition-colors cursor-pointer">
                    Voice Call
                  </Link>
                </li>
                <li>
                  <Link to="/chat" className="hover:text-white transition-colors cursor-pointer">
                    AI Chat
                  </Link>
                </li>
                <li>
                  <Link to="/pricing" className="hover:text-white transition-colors cursor-pointer">
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-3">Company</h4>
              <ul className="space-y-2 text-white/80 text-xs">
                <li>
                  <Link to="/about" className="hover:text-white transition-colors cursor-pointer">
                    About
                  </Link>
                </li>
                <li>
                  <Link to="/how-it-works" className="hover:text-white transition-colors cursor-pointer">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="hover:text-white transition-colors cursor-pointer">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-white transition-colors cursor-pointer">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/20 pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              <p className="text-xs text-white/70">
                © 2026 Open Ear. All rights reserved.
              </p>
              <a href="https://readdy.ai/?ref=logo" target="_blank" rel="noopener noreferrer" className="text-xs text-white/70 hover:text-white transition-colors cursor-pointer">
                Website Builder
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
