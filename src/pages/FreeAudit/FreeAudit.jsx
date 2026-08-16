import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import VeraxLogo from '../../components/VeraxLogo/VeraxLogo';
import UserTypeStep from './components/UserTypeStep';
import ProfileStep from './components/ProfileStep';
import PROStep from './components/PROStep';
import PublisherStep from './components/PublisherStep';
import IPNumberStep from './components/IPNumberStep';
import PublisherDetailsStep from './components/PublisherDetailsStep';
import ResultsStep from './components/ResultsStep';
import './FreeAudit.css';
import './components/Steps.css';

const FreeAudit = () => {
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    email: searchParams.get('email') || '',
    userType: '',
    profileUrl: '',
    hasPRO: '',
    hasPublisher: '',
    ipNumber: '',
    writerFirstName: '',
    writerMiddleName: '',
    writerLastName: '',
    publisherIpNumber: '',
    publisherName: '',
  });
  const [auditResults, setAuditResults] = useState(null);

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    setCurrentStep((prev) => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    nextStep();
  };

  const steps = [
    {
      component: (
        <UserTypeStep
          value={formData.userType}
          onChange={(value) => updateFormData('userType', value)}
          onNext={nextStep}
        />
      ),
      title: 'What describes you best?',
    },
    {
      component: (
        <ProfileStep
          userType={formData.userType}
          value={formData.profileUrl}
          onChange={(value) => updateFormData('profileUrl', value)}
          onNext={nextStep}
          onBack={prevStep}
        />
      ),
      title: formData.userType === 'songwriter' ? 'Your Genius Profile' : 'Your Spotify Profile',
    },
    {
      component: (
        <PROStep
          value={formData.hasPRO}
          onChange={(value) => updateFormData('hasPRO', value)}
          onNext={nextStep}
          onBack={prevStep}
        />
      ),
      title: 'Are you registered with a PRO?',
    },
    {
      component: (
        <PublisherStep
          value={formData.hasPublisher}
          onChange={(value) => updateFormData('hasPublisher', value)}
          onNext={nextStep}
          onBack={prevStep}
        />
      ),
      title: 'Do you have a publisher?',
    },
    ...(formData.hasPRO !== 'no'
      ? [
          {
            component: (
              <IPNumberStep
                value={formData.ipNumber}
                onChange={(value) => updateFormData('ipNumber', value)}
                writerFirstName={formData.writerFirstName}
                writerMiddleName={formData.writerMiddleName}
                writerLastName={formData.writerLastName}
                onFirstNameChange={(value) => updateFormData('writerFirstName', value)}
                onMiddleNameChange={(value) => updateFormData('writerMiddleName', value)}
                onLastNameChange={(value) => updateFormData('writerLastName', value)}
                onNext={formData.hasPublisher === 'yes' ? nextStep : handleSubmit}
                onBack={prevStep}
                label="Your IPI Number"
              />
            ),
            title: 'Your IPI Number',
          },
        ]
      : []),
    ...(formData.hasPublisher === 'yes'
      ? [
          {
            component: (
              <PublisherDetailsStep
                ipNumber={formData.publisherIpNumber}
                publisherName={formData.publisherName}
                onIpChange={(value) => updateFormData('publisherIpNumber', value)}
                onNameChange={(value) => updateFormData('publisherName', value)}
                onNext={handleSubmit}
                onBack={prevStep}
              />
            ),
            title: 'Publisher Information',
          },
        ]
      : []),
    {
      component: <ResultsStep formData={formData} results={auditResults} setResults={setAuditResults} />,
      title: 'Your Free Audit Results',
    },
  ];

  const currentStepData = steps[currentStep];

  return (
    <>
      <Helmet>
        <title>RD - Free Music Rights Audit</title>
        <meta
          name="description"
          content="Get a free audit of your music catalog. Check for registration and metadata issues in minutes."
        />
      </Helmet>
      <div className="free-audit-scope">
        <nav className="audit-nav">
          <Link to="/" className="audit-logo">
            <VeraxLogo width={60} />
          </Link>
        </nav>
        <div className="app-container">
          <div className="content-wrapper">
            <div className="audit-header">
              <h1>Get Your Free Music Rights Audit</h1>
              <p>Check for registration and metadata issues in minutes</p>
            </div>

            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }} />
            </div>

            <div className="step-container" key={currentStep}>
              <h2 className="step-title">{currentStepData?.title}</h2>
              {currentStepData?.component}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FreeAudit;
