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
import ExamDashboard from './pages/mentor/ExamDashboard';
import CreateExam from './pages/mentor/CreateExam';
import ExamDetail from './pages/mentor/ExamDetail';
import ExamResults from './pages/mentor/ExamResults';

// Student Pages
import StudentVote from './pages/student/StudentVote';
import VoteSuccess from './pages/student/VoteSuccess';
import NumberGuessGame from './pages/student/NumberGuessGame';
import PatternArena from './pages/student/PatternArena';
import ArrayArena from './pages/student/ArrayArena';
import FunctionArena from './pages/student/FunctionArena';
import ExamLanding from './pages/student/ExamLanding';
import TakeExam from './pages/student/TakeExam';
import ExamResult from './pages/student/ExamResult';

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

          {/* Admin / Mentor Exam Arena Routes */}
          <Route path="/admin/exams" element={
            <ProtectedMentorRoute>
              <ExamDashboard />
            </ProtectedMentorRoute>
          } />
          <Route path="/admin/exams/create" element={
            <ProtectedMentorRoute>
              <CreateExam />
            </ProtectedMentorRoute>
          } />
          <Route path="/admin/exams/:id" element={
            <ProtectedMentorRoute>
              <ExamDetail />
            </ProtectedMentorRoute>
          } />
          <Route path="/admin/exams/:id/results" element={
            <ProtectedMentorRoute>
              <ExamResults />
            </ProtectedMentorRoute>
          } />
          {/* Mentor alias routes */}
          <Route path="/mentor/exams" element={<Navigate to="/admin/exams" replace />} />
          <Route path="/mentor/exams/create" element={<Navigate to="/admin/exams/create" replace />} />

          {/* Student Routes */}
          <Route path="/vote/:slug" element={<StudentVote />} />
          <Route path="/vote/:slug/success" element={<VoteSuccess />} />
          <Route path="/game/number-guessing" element={<NumberGuessGame />} />
          <Route path="/student/pattern-arena" element={<PatternArena />} />
          <Route path="/game/pattern-arena" element={<PatternArena />} />
          <Route path="/student/array-arena" element={<ArrayArena />} />
          <Route path="/game/array-arena" element={<ArrayArena />} />
          <Route path="/student/function-arena" element={<FunctionArena />} />
          <Route path="/game/function-arena" element={<FunctionArena />} />

          {/* Student Exam Arena Routes */}
          <Route path="/exam/:publicId" element={<ExamLanding />} />
          <Route path="/exam/:publicId/take" element={<TakeExam />} />
          <Route path="/exam/:publicId/result/:attemptId" element={<ExamResult />} />

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
