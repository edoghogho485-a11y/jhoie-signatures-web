import { MessageCircle, Scissors, ShieldCheck, Sparkles } from 'lucide-react';
import { BRAND_CONTACT_CONFIG } from '../config/brandContactConfig';
import { useStore } from '../context/StoreContext';

const TRUST_PILLARS = [
  {
    icon: Scissors,
    index: '01',
    title: 'Custom-Made Fashion Services',
    description:
      'Alongside ready-to-wear pieces, customers can submit bespoke outfit requests tailored around their occasion, fabric preference, and personal measurements.',
  },
  {
    icon: Sparkles,
    index: '02',
    title: 'Attention to Details & Finishing',
    description:
      'Every silhouette is designed with balanced proportions, structured seams, and clean interior finishing suited for women of different ages.',
  },
  {
    icon: ShieldCheck,
    index: '03',
    title: 'Transparent Ordering Process',
    description:
      'Browse pieces or submit a custom brief with zero automated card surprises. Final availability, sizing confirmation, and delivery details are agreed directly with you.',
  },
  {
    icon: MessageCircle,
    index: '04',
    title: 'Direct Designer Support & Enquiries',
    description:
      'Reach the studio directly via the Contact page or WhatsApp concierge for sizing guidance, fabric questions, or bespoke timeline consultations.',
  },
];

interface BrandTrustSectionProps {
  showTestimonialsSlot?: boolean;
}

export function BrandTrustSection({ showTestimonialsSlot = true }: BrandTrustSectionProps) {
  const { navigate, openWhatsAppModal, websiteSettings } = useStore();
  const testimonials = BRAND_CONTACT_CONFIG.genuineTestimonials;

  return (
    <div className="space-y-12">
      {/* 4-Pillar Trust & Ordering Process */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {TRUST_PILLARS.map((pillar) => {
          const IconComponent = pillar.icon;
          return (
            <div
              key={pillar.index}
              className="p-6 bg-[#FAF7F2] border border-[#171717]/10 flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#A68642] tabular-nums">
                    {pillar.index}
                  </span>
                  <IconComponent className="w-4 h-4 text-[#A68642]" aria-hidden="true" />
                </div>
                <h3 className="font-display text-xl font-medium text-[#171717] leading-snug">
                  {pillar.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#171717]/75 leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Customer Enquiry Callout + Empty Editable Client Feedback Slot */}
      {showTestimonialsSlot && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-5 p-6 bg-[#171717] text-white flex flex-col justify-between gap-5">
            <div className="space-y-2">
              <p className="text-xs font-medium text-[#C6A45C] tracking-[0.16em] uppercase">
                How to Reach the Designer
              </p>
              <h3 className="font-display text-2xl font-medium text-white">
                Questions Before You Order?
              </h3>
              <p className="text-xs sm:text-sm text-white/75 leading-relaxed">
                Speak directly with our concierge team for sizing checks, custom tailoring timelines,
                or ready-to-wear availability before placing an order.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  openWhatsAppModal(
                    'Enquire on WhatsApp',
                    `Hello ${websiteSettings.brandName}, I would like to speak with the designer regarding an outfit enquiry.`
                  )
                }
                className="px-4 py-2.5 bg-[#C6A45C] text-[#171717] text-xs font-semibold hover:bg-[#d5b571] transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                <span>WhatsApp Support</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('contact')}
                className="px-4 py-2.5 border border-white/25 text-white text-xs font-medium hover:border-[#C6A45C] transition-colors cursor-pointer"
              >
                Contact Form
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 p-6 bg-[#FAF7F2] border border-[#171717]/10 flex flex-col justify-center">
            {testimonials.length === 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-[#A68642] tracking-[0.16em] uppercase">
                  Client Feedback (Editable Section)
                </p>
                <h3 className="font-display text-2xl font-medium text-[#171717]">
                  Verified Client Reviews Coming Soon
                </h3>
                <p className="text-xs sm:text-sm text-[#171717]/70 leading-relaxed max-w-xl">
                  This dedicated section is intentionally kept empty until genuine, verified
                  customer feedback from JHOIE SIGNATURES clients is added via{' '}
                  <span className="font-medium text-[#171717]">
                    BRAND_CONTACT_CONFIG.genuineTestimonials
                  </span>
                  .
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {testimonials.map((t) => (
                  <blockquote key={t.id} className="p-4 bg-white border border-[#171717]/10">
                    <p className="text-xs sm:text-sm text-[#171717]/80 leading-relaxed">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                    <footer className="mt-3 pt-2 border-t border-[#171717]/10 text-xs">
                      <span className="font-semibold text-[#171717]">{t.clientName}</span>
                      <span className="text-[#171717]/60"> · {t.outfitCategory}</span>
                    </footer>
                  </blockquote>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
