import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AiAssistantProvider } from './context/AiAssistantContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import ThemeProvider from './ThemeProvider';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';
import EmailVerification from './components/auth/EmailVerification';
import Dashboard from './components/Dashboard';
import ResumesPage from './components/resumes/ResumesPage';
import ResumeUploadDialog from './components/resumes/ResumeUploadDialog';
import ResumeDetail from './components/resumes/ResumeDetail';

// Import job-related components
import JobsPage from './components/jobs/JobsPage';
import JobDetail from './components/jobs/JobDetail';
import ResumeTailoring from './components/jobs/ResumeTailoring';
import AiSearchesPage from './components/jobs/AiSearchesPage';

// Import recruiter-related components
import RecruiterPage from './components/recruiters/RecruiterPage';
import RecruiterDetails from './components/recruiters/RecruiterDetails';
import OutreachTracker from './components/recruiters/OutreachTracker';

// Import Settings
import SettingsPage from './components/SettingsPage';

// Import Global AI Assistant
import GlobalAiAssistant from './components/assistant/GlobalAiAssistant';

// Placeholder components for other sections
const ApplicationsPage = () => <div>Applications Page (Coming Soon)</div>;
const AISettingsPage = () => <div>AI Settings Page (Coming Soon)</div>;

// Conditional AI Assistant wrapper component
const ConditionalAiAssistant = () => {
  // This component will only render the AI Assistant if the user has access
  // The subscription context will be available here
  return <GlobalAiAssistant />;
};

// Wrapper component for protected routes with subscription context
const ProtectedRouteWithSubscription = ({ children }) => (
  <ProtectedRoute>
    <SubscriptionProvider>
      <AiAssistantProvider>
        {children}
        <ConditionalAiAssistant />
      </AiAssistantProvider>
    </SubscriptionProvider>
  </ProtectedRoute>
);

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Auth Routes - NO providers wrapper */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/verify-email/:token" element={<EmailVerification />} />
            
            {/* Protected Routes - WITH SubscriptionProvider and conditional AiAssistantProvider wrapper */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRouteWithSubscription>
                  <Dashboard />
                </ProtectedRouteWithSubscription>
              }
            />
            
            {/* Resume Routes */}
            <Route
              path="/resumes"
              element={
                <ProtectedRouteWithSubscription>
                  <ResumesPage />
                </ProtectedRouteWithSubscription>
              }
            />
            <Route
              path="/resumes/upload"
              element={
                <ProtectedRouteWithSubscription>
                  <ResumeUploadDialog />
                </ProtectedRouteWithSubscription>
              }
            />
            <Route
              path="/resumes/:id"
              element={
                <ProtectedRouteWithSubscription>
                  <ResumeDetail />
                </ProtectedRouteWithSubscription>
              }
            />
            
            {/* Job Routes */}
            <Route
              path="/jobs"
              element={
                <ProtectedRouteWithSubscription>
                  <JobsPage />
                </ProtectedRouteWithSubscription>
              }
            />
            <Route
              path="/jobs/:id"
              element={
                <ProtectedRouteWithSubscription>
                  <JobDetail />
                </ProtectedRouteWithSubscription>
              }
            />
            <Route
              path="/jobs/:jobId/tailor/:resumeId"
              element={
                <ProtectedRouteWithSubscription>
                  <ResumeTailoring />
                </ProtectedRouteWithSubscription>
              }
            />
            <Route
              path="/jobs/ai-searches"
              element={
                <ProtectedRouteWithSubscription>
                  <AiSearchesPage />
                </ProtectedRouteWithSubscription>
              }
            />
            
            {/* Recruiter Routes */}
            <Route
              path="/recruiters"
              element={
                <ProtectedRouteWithSubscription>
                  <RecruiterPage />
                </ProtectedRouteWithSubscription>
              }
            />
            <Route
              path="/recruiters/:id"
              element={
                <ProtectedRouteWithSubscription>
                  <RecruiterDetails />
                </ProtectedRouteWithSubscription>
              }
            />
            <Route
              path="/recruiters/outreach"
              element={
                <ProtectedRouteWithSubscription>
                  <OutreachTracker />
                </ProtectedRouteWithSubscription>
              }
            />
            
            {/* Settings Route */}
            <Route
              path="/settings"
              element={
                <ProtectedRouteWithSubscription>
                  <SettingsPage />
                </ProtectedRouteWithSubscription>
              }
            />
            
            {/* Other Routes */}
            <Route
              path="/applications"
              element={
                <ProtectedRouteWithSubscription>
                  <ApplicationsPage />
                </ProtectedRouteWithSubscription>
              }
            />
            <Route
              path="/ai-settings"
              element={
                <ProtectedRouteWithSubscription>
                  <AISettingsPage />
                </ProtectedRouteWithSubscription>
              }
            />
            
            {/* Default Route */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;