/**
 * Password validation utilities for strong password requirements.
 *
 * Requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */

export const MIN_LENGTH = 8;
export const SPECIAL_CHARS = '!@#$%^&*()_+-=[]{}|;\':",./<>?~`';

/**
 * Password validation rules with their regex patterns and descriptions
 */
export const PASSWORD_RULES = [
  {
    id: 'length',
    test: (password) => password.length >= MIN_LENGTH,
    description: `At least ${MIN_LENGTH} characters`,
  },
  {
    id: 'uppercase',
    test: (password) => /[A-Z]/.test(password),
    description: 'At least one uppercase letter (A-Z)',
  },
  {
    id: 'lowercase',
    test: (password) => /[a-z]/.test(password),
    description: 'At least one lowercase letter (a-z)',
  },
  {
    id: 'number',
    test: (password) => /[0-9]/.test(password),
    description: 'At least one number (0-9)',
  },
  {
    id: 'special',
    // eslint-disable-next-line no-useless-escape
    test: (password) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password),
    description: 'At least one special character (!@#$%^&*)',
  },
];

/**
 * Validate password against all requirements
 * @param {string} password - The password to validate
 * @returns {{ isValid: boolean, errors: string[], passedRules: string[], failedRules: string[] }}
 */
export const validatePassword = (password) => {
  const errors = [];
  const passedRules = [];
  const failedRules = [];

  for (const rule of PASSWORD_RULES) {
    if (rule.test(password)) {
      passedRules.push(rule.id);
    } else {
      failedRules.push(rule.id);
      errors.push(rule.description);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    passedRules,
    failedRules,
  };
};

/**
 * Get a human-readable description of all password requirements
 * @returns {string}
 */
export const getPasswordRequirements = () => {
  return `Password must be at least ${MIN_LENGTH} characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.`;
};

/**
 * Calculate password strength score (0-100)
 * @param {string} password - The password to evaluate
 * @returns {number} Score from 0-100
 */
export const getPasswordStrength = (password) => {
  if (!password) return 0;

  let score = 0;
  const rulesCount = PASSWORD_RULES.length;

  // Points for each rule passed
  for (const rule of PASSWORD_RULES) {
    if (rule.test(password)) {
      score += 100 / rulesCount;
    }
  }

  // Bonus points for extra length
  if (password.length > MIN_LENGTH) {
    const extraLength = Math.min(password.length - MIN_LENGTH, 8);
    score = Math.min(100, score + extraLength);
  }

  return Math.round(score);
};

/**
 * Get strength label based on score
 * @param {number} score - Password strength score (0-100)
 * @returns {{ label: string, color: string }}
 */
export const getStrengthLabel = (score) => {
  if (score < 40) return { label: 'Weak', color: '#ef4444' };
  if (score < 70) return { label: 'Fair', color: '#f59e0b' };
  if (score < 100) return { label: 'Good', color: '#3b82f6' };
  return { label: 'Strong', color: '#22c55e' };
};
