import { Sparkles } from 'lucide-react';
import { useState } from 'react';

interface BrandImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
  priority?: boolean;
}

export function BrandImage({
  src,
  alt,
  className = '',
  fallbackLabel = 'JHOIE SIGNATURES',
  priority = false,
}: BrandImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const resolvedSrc = src.startsWith('/src/assets/images/')
    ? src.replace('/src/assets/images/', '/images/')
    : src;
  const hasError = !resolvedSrc || failedSrc === resolvedSrc;

  if (hasError) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#F6F1E8] via-[#EFE7D8] to-[#E5D9C3] text-[#171717] p-6 text-center ${className}`}
      >
        <div className="w-10 h-10 border border-[#C6A45C]/60 flex items-center justify-center mb-3">
          <Sparkles className="w-4 h-4 text-[#A68642]" aria-hidden="true" />
        </div>
        <span className="font-display text-lg tracking-wide text-[#171717]">
          {fallbackLabel}
        </span>
        <span className="mt-1 text-xs text-[#171717]/60">Placeholder Lookbook Frame</span>
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      loading={priority ? 'eager' : 'lazy'}
      onError={() => setFailedSrc(resolvedSrc)}
      className={className}
    />
  );
}
