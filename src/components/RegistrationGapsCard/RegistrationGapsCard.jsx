import SpotlightCard from '../SpotlightCard/SpotlightCard';
import { Grid3x3 } from 'lucide-react';

export function RegistrationGapsCard() {
  return (
    <SpotlightCard className="neo-brutalist h-full">
      <div className="flex h-full flex-col">
        <div className="mb-3 rounded-full p-2.5 w-fit" style={{ background: 'var(--hover-bg, var(--surface))' }}>
          <Grid3x3 className="h-4 w-4" style={{ color: 'var(--soft-text)' }} />
        </div>

        <h3 className="mb-2 sm:mb-3 text-sm sm:text-lg" style={{ color: 'var(--text)' }}>
          Registration gaps.
        </h3>

        <div className="flex-1 leading-relaxed text-xs sm:text-sm" style={{ color: 'var(--soft-text)' }}>
          <p>
            Every territory where you are not registered is a territory where you are not collecting. Missing society
            accounts, incomplete metadata, unregistered works. Multiply that across your catalog and the leaks add up
            fast. Most people do not even know where the gaps are.
          </p>
        </div>
      </div>
    </SpotlightCard>
  );
}
