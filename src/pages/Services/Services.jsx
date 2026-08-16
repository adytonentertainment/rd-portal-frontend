import { useContext } from 'react';
import { Helmet } from 'react-helmet-async';
import Footer from '../../components/Footer/Footer';
import NavBar from '../../components/NavBar/NavBar';
import { ThemeContext } from '../../components/ThemeProvider/ThemeProvider';
import { FaMusic, FaDollarSign, FaChartLine, FaShieldAlt } from 'react-icons/fa';
import FlatButton from '../../components/Buttons/FlatButton/FlatButton';
import { useNavigate } from 'react-router-dom';

const Services = () => {
  const { currentTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const textColor = currentTheme === 'light' ? 'text-gray-900' : 'text-white';
  const softTextColor = currentTheme === 'light' ? 'text-gray-600' : 'text-gray-400';

  const services = [
    {
      icon: <FaMusic className="text-5xl mb-4 text-purple-500" />,
      title: 'Tune Scan',
      description: 'Find out who uses your songs.',
      details:
        "Our advanced audio fingerprinting technology scans the internet to detect where your music is being used. Upload your tracks and we'll identify every instance of your music across platforms, videos, and content creators.",
      features: [
        'Audio fingerprint matching',
        'Comprehensive platform coverage',
        'Real-time detection alerts',
        'Detailed usage reports',
      ],
    },
    {
      icon: <FaDollarSign className="text-5xl mb-4 text-green-500" />,
      title: 'Royalty Claim',
      description: 'Get paid what you deserve.',
      details:
        "Don't let unclaimed royalties slip away. We help you identify and claim all the revenue you're entitled to. Our system tracks usage across platforms and assists you in collecting what you've earned.",
      features: [
        'Automated royalty tracking',
        'Platform-specific claim assistance',
        'Revenue analytics dashboard',
        'Historical earnings reports',
      ],
    },
    {
      icon: <FaChartLine className="text-5xl mb-4 text-blue-500" />,
      title: 'Stats Viewer',
      description: 'Keep track of your stats.',
      details:
        "Comprehensive analytics at your fingertips. Monitor your music's performance across all platforms with detailed charts, graphs, and insights. Track streams, engagement, and growth over time.",
      features: [
        'Multi-platform analytics',
        'Historical trend analysis',
        'Performance comparisons',
        'Exportable reports',
      ],
    },
    {
      icon: <FaShieldAlt className="text-5xl mb-4 text-red-500" />,
      title: 'Takedown',
      description: 'Make sure you own your songs.',
      details:
        'Protect your intellectual property. When unauthorized use is detected, we provide the tools and guidance to file takedown requests. Ensure your music is only used with your permission.',
      features: [
        'Infringement detection',
        'DMCA takedown assistance',
        'Legal documentation support',
        'Case tracking system',
      ],
    },
  ];

  return (
    <>
      <Helmet>
        <title>RD - Services</title>
      </Helmet>
      <NavBar />
      <div className="min-h-screen pb-20">
        {/* Hero Section */}
        <div className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
          <h1 className={`${textColor} text-5xl font-bold mb-6`}>Our Services</h1>
          <p className={`${softTextColor} text-xl max-w-3xl mx-auto`}>
            Comprehensive music rights management and analytics solutions for artists, producers, and rights holders
          </p>
        </div>

        {/* Services Grid */}
        <div className="max-w-7xl mx-auto px-6 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {services.map((service, index) => (
              <div
                key={index}
                className="p-8 rounded-2xl border border-gray-700/50 bg-gradient-to-br from-gray-900/40 to-gray-800/40 backdrop-blur-sm hover:border-purple-500/50 transition-all duration-300"
                style={{
                  background:
                    currentTheme === 'light'
                      ? 'linear-gradient(to bottom right, rgba(249, 250, 251, 0.8), rgba(243, 244, 246, 0.8))'
                      : 'linear-gradient(to bottom right, rgba(17, 24, 39, 0.4), rgba(31, 41, 55, 0.4))',
                }}
              >
                <div className="flex flex-col items-start">
                  {service.icon}
                  <h2 className={`${textColor} text-3xl font-bold mb-2`}>{service.title}</h2>
                  <p className={`${softTextColor} text-lg mb-4 italic`}>{service.description}</p>
                  <p className={`${textColor} text-base mb-6 leading-relaxed`}>{service.details}</p>
                  <div className="w-full">
                    <h3 className={`${textColor} text-lg font-semibold mb-3`}>Key Features:</h3>
                    <ul className="space-y-2">
                      {service.features.map((feature, fIndex) => (
                        <li key={fIndex} className={`${softTextColor} flex items-start`}>
                          <span className="text-purple-500 mr-2">•</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div
            className="p-12 rounded-2xl border border-purple-500/30"
            style={{
              background:
                currentTheme === 'light'
                  ? 'linear-gradient(to bottom right, rgba(249, 250, 251, 0.9), rgba(243, 244, 246, 0.9))'
                  : 'linear-gradient(to bottom right, rgba(88, 28, 135, 0.1), rgba(67, 20, 100, 0.1))',
            }}
          >
            <h2 className={`${textColor} text-4xl font-bold mb-4`}>Ready to Get Started?</h2>
            <p className={`${softTextColor} text-lg mb-8`}>
              Join thousands of artists protecting and monetizing their music
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <FlatButton className="primary" onClick={() => navigate('/signup')}>
                Sign Up Now
              </FlatButton>
              <FlatButton onClick={() => navigate('/pricing')}>View Pricing</FlatButton>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Services;
