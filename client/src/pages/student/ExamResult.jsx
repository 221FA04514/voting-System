import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Toast from '../../components/Toast';
import QuestionContent from '../../components/QuestionContent';
import { 
  Award, 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  Clock, 
  FileText, 
  Check, 
  ChevronDown, 
  ChevronUp,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export default function ExamResult() {
  const { publicId, attemptId } = useParams();

  const [resultData, setResultData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchResult();
  }, [publicId, attemptId]);

  const fetchResult = async () => {
    try {
      const res = await fetch(`/api/exam-portal/${publicId}/result/${attemptId}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch exam result');
      }
      setResultData(data);
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '6rem', color: '#64748b' }}>
        Loading examination result report...
      </div>
    );
  }

  if (!resultData || !resultData.attempt) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '2rem' }}>
        <h2>Result Not Available</h2>
        <p style={{ color: '#64748b' }}>
          This examination attempt was not found or is still in progress.
        </p>
      </div>
    );
  }

  const { examTitle, subject, passingMarks = 0, attempt, reviewQuestions } = resultData;
  const isPassed = Number(attempt.score) >= Number(passingMarks);
  const minutes = Math.floor((attempt.timeTakenSeconds || 0) / 60);
  const seconds = (attempt.timeTakenSeconds || 0) % 60;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '2.5rem 1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{
        maxWidth: '760px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {/* Header Ribbon */}
        <div style={{
          background: isPassed
            ? 'linear-gradient(135deg, #065f46 0%, #047857 50%, #059669 100%)'
            : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
          color: '#ffffff',
          padding: '2.5rem 2rem',
          textAlign: 'center'
        }}>
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem auto',
            backdropFilter: 'blur(4px)'
          }}>
            <Award size={36} />
          </div>

          <div style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', opacity: 0.9 }}>
            EXAMINATION COMPLETED
          </div>

          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: '0.25rem 0 0.5rem 0' }}>
            {examTitle}
          </h1>

          <div style={{ fontSize: '0.95rem', opacity: 0.9 }}>
            Student: <strong>{attempt.studentName || 'Authenticated Student'}</strong> ({attempt.registrationNumber})
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '2rem' }}>

          {/* Primary Score Showcase Card */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '2px solid #e2e8f0',
            borderRadius: '16px',
            padding: '1.75rem',
            textAlign: 'center',
            marginBottom: '2rem'
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Final Official Score
            </div>

            <div style={{
              fontSize: '3.25rem',
              fontWeight: 900,
              color: isPassed ? '#059669' : '#dc2626',
              lineHeight: 1.1,
              margin: '0.5rem 0'
            }}>
              {attempt.score} <span style={{ fontSize: '1.75rem', color: '#94a3b8', fontWeight: 600 }}>/ {attempt.maximumMarks}</span>
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: isPassed ? '#dcfce7' : '#fee2e2', color: isPassed ? '#15803d' : '#991b1b', padding: '0.35rem 0.85rem', borderRadius: '20px', fontWeight: 800, fontSize: '0.9rem' }}>
              <Sparkles size={16} />
              <span>{attempt.percentage}% Percentage — {isPassed ? 'PASSED' : 'NEEDS IMPROVEMENT'}</span>
            </div>
          </div>

          {/* 4-Stat Breakdown Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
              <CheckCircle size={20} style={{ color: '#16a34a', margin: '0 auto 0.25rem auto' }} />
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#15803d' }}>
                {attempt.correctCount}
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#166534' }}>
                Correct Answers
              </div>
            </div>

            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecdd3', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
              <XCircle size={20} style={{ color: '#dc2626', margin: '0 auto 0.25rem auto' }} />
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#991b1b' }}>
                {attempt.incorrectCount}
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#991b1b' }}>
                Incorrect Answers
              </div>
            </div>

            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
              <HelpCircle size={20} style={{ color: '#64748b', margin: '0 auto 0.25rem auto' }} />
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#475569' }}>
                {attempt.unansweredCount}
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                Unanswered
              </div>
            </div>

            <div style={{ backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
              <Clock size={20} style={{ color: '#4f46e5', margin: '0 auto 0.25rem auto' }} />
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>
                {minutes}m {seconds}s
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                Time Taken
              </div>
            </div>
          </div>

          {/* Submission Details Bar */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem 1.25rem',
            backgroundColor: '#f8fafc',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            fontSize: '0.85rem',
            color: '#64748b',
            marginBottom: '2rem'
          }}>
            <div>
              Status: <strong style={{ color: '#0f172a', textTransform: 'capitalize' }}>{attempt.attemptStatus}</strong>
            </div>
            <div>
              Section: <strong style={{ color: '#0f172a' }}>{attempt.section || 'General'}</strong>
            </div>
            <div>
              Submitted At: <strong style={{ color: '#0f172a' }}>{new Date(attempt.submittedAt).toLocaleTimeString()}</strong>
            </div>
          </div>

          {/* Optional Post-Exam Answer Review (if revealed by mentor) */}
          {reviewQuestions && reviewQuestions.length > 0 ? (
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1rem 0' }}>
                Post-Examination Question Review
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {reviewQuestions.map((q, idx) => {
                  const isCorrect = q.evaluationStatus === 'correct';
                  const isIncorrect = q.evaluationStatus === 'incorrect';

                  return (
                    <div
                      key={q.id}
                      style={{
                        padding: '1rem',
                        borderRadius: '10px',
                        border: '1px solid',
                        borderColor: isCorrect ? '#bbf7d0' : isIncorrect ? '#fecdd3' : '#e2e8f0',
                        backgroundColor: isCorrect ? '#f0fdf4' : isIncorrect ? '#fff1f2' : '#ffffff'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b' }}>
                          Question {idx + 1}
                        </span>
                        <span style={{
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          color: isCorrect ? '#16a34a' : isIncorrect ? '#dc2626' : '#64748b'
                        }}>
                          {isCorrect ? `+${q.marksAwarded} Marks` : isIncorrect ? `${q.marksAwarded} Marks` : '0 Marks'}
                        </span>
                      </div>

                      <QuestionContent text={q.questionText} compact />

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                        <div style={{ padding: '0.4rem 0.6rem', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>YOUR ANSWER:</span>
                          <strong style={{ color: isCorrect ? '#10b981' : isIncorrect ? '#ef4444' : '#64748b' }}>
                            {q.questionType === 'mcq' ? (q.studentSelectedOption || 'None') : (q.studentTextResponse || 'None')}
                          </strong>
                        </div>

                        <div style={{ padding: '0.4rem 0.6rem', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>CORRECT ANSWER:</span>
                          <strong style={{ color: '#10b981' }}>
                            {q.correctAnswer}
                          </strong>
                        </div>
                      </div>

                      {q.explanation && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#475569', fontStyle: 'italic' }}>
                          Note: {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '1.25rem',
              textAlign: 'center',
              color: '#64748b',
              fontSize: '0.85rem'
            }}>
              <ShieldCheck size={24} style={{ color: '#4f46e5', margin: '0 auto 0.5rem auto' }} />
              <div>
                Official answer keys and question-by-question explanations are preserved securely and will be released by the mentor after the examination closes.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
