import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import NavBar from '../../components/NavBar/NavBar';
import { IoIosCheckmark } from 'react-icons/io';
import { RxCross2 } from 'react-icons/rx';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import urlJoin from 'url-join';
import s from './pricing.module.css';

const Pricing = () => {
  const [timeInterval, setTimeInterval] = useState('monthly');
  const [currentUserTier, setCurrentUserTier] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [solutionType, setSolutionType] = useState('artists');
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [changeLoading, setChangeLoading] = useState(false);
  const [pendingTier, setPendingTier] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserSubscription();
  }, []);

  const fetchUserSubscription = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios({
        url: urlJoin(process.env.REACT_APP_BACKEND_URL, '/stripe/subscription'),
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 200 && response.data) {
        setCurrentUserTier(response.data.tier?.toLowerCase());
      }
    } catch (error) {
      console.error('Failed to fetch user subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuySubscription = async (type) => {
    const token = localStorage.getItem('token');

    if (currentUserTier && currentUserTier !== 'free') {
      setPendingTier(type);
      setPreviewLoading(true);
      setShowChangeModal(true);
      setPreviewData(null);

      const interval = timeInterval === 'yearly' ? 'year' : 'month';
      try {
        const response = await axios({
          url: urlJoin(
            process.env.REACT_APP_BACKEND_URL,
            `/stripe/preview-tier-change?tier=${type}&interval=${interval}`
          ),
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.status === 200) {
          setPreviewData(response.data);
        }
      } catch (error) {
        console.error('Failed to preview tier change:', error);
        setShowChangeModal(false);
      } finally {
        setPreviewLoading(false);
      }
      return;
    }

    const checkoutInterval = timeInterval === 'yearly' ? 'year' : 'month';
    try {
      const response = await axios({
        url: urlJoin(
          process.env.REACT_APP_BACKEND_URL,
          `/stripe/checkout-session?redirect_url=${encodeURIComponent(urlJoin(process.env.REACT_APP_FRONTEND_URL, 'subscription-activated'))}&tier=${type}&interval=${checkoutInterval}`
        ),
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = response.data;
      if (response.status === 200) {
        window.location.href = data;
      }
    } catch (error) {
      console.error(error);
      navigate(`/login?redirect=${encodeURIComponent(window.location.href)}`);
    }
  };

  const handleConfirmChange = async () => {
    if (!pendingTier || changeLoading) return;
    setChangeLoading(true);

    const token = localStorage.getItem('token');
    const interval = timeInterval === 'yearly' ? 'year' : 'month';
    try {
      const response = await axios({
        url: urlJoin(
          process.env.REACT_APP_BACKEND_URL,
          `/stripe/checkout-session?redirect_url=${encodeURIComponent(urlJoin(process.env.REACT_APP_FRONTEND_URL, 'subscription-activated'))}&tier=${pendingTier}&interval=${interval}`
        ),
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 200) {
        setShowChangeModal(false);
        navigate('/subscription-activated');
      }
    } catch (error) {
      console.error('Failed to change subscription:', error);
    } finally {
      setChangeLoading(false);
    }
  };

  const handleContactSales = () => {
    window.location.href = 'mailto:contact@verax.com?subject=Enterprise Solution Inquiry';
  };

  const closeModal = () => {
    if (!changeLoading) {
      setShowChangeModal(false);
      setPendingTier(null);
      setPreviewData(null);
    }
  };

  const prices = {
    monthly: {
      essential: '10',
      pro: '30',
      elite: '75',
      enterprise: '300',
    },
    yearly: {
      essential: '96',
      pro: '288',
      elite: '720',
      enterprise: '2880',
    },
  };

  const getButtonText = (tierKey, defaultText) => {
    if (!currentUserTier || currentUserTier === 'free') {
      return defaultText;
    }
    if (currentUserTier === tierKey) {
      return 'Current Plan';
    }
    return `Change to ${tierKey.charAt(0).toUpperCase() + tierKey.slice(1)}`;
  };

  const allTiers = [
    {
      name: 'Essential',
      tagline: 'For emerging artists',
      price: prices[timeInterval]['essential'],
      originalPrice: timeInterval === 'yearly' ? '120' : null,
      features: [
        '10 scans per month',
        'Up to 20 songs in catalog',
        'Basic analytics dashboard',
        'Email support',
        '$1 per additional scan',
      ],
      popular: false,
      buttonText: getButtonText('essential', 'Get Started'),
      tierKey: 'essential',
      isCurrentPlan: currentUserTier === 'essential',
      category: 'artists',
    },
    {
      name: 'Pro',
      tagline: 'For growing creators',
      price: prices[timeInterval]['pro'],
      originalPrice: timeInterval === 'yearly' ? '360' : null,
      features: [
        '30 scans per month',
        'Up to 50 songs in catalog',
        'Earnings dashboard',
        'Registration audits',
        'Statement audits',
        'Priority email support',
      ],
      popular: true,
      buttonText: getButtonText('pro', 'Go Pro'),
      tierKey: 'pro',
      isCurrentPlan: currentUserTier === 'pro',
      category: 'artists',
    },
    {
      name: 'Elite',
      tagline: 'For professional artists',
      price: prices[timeInterval]['elite'],
      originalPrice: timeInterval === 'yearly' ? '900' : null,
      features: [
        '50 scans per month',
        'Up to 250 songs in catalog',
        'Premium analytics suite',
        'Priority support',
        'Custom reports',
        'Request access to our APIs',
      ],
      popular: false,
      buttonText: getButtonText('elite', 'Go Elite'),
      tierKey: 'elite',
      isCurrentPlan: currentUserTier === 'elite',
      category: 'artists',
    },
    {
      name: 'Enterprise',
      tagline: 'For labels & publishers',
      price: prices[timeInterval]['enterprise'],
      originalPrice: timeInterval === 'yearly' ? '2400' : null,
      features: [
        '1000 scans per month',
        'Up to 10000 songs in catalog',
        'Full analytics platform',
        'Dedicated account manager',
        'Custom integrations',
        'White-label options',
        'SLA guarantee',
      ],
      popular: false,
      buttonText: getButtonText('enterprise', 'Go Enterprise'),
      tierKey: 'enterprise',
      isCurrentPlan: currentUserTier === 'enterprise',
      category: 'enterprise',
    },
    {
      name: 'Custom',
      tagline: 'Tailored to your needs',
      price: null,
      originalPrice: null,
      features: [
        'Unlimited scans',
        'Unlimited songs in catalog',
        'Full white-label solution',
        'Custom integrations',
        'Dedicated infrastructure',
        'Enterprise SLA',
        '24/7 priority support',
        'Custom pricing',
      ],
      popular: false,
      buttonText: 'Contact Sales',
      tierKey: 'custom',
      isCustom: true,
      category: 'enterprise',
    },
  ];

  const betaAllowedTiers = process.env.REACT_APP_BETA_ALLOWED_TIERS
    ? process.env.REACT_APP_BETA_ALLOWED_TIERS.split(',').map((t) => t.trim().toLowerCase())
    : null;

  const displayedTiers = allTiers.filter((tier) => {
    if (tier.category !== solutionType) return false;
    if (betaAllowedTiers && !tier.isCustom) {
      return betaAllowedTiers.includes(tier.tierKey);
    }
    return true;
  });

  const isArtists = solutionType === 'artists';

  return (
    <div className={s.page}>
      <Helmet>
        <title>RD - Pricing</title>
      </Helmet>
      <NavBar />

      <div className={s.content}>
        <h1 className={s.title}>Choose Your Plan</h1>
        <p className={s.subtitle}>
          Choose the plan that fits your needs — whether you're an individual artist or a growing enterprise. All plans
          are billed monthly or yearly, with no hidden fees.
        </p>

        {/* Toggles */}
        <div className={s.toggleGroup}>
          {/* Solution type */}
          <div className={s.toggle}>
            <button
              className={`${s.toggleOption} ${isArtists ? s.toggleOptionActive : ''}`}
              onClick={() => setSolutionType('artists')}
            >
              For Artists
            </button>
            <button
              className={`${s.toggleOption} ${!isArtists ? s.toggleOptionActive : ''}`}
              onClick={() => setSolutionType('enterprise')}
            >
              For Enterprises
            </button>
          </div>

          {/* Billing interval */}
          <div className={s.toggle}>
            <button
              className={`${s.toggleOption} ${timeInterval === 'monthly' ? s.toggleOptionActive : ''}`}
              onClick={() => setTimeInterval('monthly')}
            >
              Monthly
            </button>
            <button
              className={`${s.toggleOption} ${timeInterval === 'yearly' ? s.toggleOptionActive : ''}`}
              onClick={() => setTimeInterval('yearly')}
            >
              Yearly
              <span className={s.saveBadge}>SAVE 20%</span>
            </button>
          </div>
        </div>

        {/* Cards */}
        {isLoading ? (
          <div className={s.loadingCenter}>
            <div className={s.spinner} />
          </div>
        ) : (
          <div className={`${s.cardGrid} ${!isArtists ? s.cardGrid2 : ''}`}>
            {displayedTiers.map((tier) => {
              const highlighted = tier.popular || tier.isCurrentPlan;
              return (
                <div key={tier.name} className={`${s.card} ${highlighted ? s.cardHighlighted : ''}`}>
                  {highlighted && <div className={s.badge}>{tier.isCurrentPlan ? 'Current Plan' : 'Most Popular'}</div>}

                  <div className={s.cardBody}>
                    <div className={s.tierName}>{tier.name}</div>
                    <div className={s.tierTagline}>{tier.tagline}</div>

                    {/* Price */}
                    <div className={s.priceRow}>
                      {tier.isCustom ? (
                        <div className={s.priceCustom}>Let's Talk</div>
                      ) : (
                        <>
                          <span className={s.price}>${tier.price}</span>
                          <span className={s.priceInterval}>/{timeInterval === 'yearly' ? 'year' : 'mo'}</span>
                          {tier.originalPrice && (
                            <div className={s.priceSave}>
                              <span className={s.priceOriginal}>${tier.originalPrice}</span>
                              <span className={s.priceSaveAmount}>
                                Save ${parseInt(tier.originalPrice) - parseInt(tier.price)}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Features */}
                    <div className={s.features}>
                      {tier.features.map((feature, i) => (
                        <div key={i} className={s.feature}>
                          <IoIosCheckmark size={16} className={s.featureIcon} />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA */}
                  <div className={s.cardFooter}>
                    <button
                      className={`${s.ctaButton} ${
                        tier.popular ? s.ctaPrimary : ''
                      } ${tier.isCurrentPlan ? s.ctaDisabled : ''}`}
                      onClick={() =>
                        tier.isCustom
                          ? handleContactSales()
                          : tier.isCurrentPlan
                            ? null
                            : handleBuySubscription(tier.tierKey)
                      }
                      disabled={tier.isCurrentPlan}
                    >
                      {tier.buttonText}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* FAQ */}
        <p className={s.faqHint}>
          Questions? Check our{' '}
          <Link to="/faq" className={s.faqLink}>
            FAQ
          </Link>{' '}
          or{' '}
          <Link to="/contact" className={s.faqLink}>
            contact support
          </Link>
        </p>
      </div>

      {/* Tier Change Modal */}
      {showChangeModal && (
        <div className={s.modalOverlay} onClick={closeModal}>
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <button className={s.modalClose} onClick={closeModal}>
              <RxCross2 size={16} />
            </button>

            {previewLoading ? (
              <div className={s.loadingCenter}>
                <div className={s.spinner} />
              </div>
            ) : previewData ? (
              <>
                <h2 className={s.modalTitle}>Change to {previewData.new_tier}?</h2>

                {/* Plan comparison */}
                <div className={s.planCompare}>
                  <div className={s.planBox}>
                    <div className={s.planBoxLabel}>Current</div>
                    <div className={s.planBoxTier}>{previewData.current_tier}</div>
                    <div className={s.planBoxPrice}>
                      ${previewData.current_price.toFixed(2)}/{previewData.current_interval === 'year' ? 'yr' : 'mo'}
                    </div>
                  </div>

                  <span className={s.planArrow}>→</span>

                  <div className={`${s.planBox} ${s.planBoxNew}`}>
                    <div className={`${s.planBoxLabel} ${s.planBoxNewLabel}`}>New</div>
                    <div className={s.planBoxTier}>{previewData.new_tier}</div>
                    <div className={s.planBoxPrice}>
                      ${previewData.new_price.toFixed(2)}/{previewData.new_interval === 'year' ? 'yr' : 'mo'}
                    </div>
                  </div>
                </div>

                {/* Proration */}
                <div className={s.prorationBox}>
                  <div className={s.prorationRow}>
                    <span className={s.prorationLabel}>Proration adjustment</span>
                    <span className={s.prorationValue}>
                      {previewData.proration_amount >= 0 ? '' : '-'}${Math.abs(previewData.proration_amount).toFixed(2)}
                    </span>
                  </div>
                  <hr className={s.prorationDivider} />
                  <div className={s.prorationRow}>
                    <span className={s.prorationValue}>Due now</span>
                    <span className={s.prorationTotal}>${previewData.amount_due.toFixed(2)}</span>
                  </div>
                </div>

                <p className={s.modalNote}>
                  Starting {previewData.next_billing_date}, you'll be billed ${previewData.new_price.toFixed(2)}/
                  {previewData.new_interval === 'year' ? 'year' : 'month'}.
                </p>

                {/* Buttons */}
                <div className={s.modalButtons}>
                  <button className={s.modalButtonCancel} onClick={closeModal} disabled={changeLoading}>
                    Cancel
                  </button>
                  <button className={s.modalButtonConfirm} onClick={handleConfirmChange} disabled={changeLoading}>
                    {changeLoading ? 'Processing...' : 'Confirm Change'}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default Pricing;
