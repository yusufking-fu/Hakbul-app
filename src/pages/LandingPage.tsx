import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import ProblemSection from '@/components/landing/ProblemSection';
import HowItWorks from '@/components/landing/HowItWorks';
import FeaturesSection from '@/components/landing/FeaturesSection';
import DashboardPreview from '@/components/landing/DashboardPreview';
import PricingSection from '@/components/landing/PricingSection';
import FAQSection from '@/components/landing/FAQSection';
import FinalCTA from '@/components/landing/FinalCTA';
import Footer from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-hb-bg">
      <Navbar />
      <Hero />
      <ProblemSection />
      <HowItWorks />
      <FeaturesSection />
      <DashboardPreview />
      <PricingSection />
      <FAQSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}
