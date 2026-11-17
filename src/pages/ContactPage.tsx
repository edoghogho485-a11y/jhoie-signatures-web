import {
  ArrowUpRight,
  CheckCircle2,
  Home,
  Info,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShoppingBag,
} from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { type ContactFieldErrors, validateContactForm } from '../utils/contactValidation';

export function ContactPage() {
  const {
    navigate,
    openWhatsAppModal,
    showToast,
    submitContactInquiry,
    websiteSettings,
    isSupabaseMode,
  } = useStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('General Styling & Order Enquiry');
  const [message, setMessage] = useState('');

  const [fieldErrors, setFieldErrors] = useState<ContactFieldErrors>({});
  const [formErrorSummary, setFormErrorSummary] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedDetails, setSubmittedDetails] = useState<{
    name: string;
    email: string;
    subject: string;
    message: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateContactForm({
      name,
      email,
      phone,
      subject,
      message,
    });

    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      setFormErrorSummary(
        validation.firstErrorMessage || 'Please complete all required fields.'
      );
      return;
    }

    setFieldErrors({});
    setFormErrorSummary(null);
    setIsSubmitting(true);

    try {
      await submitContactInquiry({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });

      setSubmittedDetails({
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });
      showToast('Enquiry sent and saved to studio inbox');
    } catch (err) {
      setFormErrorSummary(
        err instanceof Error && err.message
          ? err.message
          : 'Unable to save your enquiry right now. Please try WhatsApp instead.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendViaWhatsApp = () => {
    const details = submittedDetails || {
      name: name.trim() || 'Client',
      email: email.trim(),
      subject: subject.trim(),
      message: message.trim() || `I have an enquiry regarding ${websiteSettings.brandName}.`,
    };

    const waText = [
      `Hello ${websiteSettings.brandName},`,
      '',
      `• Name: ${details.name}`,
      details.email ? `• Email: ${details.email}` : '',
      `• Subject: ${details.subject}`,
      `• Message: ${details.message}`,
    ]
      .filter(Boolean)
      .join('\n');

    openWhatsAppModal('Send Enquiry on WhatsApp', waText);
  };

  return (
    <div className="bg-white">
      {/* Header */}
      <section className="bg-[#FAF7F2] border-b border-[#171717]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10 lg:py-14 space-y-4">
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-[#171717]/70">
            <button
              type="button"
              onClick={() => navigate('home')}
              className="inline-flex items-center gap-1.5 hover:text-[#171717] transition-colors cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Back to Home</span>
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => navigate('shop', { category: 'All' })}
              className="inline-flex items-center gap-1.5 hover:text-[#A68642] transition-colors cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Shop Catalogue</span>
            </button>
          </div>

          <div>
            <p className="text-xs font-medium text-[#A68642] tracking-[0.16em] uppercase">
              Client Support &amp; Enquiries
            </p>
            <h1 className="mt-2 font-display text-4xl sm:text-5xl font-medium text-[#171717]">
              Contact {websiteSettings.brandName}
            </h1>
            <p className="mt-3 text-sm sm:text-base text-[#171717]/70 max-w-2xl leading-relaxed">
              Have questions about ready-to-wear sizing, custom tailoring timelines, or order
              availability? Reach out below or message the studio directly.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left: Central Editable Contact Channels */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 sm:p-7 bg-[#FAF7F2] border border-[#171717]/10 space-y-5">
              <div className="space-y-1">
                <h2 className="font-display text-2xl font-medium text-[#171717]">
                  Direct Contact Details
                </h2>
                <p className="text-xs text-[#171717]/60">
                  Managed centrally from Studio Website Settings.
                </p>
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <MessageCircle className="w-5 h-5 text-[#A68642] shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="space-y-1">
                    <p className="font-semibold text-[#171717]">WhatsApp Concierge</p>
                    <p className="text-xs sm:text-sm text-[#171717]/75">
                      {websiteSettings.whatsappDisplayLabel}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        openWhatsAppModal(
                          `Message ${websiteSettings.brandName} on WhatsApp`,
                          `Hello ${websiteSettings.brandName}, I have an enquiry about your collections.`
                        )
                      }
                      className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#171717] text-white text-xs font-medium hover:bg-[#2a2a2a] transition-colors cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-[#C6A45C]" aria-hidden="true" />
                      <span>Chat on WhatsApp</span>
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#171717]/10 flex items-start gap-3">
                  <Instagram className="w-5 h-5 text-[#A68642] shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-[#171717]">Instagram</p>
                    <p className="text-xs sm:text-sm text-[#171717]/75 mt-0.5">
                      {websiteSettings.instagramHandle}
                    </p>
                    <a
                      href={websiteSettings.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-[#171717] hover:text-[#A68642] underline underline-offset-4"
                    >
                      <span>Open Instagram Profile</span>
                      <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#171717]/10 flex items-start gap-3">
                  <Mail className="w-5 h-5 text-[#A68642] shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-[#171717]">Business Email</p>
                    <p className="text-xs sm:text-sm text-[#171717]/75 mt-0.5 break-all">
                      {websiteSettings.businessEmail}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#171717]/10 flex items-start gap-3">
                  <Phone className="w-5 h-5 text-[#A68642] shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-[#171717]">Business Phone</p>
                    <p className="text-xs sm:text-sm text-[#171717]/75 mt-0.5">
                      {websiteSettings.businessPhone}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#171717]/10 flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#A68642] shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-[#171717]">Business Location &amp; Hours</p>
                    <p className="text-xs sm:text-sm text-[#171717]/75 mt-0.5">
                      {websiteSettings.businessLocation}
                    </p>
                    <p className="text-xs text-[#171717]/55 mt-1">
                      {websiteSettings.businessHours}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 bg-white border border-[#171717]/10 space-y-2">
              <p className="text-xs font-semibold text-[#A68642] uppercase tracking-wider">
                How Ordering Works
              </p>
              <p className="text-xs sm:text-sm text-[#171717]/75 leading-relaxed">
                For ready-to-wear outfits, add items to your Shopping Bag or select Order via
                WhatsApp on any product page. For made-to-measure designs, complete the{' '}
                <button
                  type="button"
                  onClick={() => navigate('custom-orders')}
                  className="font-semibold text-[#171717] underline underline-offset-4 hover:text-[#A68642] cursor-pointer"
                >
                  Custom Orders form
                </button>
                .
              </p>
            </div>
          </div>

          {/* Right: Validated Contact Form */}
          <div className="lg:col-span-7">
            {submittedDetails ? (
              <div className="p-6 sm:p-8 bg-[#FAF7F2] border border-[#171717]/15 space-y-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#A68642] shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-medium text-[#A68642] uppercase tracking-wider">
                      {isSupabaseMode ? 'Enquiry Sent to Studio' : 'Enquiry Saved Locally'}
                    </p>
                    <h2 className="font-display text-3xl font-medium text-[#171717] mt-0.5">
                      Thank you, {submittedDetails.name}
                    </h2>
                  </div>
                </div>

                <div className="p-4 bg-white border border-[#C6A45C]/50 flex items-start gap-3 text-xs sm:text-sm text-[#171717]/80 leading-relaxed">
                  <Info className="w-4 h-4 text-[#A68642] shrink-0 mt-0.5" aria-hidden="true" />
                  <p>
                    {isSupabaseMode ? (
                      <>
                        Your message has been saved directly to the {websiteSettings.brandName}{' '}
                        studio inbox. Our team will respond via email or phone shortly, or you may
                        click <strong>Send Enquiry on WhatsApp</strong> below for immediate
                        assistance.
                      </>
                    ) : (
                      <>
                        Your enquiry has been recorded in your browser for preview. Because this site
                        is not yet connected to a live email server, click{' '}
                        <strong>Send Enquiry on WhatsApp</strong> below to message the designer
                        directly.
                      </>
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleSendViaWhatsApp}
                    className="px-6 py-3 bg-[#171717] text-white text-xs sm:text-sm font-medium hover:bg-[#2a2a2a] transition-colors inline-flex items-center gap-2 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 text-[#C6A45C]" aria-hidden="true" />
                    <span>Send Enquiry on WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedDetails(null);
                      setName('');
                      setEmail('');
                      setPhone('');
                      setMessage('');
                    }}
                    className="px-5 py-3 border border-[#171717]/20 bg-white text-[#171717] text-xs sm:text-sm font-medium hover:bg-[#F6F1E8] transition-colors cursor-pointer"
                  >
                    Send Another Enquiry
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                noValidate
                className="p-6 sm:p-8 border border-[#171717]/10 bg-white space-y-5"
              >
                <div className="space-y-1">
                  <h2 className="font-display text-2xl sm:text-3xl font-medium text-[#171717]">
                    Send Us a Message
                  </h2>
                  <p className="text-xs text-[#171717]/60">
                    Fields marked with <span className="text-[#A68642] font-semibold">*</span> are
                    required.
                  </p>
                </div>

                {formErrorSummary && (
                  <div
                    role="alert"
                    className="p-4 bg-red-50 border border-red-200 text-red-900 text-sm"
                  >
                    {formErrorSummary}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="block text-xs font-semibold text-[#171717] mb-1.5"
                    >
                      Your Name <span className="text-[#A68642]">*</span>
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (fieldErrors.name) {
                          setFieldErrors((prev) => ({ ...prev, name: undefined }));
                        }
                      }}
                      placeholder="Full name"
                      aria-invalid={Boolean(fieldErrors.name)}
                      className={`w-full px-3.5 py-2.5 text-sm border focus:outline-none ${
                        fieldErrors.name
                          ? 'border-red-500 focus:border-red-600'
                          : 'border-[#171717]/20 focus:border-[#C6A45C]'
                      }`}
                    />
                    {fieldErrors.name && (
                      <p className="mt-1 text-xs text-red-700">{fieldErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="contact-email"
                      className="block text-xs font-semibold text-[#171717] mb-1.5"
                    >
                      Email Address <span className="text-[#A68642]">*</span>
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (fieldErrors.email) {
                          setFieldErrors((prev) => ({ ...prev, email: undefined }));
                        }
                      }}
                      placeholder="you@example.com"
                      aria-invalid={Boolean(fieldErrors.email)}
                      className={`w-full px-3.5 py-2.5 text-sm border focus:outline-none ${
                        fieldErrors.email
                          ? 'border-red-500 focus:border-red-600'
                          : 'border-[#171717]/20 focus:border-[#C6A45C]'
                      }`}
                    />
                    {fieldErrors.email && (
                      <p className="mt-1 text-xs text-red-700">{fieldErrors.email}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label
                      htmlFor="contact-phone"
                      className="block text-xs font-semibold text-[#171717] mb-1.5"
                    >
                      Phone / WhatsApp{' '}
                      <span className="font-normal text-[#171717]/55">(Optional)</span>
                    </label>
                    <input
                      id="contact-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+234 ..."
                      className="w-full px-3.5 py-2.5 text-sm border border-[#171717]/20 focus:border-[#C6A45C] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="contact-subject"
                      className="block text-xs font-semibold text-[#171717] mb-1.5"
                    >
                      Subject <span className="text-[#A68642]">*</span>
                    </label>
                    <select
                      id="contact-subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-[#171717]/20 bg-white focus:border-[#C6A45C] focus:outline-none"
                    >
                      <option value="General Styling & Order Enquiry">
                        General Styling &amp; Order Enquiry
                      </option>
                      <option value="Custom Tailoring Consultation">
                        Custom Tailoring Consultation
                      </option>
                      <option value="Sizing & Availability">Sizing &amp; Availability</option>
                      <option value="Press & Collaborations">Press &amp; Collaborations</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="contact-message"
                    className="block text-xs font-semibold text-[#171717] mb-1.5"
                  >
                    Message <span className="text-[#A68642]">*</span>
                  </label>
                  <textarea
                    id="contact-message"
                    rows={5}
                    required
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      if (fieldErrors.message) {
                        setFieldErrors((prev) => ({ ...prev, message: undefined }));
                      }
                    }}
                    placeholder="How can we assist you today?"
                    aria-invalid={Boolean(fieldErrors.message)}
                    className={`w-full px-3.5 py-2.5 text-sm border focus:outline-none ${
                      fieldErrors.message
                        ? 'border-red-500 focus:border-red-600'
                        : 'border-[#171717]/20 focus:border-[#C6A45C]'
                    }`}
                  />
                  {fieldErrors.message && (
                    <p className="mt-1 text-xs text-red-700">{fieldErrors.message}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-7 py-3.5 bg-[#171717] text-white text-sm font-medium hover:bg-[#2a2a2a] disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    {isSubmitting ? 'Saving...' : 'Submit Enquiry'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSendViaWhatsApp}
                    className="px-6 py-3.5 border border-[#171717]/20 bg-white text-[#171717] text-sm font-medium hover:border-[#C6A45C] hover:bg-[#F6F1E8] transition-colors inline-flex items-center gap-2 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 text-[#A68642]" aria-hidden="true" />
                    <span>Message via WhatsApp</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
