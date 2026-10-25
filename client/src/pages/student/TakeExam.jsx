import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Toast from '../../components/Toast';
import Modal from '../../components/Modal';
import QuestionContent from '../../components/QuestionContent';
import { 
  Clock, 
  CheckCircle, 
  Maximize2, 
  Minimize2, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  Save, 
  HelpCircle,
  ShieldAlert,
  Menu,
  X
} from 'lucide-react';

export default function TakeExam() {
  const { publicId } = useParams();
  const navigate = useNavigate();

  // Core Attempt Data
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(null);
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Student Responses: { [questionId]: { selectedOptionId, textResponse } }
  const [responses, setResponses] = useState({});
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'
  const [toast, setToast] = useState(null);

  // Server Timer
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(null);
  const [timerExpired, setTimerExpired] = useState(false);

  // Focus & Fullscreen Monitoring
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [warningModal, setWarningModal] = useState({ open: false, title: '', message: '' });
  const [focusLossCount, setFocusLossCount] = useState(0);

  // Submit Modal
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Mobile Question Palette Drawer
  const [paletteDrawerOpen, setPaletteDrawerOpen] = useState(false);

  // Debounce ref for autosave
  const autosaveTimerRef = useRef(null);

  // 1. Initial Load: Start or Resume Attempt
  useEffect(() => {
    startOrResumeAttempt();
  }, [publicId]);

  const startOrResumeAttempt = async () => {
    const regNo = sessionStorage.getItem('exam_reg_no');
    const studentName = sessionStorage.getItem('exam_student_name') || '';
    const section = sessionStorage.getItem('exam_section') || '';

    if (!regNo) {
      // Redirect to landing if no reg number in session
      navigate(`/exam/${publicId}`);
      return;
    }

    try {
      const res = await fetch(`/api/exam-portal/${publicId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationNumber: regNo, studentName, section })
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.isCompleted) {
          navigate(`/exam/${publicId}/result/${data.attemptId}`);
          return;
        }
        throw new Error(data.error || 'Failed to start exam');
      }

      setAttempt(data.attempt);
      setExam(data.exam);
      setQuestions(data.questions || []);

      // Initialize responses from saved server state
      const initialResponses = {};
      if (data.savedResponses) {
        Object.keys(data.savedResponses).forEach(qId => {
          initialResponses[qId] = {
            selectedOptionId: data.savedResponses[qId].selectedOptionId,
            textResponse: data.savedResponses[qId].textResponse || ''
          };
        });
      }
      setResponses(initialResponses);

      // Initialize Timer based on server deadline
      const deadline = new Date(data.attempt.deadlineAt).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((deadline - now) / 1000));
      setTimeLeftSeconds(remaining);

      // Prompt fullscreen if enabled
      if (data.exam.fullscreenRequired && document.documentElement.requestFullscreen) {
        try {
          document.documentElement.requestFullscreen().catch(() => {
            // Browser might block automatic fullscreen without direct click; button will handle it
          });
        } catch (_) {}
      }
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // 2. Server-Enforced Timer Countdown
  useEffect(() => {
    if (timeLeftSeconds === null || timeLeftSeconds <= 0) return;

    const timer = setInterval(() => {
      setTimeLeftSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit('time_expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeftSeconds]);

  // 3. Fullscreen & Tab-Switch Monitoring
  useEffect(() => {
    if (!exam || !exam.focusMonitoringEnabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordSecurityEvent('visibility-hidden');
        setFocusLossCount(prev => prev + 1);
        setWarningModal({
          open: true,
          title: 'Tab Switch / Focus Lost Detected',
          message: 'You navigated away from the exam window. This focus-loss event has been logged on the server. Please keep your full focus on the examination.'
        });
      }
    };

    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (!isFull && exam.fullscreenRequired) {
        recordSecurityEvent('fullscreen-exit');
        setWarningModal({
          open: true,
          title: 'Fullscreen Mode Exited',
          message: 'Fullscreen mode was exited. This event has been logged for mentor review. Please click Re-enter Fullscreen.'
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [exam]);

  // Security Event Logger
  const recordSecurityEvent = async (eventType) => {
    if (!attempt) return;
    try {
      await fetch(`/api/exam-portal/${publicId}/security-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId: attempt.id,
          eventType,
          metadata: { timestamp: new Date().toISOString() }
        })
      });
    } catch (_) {}
  };

  // 4. Autosave Mechanism
  const handleAnswerChange = (questionId, { selectedOptionId, textResponse }) => {
    // Immediate UI update
    setResponses(prev => ({
      ...prev,
      [questionId]: {
        selectedOptionId: selectedOptionId !== undefined ? selectedOptionId : (prev[questionId]?.selectedOptionId || null),
        textResponse: textResponse !== undefined ? textResponse : (prev[questionId]?.textResponse || '')
      }
    }));

    setSaveStatus('saving');

    // Debounce save request by 400ms
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/exam-portal/${publicId}/autosave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attemptId: attempt.id,
            questionId,
            selectedOptionId: selectedOptionId !== undefined ? selectedOptionId : (responses[questionId]?.selectedOptionId || null),
            textResponse: textResponse !== undefined ? textResponse : (responses[questionId]?.textResponse || null)
          })
        });

        if (res.ok) {
          setSaveStatus('saved');
        } else {
          setSaveStatus('error');
        }
      } catch (_) {
        setSaveStatus('error');
      }
    }, 400);
  };

  // 5. Final Submission
  const handleFinalSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      // Prepare final responses snapshot
      const finalResponsesArray = Object.keys(responses).map(qId => ({
        questionId: qId,
        selectedOptionId: responses[qId].selectedOptionId,
        textResponse: responses[qId].textResponse
      }));

      const res = await fetch(`/api/exam-portal/${publicId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId: attempt.id,
          finalResponses: finalResponsesArray
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Submission failed');
      }

      // Exit fullscreen if active
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }

      // Navigate to student result page immediately!
      navigate(`/exam/${publicId}/result/${attempt.id}`);
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
      setSubmitting(false);
    }
  };

  // Auto-submit on time expiry
  const handleAutoSubmit = (reason) => {
    setTimerExpired(true);
    setToast({ message: 'Exam time has expired! Finalizing and evaluating responses...', type: 'info' });
    handleFinalSubmit();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '6rem', color: '#64748b' }}>
        Loading examination room...
      </div>
    );
  }

  if (!attempt || questions.length === 0) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '2rem' }}>
        <h2>Examination Initialization Error</h2>
        <p style={{ color: '#64748b' }}>Unable to load questions for this examination.</p>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const currentResp = responses[currentQ.id] || { selectedOptionId: null, textResponse: '' };

  // Calculate statistics for navigator
  const answeredCount = questions.filter(q => {
    const r = responses[q.id];
    return r && (r.selectedOptionId || (r.textResponse && r.textResponse.trim()));
  }).length;
  const unansweredCount = questions.length - answeredCount;

  // Format Timer String
  const minutes = Math.floor((timeLeftSeconds || 0) / 60);
  const seconds = (timeLeftSeconds || 0) % 60;
  const timerString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isTimeCritical = (timeLeftSeconds || 0) <= 300; // < 5 mins

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f1f5f9',
      display: 'flex',
      flexDirection: 'column',
      userSelect: 'none' // Prevent text selection distraction during exam
    }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* TOP HEADER: Timer, Progress, Autosave, Fullscreen */}
      <header style={{
        backgroundColor: '#0f172a',
        color: '#ffffff',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Left: Exam Title & Student */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc' }}>
              {exam.title}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
              Reg: <strong>{attempt.registrationNumber}</strong> {attempt.studentName && `(${attempt.studentName})`}
            </div>
          </div>
        </div>

        {/* Center: Server Synchronized Countdown Timer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          backgroundColor: isTimeCritical ? '#7f1d1d' : '#1e293b',
          border: isTimeCritical ? '1px solid #ef4444' : '1px solid #334155',
          padding: '0.4rem 0.85rem',
          borderRadius: '24px',
          color: isTimeCritical ? '#fca5a5' : '#38bdf8',
          animation: isTimeCritical ? 'pulse 1.5s infinite' : 'none'
        }}>
          <Clock size={18} />
          <span style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'monospace' }}>
            {timerString}
          </span>
        </div>

        {/* Right: Autosave Status & Fullscreen Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Autosave Indicator */}
          <div style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: saveStatus === 'saved' ? '#4ade80' : saveStatus === 'saving' ? '#fbbf24' : '#f87171',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}>
            <Save size={14} />
            <span style={{ display: 'none', md: 'inline' }}>
              {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving...' : 'Save Error'}
            </span>
          </div>

          {/* Fullscreen Button */}
          {exam.fullscreenRequired && (
            <button
              onClick={toggleFullscreen}
              className="btn btn-secondary"
              style={{
                padding: '0.35rem 0.65rem',
                fontSize: '0.75rem',
                backgroundColor: '#1e293b',
                color: '#f8fafc',
                borderColor: '#334155'
              }}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          )}

          {/* Mobile Drawer Toggle */}
          <button
            onClick={() => setPaletteDrawerOpen(!paletteDrawerOpen)}
            className="btn btn-secondary"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', backgroundColor: '#1e293b', color: '#f8fafc', borderColor: '#334155' }}
          >
            <Menu size={16} />
          </button>
        </div>
      </header>

      {/* MAIN EXAM BODY (Desktop Grid: Question on left, Palette on right) */}
      <div style={{
        maxWidth: '1280px',
        width: '100%',
        margin: '0 auto',
        padding: '1.5rem',
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr minmax(250px, 320px)',
        gap: '1.5rem',
        alignItems: 'start'
      }}>

        {/* LEFT COLUMN: Question Card */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #cbd5e1',
          padding: '2rem',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '480px',
          justifyContent: 'space-between'
        }}>
          <div>
            {/* Question Header: Number & Marks */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{
                  backgroundColor: '#4f46e5',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '8px'
                }}>
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <span style={{
                  backgroundColor: currentQ.questionType === 'mcq' ? '#e0e7ff' : '#fef3c7',
                  color: currentQ.questionType === 'mcq' ? '#3730a3' : '#b45309',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  textTransform: 'uppercase'
                }}>
                  {currentQ.questionType === 'mcq' ? 'MCQ' : 'Fill in Blank'}
                </span>
              </div>

              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>
                +{currentQ.marks} Marks {exam.negative_marking_enabled && `(-${currentQ.negativeMarks || 0})`}
              </div>
            </div>

            {/* Question Text & Code Snippet */}
            <QuestionContent text={currentQ.questionText} />

            {/* Question Input Area */}
            {currentQ.questionType === 'mcq' ? (
              /* MCQ Options */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {currentQ.options.map((optText, optIdx) => {
                  const letter = String.fromCharCode(65 + optIdx);
                  const isSelected = currentResp.selectedOptionId === letter;

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleAnswerChange(currentQ.id, { selectedOptionId: letter })}
                      style={{
                        padding: '1rem 1.25rem',
                        borderRadius: '12px',
                        border: '2px solid',
                        borderColor: isSelected ? '#4f46e5' : '#e2e8f0',
                        backgroundColor: isSelected ? '#eef2ff' : '#ffffff',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 4px 12px rgba(79, 70, 229, 0.15)' : 'none'
                      }}
                    >
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: isSelected ? '#4f46e5' : '#f1f5f9',
                        color: isSelected ? '#ffffff' : '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        flexShrink: 0
                      }}>
                        {letter}
                      </div>
                      <span style={{
                        fontSize: '0.95rem',
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? '#312e81' : '#334155',
                        lineHeight: 1.4
                      }}>
                        {optText}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Fill In Blank Input */
              <div style={{ marginTop: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#475569', marginBottom: '0.5rem' }}>
                  Type your short answer in the box below:
                </label>
                <input
                  type="text"
                  value={currentResp.textResponse || ''}
                  onChange={(e) => handleAnswerChange(currentQ.id, { textResponse: e.target.value })}
                  placeholder="e.g. printf"
                  style={{
                    width: '100%',
                    padding: '0.85rem 1.25rem',
                    borderRadius: '10px',
                    border: '2px solid #cbd5e1',
                    fontSize: '1.05rem',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    outline: 'none',
                    backgroundColor: '#ffffff'
                  }}
                />
              </div>
            )}
          </div>

          {/* Navigation Controls */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '1.5rem',
            marginTop: '2rem'
          }}>
            <button
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="btn btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                opacity: currentIndex === 0 ? 0.4 : 1,
                cursor: currentIndex === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              <ChevronLeft size={18} />
              <span>Previous</span>
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <span>Next Question</span>
                <ChevronRight size={18} />
              </button>
            ) : (
              <button
                onClick={() => setSubmitModalOpen(true)}
                className="btn"
                style={{
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontWeight: 700,
                  padding: '0.65rem 1.25rem',
                  borderRadius: '8px'
                }}
              >
                <Send size={16} />
                <span>Submit Exam</span>
              </button>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Question Palette & Submission Card */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #cbd5e1',
          padding: '1.5rem',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1rem 0' }}>
            Question Navigator
          </h3>

          {/* Progress Indicators */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '0.8rem' }}>
            <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: '#ecfdf5', color: '#065f46', fontWeight: 700, textAlign: 'center' }}>
              ✓ {answeredCount} Answered
            </div>
            <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 700, textAlign: 'center' }}>
              • {unansweredCount} Left
            </div>
          </div>

          {/* Palette Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '0.5rem',
            marginBottom: '1.75rem',
            maxHeight: '260px',
            overflowY: 'auto'
          }}>
            {questions.map((q, idx) => {
              const resp = responses[q.id];
              const isAnswered = resp && (resp.selectedOptionId || (resp.textResponse && resp.textResponse.trim()));
              const isCurrent = idx === currentIndex;

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  style={{
                    height: '40px',
                    borderRadius: '8px',
                    border: isCurrent ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                    backgroundColor: isAnswered ? '#10b981' : isCurrent ? '#e0e7ff' : '#f8fafc',
                    color: isAnswered ? '#ffffff' : isCurrent ? '#3730a3' : '#334155',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s'
                  }}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Final Submit Button */}
          <button
            onClick={() => setSubmitModalOpen(true)}
            className="btn"
            style={{
              width: '100%',
              backgroundColor: '#059669',
              color: '#ffffff',
              padding: '0.75rem',
              fontWeight: 800,
              fontSize: '0.95rem',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)'
            }}
          >
            <Send size={18} />
            <span>Finish & Submit Exam</span>
          </button>
        </div>
      </div>

      {/* Warning Modal (Tab Switch or Fullscreen Exit) */}
      <Modal
        isOpen={warningModal.open}
        onClose={() => setWarningModal(prev => ({ ...prev, open: false }))}
        title={warningModal.title}
      >
        <div style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626', fontWeight: 800, marginBottom: '0.5rem' }}>
            <AlertTriangle size={20} />
            <span>Integrity Alert Logged ({focusLossCount} occurrences)</span>
          </div>
          <p>{warningModal.message}</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button
              onClick={() => {
                setWarningModal(prev => ({ ...prev, open: false }));
                if (exam.fullscreenRequired && !document.fullscreenElement) {
                  toggleFullscreen();
                }
              }}
              className="btn btn-primary"
            >
              Acknowledge & Resume
            </button>
          </div>
        </div>
      </Modal>

      {/* Submit Confirmation Dialog */}
      <Modal
        isOpen={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        title="Confirm Final Submission"
      >
        <div style={{ color: '#334155', lineHeight: 1.5 }}>
          <p style={{ margin: '0 0 1rem 0' }}>
            Are you sure you want to finalize your examination? Once submitted, your answers will be evaluated on the server and you cannot change them.
          </p>

          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '1rem',
            marginBottom: '1.25rem',
            fontSize: '0.85rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
              <span>Answered Questions:</span>
              <strong style={{ color: '#10b981' }}>{answeredCount} of {questions.length}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
              <span>Unanswered Questions:</span>
              <strong style={{ color: unansweredCount > 0 ? '#ef4444' : '#10b981' }}>{unansweredCount}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
              <span>Time Remaining:</span>
              <strong style={{ color: '#4f46e5' }}>{timerString}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              onClick={() => setSubmitModalOpen(false)}
              disabled={submitting}
              className="btn btn-secondary"
            >
              Continue Working
            </button>
            <button
              onClick={handleFinalSubmit}
              disabled={submitting}
              className="btn"
              style={{
                backgroundColor: '#059669',
                color: '#ffffff',
                fontWeight: 700,
                padding: '0.65rem 1.25rem'
              }}
            >
              {submitting ? 'Submitting & Grading...' : 'Confirm Submission'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
