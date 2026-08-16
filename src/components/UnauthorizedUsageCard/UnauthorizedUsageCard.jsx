import SpotlightCard from '../SpotlightCard/SpotlightCard';
import { Radio } from 'lucide-react';

export function UnauthorizedUsageCard() {
  return (
    <SpotlightCard className="neo-brutalist h-full">
      <div className="flex h-full flex-col">
        <div className="mb-3 rounded-full p-2.5 w-fit" style={{ background: 'var(--hover-bg, var(--surface))' }}>
          <Radio className="h-4 w-4" style={{ color: 'var(--soft-text)' }} />
        </div>

        <h3 className="mb-2 sm:mb-3 text-sm sm:text-lg" style={{ color: 'var(--text)' }}>
          Unauthorized usage.
        </h3>

        <div className="flex-1 leading-relaxed text-xs sm:text-sm" style={{ color: 'var(--soft-text)' }}>
          <p>
            Your music is being played on radio, broadcast on TV, streamed on DSPs without your knowledge. RD uses
            fingerprinting to detect usage you were never notified about and surfaces it so you can claim what is owed.
          </p>
        </div>
      </div>
    </SpotlightCard>
  );
}
