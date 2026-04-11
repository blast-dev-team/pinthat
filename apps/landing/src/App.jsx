import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import SocialProof from './components/SocialProof.jsx';
import Stats from './components/Stats.jsx';
import Features from './components/Features.jsx';
import Workflow from './components/Workflow.jsx';
import Pricing from './components/Pricing.jsx';
import FinalCTA from './components/FinalCTA.jsx';
import Footer from './components/Footer.jsx';

export default function App() {
  return (
    <>
      <Header />
      <main className="pt-16">
        <Hero />
        <SocialProof />
        <Stats />
        <Features />
        <Workflow />
        <Pricing />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
