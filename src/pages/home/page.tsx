import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import { useSEO, generateOrganizationSchema, generateServiceSchema } from '../../utils/seo';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';

export default function HomePage() {
  // SEO Configuration
  useSEO({
    title: 'Open Ear | Emotional Support by Call and Chat',
    description: 'Open Ear is your safe, judgment-free space for emotional support. Talk by call or chat anytime, with flexible pay-as-you-go options and instant access to support.',
    keywords: 'Open Ear, OpenEar, Open Ear support, emotional support, mental wellness support, call support, chat support, safe space to talk, therapy alternative',
    canonical: '/',
    ogType: 'website',
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          name: 'Open Ear',
          alternateName: 'OpenEar',
          url: 'https://openear.com',
        },
        {
          '@type': 'WebPage',
          name: 'Open Ear Home',
          url: 'https://openear.com/',
          description:
            'Open Ear offers judgment-free emotional support through call and chat for people who need someone to listen.',
          isPartOf: {
            '@type': 'WebSite',
            name: 'Open Ear',
            url: 'https://openear.com',
          },
        },
        generateOrganizationSchema(),
        generateServiceSchema(),
      ],
    },
  });

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    const adminSession = localStorage.getItem('admin_session');
    if (!adminSession || !user) {
      setIsAdmin(false);
      return;
    }
    try {
      await apiFetch('/api/admin/check');
      setIsAdmin(true);
    } catch {
      setIsAdmin(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar transparent={true} />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Full Page Background Image */}
        <div className="fixed inset-0 z-0">
          <img 
            src="https://static.readdy.ai/image/7c6b8d1dcab40743d27d791ddb990d62/674013c1e6deb9f2c3f35efa3c57ea2d.jpeg"
            alt="People sharing in discussion"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/60 to-white/70"></div>
        </div>

        {/* Content Container */}
        <div className="relative z-10">
          {/* Hero Section */}
          <section className="relative pt-24 md:pt-28 lg:pt-32 pb-14 md:pb-18 lg:pb-20 px-4 md:px-8 lg:px-14">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-1.5 px-3 md:px-4 py-1.5 bg-[#0096FF]/10 rounded-full mb-4 md:mb-5">
                <i className="ri-heart-3-fill text-[#0096FF] text-sm"></i>
                <span className="text-xs font-medium text-[#0096FF]">Safe Space</span>
              </div>
              
              <h1 className="text-2xl md:text-3xl lg:text-5xl font-bold text-[#2A2A2A] mb-4 md:mb-5 leading-tight px-3" style={{ fontFamily: 'Playfair Display, serif' }}>
                A Safe Place to Share<br />What's On Your Mind
              </h1>
              
              <p className="text-sm md:text-base text-[#6B6B6B] mb-5 md:mb-8 max-w-2xl mx-auto leading-relaxed px-3">
                This isn't therapy—it's emotional support when you need it most. Connect through call or chat, anytime.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
                <Link to="/call">
                  <button className="w-full sm:w-auto px-6 md:px-8 py-3 md:py-3.5 bg-[#0096FF] text-white rounded-xl text-sm md:text-base font-semibold hover:bg-[#0077CC] transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer">
                    <i className="ri-phone-fill text-base"></i>
                    Start a Call
                  </button>
                </Link>
                <Link to="/chat">
                  <button className="w-full sm:w-auto px-6 md:px-8 py-3 md:py-3.5 bg-white text-[#0096FF] border-2 border-[#0096FF] rounded-xl text-sm md:text-base font-semibold hover:bg-[#0096FF] hover:text-white transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer">
                    <i className="ri-message-3-fill text-base"></i>
                    AI Chat
                  </button>
                </Link>
              </div>
              
              <p className="text-xs text-[#6B6B6B] mt-3 px-3">
                No appointment needed • Pay per session or subscribe
              </p>
            </div>
          </section>

          {/* Feature Grid */}
          <section className="bg-white/60 backdrop-blur-sm py-10 md:py-16 lg:py-20 px-4 md:px-8 lg:px-14">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-baseline md:justify-between mb-6 md:mb-10 gap-3">
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-[#0096FF]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Choose Your Support Style
                </h2>
                <p className="text-sm text-[#6B6B6B] max-w-sm md:text-right">
                  Real voice support when you need it most, with flexible pricing by the minute
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
                {/* Call Support Card */}
                <div className="bg-[#E6F5FF] rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-lg transition-shadow">
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-[#0096FF]/20 rounded-full flex items-center justify-center mb-4">
                    <i className="ri-phone-fill text-xl md:text-2xl text-[#0096FF]"></i>
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-[#2A2A2A] mb-3">Voice Connection</h3>
                  <ul className="space-y-2 mb-5">
                    <li className="flex items-start gap-2 text-xs md:text-sm text-[#6B6B6B]">
                      <i className="ri-check-line text-[#0096FF] text-base mt-0.5"></i>
                      <span>Real-time emotional support</span>
                    </li>
                    <li className="flex items-start gap-2 text-xs md:text-sm text-[#6B6B6B]">
                      <i className="ri-check-line text-[#0096FF] text-base mt-0.5"></i>
                      <span>Secure Twilio-powered calls</span>
                    </li>
                    <li className="flex items-start gap-2 text-xs md:text-sm text-[#6B6B6B]">
                      <i className="ri-check-line text-[#0096FF] text-base mt-0.5"></i>
                      <span>Pay per minute - simple pricing</span>
                    </li>
                    <li className="flex items-start gap-2 text-xs md:text-sm text-[#6B6B6B]">
                      <i className="ri-check-line text-[#0096FF] text-base mt-0.5"></i>
                      <span>Connect instantly when you need it</span>
                    </li>
                  </ul>
                  <Link to="/call" className="text-[#0096FF] font-semibold text-sm flex items-center gap-2 hover:gap-3 transition-all cursor-pointer">
                    Start a Call <i className="ri-arrow-right-line"></i>
                  </Link>
                </div>

                {/* Book Appointment Card */}
                <div className="bg-[#E6F5FF] rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-lg transition-shadow">
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-[#0096FF]/20 rounded-full flex items-center justify-center mb-4">
                    <i className="ri-calendar-check-fill text-xl md:text-2xl text-[#0096FF]"></i>
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-[#2A2A2A] mb-3">Book Appointment</h3>
                  <ul className="space-y-2 mb-5">
                    <li className="flex items-start gap-2 text-xs md:text-sm text-[#6B6B6B]">
                      <i className="ri-check-line text-[#0096FF] text-base mt-0.5"></i>
                      <span>Schedule at your convenience</span>
                    </li>
                    <li className="flex items-start gap-2 text-xs md:text-sm text-[#6B6B6B]">
                      <i className="ri-check-line text-[#0096FF] text-base mt-0.5"></i>
                      <span>Email & calendar reminders</span>
                    </li>
                    <li className="flex items-start gap-2 text-xs md:text-sm text-[#6B6B6B]">
                      <i className="ri-check-line text-[#0096FF] text-base mt-0.5"></i>
                      <span>Flexible rescheduling</span>
                    </li>
                    <li className="flex items-start gap-2 text-xs md:text-sm text-[#6B6B6B]">
                      <i className="ri-check-line text-[#0096FF] text-base mt-0.5"></i>
                      <span>Dedicated support time</span>
                    </li>
                  </ul>
                  <Link to="/call" className="text-[#0096FF] font-semibold text-sm flex items-center gap-2 hover:gap-3 transition-all cursor-pointer">
                    Book Now <i className="ri-arrow-right-line"></i>
                  </Link>
                </div>

                {/* Flexible Plans Card */}
                <div className="bg-[#E6F5FF] rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-lg transition-shadow">
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-[#0096FF]/20 rounded-full flex items-center justify-center mb-4">
                    <i className="ri-timer-fill text-xl md:text-2xl text-[#0096FF]"></i>
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-[#2A2A2A] mb-3">Flexible Minutes</h3>
                  <ul className="space-y-2 mb-5">
                    <li className="flex items-start gap-2 text-xs md:text-sm text-[#6B6B6B]">
                      <i className="ri-check-line text-[#0096FF] text-base mt-0.5"></i>
                      <span>Buy minutes in packages</span>
                    </li>
                    <li className="flex items-start gap-2 text-xs md:text-sm text-[#6B6B6B]">
                      <i className="ri-check-line text-[#0096FF] text-base mt-0.5"></i>
                      <span>Save more with larger packs</span>
                    </li>
                    <li className="flex items-start gap-2 text-xs md:text-sm text-[#6B6B6B]">
                      <i className="ri-check-line text-[#0096FF] text-base mt-0.5"></i>
                      <span>Minutes never expire</span>
                    </li>
                    <li className="flex items-start gap-2 text-xs md:text-sm text-[#6B6B6B]">
                      <i className="ri-check-line text-[#0096FF] text-base mt-0.5"></i>
                      <span>No long-term commitment</span>
                    </li>
                  </ul>
                  <Link to="/pricing" className="text-[#0096FF] font-semibold text-sm flex items-center gap-2 hover:gap-3 transition-all cursor-pointer">
                    View Pricing <i className="ri-arrow-right-line"></i>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Testimonials */}
          <section className="bg-white/50 backdrop-blur-sm py-10 md:py-16 lg:py-20 px-4 md:px-8 lg:px-14">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-6 md:mb-10">
                <div className="inline-flex items-center gap-1.5 px-3 md:px-4 py-1.5 bg-[#0096FF]/10 rounded-full mb-3 md:mb-4">
                  <i className="ri-star-fill text-[#0096FF] text-xs"></i>
                  <span className="text-xs font-medium text-[#0096FF]">Trusted Support</span>
                </div>
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-[#0096FF]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Real Stories, Real Support
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div className="bg-[#E6F5FF] rounded-2xl p-4 md:p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-[#0096FF] rounded-full flex items-center justify-center text-white font-bold text-sm">
                      S
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-[#2A2A2A]">Sarah M.</p>
                      <p className="text-xs text-[#6B6B6B]">Student</p>
                    </div>
                  </div>
                  <i className="ri-double-quotes-l text-2xl md:text-3xl text-[#0096FF]/20 mb-2 block"></i>
                  <p className="text-xs md:text-sm text-[#2A2A2A] leading-relaxed">
                    "Open Ear has been a lifeline during stressful exam periods. Having someone to talk to without judgment makes all the difference."
                  </p>
                </div>

                <div className="bg-[#E6F5FF] rounded-2xl p-4 md:p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-[#0096FF] rounded-full flex items-center justify-center text-white font-bold text-sm">
                      M
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-[#2A2A2A]">Michael T.</p>
                      <p className="text-xs text-[#6B6B6B]">Working Professional</p>
                    </div>
                  </div>
                  <i className="ri-double-quotes-l text-2xl md:text-3xl text-[#0096FF]/20 mb-2 block"></i>
                  <p className="text-xs md:text-sm text-[#2A2A2A] leading-relaxed">
                    "The pay-per-minute model is perfect. I can get support on my schedule without worrying about subscription fees."
                  </p>
                </div>

                <div className="relative rounded-2xl overflow-hidden h-48 md:h-full md:min-h-[200px]">
                  <img 
                    src="https://readdy.ai/api/search-image?query=Peaceful%20person%20in%20serene%20natural%20setting%20feeling%20calm%20and%20supported%2C%20warm%20golden%20hour%20lighting%2C%20gentle%20expression%20of%20relief%20and%20contentment%2C%20soft%20focus%20background%20with%20nature%20elements%2C%20emotional%20wellness%20and%20peace%20theme%2C%20authentic%20candid%20moment&width=400&height=400&seq=testimonial-photo-001&orientation=squarish"
                    alt="Testimonial"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0096FF]/90 via-[#0096FF]/40 to-transparent"></div>
                  <div className="absolute bottom-4 md:bottom-5 left-4 md:left-5 right-4 md:right-5 text-white">
                    <p className="font-semibold text-sm mb-0.5">Jessica L.</p>
                    <p className="text-xs opacity-90">"A safe space when I needed it most"</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-3 relative rounded-2xl overflow-hidden h-48 md:h-56 lg:h-48">
                  <img 
                    src="https://readdy.ai/api/search-image?query=Two%20people%20having%20supportive%20conversation%20in%20comfortable%20modern%20space%2C%20warm%20ambient%20lighting%2C%20genuine%20connection%20and%20empathy%2C%20professional%20yet%20welcoming%20environment%2C%20emotional%20support%20and%20understanding%20theme%2C%20horizontal%20composition%20with%20soft%20natural%20tones&width=800&height=400&seq=testimonial-wide-001&orientation=landscape"
                    alt="Support conversation"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#0096FF]/90 via-[#0096FF]/60 to-transparent"></div>
                  <div className="absolute bottom-4 md:bottom-5 left-4 md:left-5 right-4 md:right-5 text-white">
                    <p className="font-semibold text-sm mb-1">David R., Entrepreneur</p>
                    <p className="text-xs leading-relaxed opacity-95">
                      "Running a business can be isolating. Open Ear gives me a place to process my thoughts and feelings without the pressure of formal therapy."
                    </p>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-[#E6F5FF] rounded-2xl p-4 md:p-5">
                    <p className="text-xs md:text-sm text-[#2A2A2A] leading-relaxed mb-4">
                      "Being able to call whenever I need support has been life-changing. The booking system makes it easy to plan ahead."
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-[#0096FF] rounded-full flex items-center justify-center text-white font-bold text-xs">
                        A
                      </div>
                      <div>
                        <p className="font-semibold text-xs text-[#2A2A2A]">Amanda K.</p>
                        <p className="text-xs text-[#6B6B6B]">Freelancer</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#E6F5FF] rounded-2xl p-4 md:p-5">
                    <p className="text-xs md:text-sm text-[#2A2A2A] leading-relaxed mb-4">
                      "I appreciate the pay-per-session model. I can use it when I need it without feeling locked into a subscription."
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-[#0096FF] rounded-full flex items-center justify-center text-white font-bold text-xs">
                        R
                      </div>
                      <div>
                        <p className="font-semibold text-xs text-[#2A2A2A]">Robert P.</p>
                        <p className="text-xs text-[#6B6B6B]">Teacher</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="relative h-[280px] md:h-[350px] lg:h-[400px] overflow-hidden">
            <img 
              src="https://static.readdy.ai/image/7c6b8d1dcab40743d27d791ddb990d62/f1efb7ec7f8e2359adf77f5e3104e7ac.jpeg"
              alt="Ready to talk"
              className="w-full h-full object-cover object-top"
            />
            <div className="absolute inset-0 bg-black/30"></div>
            
            <div className="absolute inset-0 flex flex-col md:flex-row items-center justify-center md:justify-between px-4 md:px-8 lg:px-14 gap-5 md:gap-0">
              <div className="text-center md:text-left">
                <h2 className="text-2xl md:text-3xl lg:text-5xl font-bold text-white mb-2 md:mb-4" style={{ fontFamily: 'Poppins, sans-serif', textTransform: 'lowercase' }}>
                  ready to talk?
                </h2>
              </div>
              
              <div className="text-center md:text-right">
                <p className="text-sm md:text-base lg:text-lg text-white mb-5 md:mb-8 leading-relaxed">
                  Connect with support in minutes<br />No judgment, just listening
                </p>
                <button className="inline-flex items-center gap-2 md:gap-3 px-6 md:px-10 py-3 md:py-3.5 bg-white text-[#2A2A2A] rounded-full text-sm md:text-base font-semibold hover:bg-[#E6F5FF] transition-all shadow-2xl whitespace-nowrap cursor-pointer">
                  Get Started Now
                  <div className="w-6 h-6 md:w-8 md:h-8 bg-[#0096FF] rounded-full flex items-center justify-center">
                    <i className="ri-arrow-right-line text-white text-sm md:text-base"></i>
                  </div>
                </button>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="bg-[#0096FF] text-white py-10 md:py-12 lg:py-14 px-4 md:px-8 lg:px-14">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 md:gap-8 lg:gap-10 mb-8 md:mb-10">
                <div className="lg:col-span-4">
                  <h3 className="text-xl md:text-2xl lg:text-3xl font-bold mb-4 md:mb-6" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    Open Ear
                  </h3>
                  <p className="text-xs md:text-sm text-white/80 leading-relaxed mb-4 md:mb-6">
                    We provide a safe, judgment-free space for emotional support. Whether you need to talk or chat, we're here to listen when you need it most.
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

                <div className="lg:col-span-4">
                  <div className="space-y-4 md:space-y-5">
                    <div>
                      <p className="text-xs uppercase text-white/70 mb-1.5 tracking-wider">ADDRESS</p>
                      <p className="text-xs md:text-sm text-white/90">Rantatie</p>
                      <p className="text-xs md:text-sm text-white/90">Ranua</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-white/70 mb-1.5 tracking-wider">PHONE</p>
                      <p className="text-xs md:text-sm text-white/90">+358 41 7203762</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-white/70 mb-1.5 tracking-wider">EMAIL</p>
                      <p className="text-xs md:text-sm text-white/90">support@openear.com</p>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4">
                  <div className="rounded-xl overflow-hidden border-2 border-white h-44 md:h-52 lg:h-60">
                    <img 
                      src="https://static.readdy.ai/image/7c6b8d1dcab40743d27d791ddb990d62/aead965964394cc03948dd12339d9860.jpeg"
                      alt="Community"
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-white/20 pt-5 md:pt-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <p className="text-xs text-white/70 text-center md:text-left">
                    © 2026 Open Ear. All rights reserved.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
                    <Link 
                      to="/privacy" 
                      onClick={() => window.scrollTo(0, 0)}
                      className="text-xs text-white/70 hover:text-white transition-colors cursor-pointer"
                    >
                      Privacy Policy
                    </Link>
                    <Link 
                      to="/terms" 
                      onClick={() => window.scrollTo(0, 0)}
                      className="text-xs text-white/70 hover:text-white transition-colors cursor-pointer"
                    >
                      Terms
                    </Link>
                    <Link 
                      to="/contact" 
                      onClick={() => window.scrollTo(0, 0)}
                      className="text-xs text-white/70 hover:text-white transition-colors cursor-pointer"
                    >
                      Contact
                    </Link>
                    <a href="https://readdy.ai/?ref=logo" target="_blank" rel="noopener noreferrer" className="text-xs text-white/70 hover:text-white transition-colors cursor-pointer">
                      
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </section>
    </div>
  );
}
