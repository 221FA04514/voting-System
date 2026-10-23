import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Toast from '../../components/Toast';
import { 
  FileText, 
  Clock, 
  HelpCircle, 
  Award, 
  CheckCircle, 
  ShieldAlert, 
  Maximize2, 
  AlertCircle, 
  ArrowRight,
  UserCheck,
  Check,
  Lock
} from 'lucide-react';

const REG_REGEX = /^261FA0\d{4}$/i;

export default function ExamLanding() {
  const { publicId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Verification State
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [studentName, setStudentName] = useState('');
  const [section, setSection] = useState('sec-9');
  const [verifying, setVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState(null); // null, 'verified', 'already_submitted', 'in_progress', 'ineligible'
  const [existingAttemptId, setExistingAttemptId] = useState(null);

  // Pre-exam acknowledgement
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    fetchExamInfo();
  }, [publicId]);

  const fetchExamInfo = async () => {
    try {
      const res = await fetch(`/api/exam-portal/${publicId}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load exam details');
      }
      setExam(data.exam);
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const cleanReg = registrationNumber.trim().toUpperCase();

    if (!cleanReg) {
      setToast({ message: 'Registration number is required', type: 'error' });
      return;
    }

    if (!REG_REGEX.test(cleanReg)) {
      setToast({
        message: 'Invalid Registration Number. Expected format is 261FA0XXXX (e.g. 261FA01025)',
        type: 'error'
      });
      return;
    }

    setVerifying(true);
    try {
      const res = await fetch(`/api/exam-portal/${publicId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationNumber: cleanReg })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Verification failed');
      }

      if (data.isCompleted) {
        setVerifyStatus('already_submitted');
        setExistingAttemptId(data.attemptId);
        setToast({ message: data.message, type: 'info' });
      } else if (data.hasAttempt && data.attemptStatus === 'in_progress') {
        setVerifyStatus('in_progress');
        setExistingAttemptId(data.attemptId);
        setToast({ message: data.message, type: 'info' });
      } else if (data.eligible) {
        setVerifyStatus('verified');
        setToast({ message: 'Registration verified! Please review rules before starting.', type: 'success' });
      } else {
        setVerifyStatus('ineligible');
        setToast({ message: data.message || 'Not eligible for this exam', type: 'error' });
      }
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setVerifying(false);
    }
  };

  const handleStartExam = () => {
    // Pass reg no, studentName and section in session storage for the exam room
    sessionStorage.setItem('exam_reg_no', registrationNumber.trim().toUpperCase());
    sessionStorage.setItem('exam_student_name', studentName.trim());
    sessionStorage.setItem('exam_section', section);

    navigate(`/exam/${publicId}/take`);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem', color: '#64748b' }}>
        Loading examination portal...
      </div>
    );
  }

  if (!exam) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '2rem' }}>
        <h2 style={{ color: '#0f172a' }}>Examination Not Found</h2>
        <p style={{ color: '#64748b' }}>
          This examination link may be incorrect, closed by the administrator, or no longer available.
        </p>
      </div>
    );
  }

  const isRegValid = REG_REGEX.test(registrationNumber.trim());

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '2rem 1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{
        maxWidth: '720px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {/* Header Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
          color: '#ffffff',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              padding: '0.2rem 0.65rem',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.05em'
            }}>
              VIGNAN C-CODE ARENA
            </span>
            <span style={{
              backgroundColor: '#10b981',
              color: '#ffffff',
              padding: '0.2rem 0.6rem',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 800
            }}>
              EXAM ARENA
            </span>
          </div>

          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0', letterSpacing: '-0.02em' }}>
            {exam.title}
          </h1>

          {exam.subject && (
            <p style={{ margin: 0, opacity: 0.85, fontSize: '0.95rem', fontWeight: 500 }}>
              Subject: {exam.subject}
            </p>
          )}
        </div>

        {/* Content Body */}
        <div style={{ padding: '2rem' }}>

          {/* Quick Metrics Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1.75rem'
          }}>
            <div style={{ backgroundColor: '#f1f5f9', padding: '0.85rem', borderRadius: '10px', textAlign: 'center' }}>
              <Clock size={18} style={{ color: '#4f46e5', margin: '0 auto 0.25rem auto' }} />
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>
                {exam.durationMinutes} mins
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Exam Duration</div>
            </div>

            <div style={{ backgroundColor: '#f1f5f9', padding: '0.85rem', borderRadius: '10px', textAlign: 'center' }}>
              <HelpCircle size={18} style={{ color: '#10b981', margin: '0 auto 0.25rem auto' }} />
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>
                {exam.totalQuestions}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Questions</div>
            </div>

            <div style={{ backgroundColor: '#f1f5f9', padding: '0.85rem', borderRadius: '10px', textAlign: 'center' }}>
              <Award size={18} style={{ color: '#f59e0b', margin: '0 auto 0.25rem auto' }} />
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>
                {exam.totalMarks}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Maximum Marks</div>
            </div>

            <div style={{ backgroundColor: '#f1f5f9', padding: '0.85rem', borderRadius: '10px', textAlign: 'center' }}>
              <Lock size={18} style={{ color: '#8b5cf6', margin: '0 auto 0.25rem auto' }} />
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>
                1 Attempt
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Per Reg Number</div>
            </div>
          </div>

          {/* Description & Instructions */}
          {exam.instructions && (
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.75rem'
            }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', margin: '0 0 0.5rem 0' }}>
                Instructions from Mentor:
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                {exam.instructions}
              </p>
            </div>
          )}

          {/* Step 2: Registration Verification */}
          <div style={{
            border: '1.5px solid #e2e8f0',
            borderRadius: '14px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            backgroundColor: '#ffffff'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem 0' }}>
              Student Identity Verification
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 1.25rem 0' }}>
              Enter your official Vignan registration number (Format: <strong>261FA0XXXX</strong>).
            </p>

            <form onSubmit={handleVerify}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#334155', marginBottom: '0.35rem' }}>
                    Registration Number <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={registrationNumber}
                    onChange={(e) => {
                      setRegistrationNumber(e.target.value.toUpperCase());
                      setVerifyStatus(null);
                    }}
                    placeholder="261FA01025"
                    maxLength={10}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '1.5px solid',
                      borderColor: registrationNumber ? (isRegValid ? '#10b981' : '#ef4444') : '#cbd5e1',
                      fontSize: '1rem',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      outline: 'none'
                    }}
                  />
                  {registrationNumber && !isRegValid && (
                    <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                      Format must be 261FA0 followed by 4 digits (e.g., 261FA01025)
                    </span>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#334155', marginBottom: '0.35rem' }}>
                    Student Full Name
                  </label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Enter your name"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.95rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#334155', marginBottom: '0.35rem' }}>
                    Section
                  </label>
                  <select
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.95rem',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    <option value="sec-9">sec-9</option>
                    <option value="sec-25">sec-25</option>
                    <option value="sec-53">sec-53</option>
                  </select>
                </div>
              </div>

              {verifyStatus !== 'verified' && (
                <button
                  type="submit"
                  disabled={verifying || !isRegValid}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <UserCheck size={18} />
                  <span>{verifying ? 'Verifying Eligibility...' : 'Verify Eligibility'}</span>
                </button>
              )}
            </form>

            {/* Already Submitted State */}
            {verifyStatus === 'already_submitted' && (
              <div style={{
                marginTop: '1.25rem',
                padding: '1.25rem',
                borderRadius: '10px',
                backgroundColor: '#fef3c7',
                border: '1px solid #fde68a',
                textAlign: 'center'
              }}>
                <CheckCircle size={28} style={{ color: '#d97706', margin: '0 auto 0.5rem auto' }} />
                <h4 style={{ margin: '0 0 0.35rem 0', fontWeight: 800, color: '#92400e' }}>
                  Examination Already Completed
                </h4>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#78350f' }}>
                  A verified submission has already been recorded for registration number <strong>{registrationNumber}</strong>. Only one attempt is permitted.
                </p>
                <button
                  onClick={() => navigate(`/exam/${publicId}/result/${existingAttemptId}`)}
                  className="btn btn-primary"
                  style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
                >
                  View Your Final Score & Result
                </button>
              </div>
            )}

            {/* In Progress Attempt Resume */}
            {verifyStatus === 'in_progress' && (
              <div style={{
                marginTop: '1.25rem',
                padding: '1.25rem',
                borderRadius: '10px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                textAlign: 'center'
              }}>
                <Clock size={28} style={{ color: '#2563eb', margin: '0 auto 0.5rem auto' }} />
                <h4 style={{ margin: '0 0 0.35rem 0', fontWeight: 800, color: '#1e40af' }}>
                  Attempt In Progress
                </h4>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#1e3a8a' }}>
                  You have an active session in progress. Your timer has been continuously running on the server.
                </p>
                <button
                  onClick={handleStartExam}
                  className="btn btn-primary"
                  style={{ padding: '0.65rem 1.5rem', fontWeight: 700 }}
                >
                  Resume Exam Attempt
                </button>
              </div>
            )}
          </div>

          {/* Step 3: Verified Pre-Exam Checklist & Start */}
          {verifyStatus === 'verified' && (
            <div style={{
              backgroundColor: '#f0fdf4',
              border: '1.5px solid #bbf7d0',
              borderRadius: '14px',
              padding: '1.5rem',
              animation: 'fadeIn 0.3s ease-in'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#166534' }}>
                <CheckCircle size={22} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                  Eligibility Confirmed: {registrationNumber}
                </h3>
              </div>

              <div style={{ fontSize: '0.85rem', color: '#14532d', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                <p style={{ margin: '0 0 0.5rem 0' }}>
                  Please acknowledge the examination security conditions:
                </p>
                <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                  {exam.fullscreenRequired && (
                    <li style={{ marginBottom: '0.35rem' }}>
                      <strong>Fullscreen Mode:</strong> The exam will request browser fullscreen on start. Fullscreen exit events are logged.
                    </li>
                  )}
                  {exam.focusMonitoringEnabled && (
                    <li style={{ marginBottom: '0.35rem' }}>
                      <strong>Tab-Switch Monitoring:</strong> Switching tabs or losing window focus is tracked and reported to the mentor.
                    </li>
                  )}
                  <li style={{ marginBottom: '0.35rem' }}>
                    <strong>Server Timer:</strong> The {exam.durationMinutes}-minute countdown starts immediately. Refreshing the browser will NOT reset the timer.
                  </li>
                  <li style={{ marginBottom: '0.35rem' }}>
                    <strong>Autosave:</strong> Every MCQ and fill-in-the-blank answer is saved automatically to the cloud server.
                  </li>
                  <li>
                    <strong>Single Submission:</strong> Once submitted or when the timer expires, the exam is graded on the server and cannot be retaken.
                  </li>
                </ul>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', color: '#166534', fontWeight: 700, cursor: 'pointer', marginBottom: '1.25rem' }}>
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#16a34a' }}
                />
                <span>I understand the instructions and agree to begin the examination.</span>
              </label>

              <button
                type="button"
                onClick={handleStartExam}
                disabled={!acknowledged}
                className="btn"
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  backgroundColor: acknowledged ? '#16a34a' : '#9ca3af',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '1rem',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  cursor: acknowledged ? 'pointer' : 'not-allowed',
                  boxShadow: acknowledged ? '0 4px 14px rgba(22, 163, 74, 0.4)' : 'none'
                }}
              >
                <span>Enter & Start Examination</span>
                <ArrowRight size={20} />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
