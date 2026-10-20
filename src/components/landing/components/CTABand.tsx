import { ArrowRight } from 'lucide-react';

interface CTABandProps {
  title: string;
  subtitle: string;
  onPrimary: () => void;
  onSecondary?: () => void;
  primaryLabel?: string;
  secondaryLabel?: string;
}

export function CTABand({
  title,
  subtitle,
  onPrimary,
  onSecondary,
  primaryLabel = 'Ücretsiz Dene',
  secondaryLabel = 'Bizi Arayın',
}: CTABandProps) {
  return (
    <section className="relative py-16 md:py-20 bg-gradient-to-r from-orange-500 via-orange-600 to-red-600">
      <div className="relative max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight">{title}</h2>
        <p className="text-base text-orange-50 mb-8 max-w-2xl mx-auto leading-relaxed">{subtitle}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={onPrimary}
            className="inline-flex items-center justify-center gap-2 bg-white text-orange-700 font-bold px-6 py-3 rounded-xl hover:bg-orange-50 transition shadow-lg"
          >
            {primaryLabel}
            <ArrowRight className="w-4 h-4" />
          </button>
          {onSecondary && (
            <button
              type="button"
              onClick={onSecondary}
              className="inline-flex items-center justify-center gap-2 border-2 border-white/70 text-white font-bold px-6 py-3 rounded-xl hover:bg-white/10 transition"
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
