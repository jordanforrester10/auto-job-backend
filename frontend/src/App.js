import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { AiAssistantProvider } from './context/AiAssistantContext.js';
import ThemeProvider from './ThemeProvider.js';
import ProtectedRoute from './components/auth/ProtectedRoute.js';
import Login from './components/auth/Login.js';
import Register from './components/auth/Register.js';
import ForgotPassword from './components/auth/ForgotPassword.js';
import ResetPassword from './components/auth/ResetPassword.js';
import EmailVerification from './components/auth/EmailVerification.js';
import Dashboard from './components/Dashboard.js';
import ResumesPage from './components/resumes/ResumesPage.js';
import ResumeUploadDialog from './components/resumes/ResumeUploadDialog.js';
import ResumeDetail from './components/resumes/ResumeDetail.js';

// Import job-related components
import JobsPage from './components/jobs/JobsPage.js';
import JobDetail from './components/jobs/JobDetail.js';
import ResumeTailoring from './components/jobs/ResumeTailoring.js';
import AiSearchesPage from './components/jobs/AiSearchesPage.js';

// Import recruiter-related components
import RecruiterPage from './components/recruiters/RecruiterPage.js';
import RecruiterDetails from './components/recruiters/RecruiterDetails.js';
import OutreachTracker from './components/recruiters/OutreachTracker.js';

// Import Settings
import SettingsPage from './components/SettingsPage.js';

// Import Global AI Assistant
import GlobalAiAssistant from './components/assistant/GlobalAiAssistant.js';

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
                    <ResumeUploadDialog />
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