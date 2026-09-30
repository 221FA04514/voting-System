import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';

// Mentor Pages
import Login from './pages/mentor/Login';
import Dashboard from './pages/mentor/Dashboard';
import CreateSession from './pages/mentor/CreateSession';
import SessionDetail from './pages/mentor/SessionDetail';
import SessionResults from './pages/mentor/SessionResults';
import Settings from './pages/mentor/Settings';

// Student Pages
import StudentVote from './pages/student/StudentVote';
import VoteSuccess from './pages/student/VoteSuccess';
import NumberGuessGame from './pages/student/NumberGuessGame';

function ProtectedMentorRoute({ children }) {
  const { mentor, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
        Authenticating...
      </div>
    );
  }
  if (!mentor) {
    return <Navigate to="/mentor/login" replace />;
  }
  return children;
}

function AppContent() {
  const { mentor } = useAuth();

  return (
    <div className="app-container">
      <Navbar />
      <main className="main-content">
        <Routes>
          {/* Default Route */}
          <Route path="/" element={<Navigate to={mentor ? "/mentor/dashboard" : "/mentor/login"} replace />} />

          {/* Mentor Routes */}
          <Route path="/mentor/login" element={<Login />} />
          <Route path="/mentor/dashboard" element={
            <ProtectedMentorRoute>
              <Dashboard />
            </ProtectedMentorRoute>
          } />
          <Route path="/mentor/create-session" element={
            <ProtectedMentorRoute>
              <CreateSession />
            </ProtectedMentorRoute>
          } />
          <Route path="/mentor/session/:id" element={
            <ProtectedMentorRoute>
              <SessionDetail />
            </ProtectedMentorRoute>
          } />
          <Route path="/mentor/session/:id/results" element={
            <ProtectedMentorRoute>
              <SessionResults />
            </ProtectedMentorRoute>
          } />
          <Route path="/mentor/settings" element={
            <ProtectedMentorRoute>
              <Settings />
            </ProtectedMentorRoute>
          } />

          {/* Student Routes */}
          <Route path="/vote/:slug" element={<StudentVote />} />
          <Route path="/vote/:slug/success" element={<VoteSuccess />} />
          <Route path="/game/number-guessing" element={<NumberGuessGame />} />

          {/* Fallback Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}
