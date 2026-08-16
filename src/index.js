import { useContext, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import Clarity from '@microsoft/clarity';
import './index.css';
import Settings from './pages/Settings/Settings';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import PrivacyPolicy from './pages/PrivacyPolicy/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService/TermsOfService';
import { ThemeProvider } from './components/ThemeProvider/ThemeProvider';
import { LanguageProvider } from './i18n/LanguageContext';
import { setMyLanguage } from './api/portal';
import { UserContext } from './components/UserContext/UserContext';
import { changeTheme } from './misc/helper';
import ProtectedRoutes from './components/ProtectedRoute/ProtectedRoutes';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import EmailConfirmed from './pages/EmailConfirmed';
import EmailInvalid from './pages/EmailInvalid';
import PageMessage from './components/PageMessage/PageMessage';
import Imprint from './pages/Imprint';
import { SubscriptionContext } from './components/SubscriptionContext/SubscriptionContext';
import ClientContext from './components/ClientContext/ClientContext';
import SignUpSuccessful from './pages/SignUpSuccessful';
import { ToastContainer, Bounce } from 'react-toastify';
import ResetPassword from './pages/ResetPassword/ResetPassword';
import ForgotPassword from './pages/ForgotPassword/ForgotPassword';
import Revenue from './pages/Revenue/Revenue';
import TokenWatcher from './components/TokenWatcher/TokenWatcher';
import CrispChat from './components/CrispChat/CrispChat';
import AutoRegister from './pages/AutoRegister/AutoRegister';
import WriterStatements from './pages/WriterStatements/WriterStatements';
import AdminOverview from './pages/AdminOverview/AdminOverview';
import AdminStatements from './pages/AdminStatements/AdminStatements';
import AdminStatementUpload from './pages/AdminStatementUpload/AdminStatementUpload';
import AdminStatementDetail from './pages/AdminStatementDetail/AdminStatementDetail';
import AdminWriters from './pages/AdminWriters/AdminWriters';
import AdminWriterDetail from './pages/AdminWriterDetail/AdminWriterDetail';
import AdminClientImport from './pages/AdminClientImport/AdminClientImport';
import InviteAccept from './pages/InviteAccept/InviteAccept';
import { UserContextProvider } from './components/UserContext/UserContext';
import { useIsAdmin } from './utils/auth';
import AdminDistributions from './pages/AdminDistributions/AdminDistributions';
import AdminDistributionDetail from './pages/AdminDistributionDetail/AdminDistributionDetail';
import AdminAccounts from './pages/AdminAccounts/AdminAccounts';
import { HelmetProvider } from 'react-helmet-async';
import { HeroUIProvider } from '@heroui/react';
import { PostHogProvider } from 'posthog-js/react';

// Initialize Microsoft Clarity for UX analytics (at module level, runs once)
const clarityProjectId = process.env.REACT_APP_CLARITY_PROJECT_ID;
if (clarityProjectId) {
  Clarity.init(clarityProjectId);
}

// Root is the portal, nothing else: a signed-in user goes to their portal
// (admins → dashboard, writers → earnings); anyone not logged in goes to the
// login screen. There is no marketing home.
const RootRoute = () => {
  const isAdmin = useIsAdmin();
  const user = useContext(UserContextProvider);
  if (user === undefined) return null; // auth still resolving
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={isAdmin ? '/admin' : '/earnings'} replace />;
};

const App = () => {
  useEffect(() => {
    changeTheme(localStorage.getItem('theme'));
  }, []);

  return (
    <>
      <HeroUIProvider>
        <UserContext>
          <SubscriptionContext>
            <ClientContext>
              <HelmetProvider>
                <ThemeProvider>
                  {/* Portal language (ES/EN). Persisting to the contact record is
                      best-effort — a signed-out visitor has nowhere to save it,
                      and the switch must work regardless. */}
                  <LanguageProvider persist={setMyLanguage}>
                    <GoogleOAuthProvider clientId="456632936333-6nob9vo959nuhchsb5c6usm3eeb08gbj.apps.googleusercontent.com">
                      <BrowserRouter>
                        <TokenWatcher />
                        <CrispChat />
                        <Routes>
                          <Route element={<RootRoute />} path="/" />
                          {/* One way in: /signup is the historical URL, /register is the page.
                            The legacy SignUpWizard (TuneScan captcha/Stripe flow) is retired
                            from routing but still on disk at pages/SignUp/SignUpWizard.jsx. */}
                          <Route element={<Navigate to="/register" replace />} path="/signup" />
                          <Route element={<Register />} path="/register" />
                          <Route element={<InviteAccept />} path="/invite/:token" />
                          <Route element={<Login />} path="/login" />
                          <Route element={<EmailConfirmed />} path="/email-confirmed" />
                          <Route element={<EmailInvalid />} path="/email-invalid" />
                          <Route element={<SignUpSuccessful />} path="/signup-successful" />
                          <Route element={<PageMessage />} path="/page-message" />
                          {/* Legal pages (kept — linked from login/register) */}
                          <Route element={<PrivacyPolicy />} path="/pp" />
                          <Route element={<TermsOfService />} path="/tos" />
                          <Route element={<Imprint />} path="/imprint" />
                          {/* Settings doesn't require email verification */}
                          <Route element={<ProtectedRoutes requireEmailVerification={false} />}>
                            <Route element={<Settings />} path="/settings" />
                          </Route>
                          <Route element={<ProtectedRoutes />}>
                            <Route element={<Navigate to="/earnings" replace />} path="/dashboard" />
                            {/* Admin (publisher) app */}
                            <Route element={<AdminOverview />} path="/admin" />
                            <Route element={<AdminStatements />} path="/admin/statements" />
                            <Route element={<AdminStatementUpload />} path="/admin/statements/upload" />
                            <Route element={<AdminStatementDetail />} path="/admin/statements/:id" />
                            <Route element={<AdminWriters />} path="/admin/writers" />
                            <Route element={<AdminWriterDetail />} path="/admin/writers/:id" />
                            <Route element={<AdminClientImport />} path="/admin/client-imports/:id" />
                            <Route element={<AdminDistributions />} path="/admin/distributions" />
                            <Route element={<AdminDistributionDetail />} path="/admin/distributions/:periodId" />
                            <Route element={<AdminAccounts />} path="/admin/accounts" />
                            <Route element={<AutoRegister />} path="/auto-register" />
                            {/* Writer portal */}
                            <Route element={<Revenue />} path="/earnings" />
                            <Route element={<WriterStatements />} path="/statements" />
                          </Route>
                          <Route element={<ResetPassword />} path="/resetPassword" />
                          <Route element={<ForgotPassword />} path="/forgotPassword" />
                        </Routes>
                      </BrowserRouter>
                    </GoogleOAuthProvider>
                  </LanguageProvider>
                </ThemeProvider>
              </HelmetProvider>
            </ClientContext>
          </SubscriptionContext>
        </UserContext>
      </HeroUIProvider>
      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        transition={Bounce}
        className="toast"
      />
    </>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <PostHogProvider
    apiKey={process.env.REACT_APP_POSTHOG_KEY}
    options={{
      api_host: process.env.REACT_APP_POSTHOG_HOST,
      defaults: '2025-05-24',
      capture_exceptions: true,
      debug: process.env.NODE_ENV === 'development',
    }}
  >
    <App />
  </PostHogProvider>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
