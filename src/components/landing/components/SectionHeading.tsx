interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  light?: boolean;
}

export function SectionHeading({ eyebrow, title, subtitle, align = 'center', light }: SectionHeadingProps) {
  const alignClass = align === 'center' ? 'text-center mx-auto' : 'text-left';
  return (
    <div className={`max-w-3xl mb-12 md:mb-16 ${alignClass}`}>
      {eyebrow && (
        <p className={`text-[11px] font-bold uppercase tracking-[0.18em] mb-3 ${light ? 'text-orange-300' : 'text-orange-500'}`}>
          {eyebrow}
        </p>
      )}
      <h2 className={`text-3xl md:text-4xl font-extrabold tracking-tight leading-tight ${light ? 'text-white' : 'text-slate-900'}`}>
        {title}
      </h2>
      {subtitle && (
        <p className={`mt-4 text-base md:text-lg leading-relaxed ${light ? 'text-slate-300' : 'text-slate-500'}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
