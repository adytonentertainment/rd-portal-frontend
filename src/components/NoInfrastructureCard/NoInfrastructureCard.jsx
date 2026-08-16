import SpotlightCard from '../SpotlightCard/SpotlightCard';
import { Scale } from 'lucide-react';

export function NoInfrastructureCard() {
  return (
    <SpotlightCard className="neo-brutalist h-full">
      <div className="flex h-full flex-col">
        <div className="mb-3 rounded-full p-2.5 w-fit" style={{ background: 'var(--hover-bg, var(--surface))' }}>
          <Scale className="h-4 w-4" style={{ color: 'var(--soft-text)' }} />
        </div>

        <h3 className="mb-2 sm:mb-3 text-sm sm:text-lg" style={{ color: 'var(--text)' }}>
          No infrastructure, no leverage.
        </h3>

        <div className="flex-1 leading-relaxed text-xs sm:text-sm" style={{ color: 'var(--soft-text)' }}>
          <p>
            Without systems, creators depend on whoever offers them a deal. Publishers depend on manual processes that
            break at scale. Both problems have the same solution.
          </p>
        </div>
      </div>
    </SpotlightCard>
  );
}
