import { PlatformLogo } from '../../PlatformLogo';
import { INTEGRATIONS } from '../content/siteContent';

/** Platform logoları — sabit kurumsal şerit */
export function IntegrationMarquee() {
  return (
    <div className="relative py-2">
      <div className="landing-marquee-track flex items-center gap-4 md:gap-6">
        {INTEGRATIONS.map((item) => (
          <div
            key={item.code}
            className="flex shrink-0 items-center justify-center rounded-xl border border-orange-100 bg-white px-6 py-4 min-h-[64px] min-w-[140px]"
          >
            <PlatformLogo code={item.code} name={item.name} size="md" />
          </div>
        ))}
      </div>
    </div>
  );
}
