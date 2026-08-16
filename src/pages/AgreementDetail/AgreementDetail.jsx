import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  FaArrowLeft,
  FaFileAlt,
  FaSync,
  FaExclamationTriangle,
  FaChevronDown,
  FaChevronUp,
  FaInfoCircle,
  FaDownload,
  FaRedo,
  FaEye,
  FaCogs,
  FaBolt,
} from 'react-icons/fa';
import { CircularProgress, Tooltip } from '@mui/material';
import { Breadcrumbs, BreadcrumbItem } from '@heroui/react';
import Sidebar from '../../components/Sidebar/Sidebar';
import styles from './agreementDetail.module.css';

const AGREEMENT_TYPES = ['producer agreement', 'publishing', 'management'];

// Red flag explanations for each field (publishing/general agreements)
const RED_FLAG_EXPLANATIONS = {
  mechanical_domestic:
    'Mechanical royalty rate is below 50%. Industry standard for publishing is 75-85%. ' +
    'This severely limits your income from streaming and downloads.',
  mechanical_international:
    'International mechanical rate is below 50%. You may be leaving significant foreign income on the table.',
  performance_domestic:
    'Performance royalty rate is below 50%. This dramatically reduces your income from radio, TV, and public performances.',
  performance_international:
    'International performance rate is below 50%. Foreign performance income can be substantial - this rate is predatory.',
  sync:
    'Sync licensing rate is below 50%. Sync placements in film/TV/ads can be highly lucrative - ' +
    'this rate significantly undervalues your work.',
  audit_window:
    'Audit window is less than 2 years or not specified. This means you lose the right to audit older ' +
    'royalty statements, making it nearly impossible to recover underpayments.',
  audit_costs:
    'Artist pays ALL audit costs regardless of outcome. This discourages you from ever auditing, even if ' +
    'significant underpayments exist. Industry standard: company pays if discrepancy exceeds 5-10%.',
  audit_frequency:
    'Audit frequency is too restrictive. You should be able to audit at least once per year to catch underpayments early.',
  statement_frequency:
    'Statement frequency is too infrequent. Quarterly statements are industry standard - ' +
    'anything less makes it harder to track your earnings.',
  objection_period:
    'Objection period is too short or not specified. You may lose the right to dispute incorrect statements ' +
    'before you can even review them.',
  term: 'Term length is excessively long or perpetual. You may be locked into unfavorable terms for decades with no exit.',
  collection_period:
    'Collection period exceeds 2 years. The company retains rights to collect (and take their cut) ' +
    'long after the agreement ends.',
  expiration_date:
    'Life of copyright or perpetual term with no termination rights. You permanently lose control of your works.',
  approvals:
    'No approval rights for licensing. Your music could be used in contexts you find objectionable without your consent.',
  subtype: 'Full publishing or perpetual rights transfer. You are signing away ownership of your songs permanently.',
  advance: 'Advance terms are predatory with excessive recoupment provisions.',
  exclusivity: 'Exclusive rights with overly broad restrictions limiting your career options.',
  other: 'Other royalty terms contain predatory provisions that significantly reduce your income.',
  master: 'Master royalty rate is below industry standard. This significantly reduces your recording income.',
};

// Red flag explanations specific to producer agreements - includes all 18 RF codes
const PRODUCER_RED_FLAG_EXPLANATIONS = {
  // CRITICAL RED FLAGS (RF01-RF06)
  RF01:
    'FRACTION/FORMULA ROYALTY: Your royalty is calculated as a fraction of the artist rate, not a direct percentage. ' +
    'This means your stated 2% could effectively become 0.1% after the fraction is applied. ' +
    'Negotiate for a direct percentage instead.',
  RF02:
    'BLIND EXTERNAL REFERENCE: The agreement references another document (like "per Recording Agreement") that was not provided. ' +
    'You cannot evaluate terms you cannot see. Request all referenced documents before signing.',
  RF03:
    "NO AUDIT RIGHTS: This agreement contains no provision for you to audit the company's books. " +
    'Without audit rights, you have no way to verify your royalty calculations are correct. This is a dealbreaker.',
  RF04:
    'UNLIMITED INDEMNITY WITHHOLDING: The company can withhold your payments indefinitely for "potential liability" ' +
    'with no cap on amount or time. Your money could be held hostage forever. Negotiate caps and time limits.',
  RF05:
    'NET ZERO ADVANCE: After deductions, your actual advance is zero or negative. ' +
    'The stated advance sounds good but you receive nothing upfront. Negotiate for a true net advance.',
  RF06:
    'DOUBLE RECOUPMENT GATE: You only get paid after multiple conditions are met (e.g., artist recoups AND video costs recouped). ' +
    'Each gate makes payment less likely. Negotiate for single recoupment or direct payment.',

  // HIGH RED FLAGS (RF07-RF09)
  RF07:
    'STACKED UNDEFINED DEDUCTIONS: Multiple vague deductions like "proportionate reductions" and "territorial diminutions" ' +
    'can compound to reduce your royalty by 50-80%. Negotiate for specific, capped deductions.',
  RF08:
    'SYNC SHARE VIA FRACTION: Your sync licensing income is calculated using the same fraction formula as royalties. ' +
    'Your "50% of sync" could become 5% effective. Negotiate for direct sync percentage.',
  RF09:
    'AUDIO-VISUAL REDUCTION: Your royalty is reduced by an additional 50% for music videos and visual content. ' +
    'Combined with other deductions, AV royalties may be nearly worthless. Negotiate to remove this reduction.',

  // MEDIUM RED FLAGS (RF10-RF18)
  RF10:
    'ESCALATION EXCLUDED: The agreement explicitly excludes escalation provisions that would increase your rate ' +
    'as sales hit milestones. You miss out on higher rates for successful releases.',
  RF11:
    'SHORT OBJECTION PERIOD: You have less than 1 year to dispute incorrect royalty statements. ' +
    'Given quarterly reporting, you may not catch errors before losing the right to object.',
  RF12:
    'HIGH PAYMENT THRESHOLD: Payments are only made when owed amount exceeds £200+. ' +
    'Your earnings could accumulate for years before you see any payment.',
  RF13:
    'UNLIMITED REMIX RIGHTS: The licensee can create unlimited remixes and versions without additional payment. ' +
    'Your work could spawn dozens of derivatives you receive nothing extra for.',
  RF14:
    'PRO-RATA COMPILATION: Your royalty is divided by the number of tracks on compilations. ' +
    'A 2% rate becomes 0.13% on a 15-track compilation. Negotiate floor rates for compilations.',
  RF15:
    'REVERSIONARY RIGHTS WAIVED: You have waived your US legal right to reclaim your copyright after 35 years (Section 203). ' +
    'This is a permanent surrender of an important protection. Never waive reversionary rights.',
  RF16:
    'VIDEO RECOUPMENT GATE: You receive no royalties from music videos until video production costs are fully recouped. ' +
    'Expensive videos may never recoup, meaning you never see video royalties.',
  RF17:
    'ALL SERVICES BUNDLED: Additional services like mixing, engineering, or vocals are included without extra compensation. ' +
    'You are providing skilled work for free. Negotiate separate fees for additional services.',
  RF18:
    'UNKNOWN DEADLINES: Your obligations are tied to undefined deadlines like "Company\'s deadline" or "reasonable time". ' +
    'You cannot plan your work when you do not know when things are due. Request specific dates.',

  // Legacy field-based explanations (for backwards compatibility)
  base_rate:
    'Producer points are below 2% or non-existent. Industry standard is 3-5%. ' +
    'Without proper points, you miss out on ongoing royalty income from the master.',
  producer_fee:
    'Producer fee is significantly below market rate for the scope of work. ' +
    'Ensure you are being fairly compensated for your production services.',
  total_advance: 'No advance provided. An advance helps cover your costs and shows commitment from the hiring party.',
  recoupable_amount:
    'Advance is fully recoupable with cross-collateralization. This means losses from other projects ' +
    'can eat into your royalties from successful productions.',
  recoupable_advance:
    'Advance is cross-collateralized with other projects. This means losses from other recordings ' +
    'can reduce or eliminate your royalties from this production, even if it is successful.',
  work_for_hire:
    'Work-for-hire agreement with no additional compensation. You permanently give up ALL rights to the music ' +
    'with no ongoing royalties. Only accept if the upfront fee is substantial.',
  master_ownership:
    'Full master ownership transferred to label/artist with no reversion rights. ' +
    'You lose all control and ongoing benefit from the recordings you created.',
  composition_rights:
    'No composition/publishing rights retained. If you contributed to the songwriting, ' +
    'you should retain your co-writer share and publishing participation.',
  letter_of_direction:
    'No Letter of Direction (LOD) included. Without an LOD, you must chase the artist for payment rather than ' +
    'getting paid directly by the label. This is a critical protection for producers.',
  reversion_rights:
    'No reversion rights if master is not released. You could create music that sits unreleased forever ' +
    'while you cannot use or re-license your own work.',
  audit_window:
    'Audit window is less than 2 years. This limits your ability to verify royalty calculations and recover underpayments.',
  audit_costs:
    'Producer pays all audit costs. This discourages auditing even when underpayments exist. ' +
    'Industry standard: company pays if discrepancy exceeds 10%.',
  audit_rights:
    'No audit rights specified. Without the ability to audit, you cannot verify your royalty calculations are correct.',
  credit_format:
    'No credit obligation specified. Proper credit is essential for building your reputation and portfolio.',
  all_in_fund:
    'Producer royalties paid from artist all-in fund. Your payment depends on artist recoupment - ' +
    'if the artist never recoups, you may never see royalties.',
  backend_percentage: 'Backend percentage is below industry standard or has unfavorable calculation terms.',
  royalty_rate: 'Royalty rate is below industry standard of 3-5% or uses an unfavorable calculation method.',
  royalty_base: 'Royalty base uses undefined deductions that can significantly reduce your actual payment.',
  payment_threshold: 'Payment threshold is too high, delaying when you receive your earnings.',
  sync_share: 'Sync share is below industry standard or uses fraction calculation that reduces effective rate.',
  escalation: 'Escalation provisions are explicitly excluded, preventing higher rates for successful releases.',
  duration: 'Rights granted for perpetual/life of copyright duration with no reversion.',
  remix_rights: 'Unlimited remix rights granted without additional compensation.',
  objection_period: 'Objection period is too short to properly review and dispute incorrect statements.',
  indemnification: 'One-sided indemnification puts all legal risk on you.',
};

// Term definitions for producer agreements - explains what each term means
const TERM_DEFINITIONS = {
  // Agreement Summary Fields
  type: 'The category of agreement - defines the legal structure and which party retains primary control.',
  licensor:
    'The party granting rights (usually the producer). This is who owns the original work and is licensing it out.',
  licensee: 'The party receiving rights (usually the artist or label). This is who is paying to use the work.',
  producer:
    'The party granting rights (usually the producer). This is who owns the original work and is licensing it out.',
  artist_or_label: 'The party receiving rights (usually the artist or label). This is who is paying to use the work.',
  artist:
    'The recording artist or performer who will release the track. This is who the public will associate with the song.',
  track: 'The specific song or recording covered by this agreement.',
  effective_date: 'When the agreement officially begins and the terms become legally binding.',
  exclusivity:
    'Whether the license is exclusive (only this licensee can use the work) or non-exclusive (producer can license to others too).',
  status: 'The current state of the agreement - active, pending, expired, or terminated.',

  // Financial Terms
  nominal_fee:
    'A token payment (usually £1-100) that legally validates the contract. This is separate from the actual advance or royalties.',
  advance:
    'Upfront payment given before the release. This is typically recoupable, meaning it gets deducted from future royalties until paid back.',
  recoupable_advance:
    'Terms governing how the advance is recouped. Fully recoupable is standard; cross-collateralized means losses from other projects can eat into your royalties. Non-recoupable or capped recoupment is favorable.',
  royalty_rate:
    'The percentage of revenue you receive from sales and streams. This is your ongoing income from the master recording.',
  royalty_base:
    'What the royalty percentage is calculated against - could be gross receipts, net receipts, or PPD (Published Price to Dealer).',
  payment_threshold: 'The minimum amount that must accumulate before the label is required to send you a payment.',
  sync_share:
    'Your percentage of income when the track is licensed for use in films, TV shows, commercials, or video games.',
  escalation: 'Automatic increases to your royalty rate when the track hits certain sales or streaming milestones.',

  // Rights Terms
  duration:
    'How long the license or rights transfer lasts. Perpetuity means forever; limited terms eventually revert rights back to you.',
  territory:
    'The geographic regions where the license applies. Worldwide means all countries; limited territories restrict usage.',
  media_scope:
    'What formats and platforms the music can be used on - streaming, physical, broadcast, or future technologies.',
  remix_rights: 'Whether the licensee can create remixes or alternate versions of your work, and how many.',
  name_likeness: 'Rights to use your name, image, and biographical information for marketing and promotion.',
  touring_visuals: 'Rights to use your work in live concert visuals, stage shows, and touring productions.',

  // Credit Terms
  credit_format: 'The exact wording of how you will be credited on releases, metadata, and promotional materials.',
  credit_placement: 'Where your credit will appear - album artwork, streaming metadata, liner notes, press releases.',
  credit_remedy:
    'What happens if the other party fails to credit you properly - usually requires correction on future pressings.',

  // Legal Terms
  warranties:
    'Legal guarantees you make about the work - typically that you own it, it is original, and does not infringe others rights.',
  indemnification:
    'Who is responsible for legal costs if someone sues over the music. One-sided indemnity puts all risk on you.',
  moral_rights:
    'Your right to be identified as the creator and to object to derogatory treatment of your work. Often waived in commercial deals.',
  third_party_payments:
    'Who is responsible for paying co-writers, sample owners, or other contributors to the original work.',
  audit_rights:
    'Your right to hire an accountant to examine the labels books and verify your royalty calculations are correct.',

  // Administrative Terms
  accounting_frequency: 'How often you receive royalty statements - quarterly, semi-annually, or annually.',
  objection_period: 'The time window you have to dispute a royalty statement if you believe it contains errors.',
  litigation_deadline: 'How long you have to file a lawsuit if you discover underpayment or contract breach.',
  assignment_rights:
    'Whether either party can transfer the contract to a different company without the others consent.',
  governing_law: 'Which countrys or states legal system will be used to interpret and enforce the contract.',

  // Royalty Structure Analysis Fields
  structure_type:
    'How your royalty is calculated - DIRECT means you get a straight percentage, APPLICABLE_FRACTION means reductions are applied before you get your share.',
  headline_rate:
    'The royalty percentage stated in the contract. This is the number they show you, but it may not be what you actually receive.',
  effective_rate:
    'Your actual royalty rate after all deductions and fractions are applied. This is what you really get paid.',
  calculation: 'The step-by-step breakdown of how the headline rate gets reduced to your effective rate.',
  royalty_calculation:
    'The formula or method used to calculate your royalty payment, including any fractions, multipliers, or conditional terms.',
  recoupment_threshold:
    'The amount that must be recouped (paid back from your royalties) before you start receiving payments. Higher thresholds delay your income.',
  payment_thresholds:
    'Minimum amounts that must accumulate before the company is required to pay you. High thresholds can significantly delay receiving your earnings.',
};

// Assessment tooltips for Agreement Summary fields (card hover)
const SUMMARY_ASSESSMENTS = {
  type: {
    sample_clearance: 'Sample clearance deal - you are licensing existing work for use in a new recording.',
    work_for_hire: 'Work-for-hire - you give up all ownership rights in exchange for a flat fee. No ongoing royalties.',
    points_deal: 'Points deal - you receive a percentage of royalties from the master recording.',
    beat_lease: 'Beat lease - non-exclusive license allowing the artist to use your beat with limitations.',
    beat_sale: 'Beat sale - exclusive transfer of rights to the beat, typically with ongoing royalties.',
    co_production: 'Co-production - shared ownership and responsibilities between multiple producers.',
  },
  exclusivity: {
    Exclusive: 'Exclusive license - only this licensee can use the work. Higher value but limits your options.',
    'Non-Exclusive':
      'Non-exclusive - you can license this work to multiple parties. More flexible but typically lower fees.',
  },
  status: {
    'Fully Executed': 'All parties have signed - this agreement is legally binding.',
    'Partially Executed': 'Some signatures missing - agreement may not yet be enforceable.',
    'No Signature': 'Unsigned - this is a draft or proposal, not a binding contract.',
  },
};

// Assessment tooltips for Royalty Structure Analysis fields (card hover)
const ROYALTY_ASSESSMENTS = {
  structure_type: {
    DIRECT: 'Good news - your royalty is calculated directly on the revenue base with no hidden reductions.',
    APPLICABLE_FRACTION:
      'Warning - your royalty goes through multiple reduction layers before you get paid. The headline rate is misleading.',
  },
  headline_vs_effective: {
    same: 'Your headline and effective rates match - what you see is what you get.',
    different:
      'Your effective rate is lower than the headline rate due to contract deductions. Review the calculation breakdown.',
  },
};

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

// Extraction method options for re-extraction
const EXTRACTION_METHODS = [
  {
    value: 'vision',
    label: 'Vision API',
    description: 'Best for scanned PDFs and complex layouts',
    icon: FaEye,
    recommended: true,
  },
  {
    value: 'auto',
    label: 'Auto (Smart)',
    description: 'Tries multiple methods, picks best result',
    icon: FaBolt,
  },
  {
    value: 'standard',
    label: 'Standard',
    description: 'Faster, no API calls - for simple PDFs',
    icon: FaCogs,
  },
];

const AgreementDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [agreement, setAgreement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reparsing, setReparsing] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [changingType, setChangingType] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [expandedFlags, setExpandedFlags] = useState({});
  const typeDropdownRef = useRef(null);
  // Re-extraction state
  const [reExtracting, setReExtracting] = useState(false);
  const [showReExtractDropdown, setShowReExtractDropdown] = useState(false);
  const [reExtractResult, setReExtractResult] = useState(null);
  const reExtractDropdownRef = useRef(null);

  useEffect(() => {
    // Reset debug flag when agreement changes
    window._fieldRatingsLogged = false;
    fetchAgreement();
  }, [id]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target)) {
        setShowTypeDropdown(false);
      }
      if (reExtractDropdownRef.current && !reExtractDropdownRef.current.contains(event.target)) {
        setShowReExtractDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear re-extract result after 10 seconds
  useEffect(() => {
    if (reExtractResult) {
      const timer = setTimeout(() => setReExtractResult(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [reExtractResult]);

  const fetchAgreement = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/agreements/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAgreement(data);
      } else if (response.status === 404) {
        setError(`Agreement #${id} not found. It may have been deleted or you don't have access.`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.detail || `Failed to load agreement (Error ${response.status})`);
      }
    } catch (err) {
      console.error('Error fetching agreement:', err);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const reparseAgreement = async () => {
    setReparsing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/agreements/${id}/reparse`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Reset debug flag to log new field_ratings
        window._fieldRatingsLogged = false;
        setAgreement(data);
      } else {
        const errorData = await response.json();
        alert(errorData.detail || 'Failed to re-parse agreement');
      }
    } catch (error) {
      console.error('Error re-parsing agreement:', error);
      alert('Failed to re-parse agreement');
    } finally {
      setReparsing(false);
    }
  };

  const changeAgreementType = async (newType) => {
    if (newType === agreement?.agreement_type) {
      setShowTypeDropdown(false);
      return;
    }

    setChangingType(true);
    setShowTypeDropdown(false);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/agreements/${id}/change-type`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ new_type: newType }),
      });

      if (response.ok) {
        const data = await response.json();
        // Reset debug flag to log new field_ratings
        window._fieldRatingsLogged = false;
        setAgreement(data);
      } else {
        const errorData = await response.json();
        alert(errorData.detail || 'Failed to change agreement type');
      }
    } catch (error) {
      console.error('Error changing agreement type:', error);
      alert('Failed to change agreement type');
    } finally {
      setChangingType(false);
    }
  };

  // Re-extract agreement with specified extraction method
  const reExtractAgreement = async (extractionMethod) => {
    setReExtracting(true);
    setShowReExtractDropdown(false);
    setReExtractResult(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/agreements/${id}/re-extract`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ extraction_method: extractionMethod }),
      });

      if (response.ok) {
        const data = await response.json();
        // Reset debug flag to log new field_ratings
        window._fieldRatingsLogged = false;
        setAgreement(data);
        // Show quality improvement result
        setReExtractResult({
          success: true,
          oldScore: data.old_quality_score,
          newScore: data.new_quality_score,
          improvement: data.quality_improvement,
          method: data.new_extraction_method,
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        setReExtractResult({
          success: false,
          error: errorData.detail || 'Re-extraction failed',
        });
      }
    } catch (error) {
      console.error('Error re-extracting agreement:', error);
      setReExtractResult({
        success: false,
        error: 'Network error during re-extraction',
      });
    } finally {
      setReExtracting(false);
    }
  };

  // Helper function to normalize analysis data for both new and legacy structures
  const getAnalysisData = (parsed) => {
    if (!parsed) return null;

    // Check for new overall_assessment structure (object with rating, summary, counts)
    const hasNewStructure =
      parsed.overall_assessment && typeof parsed.overall_assessment === 'object' && parsed.overall_assessment.rating;

    // Check for legacy overall_score structure
    const hasLegacyStructure = parsed.overall_score && typeof parsed.overall_score === 'object';

    if (hasNewStructure) {
      return {
        rating: parsed.overall_assessment.rating,
        summary: parsed.overall_assessment.summary,
        red_count: parsed.overall_assessment.red_count ?? 0,
        yellow_count: parsed.overall_assessment.yellow_count ?? 0,
        green_count: parsed.overall_assessment.green_count ?? 0,
        gray_count: parsed.overall_assessment.gray_count ?? 0,
        critical_flags: parsed.overall_assessment.critical_flags ?? 0,
        high_flags: parsed.overall_assessment.high_flags ?? 0,
        medium_flags: parsed.overall_assessment.medium_flags ?? 0,
        terms: parsed.terms,
        isNew: true,
      };
    } else if (hasLegacyStructure) {
      return {
        rating: parsed.overall_score.rating,
        summary: parsed.overall_score.summary,
        red_count: parsed.overall_score.red_flags ?? parsed.overall_score.red_count ?? 0,
        yellow_count: parsed.overall_score.yellow_flags ?? parsed.overall_score.yellow_count ?? 0,
        green_count: parsed.overall_score.green_flags ?? parsed.overall_score.green_count ?? 0,
        gray_count: parsed.overall_score.gray_count ?? 0,
        critical_flags: 0,
        high_flags: 0,
        medium_flags: 0,
        terms: parsed.terms,
        isNew: false,
      };
    } else if (typeof parsed.overall_assessment === 'string') {
      // Handle case where overall_assessment is just a string rating
      return {
        rating: parsed.overall_assessment,
        summary: null,
        red_count: 0,
        yellow_count: 0,
        green_count: 0,
        gray_count: 0,
        critical_flags: 0,
        high_flags: 0,
        medium_flags: 0,
        terms: parsed.terms,
        isNew: false,
      };
    }

    return null;
  };

  // Download report handler
  const handleDownloadReport = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/agreements/${id}/report`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `agreement_${id}_report.docx`;

        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
          if (filenameMatch && filenameMatch[1]) {
            filename = filenameMatch[1].replace(/['"]/g, '');
          }
        }

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.detail || 'Failed to download report');
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report');
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const calculateDaysUntil = (dateStr) => {
    if (!dateStr || dateStr === 'Life of Copyright' || dateStr === 'Perpetual') return null;
    try {
      const targetDate = new Date(dateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffTime = targetDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return null;
    }
  };

  const formatTerminationDeadline = (renewal, expirationDate) => {
    if (!renewal?.auto_renews || renewal.auto_renews === 'No') return null;
    const noticeDays = parseInt(renewal.termination_notice_days) || 30;
    const renewalDate = renewal.next_renewal_date || expirationDate;
    if (!renewalDate || renewalDate === 'Life of Copyright' || renewalDate === 'Perpetual') return null;

    try {
      const targetDate = new Date(renewalDate);
      const deadlineDate = new Date(targetDate);
      deadlineDate.setDate(deadlineDate.getDate() - noticeDays);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));

      return {
        daysLeft,
        deadlineDate: deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        renewalDate: targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        isUrgent: daysLeft <= 30,
        isPast: daysLeft < 0,
      };
    } catch {
      return null;
    }
  };

  // Get extraction metadata for context-aware rendering
  const getExtractionQuality = () => {
    const metadata = agreement?.parsed_content?.extraction_metadata;
    if (!metadata) return { score: 100, method: 'unknown', warnings: [] };
    return {
      score: metadata.quality_score || 100,
      method: metadata.method || 'unknown',
      warnings: metadata.warnings || [],
    };
  };

  const renderValue = (value, termData = null) => {
    const extraction = getExtractionQuality();

    // Handle N/A (not applicable) terms - show minimal indicator
    if (value === 'N/A' || (typeof value === 'string' && value.toLowerCase().includes('not applicable'))) {
      return (
        <span className={styles.naValue} style={{ color: '#9ca3af', fontSize: '0.9em', fontStyle: 'italic' }}>
          N/A
        </span>
      );
    }

    if (value === null || value === undefined || value === '') {
      // Check if this is due to extraction issues
      if (termData?.extraction_issue) {
        return (
          <span className={styles.emptyValue} style={{ color: '#f59e0b' }}>
            ⚠️ Term may exist but wasn't detected (extraction quality: {extraction.score}/100)
          </span>
        );
      }
      // Context-aware "not found" messages based on extraction quality
      if (extraction.score < 50) {
        return (
          <span className={styles.emptyValue} style={{ color: '#f59e0b' }}>
            ⚠️ Document extraction quality low - term may be present but not detected
          </span>
        );
      }
      if (extraction.score < 70) {
        return <span className={styles.emptyValue}>Not found (extraction quality: moderate)</span>;
      }
      return <span className={styles.emptyValue}>Not specified in document</span>;
    }
    // Handle "NOT_FOUND" string value
    if (value === 'NOT_FOUND') {
      if (termData?.extraction_issue) {
        return (
          <span className={styles.emptyValue} style={{ color: '#f59e0b' }}>
            ⚠️ Term may exist but wasn't detected (extraction issue)
          </span>
        );
      }
      if (extraction.score < 50) {
        return (
          <span className={styles.emptyValue} style={{ color: '#f59e0b' }}>
            ⚠️ Not found - extraction quality very low ({extraction.score}/100)
          </span>
        );
      }
      if (extraction.score < 70) {
        return (
          <span className={styles.emptyValue} style={{ color: '#9ca3af' }}>
            Not found (extraction quality: {extraction.score}/100)
          </span>
        );
      }
      // Only show "Not specified in document" when extraction quality is good
      // Display as "Missing" to indicate it should be present
      return (
        <span className={styles.emptyValue} style={{ color: '#ef4444' }}>
          Missing - should be present in this agreement type
        </span>
      );
    }
    // Handle objects by converting to formatted string
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return value.map((item, i) => (typeof item === 'object' ? JSON.stringify(item) : item)).join(', ');
      }
      // Convert object to readable format
      return Object.entries(value)
        .map(([key, val]) => {
          const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
          const displayVal = typeof val === 'object' ? JSON.stringify(val) : val;
          return `${label}: ${displayVal}`;
        })
        .join('\n');
    }
    return value;
  };

  // Extract just the math equation from the royalty explanation
  const extractEquation = (explanation) => {
    if (!explanation) return null;
    // Match patterns like "X% × (Y% ÷ Z%) = W%" or "X × Y = Z"
    const equationMatch = explanation.match(/[\d.]+%?\s*[×x*]\s*[\d.(%÷/\s)]+\s*=\s*[\d.]+%?/i);
    if (equationMatch) {
      return equationMatch[0].trim();
    }
    // Fallback: try to extract anything that looks like an equation with = sign
    const simpleMatch = explanation.match(/[\d.]+%?\s*[×x*/÷+\-\s()%]+\s*=\s*[\d.]+%?/i);
    if (simpleMatch) {
      return simpleMatch[0].trim();
    }
    // Last resort: return first portion before comma or period
    const shortVersion = explanation.split(/[,.]/).shift();
    return shortVersion?.length > 60 ? shortVersion.substring(0, 60) + '...' : shortVersion;
  };

  // Get field rating style based on AI analysis
  const getFieldRating = (fieldName) => {
    const ratings = agreement?.parsed_content?.field_ratings;

    // Debug: log field_ratings once when component has data
    if (agreement?.parsed_content && !window._fieldRatingsLogged) {
      console.log('[DEBUG] field_ratings:', ratings);
      console.log('[DEBUG] Full parsed_content keys:', Object.keys(agreement.parsed_content));
      window._fieldRatingsLogged = true;
    }

    if (!ratings) return { style: null, isRed: false };

    const greenFields = ratings.green || [];
    const yellowFields = ratings.yellow || [];
    const redFields = ratings.red || [];

    if (redFields.includes(fieldName)) {
      return {
        style: {
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          color: '#dc2626',
        },
        isRed: true,
      };
    }
    if (yellowFields.includes(fieldName)) {
      return {
        style: {
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          color: '#d97706',
        },
        isRed: false,
      };
    }
    if (greenFields.includes(fieldName)) {
      return {
        style: {
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.4)',
          color: '#16a34a',
        },
        isRed: false,
      };
    }
    return { style: null, isRed: false };
  };

  // Render a field value with optional danger icon for red flags
  const renderRatedField = (fieldName, value, isLarge = false) => {
    const { style, isRed } = getFieldRating(fieldName);
    const className = isLarge ? styles.fieldValueLarge : styles.fieldValue;

    // Use producer-specific explanations for producer agreements
    const isProducerAgreement =
      agreement?.agreement_type === 'producer agreement' || parsed.agreement?.type === 'PRODUCER_AGREEMENT';
    const explanations = isProducerAgreement ? PRODUCER_RED_FLAG_EXPLANATIONS : RED_FLAG_EXPLANATIONS;
    const explanation =
      explanations[fieldName] || RED_FLAG_EXPLANATIONS[fieldName] || 'This term is a significant red flag.';

    return (
      <div className={className} style={style || {}}>
        <span style={{ flex: 1 }}>{renderValue(value)}</span>
        {isRed && (
          <Tooltip
            title={explanation}
            arrow
            placement="top"
            slotProps={{
              tooltip: {
                sx: {
                  bgcolor: 'rgba(220, 38, 38, 0.95)',
                  color: '#fff',
                  fontSize: '12px',
                  padding: '10px 14px',
                  maxWidth: 320,
                  lineHeight: 1.5,
                  '& .MuiTooltip-arrow': {
                    color: 'rgba(220, 38, 38, 0.95)',
                  },
                },
              },
            }}
          >
            <span style={{ marginLeft: '10px', display: 'flex', alignItems: 'center', cursor: 'help' }}>
              <FaExclamationTriangle size={14} color="#dc2626" />
            </span>
          </Tooltip>
        )}
      </div>
    );
  };

  // Color mapping for term assessments
  const getTermColorStyles = (color) => {
    const colorMap = {
      RED: {
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        color: '#dc2626',
        badgeBg: '#dc2626',
      },
      YELLOW: {
        background: 'rgba(245, 158, 11, 0.1)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        color: '#d97706',
        badgeBg: '#d97706',
      },
      GREEN: {
        background: 'rgba(34, 197, 94, 0.1)',
        border: '1px solid rgba(34, 197, 94, 0.3)',
        color: '#16a34a',
        badgeBg: '#16a34a',
      },
      GRAY: {
        background: 'rgba(156, 163, 175, 0.1)',
        border: '1px solid rgba(156, 163, 175, 0.3)',
        color: '#6b7280',
        badgeBg: '#6b7280',
      },
    };
    return colorMap[color] || colorMap.GRAY;
  };

  // Render a term with color-coded assessment
  const renderTermWithAssessment = (termKey, termData) => {
    if (!termData) return null;

    const colorStyles = getTermColorStyles(termData.color);
    const displayValue = termData.value === 'NOT_FOUND' ? 'Not specified' : termData.value;
    const label = termKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    return (
      <Tooltip
        key={termKey}
        title={
          <div style={{ padding: '8px' }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>Assessment:</strong> {termData.assessment || 'No assessment available'}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Industry Standard:</strong> {termData.industry_standard || 'Not specified'}
            </div>
            {termData.clause && (
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>Clause: {termData.clause}</div>
            )}
          </div>
        }
        arrow
        placement="top"
      >
        <div className={styles.field} style={{ cursor: 'pointer' }}>
          <label className={styles.fieldLabel} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {label}
            <span
              style={{
                fontSize: '9px',
                padding: '2px 6px',
                borderRadius: '4px',
                background: colorStyles.badgeBg,
                color: 'white',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              {termData.color || 'GRAY'}
            </span>
          </label>
          <div
            className={styles.fieldValue}
            style={{
              background: colorStyles.background,
              border: colorStyles.border,
              color: colorStyles.color,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span style={{ flex: 1 }}>{displayValue}</span>
            <Tooltip title={TERM_DEFINITIONS[termKey] || 'No definition available'} arrow placement="right">
              <span style={{ cursor: 'help' }} onClick={(e) => e.stopPropagation()}>
                <FaInfoCircle style={{ color: '#374151', fontSize: '14px', marginLeft: '8px' }} />
              </span>
            </Tooltip>
          </div>
        </div>
      </Tooltip>
    );
  };

  // Render a term section with all its fields
  // showNA: if false (default), N/A terms are hidden for cleaner display
  const renderTermSection = (sectionTitle, sectionData, sectionNumber, showNA = false) => {
    if (!sectionData || Object.keys(sectionData).length === 0) {
      return (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {sectionNumber} {sectionTitle}
          </h2>
          <p style={{ color: 'var(--muted-text)', fontStyle: 'italic' }}>No {sectionTitle.toLowerCase()} extracted</p>
        </div>
      );
    }

    // Filter out N/A terms if showNA is false
    const termEntries = Object.entries(sectionData).filter(([key, term]) => {
      if (!showNA && term && (term.value === 'N/A' || term.assessment?.includes('Not applicable'))) {
        return false;
      }
      return true;
    });

    // Count hidden N/A terms for display
    const hiddenNACount = Object.values(sectionData).filter(
      (term) => term && (term.value === 'N/A' || term.assessment?.includes('Not applicable'))
    ).length;

    if (termEntries.length === 0) {
      return (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {sectionNumber} {sectionTitle}
            {hiddenNACount > 0 && (
              <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 400, marginLeft: '8px' }}>
                ({hiddenNACount} N/A terms hidden)
              </span>
            )}
          </h2>
          <p style={{ color: 'var(--muted-text)', fontStyle: 'italic' }}>
            No applicable {sectionTitle.toLowerCase()} terms for this agreement type
          </p>
        </div>
      );
    }

    return (
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          {sectionNumber} {sectionTitle}
          {!showNA && hiddenNACount > 0 && (
            <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 400, marginLeft: '8px' }}>
              ({hiddenNACount} N/A terms hidden)
            </span>
          )}
        </h2>
        <div className={styles.fieldGroupFour}>
          {termEntries.map(([key, term]) => renderTermWithAssessment(key, term))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Sidebar />
        <div className={styles.container} style={{ marginLeft: 'var(--sidebar-width, 72px)' }}>
          <div className={styles.loadingState}>
            <CircularProgress size={40} sx={{ color: 'var(--muted-text)' }} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <Sidebar />
        <div className={styles.container} style={{ marginLeft: 'var(--sidebar-width, 72px)' }}>
          <div className={styles.errorState}>
            <FaExclamationTriangle size={48} style={{ color: '#ef4444', marginBottom: '16px' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Unable to Load Agreement</h2>
            <p style={{ color: 'var(--muted-text)', marginBottom: '24px' }}>{error}</p>
            <button
              onClick={() => navigate('/agreements')}
              style={{
                padding: '10px 20px',
                background: 'var(--panel-bg)',
                border: '1px solid var(--button-border)',
                borderRadius: '8px',
                cursor: 'pointer',
                color: 'var(--text)',
              }}
            >
              Back to Agreements
            </button>
          </div>
        </div>
      </div>
    );
  }

  const parsed = agreement?.parsed_content || {};

  return (
    <div className="flex flex-col h-full">
      <Sidebar />
      <Helmet>
        <title>RD - {agreement?.original_filename || 'Agreement'}</title>
      </Helmet>
      <div className={styles.container} style={{ marginLeft: 'var(--sidebar-width, 72px)' }}>
        {/* Breadcrumb */}
        <Breadcrumbs className={styles.breadcrumb}>
          <BreadcrumbItem href="/dashboard">Dashboard</BreadcrumbItem>
          <BreadcrumbItem href="/agreements">Agreements</BreadcrumbItem>
          <BreadcrumbItem>{agreement?.original_filename}</BreadcrumbItem>
        </Breadcrumbs>

        {/* Header */}
        <div className={styles.pageHeader}>
          <button className={styles.backButton} onClick={() => navigate('/agreements')}>
            <FaArrowLeft size={14} />
            Back
          </button>
          <div className={styles.headerInfo}>
            <div className={styles.fileIcon}>
              <FaFileAlt size={24} />
            </div>
            <div>
              <h1 className={styles.pageTitle}>{agreement?.original_filename}</h1>
              <p className={styles.pageMeta}>
                <span className={styles.typeBadge}>{agreement?.agreement_type}</span>
                <span className={styles.fileSize}>{formatFileSize(agreement?.file_size)}</span>
              </p>
            </div>
          </div>
          <div className={styles.headerActions}>
            {/* Change Type Dropdown */}
            <div className={styles.typeDropdownContainer} ref={typeDropdownRef}>
              <button
                className={styles.changeTypeButton}
                onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                disabled={changingType || reparsing}
              >
                {changingType ? (
                  <>
                    <CircularProgress size={14} sx={{ color: 'inherit' }} />
                    Changing...
                  </>
                ) : (
                  <>
                    Change Type
                    <FaChevronDown size={10} />
                  </>
                )}
              </button>
              {showTypeDropdown && (
                <div className={styles.typeDropdown}>
                  {AGREEMENT_TYPES.map((type) => (
                    <button
                      key={type}
                      className={`${styles.typeDropdownItem} ${
                        agreement?.agreement_type === type ? styles.typeDropdownItemActive : ''
                      }`}
                      onClick={() => changeAgreementType(type)}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                      {agreement?.agreement_type === type && ' ✓'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button className={styles.reparseButton} onClick={reparseAgreement} disabled={reparsing || changingType}>
              {reparsing ? (
                <>
                  <CircularProgress size={14} sx={{ color: 'inherit' }} />
                  Parsing...
                </>
              ) : (
                <>
                  <FaSync size={14} />
                  Re-parse with AI
                </>
              )}
            </button>

            {/* Re-extract Button with Method Selector */}
            {agreement?.parsed_content && (
              <div className={styles.typeDropdownContainer} ref={reExtractDropdownRef}>
                <Tooltip
                  title="Re-extract text from original file using a different extraction method. Use this when extraction quality is poor."
                  arrow
                  placement="bottom"
                >
                  <button
                    className={styles.reExtractButton}
                    onClick={() => setShowReExtractDropdown(!showReExtractDropdown)}
                    disabled={reExtracting || reparsing || changingType}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      background: reExtracting ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                      color: '#3b82f6',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: reExtracting ? 'not-allowed' : 'pointer',
                      opacity: reExtracting ? 0.7 : 1,
                      transition: 'all 0.2s',
                    }}
                  >
                    {reExtracting ? (
                      <>
                        <CircularProgress size={14} sx={{ color: 'inherit' }} />
                        Re-extracting...
                      </>
                    ) : (
                      <>
                        <FaRedo size={14} />
                        Re-extract
                        <FaChevronDown size={10} />
                      </>
                    )}
                  </button>
                </Tooltip>
                {showReExtractDropdown && (
                  <div
                    className={styles.typeDropdown}
                    style={{
                      minWidth: '280px',
                      padding: '8px',
                    }}
                  >
                    <div
                      style={{
                        padding: '8px 12px',
                        fontSize: '11px',
                        color: 'var(--muted-text)',
                        borderBottom: '1px solid var(--button-border)',
                        marginBottom: '8px',
                      }}
                    >
                      Choose extraction method:
                    </div>
                    {EXTRACTION_METHODS.map((method) => {
                      const IconComponent = method.icon;
                      return (
                        <button
                          key={method.value}
                          className={styles.typeDropdownItem}
                          onClick={() => reExtractAgreement(method.value)}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            padding: '12px',
                            textAlign: 'left',
                            width: '100%',
                          }}
                        >
                          <IconComponent
                            size={16}
                            style={{
                              color: method.recommended ? '#3b82f6' : 'var(--muted-text)',
                              marginTop: '2px',
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '2px',
                              }}
                            >
                              <span style={{ fontWeight: 500 }}>{method.label}</span>
                              {method.recommended && (
                                <span
                                  style={{
                                    fontSize: '9px',
                                    padding: '2px 6px',
                                    background: 'rgba(59, 130, 246, 0.2)',
                                    color: '#3b82f6',
                                    borderRadius: '4px',
                                    fontWeight: 600,
                                  }}
                                >
                                  RECOMMENDED
                                </span>
                              )}
                            </div>
                            <div
                              style={{
                                fontSize: '11px',
                                color: 'var(--muted-text)',
                              }}
                            >
                              {method.description}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Re-extraction Result Toast */}
            {reExtractResult && (
              <div
                style={{
                  position: 'fixed',
                  bottom: '24px',
                  right: '24px',
                  padding: '16px 20px',
                  background: reExtractResult.success ? 'rgba(34, 197, 94, 0.95)' : 'rgba(239, 68, 68, 0.95)',
                  color: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  zIndex: 9999,
                  maxWidth: '360px',
                  animation: 'slideIn 0.3s ease-out',
                }}
              >
                {reExtractResult.success ? (
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      ✓ Re-extraction Complete
                    </div>
                    <div style={{ fontSize: '13px', opacity: 0.95 }}>
                      Quality: {reExtractResult.oldScore} → {reExtractResult.newScore}
                      <span
                        style={{
                          marginLeft: '8px',
                          padding: '2px 8px',
                          background: 'rgba(255,255,255,0.2)',
                          borderRadius: '10px',
                          fontWeight: 600,
                        }}
                      >
                        {reExtractResult.improvement > 0 ? '+' : ''}
                        {reExtractResult.improvement}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '4px' }}>
                      Method: {reExtractResult.method}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>✕ Re-extraction Failed</div>
                    <div style={{ fontSize: '13px', opacity: 0.95 }}>{reExtractResult.error}</div>
                  </div>
                )}
              </div>
            )}

            {/* Download Report Button */}
            {agreement?.parsed_content && (
              <button
                className={styles.downloadButton}
                onClick={handleDownloadReport}
                disabled={downloading || reparsing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  background: 'rgba(34, 197, 94, 0.1)',
                  color: '#16a34a',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: downloading ? 'not-allowed' : 'pointer',
                  opacity: downloading ? 0.6 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {downloading ? (
                  <>
                    <CircularProgress size={14} sx={{ color: 'inherit' }} />
                    Downloading...
                  </>
                ) : (
                  <>
                    <FaDownload size={14} />
                    Download Report
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Extraction Quality Warning Banner */}
        {(() => {
          const extraction = getExtractionQuality();

          // Count NOT_FOUND and N/A terms
          const terms = agreement?.parsed_content?.terms || {};
          let notFoundCount = 0;
          let naCount = 0;
          let totalTerms = 0;
          Object.values(terms).forEach((section) => {
            if (section && typeof section === 'object') {
              Object.values(section).forEach((term) => {
                if (term && typeof term === 'object') {
                  totalTerms++;
                  if (term.value === 'NOT_FOUND') notFoundCount++;
                  if (term.value === 'N/A') naCount++;
                }
              });
            }
          });

          // Show warning if extraction quality is low OR if too many terms are NOT_FOUND
          const showWarning =
            (extraction.score < 70 && agreement?.parsed_content) ||
            (notFoundCount > 15 && extraction.score < 70 && agreement?.parsed_content);

          if (!showWarning) return null;

          const bgColor = extraction.score < 50 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)';
          const borderColor = extraction.score < 50 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)';
          const textColor = extraction.score < 50 ? '#dc2626' : '#f59e0b';
          const methodLabel =
            extraction.method === 'vision_api'
              ? 'PDF Vision'
              : extraction.method === 'pdfplumber'
                ? 'PDF Parser'
                : extraction.method === 'pypdf2'
                  ? 'Basic Parser'
                  : extraction.method === 'docx'
                    ? 'DOCX'
                    : extraction.method;

          let message;
          if (notFoundCount > 15 && extraction.score < 70) {
            message = `High number of missing terms (${notFoundCount}) detected with low extraction quality. Consider re-extracting with Vision API for better results.`;
          } else if (extraction.score < 50) {
            message =
              'Some terms may not have been detected correctly. This often happens with scanned documents or complex layouts. Try using the "Re-extract" button with Vision API for better results.';
          } else {
            message =
              'Extraction quality is moderate. Some terms marked as "Missing" may actually exist in the document. Try "Re-extract" with Vision API or re-parse with AI.';
          }

          return (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '16px 20px',
                marginBottom: '16px',
                background: bgColor,
                border: `1px solid ${borderColor}`,
                borderRadius: '12px',
              }}
            >
              <FaExclamationTriangle
                size={20}
                style={{
                  color: textColor,
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              />
              <div>
                <div
                  style={{
                    fontWeight: 600,
                    color: textColor,
                    marginBottom: '4px',
                  }}
                >
                  Document Extraction Quality: {extraction.score}/100
                  <span
                    style={{
                      fontSize: '11px',
                      marginLeft: '8px',
                      padding: '2px 8px',
                      background: 'rgba(255,255,255,0.2)',
                      borderRadius: '10px',
                    }}
                  >
                    {methodLabel}
                  </span>
                  {notFoundCount > 0 && (
                    <span
                      style={{
                        fontSize: '11px',
                        marginLeft: '8px',
                        padding: '2px 8px',
                        background: notFoundCount > 15 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.2)',
                        borderRadius: '10px',
                        color: notFoundCount > 15 ? '#dc2626' : 'inherit',
                      }}
                    >
                      {notFoundCount} missing
                    </span>
                  )}
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    color: 'var(--muted-text)',
                    lineHeight: 1.5,
                  }}
                >
                  {message}
                </p>
                {extraction.warnings.length > 0 && (
                  <ul
                    style={{
                      margin: '8px 0 0 0',
                      padding: '0 0 0 16px',
                      fontSize: '12px',
                      color: 'var(--muted-text)',
                    }}
                  >
                    {extraction.warnings.slice(0, 3).map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })()}

        {/* Details Grid */}
        <div className={styles.detailsGrid}>
          {/* Analysis in progress message */}
          {!agreement?.parsed_content && (
            <div
              className={styles.section}
              style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                textAlign: 'center',
                padding: '40px 20px',
              }}
            >
              <CircularProgress size={32} sx={{ color: '#3b82f6', marginBottom: '16px' }} />
              <h3 style={{ margin: '0 0 8px 0', color: '#3b82f6' }}>Analysis in Progress</h3>
              <p style={{ margin: 0, color: 'var(--muted-text)', fontSize: '13px' }}>
                This agreement is being analyzed. Please check back shortly or click "Re-parse with AI" to trigger a new
                analysis.
              </p>
            </div>
          )}

          {/* PRODUCER AGREEMENT SECTIONS */}
          {/* Support both legacy (agreement_type) and new (parsed.agreement.type) formats */}
          {agreement?.parsed_content &&
          (agreement?.agreement_type === 'producer agreement' || parsed.agreement?.type === 'PRODUCER_AGREEMENT') ? (
            <>
              {/* Overall Assessment Banner - Enhanced */}
              {(() => {
                const analysisData = getAnalysisData(parsed);
                if (!analysisData) return null;

                const getRatingColor = (rating) => {
                  switch (rating) {
                    case 'FAVORABLE':
                      return { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.4)', text: '#16a34a' };
                    case 'NEUTRAL':
                      return { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.4)', text: '#3b82f6' };
                    case 'UNFAVORABLE':
                      return { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.4)', text: '#d97706' };
                    default:
                      return { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.4)', text: '#dc2626' };
                  }
                };

                const colors = getRatingColor(analysisData.rating);

                return (
                  <div
                    className={styles.section}
                    style={{
                      background: colors.bg,
                      border: `2px solid ${colors.border}`,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '12px',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      <h2
                        className={styles.sectionTitle}
                        style={{ margin: 0, color: colors.text, borderBottom: 'none', paddingBottom: 0 }}
                      >
                        Overall Assessment: {analysisData.rating?.replace(/_/g, ' ')}
                      </h2>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            padding: '4px 12px',
                            borderRadius: '20px',
                            background: '#dc2626',
                            color: 'white',
                            fontSize: '12px',
                          }}
                        >
                          {analysisData.red_count} Red
                        </span>
                        <span
                          style={{
                            padding: '4px 12px',
                            borderRadius: '20px',
                            background: '#d97706',
                            color: 'white',
                            fontSize: '12px',
                          }}
                        >
                          {analysisData.yellow_count} Yellow
                        </span>
                        <span
                          style={{
                            padding: '4px 12px',
                            borderRadius: '20px',
                            background: '#16a34a',
                            color: 'white',
                            fontSize: '12px',
                          }}
                        >
                          {analysisData.green_count} Green
                        </span>
                        {analysisData.gray_count > 0 && (
                          <span
                            style={{
                              padding: '4px 12px',
                              borderRadius: '20px',
                              background: '#6b7280',
                              color: 'white',
                              fontSize: '12px',
                            }}
                          >
                            {analysisData.gray_count} Not Found
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Severity breakdown for new structure */}
                    {analysisData.isNew &&
                      (analysisData.critical_flags > 0 ||
                        analysisData.high_flags > 0 ||
                        analysisData.medium_flags > 0) && (
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', fontSize: '13px' }}>
                          <span style={{ color: '#dc2626', fontWeight: 500 }}>
                            {analysisData.critical_flags} Critical
                          </span>
                          <span style={{ color: '#f59e0b', fontWeight: 500 }}>{analysisData.high_flags} High</span>
                          <span style={{ color: '#eab308', fontWeight: 500 }}>{analysisData.medium_flags} Medium</span>
                        </div>
                      )}
                    {analysisData.summary && (
                      <p style={{ margin: 0, color: 'var(--text)', fontSize: '14px', lineHeight: 1.6 }}>
                        {analysisData.summary}
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Agreement Summary - NEW */}
              {parsed.agreement_summary && (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Agreement Summary</h2>
                  <div className={styles.fieldGroupFour}>
                    <Tooltip
                      title={
                        SUMMARY_ASSESSMENTS.type[parsed.agreement_summary?.type] ||
                        'Hover over the info icon for more details about this field.'
                      }
                      arrow
                      placement="top"
                    >
                      <div className={styles.field} style={{ cursor: 'pointer' }}>
                        <label className={styles.fieldLabel}>Type</label>
                        <div className={styles.fieldValue} style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ flex: 1 }}>
                            {renderValue(parsed.agreement_summary?.type?.replace(/_/g, ' '))}
                          </span>
                          <Tooltip title={TERM_DEFINITIONS.type} arrow placement="right">
                            <span style={{ cursor: 'help' }} onClick={(e) => e.stopPropagation()}>
                              <FaInfoCircle style={{ color: '#374151', fontSize: '14px', marginLeft: '8px' }} />
                            </span>
                          </Tooltip>
                        </div>
                      </div>
                    </Tooltip>
                    <Tooltip
                      title="The producer or original rights holder who is granting the license."
                      arrow
                      placement="top"
                    >
                      <div className={styles.field} style={{ cursor: 'pointer' }}>
                        <label className={styles.fieldLabel}>Licensor (Producer)</label>
                        <div className={styles.fieldValue} style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ flex: 1 }}>
                            {renderValue(parsed.agreement_summary?.licensor || parsed.agreement_summary?.producer)}
                          </span>
                          <Tooltip title={TERM_DEFINITIONS.licensor} arrow placement="right">
                            <span style={{ cursor: 'help' }} onClick={(e) => e.stopPropagation()}>
                              <FaInfoCircle style={{ color: '#374151', fontSize: '14px', marginLeft: '8px' }} />
                            </span>
                          </Tooltip>
                        </div>
                      </div>
                    </Tooltip>
                    <Tooltip title="The label or company receiving the rights to use the work." arrow placement="top">
                      <div className={styles.field} style={{ cursor: 'pointer' }}>
                        <label className={styles.fieldLabel}>Licensee (Label)</label>
                        <div className={styles.fieldValue} style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ flex: 1 }}>
                            {renderValue(
                              parsed.agreement_summary?.licensee || parsed.agreement_summary?.artist_or_label
                            )}
                          </span>
                          <Tooltip title={TERM_DEFINITIONS.licensee} arrow placement="right">
                            <span style={{ cursor: 'help' }} onClick={(e) => e.stopPropagation()}>
                              <FaInfoCircle style={{ color: '#374151', fontSize: '14px', marginLeft: '8px' }} />
                            </span>
                          </Tooltip>
                        </div>
                      </div>
                    </Tooltip>
                    <Tooltip
                      title="The recording artist or performer who will release the track."
                      arrow
                      placement="top"
                    >
                      <div className={styles.field} style={{ cursor: 'pointer' }}>
                        <label className={styles.fieldLabel}>Artist</label>
                        <div className={styles.fieldValue} style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ flex: 1 }}>{renderValue(parsed.agreement_summary?.artist)}</span>
                          <Tooltip title={TERM_DEFINITIONS.artist} arrow placement="right">
                            <span style={{ cursor: 'help' }} onClick={(e) => e.stopPropagation()}>
                              <FaInfoCircle style={{ color: '#374151', fontSize: '14px', marginLeft: '8px' }} />
                            </span>
                          </Tooltip>
                        </div>
                      </div>
                    </Tooltip>
                  </div>
                  <div className={styles.fieldGroupFour} style={{ marginTop: '16px' }}>
                    <Tooltip title="The specific song or recording this agreement covers." arrow placement="top">
                      <div className={styles.field} style={{ cursor: 'pointer' }}>
                        <label className={styles.fieldLabel}>Track</label>
                        <div className={styles.fieldValue} style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ flex: 1 }}>{renderValue(parsed.agreement_summary?.track)}</span>
                          <Tooltip title={TERM_DEFINITIONS.track} arrow placement="right">
                            <span style={{ cursor: 'help' }} onClick={(e) => e.stopPropagation()}>
                              <FaInfoCircle style={{ color: '#374151', fontSize: '14px', marginLeft: '8px' }} />
                            </span>
                          </Tooltip>
                        </div>
                      </div>
                    </Tooltip>
                    <Tooltip
                      title="The date when this agreement becomes legally binding and enforceable."
                      arrow
                      placement="top"
                    >
                      <div className={styles.field} style={{ cursor: 'pointer' }}>
                        <label className={styles.fieldLabel}>Effective Date</label>
                        <div className={styles.fieldValue} style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ flex: 1 }}>{renderValue(parsed.agreement_summary?.effective_date)}</span>
                          <Tooltip title={TERM_DEFINITIONS.effective_date} arrow placement="right">
                            <span style={{ cursor: 'help' }} onClick={(e) => e.stopPropagation()}>
                              <FaInfoCircle style={{ color: '#374151', fontSize: '14px', marginLeft: '8px' }} />
                            </span>
                          </Tooltip>
                        </div>
                      </div>
                    </Tooltip>
                    <Tooltip
                      title={
                        SUMMARY_ASSESSMENTS.exclusivity[parsed.agreement_summary?.exclusivity] ||
                        'Determines whether you can license this work to other parties.'
                      }
                      arrow
                      placement="top"
                    >
                      <div className={styles.field} style={{ cursor: 'pointer' }}>
                        <label className={styles.fieldLabel}>Exclusivity</label>
                        <div className={styles.fieldValue} style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ flex: 1 }}>{renderValue(parsed.agreement_summary?.exclusivity)}</span>
                          <Tooltip title={TERM_DEFINITIONS.exclusivity} arrow placement="right">
                            <span style={{ cursor: 'help' }} onClick={(e) => e.stopPropagation()}>
                              <FaInfoCircle style={{ color: '#374151', fontSize: '14px', marginLeft: '8px' }} />
                            </span>
                          </Tooltip>
                        </div>
                      </div>
                    </Tooltip>
                    <Tooltip
                      title={
                        SUMMARY_ASSESSMENTS.status[parsed.agreement_summary?.status] ||
                        'Indicates whether the agreement has been fully signed and executed.'
                      }
                      arrow
                      placement="top"
                    >
                      <div className={styles.field} style={{ cursor: 'pointer' }}>
                        <label className={styles.fieldLabel}>Status</label>
                        <div className={styles.fieldValue} style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ flex: 1 }}>{renderValue(parsed.agreement_summary?.status)}</span>
                          <Tooltip title={TERM_DEFINITIONS.status} arrow placement="right">
                            <span style={{ cursor: 'help' }} onClick={(e) => e.stopPropagation()}>
                              <FaInfoCircle style={{ color: '#374151', fontSize: '14px', marginLeft: '8px' }} />
                            </span>
                          </Tooltip>
                        </div>
                      </div>
                    </Tooltip>
                  </div>
                </div>
              )}

              {/* Fallback: Old structure parties */}
              {!parsed.agreement_summary && (parsed.producer || parsed.artist_or_label) && (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Parties</h2>
                  <div className={styles.fieldGroup}>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>Producer</label>
                      <div className={styles.fieldValue}>{renderValue(parsed.producer)}</div>
                    </div>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>Artist / Label</label>
                      <div className={styles.fieldValue}>{renderValue(parsed.artist_or_label)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Royalty Analysis - NEW */}
              {parsed.royalty_analysis && (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Royalty Structure Analysis</h2>
                  <div className={styles.fieldGroupFour}>
                    {/* Structure Type Card */}
                    <Tooltip
                      title={
                        ROYALTY_ASSESSMENTS.structure_type[parsed.royalty_analysis?.structure_type] ||
                        'Structure type determines how your royalty is calculated.'
                      }
                      arrow
                      placement="top"
                    >
                      <div className={styles.field} style={{ cursor: 'pointer' }}>
                        <label className={styles.fieldLabel}>Structure Type</label>
                        <div
                          className={styles.fieldValue}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            ...(parsed.royalty_analysis?.structure_type === 'APPLICABLE_FRACTION'
                              ? {
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  padding: '8px',
                                  borderRadius: '4px',
                                  border: '1px solid rgba(239, 68, 68, 0.4)',
                                  color: '#dc2626',
                                }
                              : parsed.royalty_analysis?.structure_type === 'DIRECT'
                                ? {
                                    background: 'rgba(34, 197, 94, 0.1)',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid rgba(34, 197, 94, 0.4)',
                                    color: '#16a34a',
                                  }
                                : {}),
                          }}
                        >
                          <span style={{ flex: 1 }}>{renderValue(parsed.royalty_analysis?.structure_type)}</span>
                          <Tooltip title={TERM_DEFINITIONS.structure_type} arrow placement="right">
                            <span style={{ cursor: 'help' }} onClick={(e) => e.stopPropagation()}>
                              <FaInfoCircle style={{ color: '#374151', fontSize: '14px', marginLeft: '8px' }} />
                            </span>
                          </Tooltip>
                        </div>
                      </div>
                    </Tooltip>

                    {/* Headline Rate Card */}
                    <Tooltip
                      title="This is the rate shown in your contract. Compare with effective rate to see if there are hidden deductions."
                      arrow
                      placement="top"
                    >
                      <div className={styles.field} style={{ cursor: 'pointer' }}>
                        <label className={styles.fieldLabel}>Headline Rate</label>
                        <div className={styles.fieldValue} style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ flex: 1 }}>{renderValue(parsed.royalty_analysis?.headline_rate)}</span>
                          <Tooltip title={TERM_DEFINITIONS.headline_rate} arrow placement="right">
                            <span style={{ cursor: 'help' }} onClick={(e) => e.stopPropagation()}>
                              <FaInfoCircle style={{ color: '#374151', fontSize: '14px', marginLeft: '8px' }} />
                            </span>
                          </Tooltip>
                        </div>
                      </div>
                    </Tooltip>

                    {/* Effective Rate Card */}
                    <Tooltip
                      title={
                        parsed.royalty_analysis?.effective_rate !== parsed.royalty_analysis?.headline_rate
                          ? ROYALTY_ASSESSMENTS.headline_vs_effective.different
                          : ROYALTY_ASSESSMENTS.headline_vs_effective.same
                      }
                      arrow
                      placement="top"
                    >
                      <div className={styles.field} style={{ cursor: 'pointer' }}>
                        <label className={styles.fieldLabel}>Effective Rate</label>
                        <div
                          className={styles.fieldValue}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            ...(parsed.royalty_analysis?.effective_rate &&
                            parsed.royalty_analysis?.effective_rate !== parsed.royalty_analysis?.headline_rate
                              ? {
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  padding: '8px',
                                  borderRadius: '4px',
                                  border: '1px solid rgba(239, 68, 68, 0.4)',
                                  color: '#dc2626',
                                }
                              : {}),
                          }}
                        >
                          <span style={{ flex: 1 }}>{renderValue(parsed.royalty_analysis?.effective_rate)}</span>
                          <Tooltip title={TERM_DEFINITIONS.effective_rate} arrow placement="right">
                            <span style={{ cursor: 'help' }} onClick={(e) => e.stopPropagation()}>
                              <FaInfoCircle style={{ color: '#374151', fontSize: '14px', marginLeft: '8px' }} />
                            </span>
                          </Tooltip>
                        </div>
                      </div>
                    </Tooltip>

                    {/* Calculation Card */}
                    <Tooltip
                      title={
                        <div style={{ padding: '8px', maxWidth: '400px' }}>
                          <div style={{ marginBottom: '8px' }}>
                            <strong>Full Explanation:</strong>
                          </div>
                          <div>{parsed.royalty_analysis?.explanation || 'No explanation available'}</div>
                        </div>
                      }
                      arrow
                      placement="top"
                    >
                      <div className={styles.field} style={{ cursor: 'pointer' }}>
                        <label className={styles.fieldLabel}>Calculation</label>
                        <div className={styles.fieldValue} style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ flex: 1, fontFamily: 'monospace', fontSize: '14px' }}>
                            {extractEquation(parsed.royalty_analysis?.explanation) ||
                              renderValue(parsed.royalty_analysis?.explanation)}
                          </span>
                          <Tooltip title={TERM_DEFINITIONS.calculation} arrow placement="right">
                            <span style={{ cursor: 'help' }} onClick={(e) => e.stopPropagation()}>
                              <FaInfoCircle style={{ color: '#374151', fontSize: '14px', marginLeft: '8px' }} />
                            </span>
                          </Tooltip>
                        </div>
                      </div>
                    </Tooltip>
                  </div>

                  {/* Second row: Calculation Context Fields */}
                  {(parsed.royalty_analysis?.royalty_base ||
                    parsed.royalty_analysis?.royalty_calculation ||
                    parsed.royalty_analysis?.escalation ||
                    parsed.royalty_analysis?.recoupment_threshold ||
                    parsed.royalty_analysis?.payment_threshold) && (
                    <div className={styles.fieldGroupFour} style={{ marginTop: '16px' }}>
                      {/* Royalty Base Card */}
                      {parsed.royalty_analysis?.royalty_base && (
                        <Tooltip
                          title="The base amount your royalty percentage is applied against. Net receipts mean more deductions than gross."
                          arrow
                          placement="top"
                        >
                          <div className={styles.field} style={{ cursor: 'pointer' }}>
                            <label className={styles.fieldLabel}>Royalty Base</label>
                            <div className={styles.fieldValue} style={{ display: 'flex', alignItems: 'center' }}>
                              <span style={{ flex: 1 }}>{renderValue(parsed.royalty_analysis?.royalty_base)}</span>
                              <Tooltip title={TERM_DEFINITIONS.royalty_base} arrow placement="right">
                                <span style={{ cursor: 'help' }} onClick={(e) => e.stopPropagation()}>
                                  <FaInfoCircle style={{ color: '#374151', fontSize: '14px', marginLeft: '8px' }} />
                                </span>
                              </Tooltip>
                            </div>
                          </div>
                        </Tooltip>
                      )}

                      {/* Royalty Calculation Card */}
                      {parsed.royalty_analysis?.royalty_calculation && (
                        <Tooltip
                          title="The specific formula or method used to calculate your royalty. Look for fraction calculations that can reduce your effective rate."
                          arrow
                          placement="top"
                        >
                          <div className={styles.field} style={{ cursor: 'pointer' }}>
                            <label className={styles.fieldLabel}>Calculation Method</label>
                            <div className={styles.fieldValue} style={{ display: 'flex', alignItems: 'center' }}>
                              <span style={{ flex: 1, fontFamily: 'monospace', fontSize: '13px' }}>
                                {renderValue(parsed.royalty_analysis?.royalty_calculation)}
                              </span>
                              <Tooltip title={TERM_DEFINITIONS.royalty_calculation} arrow placement="right">
                                <span style={{ cursor: 'help' }} onClick={(e) => e.stopPropagation()}>
                                  <FaInfoCircle style={{ color: '#374151', fontSize: '14px', marginLeft: '8px' }} />
                                </span>
                              </Tooltip>
                            </div>
                          </div>
                        </Tooltip>
                      )}

                      {/* Escalation Card */}
                      {parsed.royalty_analysis?.escalation && (
                        <Tooltip
                          title={
                            parsed.royalty_analysis?.escalation?.toLowerCase?.().includes('none') ||
                            parsed.royalty_analysis?.escalation?.toLowerCase?.().includes('excluded')
                              ? 'No escalation provisions - your rate will not increase even if the release is successful.'
                              : 'Escalation provisions allow your rate to increase when sales hit certain milestones.'
                          }
                          arrow
                          placement="top"
                        >
                          <div className={styles.field} style={{ cursor: 'pointer' }}>
                            <label className={styles.fieldLabel}>Escalation</label>
                            <div
                              className={styles.fieldValue}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                ...(parsed.royalty_analysis?.escalation?.toLowerCase?.().includes('none') ||
                                parsed.royalty_analysis?.escalation?.toLowerCase?.().includes('excluded')
                                  ? {
                                      background: 'rgba(245, 158, 11, 0.1)',
                                      padding: '8px',
                                      borderRadius: '4px',
                                      border: '1px solid rgba(245, 158, 11, 0.4)',
                                      color: '#d97706',
                                    }
                                  : {}),
                              }}
                            >
                              <span style={{ flex: 1 }}>{renderValue(parsed.royalty_analysis?.escalation)}</span>
                              <Tooltip title={TERM_DEFINITIONS.escalation} arrow placement="right">
                                <span style={{ cursor: 'help' }} onClick={(e) => e.stopPropagation()}>
                                  <FaInfoCircle style={{ color: '#374151', fontSize: '14px', marginLeft: '8px' }} />
                                </span>
                              </Tooltip>
                            </div>
                          </div>
                        </Tooltip>
                      )}

                      {/* Recoupment Threshold Card */}
                      {parsed.royalty_analysis?.recoupment_threshold && (
                        <Tooltip
                          title="The amount that must be recouped before you receive royalty payments. Higher amounts mean longer waits for income."
                          arrow
                          placement="top"
                        >
                          <div className={styles.field} style={{ cursor: 'pointer' }}>
                            <label className={styles.fieldLabel}>Recoupment Threshold</label>
                            <div className={styles.fieldValue} style={{ display: 'flex', alignItems: 'center' }}>
                              <span style={{ flex: 1 }}>
                                {renderValue(parsed.royalty_analysis?.recoupment_threshold)}
                              </span>
                              <Tooltip title={TERM_DEFINITIONS.recoupment_threshold} arrow placement="right">
                                <span style={{ cursor: 'help' }} onClick={(e) => e.stopPropagation()}>
                                  <FaInfoCircle style={{ color: '#374151', fontSize: '14px', marginLeft: '8px' }} />
                                </span>
                              </Tooltip>
                            </div>
                          </div>
                        </Tooltip>
                      )}

                      {/* Payment Threshold Card */}
                      {parsed.royalty_analysis?.payment_threshold && (
                        <Tooltip
                          title="Minimum amount that must accumulate before you receive payment. High thresholds delay your earnings."
                          arrow
                          placement="top"
                        >
                          <div className={styles.field} style={{ cursor: 'pointer' }}>
                            <label className={styles.fieldLabel}>Payment Threshold</label>
                            <div
                              className={styles.fieldValue}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                // Highlight if threshold seems high (>£100 or >$100)
                                ...(parsed.royalty_analysis?.payment_threshold &&
                                /[£$€]?\s*[12]\d{2,}|[£$€]?\s*\d{3,}/.test(
                                  String(parsed.royalty_analysis?.payment_threshold)
                                )
                                  ? {
                                      background: 'rgba(245, 158, 11, 0.1)',
                                      padding: '8px',
                                      borderRadius: '4px',
                                      border: '1px solid rgba(245, 158, 11, 0.4)',
                                      color: '#d97706',
                                    }
                                  : {}),
                              }}
                            >
                              <span style={{ flex: 1 }}>{renderValue(parsed.royalty_analysis?.payment_threshold)}</span>
                              <Tooltip title={TERM_DEFINITIONS.payment_thresholds} arrow placement="right">
                                <span style={{ cursor: 'help' }} onClick={(e) => e.stopPropagation()}>
                                  <FaInfoCircle style={{ color: '#374151', fontSize: '14px', marginLeft: '8px' }} />
                                </span>
                              </Tooltip>
                            </div>
                          </div>
                        </Tooltip>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Color-Coded Terms - Financial */}
              {renderTermSection('Financial Terms', parsed.terms?.financial, '1.1')}

              {/* Color-Coded Terms - Rights */}
              {renderTermSection('Rights Granted', parsed.terms?.rights, '1.2')}

              {/* Color-Coded Terms - Credit */}
              {renderTermSection('Credit & Attribution', parsed.terms?.credit, '1.3')}

              {/* Color-Coded Terms - Legal */}
              {renderTermSection('Legal Protections', parsed.terms?.legal, '1.4')}

              {/* Color-Coded Terms - Administrative */}
              {renderTermSection('Administrative Terms', parsed.terms?.administrative, '1.5')}

              {/* Color-Coded Terms - Publishing */}
              {renderTermSection('Publishing Terms', parsed.terms?.publishing, '1.6')}

              {/* Color-Coded Terms - Payment Protection (legacy support) */}
              {parsed.terms?.payment_protection &&
                renderTermSection('Payment Protection', parsed.terms.payment_protection, '')}

              {/* Red Flags Detected - Enhanced with severity sorting */}
              {parsed.red_flags && parsed.red_flags.length > 0 && (
                <div className={styles.section}>
                  <h2
                    className={styles.sectionTitle}
                    style={{ color: '#dc2626', display: 'flex', alignItems: 'center' }}
                  >
                    <FaExclamationTriangle style={{ marginRight: '8px' }} />
                    Red Flags Detected ({parsed.red_flags.length})
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Sort flags by severity: CRITICAL -> HIGH -> MEDIUM */}
                    {[...parsed.red_flags]
                      .sort((a, b) => {
                        const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
                        return (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3);
                      })
                      .map((flag, idx) => {
                        const getSeverityColors = (severity) => {
                          switch (severity) {
                            case 'CRITICAL':
                              return {
                                bg: 'rgba(239, 68, 68, 0.1)',
                                border: 'rgba(239, 68, 68, 0.3)',
                                text: '#dc2626',
                                badge: '#dc2626',
                              };
                            case 'HIGH':
                              return {
                                bg: 'rgba(245, 158, 11, 0.1)',
                                border: 'rgba(245, 158, 11, 0.3)',
                                text: '#d97706',
                                badge: '#f59e0b',
                              };
                            case 'MEDIUM':
                              return {
                                bg: 'rgba(234, 179, 8, 0.1)',
                                border: 'rgba(234, 179, 8, 0.3)',
                                text: '#ca8a04',
                                badge: '#eab308',
                              };
                            default:
                              return {
                                bg: 'rgba(59, 130, 246, 0.1)',
                                border: 'rgba(59, 130, 246, 0.3)',
                                text: '#3b82f6',
                                badge: '#3b82f6',
                              };
                          }
                        };
                        const colors = getSeverityColors(flag.severity);

                        return (
                          <div
                            key={idx}
                            style={{
                              padding: '16px',
                              borderRadius: '8px',
                              background: colors.bg,
                              border: `1px solid ${colors.border}`,
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                marginBottom: '8px',
                                gap: '12px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    background: colors.badge,
                                    color: 'white',
                                    fontWeight: 600,
                                  }}
                                >
                                  {flag.severity}
                                </span>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    background: 'rgba(0,0,0,0.1)',
                                    color: 'var(--text)',
                                    fontFamily: 'monospace',
                                  }}
                                >
                                  {flag.id}
                                </span>
                              </div>
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '8px',
                              }}
                            >
                              <strong style={{ color: colors.text, fontSize: '14px' }}>{flag.name}</strong>
                              <button
                                onClick={() =>
                                  setExpandedFlags((prev) => ({
                                    ...prev,
                                    [flag.id || idx]: !prev[flag.id || idx],
                                  }))
                                }
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '4px 8px',
                                  background: 'transparent',
                                  border: `1px solid ${colors.border}`,
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  color: colors.text,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                }}
                              >
                                {expandedFlags[flag.id || idx] ? (
                                  <>
                                    Show less <FaChevronUp size={10} />
                                  </>
                                ) : (
                                  <>
                                    Show more <FaChevronDown size={10} />
                                  </>
                                )}
                              </button>
                            </div>
                            <div
                              className={`${styles.expandableSection} ${
                                expandedFlags[flag.id || idx] ? styles.expanded : styles.collapsed
                              }`}
                            >
                              <p
                                style={{ fontSize: '13px', color: 'var(--text)', margin: '0 0 8px 0', lineHeight: 1.5 }}
                              >
                                {flag.description}
                              </p>
                              {/* Quote from agreement */}
                              {flag.quote && (
                                <div
                                  style={{
                                    padding: '10px 12px',
                                    background: 'rgba(0,0,0,0.05)',
                                    borderRadius: '6px',
                                    borderLeft: `3px solid ${colors.badge}`,
                                    marginBottom: '8px',
                                  }}
                                >
                                  <p
                                    style={{
                                      fontSize: '12px',
                                      color: 'var(--muted-text)',
                                      margin: 0,
                                      fontStyle: 'italic',
                                      lineHeight: 1.5,
                                    }}
                                  >
                                    "{flag.quote}"
                                  </p>
                                </div>
                              )}
                              {(flag.impact || flag.financial_impact) && (
                                <p style={{ fontSize: '12px', color: 'var(--muted-text)', margin: '0 0 4px 0' }}>
                                  <strong>Impact:</strong> {flag.impact || flag.financial_impact}
                                </p>
                              )}
                              {flag.recommendation && (
                                <div
                                  style={{
                                    padding: '8px 12px',
                                    background: 'rgba(34, 197, 94, 0.1)',
                                    borderRadius: '6px',
                                    marginTop: '8px',
                                  }}
                                >
                                  <p style={{ fontSize: '12px', color: '#16a34a', margin: 0 }}>
                                    <strong>Recommendation:</strong> {flag.recommendation}
                                  </p>
                                </div>
                              )}
                              {(flag.clause || flag.clause_reference) && (
                                <p style={{ fontSize: '11px', color: 'var(--muted-text)', margin: '8px 0 0 0' }}>
                                  📄 Reference: {flag.clause || flag.clause_reference}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Negotiation Priorities - Enhanced */}
              {parsed.negotiation_priorities && parsed.negotiation_priorities.length > 0 && (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Negotiation Priorities</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {parsed.negotiation_priorities.map((item, idx) => {
                      const getImpactColors = (impact) => {
                        switch (impact) {
                          case 'CRITICAL':
                            return { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', badge: '#dc2626' };
                          case 'HIGH':
                            return {
                              bg: 'rgba(245, 158, 11, 0.1)',
                              border: 'rgba(245, 158, 11, 0.3)',
                              badge: '#f59e0b',
                            };
                          case 'MEDIUM':
                            return {
                              bg: 'rgba(59, 130, 246, 0.1)',
                              border: 'rgba(59, 130, 246, 0.3)',
                              badge: '#3b82f6',
                            };
                          default:
                            return { bg: 'var(--panel-bg)', border: 'var(--button-border)', badge: 'var(--secondary)' };
                        }
                      };
                      const colors = getImpactColors(item.impact);

                      return (
                        <div
                          key={idx}
                          style={{
                            padding: '16px',
                            borderRadius: '8px',
                            background: colors.bg,
                            border: `1px solid ${colors.border}`,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              marginBottom: '12px',
                              flexWrap: 'wrap',
                            }}
                          >
                            <span
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: colors.badge,
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: 600,
                                flexShrink: 0,
                              }}
                            >
                              {item.priority}
                            </span>
                            <strong style={{ flex: 1 }}>
                              {item.term?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                            </strong>
                            {item.impact && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  background: colors.badge,
                                  color: 'white',
                                  fontWeight: 600,
                                }}
                              >
                                {item.impact}
                              </span>
                            )}
                            {item.achievability && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  background: 'rgba(34, 197, 94, 0.2)',
                                  color: '#16a34a',
                                }}
                              >
                                {item.achievability}
                              </span>
                            )}
                          </div>
                          {item.issue && (
                            <p style={{ fontSize: '13px', color: 'var(--muted-text)', margin: '0 0 12px 0' }}>
                              {item.issue}
                            </p>
                          )}
                          <div
                            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}
                          >
                            <div
                              style={{
                                padding: '10px 12px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                borderRadius: '6px',
                              }}
                            >
                              <span
                                style={{
                                  color: 'var(--muted-text)',
                                  display: 'block',
                                  fontSize: '11px',
                                  marginBottom: '4px',
                                }}
                              >
                                Current
                              </span>
                              <span style={{ color: '#dc2626', fontWeight: 500 }}>{item.current}</span>
                            </div>
                            <div
                              style={{
                                padding: '10px 12px',
                                background: 'rgba(34, 197, 94, 0.1)',
                                borderRadius: '6px',
                              }}
                            >
                              <span
                                style={{
                                  color: 'var(--muted-text)',
                                  display: 'block',
                                  fontSize: '11px',
                                  marginBottom: '4px',
                                }}
                              >
                                Target
                              </span>
                              <span style={{ color: '#16a34a', fontWeight: 500 }}>{item.target}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Financial Projection */}
              {parsed.financial_projection && (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Financial Projection</h2>
                  {parsed.financial_projection.scenario && (
                    <p style={{ color: 'var(--muted-text)', fontSize: '13px', marginBottom: '16px' }}>
                      Scenario: {parsed.financial_projection.scenario}
                    </p>
                  )}
                  <div className={styles.fieldGroupFour}>
                    {parsed.financial_projection.estimated_advance && (
                      <div className={styles.field}>
                        <label className={styles.fieldLabel}>Estimated Advance</label>
                        <div
                          className={styles.fieldValue}
                          style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}
                        >
                          <span style={{ color: '#3b82f6', fontWeight: 600 }}>
                            {typeof parsed.financial_projection.estimated_advance === 'number'
                              ? `£${parsed.financial_projection.estimated_advance.toLocaleString()}`
                              : parsed.financial_projection.estimated_advance}
                          </span>
                        </div>
                      </div>
                    )}
                    {parsed.financial_projection.recording_royalties && (
                      <div className={styles.field}>
                        <label className={styles.fieldLabel}>Recording Royalties (Annual)</label>
                        <div
                          className={styles.fieldValue}
                          style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}
                        >
                          <span style={{ color: '#16a34a', fontWeight: 600 }}>
                            {typeof parsed.financial_projection.recording_royalties === 'number'
                              ? `£${parsed.financial_projection.recording_royalties.toLocaleString()}`
                              : parsed.financial_projection.recording_royalties}
                          </span>
                        </div>
                      </div>
                    )}
                    {parsed.financial_projection.sync_income && (
                      <div className={styles.field}>
                        <label className={styles.fieldLabel}>Sync Income (Annual)</label>
                        <div
                          className={styles.fieldValue}
                          style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)' }}
                        >
                          <span style={{ color: '#8b5cf6', fontWeight: 600 }}>
                            {typeof parsed.financial_projection.sync_income === 'number'
                              ? `£${parsed.financial_projection.sync_income.toLocaleString()}`
                              : parsed.financial_projection.sync_income}
                          </span>
                        </div>
                      </div>
                    )}
                    {parsed.financial_projection.soundexchange && (
                      <div className={styles.field}>
                        <label className={styles.fieldLabel}>SoundExchange</label>
                        <div
                          className={styles.fieldValue}
                          style={{ background: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.3)' }}
                        >
                          <span style={{ color: '#ec4899', fontWeight: 600 }}>
                            {typeof parsed.financial_projection.soundexchange === 'number'
                              ? `£${parsed.financial_projection.soundexchange.toLocaleString()}`
                              : parsed.financial_projection.soundexchange}
                          </span>
                        </div>
                      </div>
                    )}
                    {parsed.financial_projection.publishing && (
                      <div className={styles.field}>
                        <label className={styles.fieldLabel}>Publishing</label>
                        <div
                          className={styles.fieldValue}
                          style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}
                        >
                          <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                            {typeof parsed.financial_projection.publishing === 'number'
                              ? `£${parsed.financial_projection.publishing.toLocaleString()}`
                              : parsed.financial_projection.publishing}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  {parsed.financial_projection.key_insight && (
                    <div
                      style={{
                        marginTop: '16px',
                        padding: '12px 16px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '8px',
                      }}
                    >
                      <p style={{ margin: 0, fontSize: '13px', color: '#3b82f6' }}>
                        <strong>Key Insight:</strong> {parsed.financial_projection.key_insight}
                      </p>
                    </div>
                  )}
                  <p style={{ marginTop: '12px', fontSize: '11px', color: 'var(--muted-text)', fontStyle: 'italic' }}>
                    * Projections are estimates based on typical industry scenarios. Actual results may vary.
                  </p>
                </div>
              )}

              {/* General Assessment */}
              {parsed.general_assessment && (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Detailed Analysis</h2>
                  <p style={{ color: 'var(--text)', lineHeight: 1.6, margin: 0 }}>{parsed.general_assessment}</p>
                </div>
              )}

              {/* FALLBACK: Old structure sections for backwards compatibility */}
              {/* Only show if new structure not present */}
              {!parsed.terms && parsed.compensation && (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Compensation</h2>
                  <div className={styles.fieldGroup}>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>Producer Fee</label>
                      {renderRatedField('producer_fee', parsed.compensation?.producer_fee)}
                    </div>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>Payment Schedule</label>
                      <div className={styles.fieldValue}>{renderValue(parsed.compensation?.payment_schedule)}</div>
                    </div>
                  </div>
                </div>
              )}

              {!parsed.royalty_analysis && parsed.royalty_structure && (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Royalty Structure Analysis</h2>
                  <div className={styles.fieldGroupFour}>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>Structure Type</label>
                      <div
                        className={styles.fieldValue}
                        style={
                          parsed.royalty_structure?.type === 'APPLICABLE_FRACTION'
                            ? {
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                color: '#dc2626',
                              }
                            : parsed.royalty_structure?.type === 'DIRECT'
                              ? {
                                  background: 'rgba(34, 197, 94, 0.1)',
                                  border: '1px solid rgba(34, 197, 94, 0.4)',
                                  color: '#16a34a',
                                }
                              : {}
                        }
                      >
                        {renderValue(parsed.royalty_structure?.type)}
                      </div>
                    </div>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>Headline Rate</label>
                      <div className={styles.fieldValue}>{renderValue(parsed.royalty_structure?.headline_rate)}</div>
                    </div>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>Effective Rate</label>
                      <div
                        className={styles.fieldValue}
                        style={
                          parsed.royalty_structure?.effective_rate &&
                          parsed.royalty_structure?.effective_rate !== parsed.royalty_structure?.headline_rate
                            ? {
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                color: '#dc2626',
                              }
                            : {}
                        }
                      >
                        {renderValue(parsed.royalty_structure?.effective_rate)}
                      </div>
                    </div>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>Calculation</label>
                      <div className={styles.fieldValue}>
                        {renderValue(parsed.royalty_structure?.calculation_explanation)}
                      </div>
                    </div>
                  </div>

                  {/* Second row: Calculation Context Fields */}
                  {(parsed.royalty_structure?.royalty_base ||
                    parsed.royalty_structure?.royalty_calculation ||
                    parsed.royalty_structure?.escalation ||
                    parsed.royalty_structure?.recoupment_threshold ||
                    parsed.royalty_structure?.payment_threshold) && (
                    <div className={styles.fieldGroupFour} style={{ marginTop: '16px' }}>
                      {parsed.royalty_structure?.royalty_base && (
                        <div className={styles.field}>
                          <label className={styles.fieldLabel}>Royalty Base</label>
                          <div className={styles.fieldValue}>{renderValue(parsed.royalty_structure?.royalty_base)}</div>
                        </div>
                      )}
                      {parsed.royalty_structure?.royalty_calculation && (
                        <div className={styles.field}>
                          <label className={styles.fieldLabel}>Calculation Method</label>
                          <div className={styles.fieldValue} style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                            {renderValue(parsed.royalty_structure?.royalty_calculation)}
                          </div>
                        </div>
                      )}
                      {parsed.royalty_structure?.escalation && (
                        <div className={styles.field}>
                          <label className={styles.fieldLabel}>Escalation</label>
                          <div
                            className={styles.fieldValue}
                            style={
                              parsed.royalty_structure?.escalation?.toLowerCase?.().includes('none') ||
                              parsed.royalty_structure?.escalation?.toLowerCase?.().includes('excluded')
                                ? {
                                    background: 'rgba(245, 158, 11, 0.1)',
                                    border: '1px solid rgba(245, 158, 11, 0.4)',
                                    color: '#d97706',
                                  }
                                : {}
                            }
                          >
                            {renderValue(parsed.royalty_structure?.escalation)}
                          </div>
                        </div>
                      )}
                      {parsed.royalty_structure?.recoupment_threshold && (
                        <div className={styles.field}>
                          <label className={styles.fieldLabel}>Recoupment Threshold</label>
                          <div className={styles.fieldValue}>
                            {renderValue(parsed.royalty_structure?.recoupment_threshold)}
                          </div>
                        </div>
                      )}
                      {parsed.royalty_structure?.payment_threshold && (
                        <div className={styles.field}>
                          <label className={styles.fieldLabel}>Payment Threshold</label>
                          <div
                            className={styles.fieldValue}
                            style={
                              parsed.royalty_structure?.payment_threshold &&
                              /[£$€]?\s*[12]\d{2,}|[£$€]?\s*\d{3,}/.test(
                                String(parsed.royalty_structure?.payment_threshold)
                              )
                                ? {
                                    background: 'rgba(245, 158, 11, 0.1)',
                                    border: '1px solid rgba(245, 158, 11, 0.4)',
                                    color: '#d97706',
                                  }
                                : {}
                            }
                          >
                            {renderValue(parsed.royalty_structure?.payment_threshold)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Overall Assessment Badge - NEW */}
              {parsed.overall_assessment && (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Overall Assessment</h2>
                  {(() => {
                    // Handle both object and string formats
                    const rating =
                      typeof parsed.overall_assessment === 'object'
                        ? parsed.overall_assessment.rating
                        : parsed.overall_assessment;
                    return (
                      <div
                        style={{
                          display: 'inline-block',
                          padding: '12px 24px',
                          borderRadius: '8px',
                          fontSize: '16px',
                          fontWeight: 600,
                          background:
                            rating === 'FAVORABLE'
                              ? 'rgba(34, 197, 94, 0.1)'
                              : rating === 'NEUTRAL'
                                ? 'rgba(59, 130, 246, 0.1)'
                                : rating === 'UNFAVORABLE'
                                  ? 'rgba(245, 158, 11, 0.1)'
                                  : 'rgba(239, 68, 68, 0.1)',
                          color:
                            rating === 'FAVORABLE'
                              ? '#16a34a'
                              : rating === 'NEUTRAL'
                                ? '#3b82f6'
                                : rating === 'UNFAVORABLE'
                                  ? '#d97706'
                                  : '#dc2626',
                          border: `1px solid ${
                            rating === 'FAVORABLE'
                              ? 'rgba(34, 197, 94, 0.3)'
                              : rating === 'NEUTRAL'
                                ? 'rgba(59, 130, 246, 0.3)'
                                : rating === 'UNFAVORABLE'
                                  ? 'rgba(245, 158, 11, 0.3)'
                                  : 'rgba(239, 68, 68, 0.3)'
                          }`,
                        }}
                      >
                        {rating?.replace(/_/g, ' ') || 'N/A'}
                      </div>
                    );
                  })()}
                </div>
              )}
            </>
          ) : agreement?.parsed_content ? (
            <>
              {/* PUBLISHING/OTHER AGREEMENT SECTIONS */}
              {/* Parties */}
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Parties</h2>
                <div className={styles.fieldGroup}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Assigner (Licensor)</label>
                    <div className={styles.fieldValue}>{renderValue(parsed.assigner)}</div>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Assignee (Licensee)</label>
                    <div className={styles.fieldValue}>{renderValue(parsed.assignee)}</div>
                  </div>
                </div>
              </div>

              {/* Financial Terms - Advances */}
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Advances</h2>
                <div className={styles.fieldGroup}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Advance Amount & Terms</label>
                    {renderRatedField('advance', parsed.costs?.advance)}
                  </div>
                </div>
              </div>

              {/* Financial Terms - Royalty Rates */}
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Royalty Rates</h2>
                {/* Mechanical rates */}
                <div className={styles.fieldGroup}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Mechanical (Domestic)</label>
                    {renderRatedField('mechanical_domestic', parsed.royalty_rates?.mechanical_domestic)}
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Mechanical (International)</label>
                    {renderRatedField('mechanical_international', parsed.royalty_rates?.mechanical_international)}
                  </div>
                </div>
                {/* Performance rates */}
                <div className={styles.fieldGroup} style={{ marginTop: '16px' }}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Performance (Domestic)</label>
                    {renderRatedField('performance_domestic', parsed.royalty_rates?.performance_domestic)}
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Performance (International)</label>
                    {renderRatedField('performance_international', parsed.royalty_rates?.performance_international)}
                  </div>
                </div>
                {/* Sync and Other */}
                <div className={styles.fieldGroup} style={{ marginTop: '16px' }}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Sync</label>
                    {renderRatedField('sync', parsed.royalty_rates?.sync)}
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Other</label>
                    {renderRatedField('other', parsed.royalty_rates?.other)}
                  </div>
                </div>
                {/* Recording-specific rates - only show if applicable */}
                {parsed.royalty_rates?.master && (
                  <div className={styles.fieldGroup} style={{ marginTop: '16px' }}>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>Master</label>
                      {renderRatedField('master', parsed.royalty_rates?.master)}
                    </div>
                  </div>
                )}
              </div>

              {/* Financial Terms - Costs & Deductions */}
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Costs & Deductions</h2>
                <div className={styles.fieldGroup}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Other Deductions</label>
                    <div className={styles.fieldValue}>{renderValue(parsed.costs?.other_deductions)}</div>
                  </div>
                </div>
                {/* Recording-specific costs - only show if applicable */}
                {(parsed.costs?.recording_costs || parsed.costs?.marketing || parsed.costs?.distribution_fee) && (
                  <div className={styles.fieldGroupThree} style={{ marginTop: '16px' }}>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>Recording Costs</label>
                      <div className={styles.fieldValue}>{renderValue(parsed.costs?.recording_costs)}</div>
                    </div>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>Marketing</label>
                      <div className={styles.fieldValue}>{renderValue(parsed.costs?.marketing)}</div>
                    </div>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>Distribution Fee</label>
                      <div className={styles.fieldValue}>{renderValue(parsed.costs?.distribution_fee)}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Accounting & Audit Rights */}
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Accounting & Audit Rights</h2>
                <div className={styles.fieldGroupThree}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Statement Frequency</label>
                    {renderRatedField('statement_frequency', parsed.audit_rights?.statement_frequency)}
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Audit Window</label>
                    {renderRatedField('audit_window', parsed.audit_rights?.audit_window)}
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Objection Period</label>
                    {renderRatedField('objection_period', parsed.audit_rights?.objection_period)}
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Audit Frequency</label>
                    {renderRatedField('audit_frequency', parsed.audit_rights?.audit_frequency)}
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Audit Costs</label>
                    {renderRatedField('audit_costs', parsed.audit_rights?.audit_costs)}
                  </div>
                </div>
              </div>

              {/* Approvals */}
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Approvals Required</h2>
                <div className={styles.fieldGroup}>
                  <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
                    {renderRatedField('approvals', parsed.approvals, true)}
                  </div>
                </div>
              </div>

              {/* Term & Territory */}
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Term & Territory</h2>
                <div className={styles.fieldGroup}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Term</label>
                    {renderRatedField('term', parsed.term)}
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Collection Period</label>
                    {renderRatedField('collection_period', parsed.collection_period)}
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Effective Date</label>
                    <div className={styles.fieldValue}>{renderValue(parsed.effective_date)}</div>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Expiration Date</label>
                    {renderRatedField('expiration_date', parsed.expiration_date)}
                  </div>
                </div>
                <div className={styles.fieldGroup} style={{ marginTop: '16px' }}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Territory</label>
                    <div className={styles.fieldValue}>{renderValue(parsed.territory)}</div>
                  </div>
                  {/* Renewal Status Cards */}
                  {(() => {
                    const termInfo = formatTerminationDeadline(parsed.renewal, parsed.expiration_date);
                    const daysToExpiry = calculateDaysUntil(parsed.expiration_date);
                    if (termInfo) {
                      const urgentBg = 'rgba(239, 68, 68, 0.1)';
                      const safeBg = 'rgba(34, 197, 94, 0.1)';
                      const urgentBorder = 'rgba(239, 68, 68, 0.3)';
                      const safeBorder = 'rgba(34, 197, 94, 0.3)';
                      return (
                        <div className={styles.field}>
                          <label className={styles.fieldLabel}>Termination Deadline</label>
                          <div
                            className={styles.fieldValue}
                            style={{
                              background: termInfo.isUrgent ? urgentBg : safeBg,
                              border: `1px solid ${termInfo.isUrgent ? urgentBorder : safeBorder}`,
                              color: termInfo.isUrgent ? '#ef4444' : '#22c55e',
                            }}
                          >
                            {termInfo.isPast
                              ? `Missed deadline. Auto-renewed on ${termInfo.renewalDate}`
                              : `Auto-renews. ${termInfo.daysLeft} days left to terminate by ${termInfo.deadlineDate}`}
                          </div>
                        </div>
                      );
                    } else if (daysToExpiry !== null) {
                      const warnBg = 'rgba(245, 158, 11, 0.1)';
                      const normalBg = 'rgba(59, 130, 246, 0.1)';
                      const warnBorder = 'rgba(245, 158, 11, 0.3)';
                      const normalBorder = 'rgba(59, 130, 246, 0.3)';
                      const isWarning = daysToExpiry <= 90;
                      return (
                        <div className={styles.field}>
                          <label className={styles.fieldLabel}>Days Until Expiry</label>
                          <div
                            className={styles.fieldValue}
                            style={{
                              background: isWarning ? warnBg : normalBg,
                              border: `1px solid ${isWarning ? warnBorder : normalBorder}`,
                              color: isWarning ? '#f59e0b' : '#3b82f6',
                            }}
                          >
                            {daysToExpiry < 0
                              ? `Expired ${Math.abs(daysToExpiry)} days ago`
                              : `${daysToExpiry} days remaining`}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            </>
          ) : null}

          {/* General Assessment - Same for all types */}
          {(parsed.general_assessment || parsed.key_terms) && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>General Assessment</h2>
              <div className={styles.fieldGroup}>
                <div className={styles.field} style={{ flex: '1 1 100%' }}>
                  <div className={styles.fieldValueLarge}>
                    {renderValue(parsed.general_assessment || parsed.key_terms)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgreementDetail;
