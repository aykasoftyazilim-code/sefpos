import type { FeatureItem } from '../content/siteContent';

export function FeatureCard({ icon: Icon, title, desc, tag }: FeatureItem) {
  return (
    <article className="relative bg-white rounded-xl border border-orange-100 p-6 hover:border-orange-300 hover:shadow-md hover:shadow-orange-500/10 transition-all">
      {tag && (
        <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
          {tag}
        </span>
      )}
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mb-4 shadow-sm">
        <Icon className="w-5 h-5 text-white" strokeWidth={2} />
      </div>
      <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 text-sm leading-relaxed">{desc}</p>
    </article>
  );
}
