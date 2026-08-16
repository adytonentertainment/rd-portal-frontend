import SpotlightCard from '../SpotlightCard/SpotlightCard';
import { Clock } from 'lucide-react';

export function AdminOverloadCard() {
  return (
    <SpotlightCard className="neo-brutalist h-full">
      <div className="flex h-full flex-col">
        <div className="mb-3 rounded-full p-2.5 w-fit" style={{ background: 'var(--hover-bg, var(--surface))' }}>
          <Clock className="h-4 w-4" style={{ color: 'var(--soft-text)' }} />
        </div>

        <h3 className="mb-2 sm:mb-3 text-sm sm:text-lg" style={{ color: 'var(--text)' }}>
          Admin overload.
        </h3>

        <div className="flex-1 leading-relaxed text-xs sm:text-sm" style={{ color: 'var(--soft-text)' }}>
          <p>
            Society logins. Quarterly deadlines. Metadata updates. Registration follow ups. For one person this is a
            full time job. For a small publisher it is three. RD compresses hours of admin into minutes.
          </p>
        </div>
      </div>
    </SpotlightCard>
  );
}
