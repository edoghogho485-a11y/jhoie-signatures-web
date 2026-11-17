import { ArrowRight, MessageCircle, Scissors } from 'lucide-react';
import { BrandImage } from '../components/BrandImage';
import { BrandTrustSection } from '../components/BrandTrustSection';
import { BRAND_CONTACT_CONFIG } from '../config/brandContactConfig';
import { useStore } from '../context/StoreContext';
import { EDITORIAL_IMAGES } from '../data/sampleCatalog';

export function AboutPage() {
  const { navigate, openWhatsAppModal, websiteSettings } = useStore();
  const storySlot = BRAND_CONTACT_CONFIG.designerStoryEditableSlot;

  return (
    <div className="bg-white">
      {/* 1. Introductory Hero Section */}
      <section className="bg-[#171717] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-4">
            <p className="font-display italic text-xl text-[#C6A45C]">{websiteSettings.tagline}</p>
            <h1 className="font-display text-4xl sm:text-5xl font-medium text-white leading-tight text-balance">
              Luxury, Modern Trends, and African Elegance for Every Woman.
            </h1>
            <p className="text-sm sm:text-base text-white/80 leading-relaxed max-w-xl">
              {websiteSettings.brandName} is a women&apos;s fashion brand creating refined ready-to-wear and
              made-to-measure outfits for women of different ages—blending timeless femininity,
              contemporary tailoring, and rich African elegance.
            </p>
            <div className="pt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate('shop', { category: 'All' })}
                className="px-6 py-3 bg-[#C6A45C] text-[#171717] text-sm font-semibold hover:bg-[#d5b571] transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <span>Explore the Shop</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => navigate('custom-orders')}
                className="px-6 py-3 border border-white/25 text-white text-sm font-medium hover:border-[#C6A45C] hover:text-[#C6A45C] transition-colors cursor-pointer"
              >
                Request a Custom Outfit
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 aspect-[16/10] overflow-hidden border border-white/10">
            <BrandImage
              src={EDITORIAL_IMAGES.heroEditorial}
              alt="JHOIE SIGNATURES luxury African fashion editorial lookbook"
              priority
              className="w-full h-full object-cover object-top"
            />
          </div>
        </div>
      </section>

      {/* 2. Brand Story & Editable Designer Biography Placeholder */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-16 lg:py-24 space-y-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          <div className="lg:col-span-5 aspect-[4/3] lg:aspect-auto overflow-hidden bg-[#F6F1E8] border border-[#171717]/10">
            <BrandImage
              src={EDITORIAL_IMAGES.atelierCraftsmanship}
              alt="JHOIE SIGNATURES bespoke atelier workspace placeholder photograph"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="lg:col-span-7 flex flex-col justify-center space-y-5">
            <p className="text-xs font-medium text-[#A68642] tracking-[0.16em] uppercase">
              Brand Story
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-medium text-[#171717] leading-tight">
              Crafted with Passion for Style, Creativity, and Confidence
            </h2>
            <p className="text-sm sm:text-base text-[#171717]/80 leading-relaxed">
              At JHOIE SIGNATURES, fashion begins with how a garment makes a woman feel. Our design
              approach pairs thoughtful silhouettes, expressive textures, and careful tailoring so
              women across generations can step into everyday moments and milestone celebrations
              with poise and self-assurance.
            </p>

            {/* Clearly marked editable designer bio space — no invented biography or years */}
            <div className="p-5 bg-[#FAF7F2] border border-[#171717]/10 space-y-2.5">
              <p className="text-xs font-semibold text-[#A68642]">{storySlot.heading}</p>
              {storySlot.paragraphs.map((paragraph, idx) => (
                <p key={idx} className="text-xs sm:text-sm text-[#171717]/75 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Fashion Identity Pillars */}
        <div className="pt-12 border-t border-[#171717]/10 space-y-8">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-medium text-[#A68642] tracking-[0.16em] uppercase">
              Our Fashion Identity
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-medium text-[#171717]">
              Where Luxury, Modern Trends, and African Elegance Meet
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#A68642]">01. Luxury &amp; Poise</p>
              <h3 className="font-display text-2xl font-medium text-[#171717]">
                Refined Fabrics &amp; Clean Lines
              </h3>
              <p className="text-sm text-[#171717]/70 leading-relaxed">
                Intentional draping, balanced structure, and elevated finishing designed to feel
                timeless rather than fleeting.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#A68642]">02. Modern Trends</p>
              <h3 className="font-display text-2xl font-medium text-[#171717]">
                Contemporary Silhouettes
              </h3>
              <p className="text-sm text-[#171717]/70 leading-relaxed">
                Fresh necklines, tailored two-piece sets, and modern cuts adaptable for work,
                evening gatherings, and formal occasions.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#A68642]">03. African Elegance</p>
              <h3 className="font-display text-2xl font-medium text-[#171717]">
                For Women of All Ages
              </h3>
              <p className="text-sm text-[#171717]/70 leading-relaxed">
                Celebrating cultural grace and expressive heritage silhouettes thoughtfully styled
                for women across different ages and body proportions.
              </p>
            </div>
          </div>
        </div>

        {/* 4. Custom Tailoring & Made-to-Measure Services */}
        <div className="p-8 sm:p-10 bg-[#F6F1E8] border border-[#171717]/10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#A68642] uppercase tracking-wider">
              <Scissors className="w-4 h-4" aria-hidden="true" />
              <span>Custom Tailoring &amp; Made-to-Measure</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-medium text-[#171717]">
              Tailored Around Your Measurements and Occasion
            </h2>
            <p className="text-sm sm:text-base text-[#171717]/75 leading-relaxed">
              In addition to ready-to-wear outfits, JHOIE SIGNATURES offers bespoke made-to-measure
              tailoring. Share your inspiration photo, preferred fabric, colour palette, and body
              measurements through our Custom Orders page, and the designer will consult with you
              directly on styling, pricing, and delivery timelines.
            </p>
          </div>
          <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3">
            <button
              type="button"
              onClick={() => navigate('custom-orders')}
              className="px-6 py-3.5 bg-[#171717] text-white text-sm font-medium hover:bg-[#2a2a2a] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Request Custom Outfit</span>
              <ArrowRight className="w-4 h-4 text-[#C6A45C]" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() =>
                openWhatsAppModal(
                  'Consult with JHOIE SIGNATURES on WhatsApp',
                  'Hello JHOIE SIGNATURES, I would like to discuss a ready-to-wear or custom-made outfit.'
                )
              }
              className="px-6 py-3.5 border border-[#171717]/20 bg-white text-[#171717] text-sm font-medium hover:border-[#C6A45C] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-[#A68642]" aria-hidden="true" />
              <span>Chat on WhatsApp</span>
            </button>
          </div>
        </div>

        {/* 5. Brand Trust & Ordering Clarity */}
        <div className="pt-4 space-y-6">
          <div className="space-y-1">
            <p className="text-xs font-medium text-[#A68642] tracking-[0.16em] uppercase">
              Client Experience
            </p>
            <h2 className="font-display text-3xl font-medium text-[#171717]">
              Our Commitment to Craft &amp; Communication
            </h2>
          </div>
          <BrandTrustSection showTestimonialsSlot={true} />
        </div>
      </section>
    </div>
  );
}
