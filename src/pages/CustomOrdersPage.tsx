import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Home,
  Info,
  Lock,
  LogOut,
  MessageCircle,
  Ruler,
  ShoppingBag,
  Upload,
  UserCheck,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { BrandImage } from '../components/BrandImage';
import { useStore } from '../context/StoreContext';
import { EDITORIAL_IMAGES } from '../data/sampleCatalog';
import { customOrdersRepository } from '../services/storeRepository';
import { supabaseStorageService } from '../services/supabaseStorageService';
import type { CustomOrderPayload, CustomOutfitType } from '../types/fashion';
import {
  type CustomOrderFieldErrors,
  validateCustomOrderForm,
} from '../utils/customOrderValidation';
import { buildCustomOrderWhatsAppMessage, formatNaira } from '../utils/formatters';

const OUTFIT_TYPES: CustomOutfitType[] = [
  'Dress',
  'Gown',
  'Two-Piece',
  'Traditional Outfit',
  'Other',
];

const OCCASION_OPTIONS = [
  'Wedding / Aso-Ebi Celebration',
  'Evening Gala / Red Carpet',
  'Traditional Ceremony / Engagement',
  'Corporate / Executive Event',
  'Luxury Casual / Resort',
  'Other Special Occasion',
];

const STANDARD_SIZE_OPTIONS = ['Exact Measurements', 'XS', 'S', 'M', 'L', 'XL'];

function compressReferenceImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        reject(new Error('Invalid image data.'));
        return;
      }

      if (typeof Image === 'undefined' || typeof document === 'undefined') {
        resolve(result);
        return;
      }

      const img = new Image();
      img.onload = () => {
        const maxWidth = 700;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(result);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        try {
          resolve(canvas.toDataURL('image/jpeg', 0.78));
        } catch {
          resolve(result);
        }
      };
      img.onerror = () => resolve(result);
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}

export function CustomOrdersPage() {
  const {
    navigate,
    openWhatsAppModal,
    showToast,
    submitCustomOrder,
    websiteSettings,
    isSupabaseMode,
    customerSession,
    isAuthLoading,
    customerLogout,
  } = useStore();

  const todayIso = new Date().toISOString().split('T')[0];

  const [customerName, setCustomerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [outfitType, setOutfitType] = useState<CustomOutfitType>('Gown');
  const [preferredOccasion, setPreferredOccasion] = useState(OCCASION_OPTIONS[0]);
  const [preferredFabric, setPreferredFabric] = useState('');
  const [preferredColor, setPreferredColor] = useState('');
  const [budgetInput, setBudgetInput] = useState('');
  const [outfitDescription, setOutfitDescription] = useState('');
  const [preferredDeliveryDate, setPreferredDeliveryDate] = useState('');
  const [standardSizeReference, setStandardSizeReference] = useState('Exact Measurements');

  const [measurementUnit, setMeasurementUnit] = useState<'inches' | 'cm'>('inches');
  const [bust, setBust] = useState('');
  const [waist, setWaist] = useState('');
  const [hips, setHips] = useState('');
  const [shoulder, setShoulder] = useState('');
  const [length, setLength] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  const [referenceImageName, setReferenceImageName] = useState('');
  const [referenceImagePreview, setReferenceImagePreview] = useState('');
  const [selectedReferenceFile, setSelectedReferenceFile] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<CustomOrderFieldErrors>({});
  const [formErrorSummary, setFormErrorSummary] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState<CustomOrderPayload | null>(null);

  const parsedBudgetNgn = Number(budgetInput.replace(/,/g, '').trim());

  useEffect(() => {
    if (!customerSession?.isAuthenticated) return;
    if (!customerName && customerSession.fullName) {
      setCustomerName(customerSession.fullName);
    }
    if (!email && customerSession.email) {
      setEmail(customerSession.email);
    }
    if (!contactNumber && customerSession.phone) {
      setContactNumber(customerSession.phone);
    }
  }, [
    contactNumber,
    customerName,
    customerSession?.email,
    customerSession?.fullName,
    customerSession?.isAuthenticated,
    customerSession?.phone,
    email,
  ]);

  const buildCurrentPayload = (): CustomOrderPayload => ({
    customerName: customerName.trim(),
    contactNumber: contactNumber.trim(),
    email: email.trim() || undefined,
    outfitType,
    outfitDescription: outfitDescription.trim(),
    preferredFabric: preferredFabric.trim() || undefined,
    preferredColor: preferredColor.trim(),
    preferredOccasion,
    budgetNgn: Number.isFinite(parsedBudgetNgn) && parsedBudgetNgn > 0 ? parsedBudgetNgn : undefined,
    preferredDeliveryDate,
    standardSizeReference,
    measurementUnit,
    measurements: {
      bust: bust.trim(),
      waist: waist.trim(),
      hips: hips.trim(),
      shoulder: shoulder.trim(),
      length: length.trim(),
      notes: additionalNotes.trim(),
    },
    additionalNotes: additionalNotes.trim() || undefined,
    referenceImageName: referenceImageName || undefined,
    referenceImagePreviewUrl: referenceImagePreview || undefined,
  });

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setFormErrorSummary('Please upload a valid image file (JPG, PNG, or WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormErrorSummary('Reference image must be under 5MB.');
      return;
    }

    setFormErrorSummary(null);
    setSelectedReferenceFile(file);
    setReferenceImageName(file.name);
    try {
      const compressed = await compressReferenceImageFile(file);
      setReferenceImagePreview(compressed);
    } catch {
      setFormErrorSummary('Unable to read that image file. Please try another photo.');
      setSelectedReferenceFile(null);
      setReferenceImageName('');
      setReferenceImagePreview('');
    }
  };

  const handleRemoveImage = () => {
    setSelectedReferenceFile(null);
    setReferenceImageName('');
    setReferenceImagePreview('');
  };

  const runValidationAndSave = async (): Promise<CustomOrderPayload | null> => {
    if (!customerSession?.isAuthenticated) {
      setFormErrorSummary(
        'Please sign in or create a customer account before submitting a custom outfit request.'
      );
      return null;
    }

    const basePayload = buildCurrentPayload();
    const validation = validateCustomOrderForm(basePayload, todayIso);

    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      setFormErrorSummary(
        validation.firstErrorMessage || 'Please review the highlighted required fields below.'
      );
      return null;
    }

    setFieldErrors({});
    setFormErrorSummary(null);
    setIsSubmitting(true);

    try {
      let submissionPayload: CustomOrderPayload = basePayload;

      if (isSupabaseMode) {
        let uploadedPath: string | undefined;
        let uploadedName = basePayload.referenceImageName;

        if (selectedReferenceFile) {
          const uploaded = await supabaseStorageService.uploadCustomReferenceImage(
            selectedReferenceFile
          );
          uploadedPath = uploaded.storagePath;
          uploadedName = uploaded.fileName;
        }

        submissionPayload = {
          ...basePayload,
          referenceImageName: uploadedName,
          referenceImagePath: uploadedPath,
          referenceImagePreviewUrl: undefined,
        };
      }

      const saved = await (submitCustomOrder
        ? submitCustomOrder(submissionPayload)
        : customOrdersRepository.submitCustomOrder(submissionPayload));
      setSubmittedRecord({
        ...saved,
        referenceImagePreviewUrl: saved.referenceImagePreviewUrl || referenceImagePreview || undefined,
      });
      return saved;
    } catch (err) {
      setFormErrorSummary(
        err instanceof Error && err.message
          ? err.message
          : 'Unable to submit your custom order brief right now. Please try again.'
      );
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const saved = await runValidationAndSave();
    if (saved) {
      showToast(
        `Custom order brief ${saved.referenceCode} sent to ${websiteSettings.brandName} Admin`
      );
    }
  };

  const handleSendFormDirectlyViaWhatsApp = async () => {
    const saved = await runValidationAndSave();
    if (!saved) return;
    const msg = buildCustomOrderWhatsAppMessage(saved);
    openWhatsAppModal('Send Custom Request on WhatsApp', msg);
  };

  const handleShareSubmittedViaWhatsApp = () => {
    if (!submittedRecord) return;
    const msg = buildCustomOrderWhatsAppMessage(submittedRecord);
    openWhatsAppModal('Send Custom Request on WhatsApp', msg);
  };

  const handleResetForm = () => {
    setCustomerName('');
    setContactNumber('');
    setEmail('');
    setOutfitType('Gown');
    setPreferredOccasion(OCCASION_OPTIONS[0]);
    setPreferredFabric('');
    setPreferredColor('');
    setBudgetInput('');
    setOutfitDescription('');
    setPreferredDeliveryDate('');
    setStandardSizeReference('Exact Measurements');
    setBust('');
    setWaist('');
    setHips('');
    setShoulder('');
    setLength('');
    setAdditionalNotes('');
    setSelectedReferenceFile(null);
    setReferenceImageName('');
    setReferenceImagePreview('');
    setFieldErrors({});
    setFormErrorSummary(null);
    setSubmittedRecord(null);
  };

  return (
    <div className="bg-white">
      {/* Header Banner */}
      <section className="bg-[#FAF7F2] border-b border-[#171717]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10 lg:py-14 space-y-5">
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
              <span>Browse Ready-to-Wear Shop</span>
            </button>
          </div>

          <div className="max-w-3xl space-y-3">
            <p className="text-xs font-medium text-[#A68642] tracking-[0.16em] uppercase">
              Made-to-Measure Atelier
            </p>
            <h1 className="font-display text-4xl sm:text-5xl font-medium text-[#171717]">
              Request a Custom-Made Outfit
            </h1>
            <p className="text-sm sm:text-base text-[#171717]/75 leading-relaxed">
              Looking for a bespoke dress, evening gown, two-piece, or traditional ensemble made
              to your exact measurements? Share your outfit vision below. After reviewing your
              brief, the designer will contact you directly to discuss fabric options, final
              pricing, and studio availability.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Main Form or Confirmation Column */}
          <div className="lg:col-span-8">
            {submittedRecord ? (
              <div className="bg-[#FAF7F2] border border-[#171717]/15 p-6 sm:p-10 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 bg-[#171717] text-[#C6A45C] flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-[#A68642] uppercase tracking-wider">
                      {isSupabaseMode
                        ? 'Custom Brief Submitted to Atelier'
                        : 'Custom Brief Prepared & Saved Locally'}
                    </p>
                    <h2 className="font-display text-3xl font-medium text-[#171717]">
                      Thank you, {submittedRecord.customerName}
                    </h2>
                    <p className="text-sm text-[#171717]/70">
                      Reference Code:{' '}
                      <span className="font-semibold text-[#171717] tabular-nums">
                        {submittedRecord.referenceCode}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Honest backend-status notice */}
                <div className="p-4 bg-white border border-[#C6A45C]/50 flex items-start gap-3 text-xs sm:text-sm text-[#171717]/80 leading-relaxed">
                  <Info className="w-4 h-4 text-[#A68642] shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    {isSupabaseMode ? (
                      <p>
                        Your custom order brief has been saved directly to the{' '}
                        {websiteSettings.brandName} studio system
                        {submittedRecord.referenceImagePath
                          ? ' along with your inspiration image in private studio storage'
                          : ''}
                        . Our designer will review your measurements and contact you shortly. You can
                        also forward a copy via WhatsApp below.
                      </p>
                    ) : (
                      <p>
                        Your custom order brief has been saved in your browser for review. Because
                        this preview storefront is not yet connected to a live studio backend, please
                        click <strong>Send Custom Request on WhatsApp</strong> below to forward your
                        details directly to the designer.
                      </p>
                    )}
                    {submittedRecord.referenceImageName && (
                      <p className="mt-2 text-xs text-[#A68642] font-medium">
                        Note on Reference Image: WhatsApp web links cannot attach image files
                        automatically — please attach &ldquo;{submittedRecord.referenceImageName}
                        &rdquo; manually once your WhatsApp chat opens.
                      </p>
                    )}
                  </div>
                </div>

                {/* Summary Card */}
                <div className="bg-white border border-[#171717]/10 p-5 space-y-4 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-[#171717]/55 block">WhatsApp Phone</span>
                      <span className="font-medium text-[#171717]">
                        {submittedRecord.contactNumber}
                      </span>
                    </div>
                    {submittedRecord.email && (
                      <div>
                        <span className="text-xs text-[#171717]/55 block">Email Address</span>
                        <span className="font-medium text-[#171717]">{submittedRecord.email}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-xs text-[#171717]/55 block">Outfit Type</span>
                      <span className="font-medium text-[#171717]">
                        {submittedRecord.outfitType}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-[#171717]/55 block">Preferred Colour</span>
                      <span className="font-medium text-[#171717]">
                        {submittedRecord.preferredColor}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-[#171717]/55 block">Preferred Fabric</span>
                      <span className="font-medium text-[#171717]">
                        {submittedRecord.preferredFabric || 'Open to recommendation'}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-[#171717]/55 block">
                        Preferred Delivery Date
                      </span>
                      <span className="font-medium text-[#171717] tabular-nums">
                        {submittedRecord.preferredDeliveryDate}
                      </span>
                    </div>
                    {typeof submittedRecord.budgetNgn === 'number' &&
                      submittedRecord.budgetNgn > 0 && (
                        <div>
                          <span className="text-xs text-[#171717]/55 block">
                            Estimated Budget
                          </span>
                          <span className="font-medium text-[#171717] tabular-nums">
                            {formatNaira(submittedRecord.budgetNgn)}
                          </span>
                        </div>
                      )}
                  </div>

                  <div>
                    <span className="text-xs text-[#171717]/55 block">Outfit Description</span>
                    <p className="text-[#171717]/85 mt-0.5">{submittedRecord.outfitDescription}</p>
                  </div>

                  <div>
                    <span className="text-xs text-[#171717]/55 block">
                      Sizing &amp; Measurements ({submittedRecord.measurementUnit})
                    </span>
                    <p className="text-xs text-[#171717]/80 mt-0.5 tabular-nums">
                      {submittedRecord.standardSizeReference &&
                      submittedRecord.standardSizeReference !== 'Exact Measurements'
                        ? `Reference Size: ${submittedRecord.standardSizeReference} · `
                        : ''}
                      Bust: {submittedRecord.measurements.bust || '—'} · Waist:{' '}
                      {submittedRecord.measurements.waist || '—'} · Hips:{' '}
                      {submittedRecord.measurements.hips || '—'} · Shoulder:{' '}
                      {submittedRecord.measurements.shoulder || '—'} · Length:{' '}
                      {submittedRecord.measurements.length || '—'}
                    </p>
                  </div>

                  {submittedRecord.additionalNotes && (
                    <div>
                      <span className="text-xs text-[#171717]/55 block">Additional Notes</span>
                      <p className="text-xs text-[#171717]/80 mt-0.5">
                        {submittedRecord.additionalNotes}
                      </p>
                    </div>
                  )}

                  {submittedRecord.referenceImageName && (
                    <div className="flex items-center gap-3 pt-2 border-t border-[#171717]/10">
                      {submittedRecord.referenceImagePreviewUrl && (
                        <img
                          src={submittedRecord.referenceImagePreviewUrl}
                          alt="Uploaded custom outfit reference"
                          className="w-14 h-16 object-cover border border-[#171717]/10"
                        />
                      )}
                      <div>
                        <span className="text-xs text-[#171717]/55 block">Reference Photo</span>
                        <span className="text-xs font-medium text-[#171717]">
                          {submittedRecord.referenceImageName}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleShareSubmittedViaWhatsApp}
                    className="px-6 py-3.5 bg-[#171717] text-white text-sm font-medium hover:bg-[#2a2a2a] transition-colors inline-flex items-center gap-2 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 text-[#C6A45C]" aria-hidden="true" />
                    <span>Send Custom Request on WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="px-5 py-3.5 border border-[#171717]/20 bg-white text-[#171717] text-sm font-medium hover:bg-[#F6F1E8] transition-colors cursor-pointer"
                  >
                    Edit / New Request
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('shop', { category: 'All' })}
                    className="px-5 py-3.5 text-xs font-medium text-[#171717]/75 hover:text-[#171717] underline underline-offset-4 cursor-pointer"
                  >
                    Return to Shop
                  </button>
                </div>
              </div>
            ) : isAuthLoading ? (
              <div className="bg-[#FAF7F2] border border-[#171717]/15 p-8 text-center space-y-3">
                <div className="w-10 h-10 mx-auto bg-[#171717] text-[#C6A45C] flex items-center justify-center">
                  <Lock className="w-4 h-4" aria-hidden="true" />
                </div>
                <p className="font-display text-2xl text-[#171717]">Verifying Account Session</p>
                <p className="text-xs text-[#171717]/65">
                  Checking your customer session before opening the custom brief form...
                </p>
              </div>
            ) : !customerSession?.isAuthenticated ? (
              <div className="bg-[#FAF7F2] border border-[#171717]/15 p-6 sm:p-10 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 bg-[#171717] text-[#C6A45C] flex items-center justify-center shrink-0">
                    <Lock className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A68642]">
                      Customer Account Required
                    </p>
                    <h2 className="font-display text-2xl sm:text-3xl font-medium text-[#171717]">
                      Sign In to Submit a Bespoke Outfit Request
                    </h2>
                    <p className="text-sm text-[#171717]/75 leading-relaxed">
                      To protect your measurements, consultation history, and private inspiration
                      photos, custom made-to-measure requests require a customer account.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('login', { redirectAfterAuth: 'custom-orders' })}
                    className="flex-1 py-3.5 px-6 bg-[#171717] text-white text-sm font-medium hover:bg-[#2a2a2a] transition-colors cursor-pointer"
                  >
                    Sign In to Continue
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('register', { redirectAfterAuth: 'custom-orders' })}
                    className="flex-1 py-3.5 px-6 border border-[#171717]/25 bg-white text-[#171717] text-sm font-medium hover:border-[#C6A45C] transition-colors cursor-pointer"
                  >
                    Create Customer Account
                  </button>
                </div>

                <div className="pt-4 border-t border-[#171717]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-xs text-[#171717]/65">
                    Want to ask a quick question before creating an account?
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      openWhatsAppModal(
                        `Custom Order Enquiry — ${websiteSettings.brandName}`,
                        `Hello ${websiteSettings.brandName}, I would like to enquire about a bespoke custom-made outfit.`
                      )
                    }
                    className="py-2.5 px-4 border border-[#171717]/20 bg-white text-[#171717] text-xs font-medium hover:border-[#C6A45C] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-[#A68642]" aria-hidden="true" />
                    <span>Message Atelier on WhatsApp</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-8">
                <div className="p-3.5 bg-[#FAF7F2] border border-[#171717]/15 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <UserCheck className="w-4 h-4 text-[#A68642] shrink-0" aria-hidden="true" />
                    <span className="text-[#171717]/75 truncate">
                      Submitting as <strong className="text-[#171717]">{customerSession.fullName}</strong>{' '}
                      ({customerSession.email})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await customerLogout();
                      showToast('Signed out');
                    }}
                    className="inline-flex items-center gap-1 text-[#171717]/70 hover:text-red-700 font-medium cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Sign Out</span>
                  </button>
                </div>

                {formErrorSummary && (
                  <div
                    role="alert"
                    className="p-4 bg-red-50 border border-red-200 text-red-900 text-sm"
                  >
                    {formErrorSummary}
                  </div>
                )}

                <p className="text-xs text-[#171717]/60">
                  Fields marked with <span className="text-[#A68642] font-semibold">*</span> are
                  required so the designer can prepare an accurate consultation.
                </p>

                {/* Section 1: Customer Contact Details */}
                <div className="space-y-4">
                  <h2 className="font-display text-2xl font-medium text-[#171717] pb-2 border-b border-[#171717]/10">
                    01. Customer Contact Information
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label
                        htmlFor="custom-name"
                        className="block text-xs font-semibold text-[#171717] mb-1.5"
                      >
                        Full Name <span className="text-[#A68642]">*</span>
                      </label>
                      <input
                        id="custom-name"
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => {
                          setCustomerName(e.target.value);
                          if (fieldErrors.customerName) {
                            setFieldErrors((prev) => ({ ...prev, customerName: undefined }));
                          }
                        }}
                        placeholder="Enter your full name"
                        aria-invalid={Boolean(fieldErrors.customerName)}
                        className={`w-full px-3.5 py-2.5 text-sm border bg-white focus:outline-none ${
                          fieldErrors.customerName
                            ? 'border-red-500 focus:border-red-600'
                            : 'border-[#171717]/20 focus:border-[#C6A45C]'
                        }`}
                      />
                      {fieldErrors.customerName && (
                        <p className="mt-1 text-xs text-red-700">{fieldErrors.customerName}</p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="custom-phone"
                        className="block text-xs font-semibold text-[#171717] mb-1.5"
                      >
                        WhatsApp Phone Number <span className="text-[#A68642]">*</span>
                      </label>
                      <input
                        id="custom-phone"
                        type="tel"
                        required
                        value={contactNumber}
                        onChange={(e) => {
                          setContactNumber(e.target.value);
                          if (fieldErrors.contactNumber) {
                            setFieldErrors((prev) => ({ ...prev, contactNumber: undefined }));
                          }
                        }}
                        placeholder="+234 800 000 0000"
                        aria-invalid={Boolean(fieldErrors.contactNumber)}
                        className={`w-full px-3.5 py-2.5 text-sm border bg-white focus:outline-none ${
                          fieldErrors.contactNumber
                            ? 'border-red-500 focus:border-red-600'
                            : 'border-[#171717]/20 focus:border-[#C6A45C]'
                        }`}
                      />
                      {fieldErrors.contactNumber && (
                        <p className="mt-1 text-xs text-red-700">{fieldErrors.contactNumber}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="custom-email"
                      className="block text-xs font-semibold text-[#171717] mb-1.5"
                    >
                      Email Address{' '}
                      <span className="font-normal text-[#171717]/55">(Optional)</span>
                    </label>
                    <input
                      id="custom-email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (fieldErrors.email) {
                          setFieldErrors((prev) => ({ ...prev, email: undefined }));
                        }
                      }}
                      placeholder="you@example.com"
                      aria-invalid={Boolean(fieldErrors.email)}
                      className={`w-full px-3.5 py-2.5 text-sm border bg-white focus:outline-none ${
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

                {/* Section 2: Outfit Specification */}
                <div className="space-y-4">
                  <h2 className="font-display text-2xl font-medium text-[#171717] pb-2 border-b border-[#171717]/10">
                    02. Outfit Details &amp; Preferences
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label
                        htmlFor="custom-outfit-type"
                        className="block text-xs font-semibold text-[#171717] mb-1.5"
                      >
                        Type of Outfit <span className="text-[#A68642]">*</span>
                      </label>
                      <select
                        id="custom-outfit-type"
                        value={outfitType}
                        onChange={(e) => setOutfitType(e.target.value as CustomOutfitType)}
                        className="w-full px-3.5 py-2.5 text-sm border border-[#171717]/20 bg-white focus:border-[#C6A45C] focus:outline-none"
                      >
                        {OUTFIT_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="custom-occasion"
                        className="block text-xs font-semibold text-[#171717] mb-1.5"
                      >
                        Occasion{' '}
                        <span className="font-normal text-[#171717]/55">(Optional)</span>
                      </label>
                      <select
                        id="custom-occasion"
                        value={preferredOccasion}
                        onChange={(e) => setPreferredOccasion(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm border border-[#171717]/20 bg-white focus:border-[#C6A45C] focus:outline-none"
                      >
                        {OCCASION_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label
                        htmlFor="custom-color"
                        className="block text-xs font-semibold text-[#171717] mb-1.5"
                      >
                        Preferred Colour <span className="text-[#A68642]">*</span>
                      </label>
                      <input
                        id="custom-color"
                        type="text"
                        required
                        value={preferredColor}
                        onChange={(e) => {
                          setPreferredColor(e.target.value);
                          if (fieldErrors.preferredColor) {
                            setFieldErrors((prev) => ({ ...prev, preferredColor: undefined }));
                          }
                        }}
                        placeholder="e.g. Midnight Black & Champagne Gold"
                        aria-invalid={Boolean(fieldErrors.preferredColor)}
                        className={`w-full px-3.5 py-2.5 text-sm border bg-white focus:outline-none ${
                          fieldErrors.preferredColor
                            ? 'border-red-500 focus:border-red-600'
                            : 'border-[#171717]/20 focus:border-[#C6A45C]'
                        }`}
                      />
                      {fieldErrors.preferredColor && (
                        <p className="mt-1 text-xs text-red-700">{fieldErrors.preferredColor}</p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="custom-fabric"
                        className="block text-xs font-semibold text-[#171717] mb-1.5"
                      >
                        Preferred Fabric{' '}
                        <span className="font-normal text-[#171717]/55">(Optional)</span>
                      </label>
                      <input
                        id="custom-fabric"
                        type="text"
                        value={preferredFabric}
                        onChange={(e) => setPreferredFabric(e.target.value)}
                        placeholder="e.g. Silk satin, crepe, lace, aso-oke, jacquard"
                        className="w-full px-3.5 py-2.5 text-sm border border-[#171717]/20 bg-white focus:border-[#C6A45C] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="custom-budget"
                      className="block text-xs font-semibold text-[#171717] mb-1.5"
                    >
                      Estimated Budget (₦){' '}
                      <span className="font-normal text-[#171717]/55">(Optional)</span>
                    </label>
                    <input
                      id="custom-budget"
                      type="number"
                      min="0"
                      step="1000"
                      value={budgetInput}
                      onChange={(e) => setBudgetInput(e.target.value)}
                      placeholder="e.g. 250000"
                      className="w-full sm:max-w-xs px-3.5 py-2.5 text-sm border border-[#171717]/20 bg-white tabular-nums focus:border-[#C6A45C] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="custom-description"
                      className="block text-xs font-semibold text-[#171717] mb-1.5"
                    >
                      Outfit Description <span className="text-[#A68642]">*</span>
                    </label>
                    <textarea
                      id="custom-description"
                      rows={4}
                      required
                      value={outfitDescription}
                      onChange={(e) => {
                        setOutfitDescription(e.target.value);
                        if (fieldErrors.outfitDescription) {
                          setFieldErrors((prev) => ({ ...prev, outfitDescription: undefined }));
                        }
                      }}
                      placeholder="Describe the silhouette, neckline, sleeve design, bodice details, length, or draping style you envision..."
                      aria-invalid={Boolean(fieldErrors.outfitDescription)}
                      className={`w-full px-3.5 py-2.5 text-sm border bg-white focus:outline-none ${
                        fieldErrors.outfitDescription
                          ? 'border-red-500 focus:border-red-600'
                          : 'border-[#171717]/20 focus:border-[#C6A45C]'
                      }`}
                    />
                    {fieldErrors.outfitDescription && (
                      <p className="mt-1 text-xs text-red-700">{fieldErrors.outfitDescription}</p>
                    )}
                  </div>
                </div>

                {/* Section 3: Sizing, Measurements & Preferred Delivery Date */}
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#171717]/10">
                    <h2 className="font-display text-2xl font-medium text-[#171717] inline-flex items-center gap-2">
                      <Ruler className="w-4 h-4 text-[#A68642]" aria-hidden="true" />
                      <span>03. Measurements &amp; Delivery Timeline</span>
                    </h2>

                    <div className="inline-flex border border-[#171717]/15 bg-[#F6F1E8] p-0.5">
                      <button
                        type="button"
                        onClick={() => setMeasurementUnit('inches')}
                        className={`px-3 py-1 text-xs font-medium cursor-pointer ${
                          measurementUnit === 'inches'
                            ? 'bg-[#171717] text-white'
                            : 'text-[#171717]/75'
                        }`}
                      >
                        Inches
                      </button>
                      <button
                        type="button"
                        onClick={() => setMeasurementUnit('cm')}
                        className={`px-3 py-1 text-xs font-medium cursor-pointer ${
                          measurementUnit === 'cm'
                            ? 'bg-[#171717] text-white'
                            : 'text-[#171717]/75'
                        }`}
                      >
                        cm
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label
                        htmlFor="custom-delivery-date"
                        className="block text-xs font-semibold text-[#171717] mb-1.5"
                      >
                        Preferred Delivery Date <span className="text-[#A68642]">*</span>
                      </label>
                      <div className="relative">
                        <Calendar
                          className="w-4 h-4 text-[#171717]/45 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                          aria-hidden="true"
                        />
                        <input
                          id="custom-delivery-date"
                          type="date"
                          min={todayIso}
                          required
                          value={preferredDeliveryDate}
                          onChange={(e) => {
                            setPreferredDeliveryDate(e.target.value);
                            if (fieldErrors.preferredDeliveryDate) {
                              setFieldErrors((prev) => ({
                                ...prev,
                                preferredDeliveryDate: undefined,
                              }));
                            }
                          }}
                          aria-invalid={Boolean(fieldErrors.preferredDeliveryDate)}
                          className={`w-full pl-9 pr-3.5 py-2.5 text-sm border bg-white tabular-nums focus:outline-none ${
                            fieldErrors.preferredDeliveryDate
                              ? 'border-red-500 focus:border-red-600'
                              : 'border-[#171717]/20 focus:border-[#C6A45C]'
                          }`}
                        />
                      </div>
                      {fieldErrors.preferredDeliveryDate && (
                        <p className="mt-1 text-xs text-red-700">
                          {fieldErrors.preferredDeliveryDate}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="custom-standard-size"
                        className="block text-xs font-semibold text-[#171717] mb-1.5"
                      >
                        Standard Size Reference{' '}
                        <span className="font-normal text-[#171717]/55">(Or enter measurements below)</span>
                      </label>
                      <select
                        id="custom-standard-size"
                        value={standardSizeReference}
                        onChange={(e) => {
                          setStandardSizeReference(e.target.value);
                          if (fieldErrors.measurements) {
                            setFieldErrors((prev) => ({ ...prev, measurements: undefined }));
                          }
                        }}
                        className="w-full px-3.5 py-2.5 text-sm border border-[#171717]/20 bg-white focus:border-[#C6A45C] focus:outline-none"
                      >
                        {STANDARD_SIZE_OPTIONS.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#171717]">
                      Body Measurements ({measurementUnit}){' '}
                      <span className="text-[#A68642]">*</span>
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                      <div>
                        <label
                          htmlFor="m-bust"
                          className="block text-xs font-medium text-[#171717]/80 mb-1"
                        >
                          Bust
                        </label>
                        <input
                          id="m-bust"
                          type="text"
                          value={bust}
                          onChange={(e) => {
                            setBust(e.target.value);
                            if (fieldErrors.measurements) {
                              setFieldErrors((prev) => ({ ...prev, measurements: undefined }));
                            }
                          }}
                          placeholder={measurementUnit === 'inches' ? 'e.g. 36' : 'e.g. 91'}
                          className="w-full px-3 py-2 text-sm border border-[#171717]/20 tabular-nums focus:border-[#C6A45C] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="m-waist"
                          className="block text-xs font-medium text-[#171717]/80 mb-1"
                        >
                          Waist
                        </label>
                        <input
                          id="m-waist"
                          type="text"
                          value={waist}
                          onChange={(e) => {
                            setWaist(e.target.value);
                            if (fieldErrors.measurements) {
                              setFieldErrors((prev) => ({ ...prev, measurements: undefined }));
                            }
                          }}
                          placeholder={measurementUnit === 'inches' ? 'e.g. 29' : 'e.g. 74'}
                          className="w-full px-3 py-2 text-sm border border-[#171717]/20 tabular-nums focus:border-[#C6A45C] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="m-hips"
                          className="block text-xs font-medium text-[#171717]/80 mb-1"
                        >
                          Hips
                        </label>
                        <input
                          id="m-hips"
                          type="text"
                          value={hips}
                          onChange={(e) => {
                            setHips(e.target.value);
                            if (fieldErrors.measurements) {
                              setFieldErrors((prev) => ({ ...prev, measurements: undefined }));
                            }
                          }}
                          placeholder={measurementUnit === 'inches' ? 'e.g. 40' : 'e.g. 102'}
                          className="w-full px-3 py-2 text-sm border border-[#171717]/20 tabular-nums focus:border-[#C6A45C] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="m-shoulder"
                          className="block text-xs font-medium text-[#171717]/80 mb-1"
                        >
                          Shoulder
                        </label>
                        <input
                          id="m-shoulder"
                          type="text"
                          value={shoulder}
                          onChange={(e) => setShoulder(e.target.value)}
                          placeholder={measurementUnit === 'inches' ? 'e.g. 15' : 'e.g. 38'}
                          className="w-full px-3 py-2 text-sm border border-[#171717]/20 tabular-nums focus:border-[#C6A45C] focus:outline-none"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label
                          htmlFor="m-length"
                          className="block text-xs font-medium text-[#171717]/80 mb-1"
                        >
                          Length
                        </label>
                        <input
                          id="m-length"
                          type="text"
                          value={length}
                          onChange={(e) => setLength(e.target.value)}
                          placeholder={measurementUnit === 'inches' ? 'e.g. 58' : 'e.g. 147'}
                          className="w-full px-3 py-2 text-sm border border-[#171717]/20 tabular-nums focus:border-[#C6A45C] focus:outline-none"
                        />
                      </div>
                    </div>
                    {fieldErrors.measurements && (
                      <p className="text-xs text-red-700">{fieldErrors.measurements}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="m-notes"
                      className="block text-xs font-semibold text-[#171717] mb-1.5"
                    >
                      Additional Notes{' '}
                      <span className="font-normal text-[#171717]/55">(Optional)</span>
                    </label>
                    <textarea
                      id="m-notes"
                      rows={3}
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      placeholder="Height with heels, preferred sleeve length, modesty coverage, or delivery city..."
                      className="w-full px-3.5 py-2.5 text-sm border border-[#171717]/20 focus:border-[#C6A45C] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Section 4: Reference Image Upload */}
                <div className="space-y-4">
                  <h2 className="font-display text-2xl font-medium text-[#171717] pb-2 border-b border-[#171717]/10">
                    04. Reference Image Upload{' '}
                    <span className="font-sans text-xs font-normal text-[#171717]/55">
                      (Optional)
                    </span>
                  </h2>

                  {referenceImagePreview ? (
                    <div className="p-4 bg-[#FAF7F2] border border-[#171717]/15 flex items-start gap-4">
                      <img
                        src={referenceImagePreview}
                        alt="Uploaded custom outfit reference"
                        className="w-20 h-24 object-cover border border-[#171717]/10 shrink-0"
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm font-medium text-[#171717] truncate">
                          {referenceImageName}
                        </p>
                        <p className="text-xs text-[#171717]/65 leading-relaxed">
                          Photo preview attached to your brief. If you continue to WhatsApp, please
                          attach this photo manually inside the WhatsApp chat because web links
                          cannot transfer image files automatically.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        aria-label="Remove reference image"
                        className="p-2 text-[#171717]/60 hover:text-red-700 cursor-pointer shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-8 border border-dashed border-[#171717]/25 bg-[#FAF7F2] hover:border-[#C6A45C] transition-colors cursor-pointer text-center">
                      <Upload className="w-6 h-6 text-[#A68642] mb-2" aria-hidden="true" />
                      <span className="text-sm font-medium text-[#171717]">
                        Upload inspiration photo or sketch
                      </span>
                      <span className="text-xs text-[#171717]/60 mt-1">
                        JPG, PNG, or WEBP up to 5MB (Optional)
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="sr-only"
                      />
                    </label>
                  )}
                </div>

                {/* Form Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-7 py-3.5 bg-[#171717] text-white text-sm font-medium hover:bg-[#2a2a2a] disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    {isSubmitting ? 'Saving Request...' : 'Save & Review Custom Request'}
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSendFormDirectlyViaWhatsApp}
                    className="px-7 py-3.5 border border-[#171717]/25 bg-white text-[#171717] text-sm font-medium hover:border-[#C6A45C] hover:bg-[#F6F1E8] disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 text-[#A68642]" aria-hidden="true" />
                    <span>Send Custom Request on WhatsApp</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Right Atelier Consultation Guide */}
          <aside className="lg:col-span-4 space-y-6 bg-[#FAF7F2] border border-[#171717]/10 p-6">
            <div className="aspect-[4/3] overflow-hidden bg-[#F6F1E8]">
              <BrandImage
                src={EDITORIAL_IMAGES.atelierCraftsmanship}
                alt="JHOIE SIGNATURES bespoke atelier craftsmanship"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-3">
              <h3 className="font-display text-2xl font-medium text-[#171717]">
                How Bespoke Orders Work
              </h3>
              <p className="text-xs sm:text-sm text-[#171717]/75 leading-relaxed">
                Every custom outfit is tailored individually. Once you share your design brief and
                measurements, the designer will contact you directly to discuss fabric selection,
                production timelines, final pricing, and fitting availability.
              </p>
              <ul className="space-y-2 text-xs text-[#171717]/75 pt-3 border-t border-[#171717]/10">
                <li>• No payment is collected on this form.</li>
                <li>• Custom pricing is confirmed after fabric and design consultation.</li>
                <li>• Standard size reference or exact measurements supported.</li>
              </ul>
            </div>

            <div className="pt-3 border-t border-[#171717]/10 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => navigate('shop', { category: 'All' })}
                className="w-full py-2.5 px-4 bg-white border border-[#171717]/15 text-xs font-medium text-[#171717] hover:border-[#171717] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Explore Ready-to-Wear Shop</span>
              </button>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
