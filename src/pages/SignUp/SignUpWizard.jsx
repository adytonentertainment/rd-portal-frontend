import { Helmet } from 'react-helmet-async';
import { useRef, useEffect, useState, useContext, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import urlJoin from 'url-join';
import ReCAPTCHA from 'react-google-recaptcha';
import { ThemeContext } from '../../components/ThemeProvider/ThemeProvider';
import { Card, CardHeader, CardBody, CardFooter, Input, Select, SelectItem } from '@heroui/react';
import VeraxLogo from '../../components/VeraxLogo/VeraxLogo';
import FlatButton from '../../components/Buttons/FlatButton/FlatButton';
import TransparentButton from '../../components/Buttons/TransparentButton/TransparentButton';
import styles from './signup.module.css';
import { FaArrowLeft, FaArrowRight, FaUser, FaBuilding, FaEye, FaEyeSlash, FaGoogle } from 'react-icons/fa';
import { useGoogleLogin } from '@react-oauth/google';

const SignUpWizard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useContext(ThemeContext);

  // Check for pre-filled audit data passed via navigation state
  const auditData = location.state?.auditData;

  // Wizard state — start at step 0 (gateway) or step 1 if audit data
  const [currentStep, setCurrentStep] = useState(auditData ? 1 : 0);
  const [formData, setFormData] = useState(() => {
    const defaults = {
      // Step 1 - Credentials
      username: '',
      email: '',
      password: '',
      confirmPassword: '',

      // Step 2
      accountType: '', // 'individual' or 'company'

      // Step 3
      role: '', // For individuals: 'artist', 'songwriter', 'manager', 'other'
      companyType: '', // For companies: 'label', 'publisher', 'management', 'other'

      // Step 4 - PRO/CMO (multiple)
      proRegistrations: [], // [{ proName: '', writerName: '', writerIpi: '' }]

      // Step 5 - Publisher
      hasPublisher: null, // true/false
      publisherName: '',
      publisherIpis: [''], // Array of IPI numbers (min 1, max 3)
    };

    // Pre-fill profile data from audit flow
    if (auditData) {
      return {
        ...defaults,
        accountType: auditData.accountType || 'individual',
        role: auditData.role || '',
        proRegistrations: auditData.proRegistrations || [],
        hasPublisher: auditData.hasPublisher,
        publisherName: auditData.publisherName || '',
        publisherIpis: auditData.publisherIpis || [''],
      };
    }

    return defaults;
  });

  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const [isGoogleUser, setIsGoogleUser] = useState(false);

  const recaptchaRef = useRef();

  // Google OAuth signup
  const googleSignup = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        // Create Google user
        const createRes = await fetch(
          urlJoin(process.env.REACT_APP_BACKEND_URL, `/auth/create-google-user/${tokenResponse.access_token}`),
          { method: 'POST' }
        );
        const createData = await createRes.json();
        if (
          !createRes.ok &&
          !createData.detail?.includes('already registered') &&
          !createData.detail?.includes('already exists')
        ) {
          setErrorMessage(createData.detail || 'Google signup failed');
          return;
        }

        // Login with Google
        const loginRes = await fetch(
          urlJoin(process.env.REACT_APP_BACKEND_URL, `/auth/google-login/${tokenResponse.access_token}`),
          { method: 'POST' }
        );
        const loginData = await loginRes.json();
        if (loginRes.ok) {
          localStorage.setItem('token', loginData.access_token);
          setAuthToken(loginData.access_token);
          setIsGoogleUser(true);

          // If audit data, save profile and redirect immediately
          if (auditData) {
            const profileData = {};
            if (formData.proRegistrations.length > 0) {
              const firstPro = formData.proRegistrations[0];
              if (firstPro.writerName) profileData.writer_name = firstPro.writerName;
              if (firstPro.writerIpi) profileData.writer_ipi = firstPro.writerIpi;
            }
            if (formData.publisherName) profileData.publisher_name = formData.publisherName;
            if (formData.publisherIpis && formData.publisherIpis[0]) {
              profileData.publisher_ipi = formData.publisherIpis[0];
            }
            if (Object.keys(profileData).length > 0) {
              try {
                await fetch(urlJoin(process.env.REACT_APP_BACKEND_URL, '/auth/user'), {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${loginData.access_token}`,
                  },
                  body: JSON.stringify(profileData),
                });
              } catch (e) {
                // Don't block flow
              }
            }
            window.location.href = '/signup-successful';
            return;
          }

          // Go to username selection step
          setCurrentStep(1);
        } else {
          setErrorMessage(loginData.detail || 'Google login failed');
        }
      } catch (err) {
        console.error('Google signup error:', err);
        setErrorMessage('Google signup failed. Please try again.');
      }
    },
  });

  // Calculate total steps dynamically based on selections
  const getTotalSteps = () => {
    let steps = 3; // Credentials + Account Type + Role/Company Type

    // Add PRO/CMO step if individual artist/songwriter
    if (formData.accountType === 'individual' && ['artist', 'songwriter'].includes(formData.role)) {
      steps += 1;
    }

    // Add Publisher step if individual artist/songwriter
    if (formData.accountType === 'individual' && ['artist', 'songwriter'].includes(formData.role)) {
      steps += 1;
    }

    // Add Publisher step if company is publisher
    if (formData.accountType === 'company' && formData.companyType === 'publisher') {
      steps += 1;
    }

    return steps;
  };

  const totalSteps = getTotalSteps();

  // Save profile data and redirect to success
  const saveProfileAndFinish = useCallback(async () => {
    const profileData = {};

    if (formData.proRegistrations.length > 0) {
      const firstPro = formData.proRegistrations[0];
      if (firstPro.writerName) profileData.writer_name = firstPro.writerName;
      if (firstPro.writerIpi) profileData.writer_ipi = firstPro.writerIpi;
    }

    if (formData.publisherName) profileData.publisher_name = formData.publisherName;
    if (formData.publisherIpis && formData.publisherIpis[0]) {
      profileData.publisher_ipi = formData.publisherIpis[0];
    }

    const token = authToken || localStorage.getItem('token');
    if (Object.keys(profileData).length > 0 && token) {
      try {
        await fetch(urlJoin(process.env.REACT_APP_BACKEND_URL, '/auth/user'), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(profileData),
        });
      } catch (err) {
        // Don't block signup flow if profile save fails
      }
    }

    window.location.href = '/signup-successful';
  }, [formData, authToken]);

  // When currentStep exceeds totalSteps (e.g. role selection reduced total),
  // save profile and finish
  useEffect(() => {
    if (currentStep > totalSteps && authToken) {
      saveProfileAndFinish();
    }
  }, [currentStep, totalSteps, authToken, saveProfileAndFinish]);

  // Navigation handlers
  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      setErrorMessage('');
    } else {
      saveProfileAndFinish();
    }
  };

  const handleBack = () => {
    // Don't go back to credentials once account is created
    const minStep = authToken ? 2 : 1;
    if (currentStep > minStep) {
      // Reset data when leaving conditional steps
      let stepCounter = 4; // First possible conditional step position

      // PRO/CMO step (only for individual artist/songwriter)
      if (formData.accountType === 'individual' && ['artist', 'songwriter'].includes(formData.role)) {
        if (currentStep === stepCounter) {
          setFormData({ ...formData, proRegistrations: [] });
        }
        stepCounter++;
      }

      // Publisher step
      const needsPublisherStep =
        (formData.accountType === 'individual' && ['artist', 'songwriter'].includes(formData.role)) ||
        (formData.accountType === 'company' && formData.companyType === 'publisher');

      if (needsPublisherStep) {
        if (currentStep === stepCounter) {
          setFormData({
            ...formData,
            hasPublisher: null,
            publisherName: '',
            publisherIpis: [''],
          });
        }
      }

      setCurrentStep(currentStep - 1);
      setErrorMessage('');
    }
  };

  const updateFormData = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  // ─── Step 0: Gateway (Sign up with Google / Continue with Email) ─
  const renderGatewayStep = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>
        <h2 className={styles.stepHeading} style={{ fontSize: '16px', marginBottom: '16px' }}>
          Get access to RD
        </h2>

        {/* Sign up with Google */}
        <button
          onClick={() => googleSignup()}
          style={{
            width: '100%',
            maxWidth: '300px',
            padding: '12px 16px',
            borderRadius: '40px',
            border: 'none',
            background: '#fff',
            color: '#1a1a1a',
            fontSize: '14px',
            fontWeight: 500,
            fontFamily: 'var(--font)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            transition: 'opacity 150ms ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <FaGoogle size={18} style={{ color: '#4285F4' }} />
          Sign up with Google
        </button>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            maxWidth: '300px',
            margin: '10px 0',
          }}
        >
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span style={{ fontSize: '13px', color: 'var(--muted-text)' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        {/* Continue with Email */}
        <button
          onClick={() => setCurrentStep(1)}
          style={{
            width: '100%',
            maxWidth: '300px',
            padding: '12px 16px',
            borderRadius: '40px',
            border: 'none',
            background: '#333',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 500,
            fontFamily: 'var(--font)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 150ms ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#444')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#333')}
        >
          Continue with Email
        </button>

        {/* Links */}
        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', color: 'var(--muted-text)' }}>
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text)',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '12px',
                fontFamily: 'var(--font)',
                padding: 0,
              }}
            >
              Log in
            </button>
          </span>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted-text)',
              cursor: 'pointer',
              fontSize: '12px',
              fontFamily: 'var(--font)',
              padding: 0,
            }}
          >
            Learn more
          </button>
        </div>

        {errorMessage && (
          <div className={styles.errorMessage} style={{ marginTop: '16px' }}>
            {errorMessage}
          </div>
        )}
      </div>
    );
  };

  // ─── Step 1: Account Credentials ─────────────────────────────────
  const renderCredentialsStep = () => {
    // Google users only need to pick a username
    if (isGoogleUser && authToken) {
      const handleUsernameSubmit = async () => {
        setErrorMessage('');
        if (!formData.username) {
          setErrorMessage('Please choose a username');
          return;
        }
        if (formData.username.length < 3) {
          setErrorMessage('Username must be at least 3 characters');
          return;
        }
        setIsSubmitting(true);
        try {
          const res = await fetch(urlJoin(process.env.REACT_APP_BACKEND_URL, '/auth/user'), {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({ username: formData.username }),
          });
          const data = await res.json();
          if (res.ok) {
            setIsSubmitting(false);
            setCurrentStep(2);
            setErrorMessage('');
          } else {
            setErrorMessage(data.detail || 'Username not available');
            setIsSubmitting(false);
          }
        } catch (err) {
          setErrorMessage('Failed to update username');
          setIsSubmitting(false);
        }
      };

      return (
        <div>
          <h2 className={styles.stepHeading}>Choose Your Username</h2>
          <p className={styles.stepSubtext}>Pick a unique username for your RD account</p>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ marginBottom: '14px' }}>
              <Input
                type="text"
                label="Username"
                variant="bordered"
                size="md"
                value={formData.username}
                onChange={(e) => updateFormData('username', e.target.value)}
                classNames={{
                  input: 'text-base',
                  label: 'text-sm font-medium',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <FlatButton
                onClick={handleUsernameSubmit}
                disabled={isSubmitting}
                style={{ maxWidth: '300px', opacity: isSubmitting ? 0.6 : 1 }}
              >
                {isSubmitting ? 'Saving...' : 'Continue'}
              </FlatButton>
            </div>
          </div>
        </div>
      );
    }

    const validatePassword = (password) => {
      const minLength = password.length >= 8;
      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

      return {
        minLength,
        hasUpperCase,
        hasLowerCase,
        hasNumber,
        hasSpecialChar,
        isValid: minLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar,
      };
    };

    const passwordStrength = validatePassword(formData.password);

    const handleSubmit = async () => {
      setErrorMessage('');

      // Validation
      if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
        setErrorMessage('Please fill in all fields');
        return;
      }

      if (!passwordStrength.isValid) {
        setErrorMessage('Password does not meet requirements');
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setErrorMessage('Passwords do not match');
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setErrorMessage('Please enter a valid email address');
        return;
      }

      setIsSubmitting(true);

      try {
        // Get captcha token
        const captchaToken = await recaptchaRef.current.executeAsync();
        recaptchaRef.current.reset();

        // Call signup API
        const response = await fetch(urlJoin(process.env.REACT_APP_BACKEND_URL, '/auth/user'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            accept: 'application/json',
          },
          body: JSON.stringify({
            username: formData.username,
            email: formData.email,
            password: formData.password,
            captchaToken: captchaToken,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          // Auto-login after successful signup
          const loginFormDetails = new URLSearchParams();
          loginFormDetails.append('username', formData.username);
          loginFormDetails.append('password', formData.password);

          const loginResponse = await fetch(urlJoin(process.env.REACT_APP_BACKEND_URL, '/auth/token'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: loginFormDetails,
          });

          const loginData = await loginResponse.json();

          if (loginResponse.ok) {
            localStorage.setItem('token', loginData.access_token);
            setAuthToken(loginData.access_token);

            // If we have audit data with profile info, save it and go straight to success
            if (auditData) {
              const profileData = {};
              if (formData.proRegistrations.length > 0) {
                const firstPro = formData.proRegistrations[0];
                if (firstPro.writerName) profileData.writer_name = firstPro.writerName;
                if (firstPro.writerIpi) profileData.writer_ipi = firstPro.writerIpi;
              }
              if (formData.publisherName) profileData.publisher_name = formData.publisherName;
              if (formData.publisherIpis && formData.publisherIpis[0]) {
                profileData.publisher_ipi = formData.publisherIpis[0];
              }
              if (Object.keys(profileData).length > 0) {
                try {
                  await fetch(urlJoin(process.env.REACT_APP_BACKEND_URL, '/auth/user'), {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${loginData.access_token}`,
                    },
                    body: JSON.stringify(profileData),
                  });
                } catch (err) {
                  // Don't block signup flow
                }
              }
              window.location.href = '/signup-successful';
              return;
            }

            // Advance to profile setup steps
            setIsSubmitting(false);
            setCurrentStep(2);
            setErrorMessage('');
          } else {
            // Signup succeeded but login failed - still redirect to success
            navigate('/signup-successful');
          }
        } else {
          setErrorMessage(data.detail || 'Failed to create account');
          setIsSubmitting(false);
        }
      } catch (error) {
        console.error('Signup error:', error);
        setErrorMessage(error.message || 'Failed to create account');
        setIsSubmitting(false);
      }
    };

    return (
      <div>
        <h2 className={styles.stepHeading}>Create Your Account</h2>

        <div style={{ marginBottom: '8px' }}>
          {/* Username */}
          <div style={{ marginBottom: '8px' }}>
            <Input
              type="text"
              label="Username"
              variant="bordered"
              size="sm"
              value={formData.username}
              onChange={(e) => updateFormData('username', e.target.value)}
              classNames={{
                input: 'text-base',
                label: 'text-xs font-medium',
              }}
            />
          </div>

          {/* Email */}
          <div style={{ marginBottom: '8px' }}>
            <Input
              type="email"
              label="Email Address"
              variant="bordered"
              size="sm"
              value={formData.email}
              onChange={(e) => updateFormData('email', e.target.value)}
              classNames={{
                input: 'text-base',
                label: 'text-xs font-medium',
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '8px' }}>
            <Input
              type={showPassword ? 'text' : 'password'}
              label="Password"
              variant="bordered"
              size="sm"
              value={formData.password}
              onChange={(e) => updateFormData('password', e.target.value)}
              classNames={{
                input: 'text-base',
                label: 'text-xs font-medium',
              }}
              endContent={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--soft-text)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                </button>
              }
            />

            {/* Password Requirements — compact 2-col grid */}
            {formData.password && (
              <div style={{ marginTop: '4px', fontSize: '10px', lineHeight: 1.4 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px 8px' }}>
                  <div style={{ color: passwordStrength.minLength ? '#10b981' : 'var(--soft-text)' }}>
                    {passwordStrength.minLength ? '✓' : '○'} 8+ chars
                  </div>
                  <div style={{ color: passwordStrength.hasUpperCase ? '#10b981' : 'var(--soft-text)' }}>
                    {passwordStrength.hasUpperCase ? '✓' : '○'} Uppercase
                  </div>
                  <div style={{ color: passwordStrength.hasLowerCase ? '#10b981' : 'var(--soft-text)' }}>
                    {passwordStrength.hasLowerCase ? '✓' : '○'} Lowercase
                  </div>
                  <div style={{ color: passwordStrength.hasNumber ? '#10b981' : 'var(--soft-text)' }}>
                    {passwordStrength.hasNumber ? '✓' : '○'} Number
                  </div>
                  <div style={{ color: passwordStrength.hasSpecialChar ? '#10b981' : 'var(--soft-text)' }}>
                    {passwordStrength.hasSpecialChar ? '✓' : '○'} Special char
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div style={{ marginBottom: '8px' }}>
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              label="Confirm Password"
              variant="bordered"
              size="sm"
              value={formData.confirmPassword}
              onChange={(e) => updateFormData('confirmPassword', e.target.value)}
              classNames={{
                input: 'text-base',
                label: 'text-xs font-medium',
              }}
              endContent={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--soft-text)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showConfirmPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                </button>
              }
            />
            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <div style={{ marginTop: '4px', fontSize: '10px', color: '#ef4444' }}>Passwords do not match</div>
            )}
          </div>

          {/* Terms — inline text, no box */}
          <div
            style={{
              fontSize: '10px',
              color: 'var(--soft-text)',
              lineHeight: 1.4,
              marginBottom: '10px',
              textAlign: 'center',
            }}
          >
            By creating an account, you agree to our{' '}
            <a
              href="/tos"
              target="_blank"
              style={{ color: 'var(--text)', textDecoration: 'underline', fontWeight: 600 }}
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href="/pp"
              target="_blank"
              style={{ color: 'var(--text)', textDecoration: 'underline', fontWeight: 600 }}
            >
              Privacy Policy
            </a>
          </div>

          {/* Submit Button */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <FlatButton
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{ maxWidth: '300px', opacity: isSubmitting ? 0.6 : 1 }}
            >
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </FlatButton>
          </div>
        </div>

        {!authToken && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '6px' }}>
            <TransparentButton onClick={() => setCurrentStep(0)} disabled={isSubmitting}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                <FaArrowLeft size={10} />
                Back
              </div>
            </TransparentButton>
          </div>
        )}
      </div>
    );
  };

  // ─── Step 2: Account Type Selection ──────────────────────────────
  const renderAccountTypeStep = () => {
    return (
      <div style={{ textAlign: 'center' }}>
        <h2 className={styles.stepHeading}>Who are you signing up as?</h2>
        <p className={styles.stepSubtext}>This helps us customize your experience</p>

        <div className={styles.gridTwoCol}>
          {/* Individual Option */}
          <button
            className={styles.optionButton}
            onClick={() => {
              updateFormData('accountType', 'individual');
              setCurrentStep((prev) => prev + 1);
            }}
          >
            <FaUser size={32} style={{ color: 'var(--text)' }} />
            <div>
              <div className={styles.optionTitle}>Individual</div>
              <div className={styles.optionDesc}>Artist, songwriter, or manager</div>
            </div>
          </button>

          {/* Company Option */}
          <button
            className={styles.optionButton}
            onClick={() => {
              updateFormData('accountType', 'company');
              setCurrentStep((prev) => prev + 1);
            }}
          >
            <FaBuilding size={32} style={{ color: 'var(--text)' }} />
            <div>
              <div className={styles.optionTitle}>Company</div>
              <div className={styles.optionDesc}>Label, publisher, or agency</div>
            </div>
          </button>
        </div>

        <button
          onClick={() => {
            window.location.href = '/signup-successful';
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--muted-text)',
            cursor: 'pointer',
            fontSize: '12px',
            marginTop: '24px',
            textDecoration: 'underline',
            textUnderlineOffset: '2px',
            fontFamily: 'var(--font)',
          }}
        >
          Skip for now
        </button>
      </div>
    );
  };

  // ─── Step 3: Role Selection (Individual) or Company Type ─────────
  const renderRoleStep = () => {
    const isIndividual = formData.accountType === 'individual';
    const options = isIndividual
      ? [
          { value: 'artist', label: 'Artist', description: 'Recording and performing artist' },
          { value: 'songwriter', label: 'Songwriter/Producer', description: 'Writer, composer, or producer' },
          { value: 'manager', label: 'Manager', description: 'Artist or catalog manager' },
          { value: 'other', label: 'Other', description: 'Tell us more later' },
        ]
      : [
          { value: 'label', label: 'Record Label', description: 'Music recording and distribution' },
          { value: 'publisher', label: 'Publishing Company', description: 'Music publishing and rights' },
          { value: 'management', label: 'Management Company', description: 'Artist and catalog management' },
          { value: 'other', label: 'Other', description: 'Tell us more later' },
        ];

    const handleSelection = (value) => {
      if (isIndividual) {
        updateFormData('role', value);
      } else {
        updateFormData('companyType', value);
      }
      // Use functional update to avoid stale closure issues
      setCurrentStep((prev) => prev + 1);
    };

    return (
      <div style={{ textAlign: 'center' }}>
        <h2 className={styles.stepHeading}>{isIndividual ? "What's your role?" : 'What type of company?'}</h2>
        <p className={styles.stepSubtext}>Select the option that best describes you</p>

        <div className={styles.gridOneCol}>
          {options.map((option) => (
            <button
              key={option.value}
              className={styles.optionButtonText}
              onClick={() => handleSelection(option.value)}
            >
              <div className={styles.optionTitle}>{option.label}</div>
              <div className={styles.optionDesc}>{option.description}</div>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
          <TransparentButton onClick={handleBack}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaArrowLeft size={12} />
              Back
            </div>
          </TransparentButton>
        </div>
      </div>
    );
  };

  // Progress Bar
  const renderProgressBar = () => {
    const progress = (currentStep / totalSteps) * 100;

    return (
      <div className={styles.progressBar}>
        <div className={styles.progressText}>
          <span>
            Step {currentStep} of {totalSteps}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
      </div>
    );
  };

  // ─── Step 4: PRO/CMO Registration (for artists/songwriters) ─────
  const renderProRegistrationStep = () => {
    const addProRegistration = () => {
      setFormData({
        ...formData,
        proRegistrations: [...formData.proRegistrations, { proName: '', writerName: '', writerIpi: '' }],
      });
    };

    const removeProRegistration = (index) => {
      const updated = formData.proRegistrations.filter((_, i) => i !== index);
      setFormData({ ...formData, proRegistrations: updated });
    };

    const updateProRegistration = (index, field, value) => {
      const updated = [...formData.proRegistrations];
      updated[index] = { ...updated[index], [field]: value };
      setFormData({ ...formData, proRegistrations: updated });
    };

    const proOptions = ['ASCAP', 'BMI', 'SESAC', 'PRS', 'GEMA', 'SACEM', 'SOCAN', 'APRA', 'JASRAC', 'Other'];

    return (
      <div>
        <h2 className={styles.stepHeading}>Registered with PRO/CMO?</h2>
        <p className={styles.stepSubtext}>Performance Rights Organizations help collect royalties</p>

        {formData.proRegistrations.length === 0 ? (
          <div className={styles.gridTwoCol} style={{ marginBottom: '24px' }}>
            <button className={styles.yesNoButton} onClick={() => addProRegistration()}>
              Yes
            </button>
            <button className={styles.yesNoButton} onClick={handleNext}>
              No
            </button>
          </div>
        ) : (
          <div style={{ marginBottom: '24px' }}>
            {formData.proRegistrations.map((registration, index) => (
              <div key={index} className={styles.proCard}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>PRO/CMO {index + 1}</span>
                  {formData.proRegistrations.length > 1 && (
                    <button
                      onClick={() => removeProRegistration(index)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--soft-text)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        textDecoration: 'underline',
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <Select
                    label="PRO/CMO Name"
                    variant="bordered"
                    selectedKeys={registration.proName ? [registration.proName] : []}
                    onChange={(e) => updateProRegistration(index, 'proName', e.target.value)}
                    classNames={{
                      trigger: 'text-base',
                      label: 'text-sm font-medium',
                    }}
                  >
                    {proOptions.map((pro) => (
                      <SelectItem key={pro} value={pro}>
                        {pro}
                      </SelectItem>
                    ))}
                  </Select>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <Input
                    type="text"
                    label="Writer Name"
                    placeholder="e.g., John Smith"
                    variant="bordered"
                    value={registration.writerName}
                    onChange={(e) => updateProRegistration(index, 'writerName', e.target.value)}
                    classNames={{
                      input: 'text-base',
                      label: 'text-sm font-medium',
                    }}
                  />
                </div>

                <div>
                  <Input
                    type="text"
                    label="Writer IPI Number"
                    placeholder="e.g., 00123456789"
                    variant="bordered"
                    value={registration.writerIpi}
                    onChange={(e) => updateProRegistration(index, 'writerIpi', e.target.value)}
                    classNames={{
                      input: 'text-base',
                      label: 'text-sm font-medium',
                    }}
                  />
                </div>
              </div>
            ))}

            <button className={styles.addButton} onClick={addProRegistration}>
              + Add Another PRO/CMO
            </button>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <FlatButton onClick={handleNext} style={{ maxWidth: '300px' }}>
                Continue
              </FlatButton>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
          <TransparentButton onClick={handleBack}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaArrowLeft size={12} />
              Back
            </div>
          </TransparentButton>
        </div>
      </div>
    );
  };

  // ─── Step 5: Publisher Information ───────────────────────────────
  const renderPublisherStep = () => {
    const isCompanyPublisher = formData.accountType === 'company' && formData.companyType === 'publisher';

    const addPublisherIpi = () => {
      if (formData.publisherIpis.length < 3) {
        setFormData({
          ...formData,
          publisherIpis: [...formData.publisherIpis, ''],
        });
      }
    };

    const removePublisherIpi = (index) => {
      if (formData.publisherIpis.length > 1) {
        const updated = formData.publisherIpis.filter((_, i) => i !== index);
        setFormData({ ...formData, publisherIpis: updated });
      }
    };

    const updatePublisherIpi = (index, value) => {
      const updated = [...formData.publisherIpis];
      updated[index] = value;
      setFormData({ ...formData, publisherIpis: updated });
    };

    // For individual users, first ask if they have a publisher
    if (!isCompanyPublisher && formData.hasPublisher === null) {
      return (
        <div>
          <h2 className={styles.stepHeading}>Do you have a publisher?</h2>
          <p className={styles.stepSubtext}>Publishers help manage and monetize your compositions</p>

          <div className={styles.gridTwoCol} style={{ marginBottom: '24px' }}>
            <button className={styles.yesNoButton} onClick={() => updateFormData('hasPublisher', true)}>
              Yes
            </button>
            <button
              className={styles.yesNoButton}
              onClick={() => {
                updateFormData('hasPublisher', false);
                handleNext();
              }}
            >
              No
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
            <TransparentButton onClick={handleBack}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaArrowLeft size={12} />
                Back
              </div>
            </TransparentButton>
          </div>
        </div>
      );
    }

    // Show publisher details form
    const shouldShowForm = isCompanyPublisher || formData.hasPublisher === true;

    if (!shouldShowForm) {
      handleNext();
      return null;
    }

    return (
      <div>
        <h2 className={styles.stepHeading}>{isCompanyPublisher ? 'Publisher Details' : 'Your Publisher'}</h2>
        <p className={styles.stepSubtext}>
          {isCompanyPublisher ? 'Enter your company information' : 'Tell us about your publishing company'}
        </p>

        <div style={{ marginBottom: '24px' }}>
          <div className={styles.publisherCard}>
            <div style={{ marginBottom: '16px' }}>
              <Input
                type="text"
                label="Publisher Name"
                placeholder="e.g., Sony Music Publishing"
                variant="bordered"
                value={formData.publisherName}
                onChange={(e) => updateFormData('publisherName', e.target.value)}
                classNames={{
                  input: 'text-base',
                  label: 'text-sm font-medium',
                }}
              />
            </div>

            {formData.publisherIpis.map((ipi, index) => (
              <div key={index} style={{ marginBottom: '16px', position: 'relative' }}>
                <Input
                  type="text"
                  label={`Publisher IPI${formData.publisherIpis.length > 1 ? ` #${index + 1}` : ''}`}
                  placeholder="e.g., 00123456789"
                  variant="bordered"
                  value={ipi}
                  onChange={(e) => updatePublisherIpi(index, e.target.value)}
                  classNames={{
                    input: 'text-base',
                    label: 'text-sm font-medium',
                  }}
                />
                {formData.publisherIpis.length > 1 && (
                  <button
                    onClick={() => removePublisherIpi(index)}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      right: '-8px',
                      transform: 'translateY(-50%) translateX(100%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--soft-text)',
                      cursor: 'pointer',
                      fontSize: '12px',
                      padding: '4px 8px',
                      opacity: 0.7,
                    }}
                    onMouseEnter={(e) => (e.target.style.opacity = 1)}
                    onMouseLeave={(e) => (e.target.style.opacity = 0.7)}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            {formData.publisherIpis.length < 3 && (
              <button
                className={styles.addButton}
                onClick={addPublisherIpi}
                style={{ marginTop: '8px', marginBottom: 0 }}
              >
                + Add IPI (up to 3)
              </button>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
            <FlatButton onClick={handleNext} style={{ maxWidth: '300px' }}>
              Continue
            </FlatButton>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
          <TransparentButton onClick={handleBack}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaArrowLeft size={12} />
              Back
            </div>
          </TransparentButton>
        </div>
      </div>
    );
  };

  // ─── Main render ─────────────────────────────────────────────────
  const renderCurrentStep = () => {
    // Step 0: Gateway
    if (currentStep === 0) {
      return renderGatewayStep();
    }

    let stepCounter = 1;

    // Step 1: Credentials
    if (currentStep === stepCounter) {
      return renderCredentialsStep();
    }
    stepCounter++;

    // Step 2: Account Type
    if (currentStep === stepCounter) {
      return renderAccountTypeStep();
    }
    stepCounter++;

    // Step 3: Role/Company Type
    if (currentStep === stepCounter) {
      return renderRoleStep();
    }
    stepCounter++;

    // Step 4: PRO/CMO (only for individual artist/songwriter)
    if (formData.accountType === 'individual' && ['artist', 'songwriter'].includes(formData.role)) {
      if (currentStep === stepCounter) {
        return renderProRegistrationStep();
      }
      stepCounter++;
    }

    // Step 5: Publisher (for individual artist/songwriter OR company publisher)
    const needsPublisherStep =
      (formData.accountType === 'individual' && ['artist', 'songwriter'].includes(formData.role)) ||
      (formData.accountType === 'company' && formData.companyType === 'publisher');

    if (needsPublisherStep) {
      if (currentStep === stepCounter) {
        return renderPublisherStep();
      }
      stepCounter++;
    }

    return <div>Step {currentStep} - Coming soon</div>;
  };

  return (
    <>
      <Helmet>
        <title>Sign Up | RD</title>
      </Helmet>

      {/* Main Content */}
      <div className={`${styles.wizardScope} ${styles.wizardWrapper}`}>
        <VeraxLogo
          iconOnly={currentStep === 0}
          width={currentStep === 0 ? 70 : 140}
          className="mb-3 flex-shrink-0"
          style={{ maxWidth: currentStep === 0 ? '70px' : '120px', opacity: 1 }}
        />

        {currentStep === 0 ? (
          /* Gateway page — no card wrapper, no progress bar */
          renderCurrentStep()
        ) : (
          /* Wizard steps — card with progress bar */
          <>
            <Card
              className="w-full max-w-2xl p-1 sm:p-4 flex-shrink"
              shadow="none"
              style={{
                background: 'transparent',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                maxHeight: 'calc(100dvh - 160px)',
                overflow: 'hidden',
                display: 'flex',
              }}
            >
              <CardBody className="gap-1" style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                {renderProgressBar()}
                {renderCurrentStep()}

                {errorMessage && (
                  <div className={styles.errorMessage} style={{ marginTop: '16px' }}>
                    {errorMessage}
                  </div>
                )}
              </CardBody>
            </Card>

            <button
              onClick={() => navigate('/login')}
              className={styles.linkButton}
              style={{
                marginTop: '8px',
                flexShrink: 0,
              }}
            >
              Already have an account? Log in
            </button>
          </>
        )}
      </div>
      <ReCAPTCHA ref={recaptchaRef} sitekey="6LflXwwrAAAAAJunzDZUUNsXHOU8-IeQ3nFujKeF" size="invisible" />
    </>
  );
};

export default SignUpWizard;
