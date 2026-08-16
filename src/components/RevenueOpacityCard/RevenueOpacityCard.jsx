import SpotlightCard from '../SpotlightCard/SpotlightCard';
import { FileText } from 'lucide-react';

export function RevenueOpacityCard() {
  return (
    <SpotlightCard className="neo-brutalist h-full">
      <div className="flex h-full flex-col">
        <div className="mb-3 rounded-full p-2.5 w-fit" style={{ background: 'var(--hover-bg, var(--surface))' }}>
          <FileText className="h-4 w-4" style={{ color: 'var(--soft-text)' }} />
        </div>

        <h3 className="mb-2 sm:mb-3 text-sm sm:text-lg" style={{ color: 'var(--text)' }}>
          Revenue opacity.
        </h3>

        <div className="flex-1 leading-relaxed text-xs sm:text-sm" style={{ color: 'var(--soft-text)' }}>
          <p>
            You get summaries. Maybe you get CSVs. Either way you are looking at numbers without context. No breakdown
            by platform, territory, or song. No way to spot what is wrong. RD turns raw transaction data into
            something you can actually read, compare, and act on.
          </p>
        </div>
      </div>
    </SpotlightCard>
  );
}
