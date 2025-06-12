import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AiAssistantProvider } from './context/AiAssistantContext';
import ThemeProvider from './ThemeProvider';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';
import EmailVerification from './components/auth/EmailVerification';
import Dashboard from './components/Dashboard';
import ResumesPage from './components/resumes/ResumesPage';
import ResumeUpload from './components/resumes/ResumeUploadDialog';
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

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Auth Routes - NO AiAssistantProvider wrapper */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/verify-email/:token" element={<EmailVerification />} />
            
            {/* Protected Routes - WITH AiAssistantProvider wrapper */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <AiAssistantProvider>
                    <Dashboard />
                    <GlobalAiAssistant />
                  </AiAssistantProvider>
                </ProtectedRoute>
              }
            />
            
            {/* Resume Routes */}
            <Route
              path="/resumes"
              element={
                <ProtectedRoute>
                  <AiAssistantProvider>
                    <ResumesPage />
                    <GlobalAiAssistant />
                  </AiAssistantProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/resumes/upload"
              element={
                <ProtectedRoute>
                  <AiAssistantProvider>
                    <ResumeUpload />
                    <GlobalAiAssistant />
                  </AiAssistantProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/resumes/:id"
              element={
                <ProtectedRoute>
                  <AiAssistantProvider>
                    <ResumeDetail />
                    <GlobalAiAssistant />
                  </AiAssistantProvider>
                </ProtectedRoute>
              }
            />
            
            {/* Job Routes */}
            <Route
              path="/jobs"
              element={
                <ProtectedRoute>
                  <AiAssistantProvider>
                    <JobsPage />
                    <GlobalAiAssistant />
                  </AiAssistantProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs/:id"
              element={
                <ProtectedRoute>
                  <AiAssistantProvider>
                    <JobDetail />
                    <GlobalAiAssistant />
                  </AiAssistantProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs/:jobId/tailor/:resumeId"
              element={
                <ProtectedRoute>
                  <AiAssistantProvider>
                    <ResumeTailoring />
                    <GlobalAiAssistant />
                  </AiAssistantProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs/ai-searches"
              element={
                <ProtectedRoute>
                  <AiAssistantProvider>
                    <AiSearchesPage />
                    <GlobalAiAssistant />
                  </AiAssistantProvider>
                </ProtectedRoute>
              }
            />
            
            {/* Recruiter Routes */}
            <Route
              path="/recruiters"
              element={
                <ProtectedRoute>
                  <AiAssistantProvider>
                    <RecruiterPage />
                    <GlobalAiAssistant />
                  </AiAssistantProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/recruiters/:id"
              element={
                <ProtectedRoute>
                  <AiAssistantProvider>
                    <RecruiterDetails />
                    <GlobalAiAssistant />
                  </AiAssistantProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/recruiters/outreach"
              element={
                <ProtectedRoute>
                  <AiAssistantProvider>
                    <OutreachTracker />
                    <GlobalAiAssistant />
                  </AiAssistantProvider>
                </ProtectedRoute>
              }
            />
            
            {/* Settings Route */}
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <AiAssistantProvider>
                    <SettingsPage />
                    <GlobalAiAssistant />
                  </AiAssistantProvider>
                </ProtectedRoute>
              }
            />
            
            {/* Other Routes */}
            <Route
              path="/applications"
              element={
                <ProtectedRoute>
                  <AiAssistantProvider>
                    <ApplicationsPage />
                    <GlobalAiAssistant />
                  </AiAssistantProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-settings"
              element={
                <ProtectedRoute>
                  <AiAssistantProvider>
                    <AISettingsPage />
                    <GlobalAiAssistant />
                  </AiAssistantProvider>
                </ProtectedRoute>
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