import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import Toast from '../../components/Toast';
import Modal from '../../components/Modal';
import { 
  ArrowLeft, 
  PlusCircle, 
  Upload, 
  Trash2, 
  Copy as DuplicateIcon, 
  Save, 
  HelpCircle, 
  Award, 
  Clock, 
  ShieldAlert, 
  Play, 
  Square, 
  ChevronUp, 
  ChevronDown, 
  Check, 
  Copy, 
  BarChart3, 
  Sparkles,
  AlertTriangle
} from 'lucide-react';

export default function ExamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Single Question Modal
  const [questionModal, setQuestionModal] = useState({
    open: false,
    mode: 'create', // 'create' or 'edit'
    questionId: null,
    type: 'mcq',
    text: '',
    options: ['', '', '', ''],
    correctAnswer: 'A',
    acceptedAnswersText: '',
    marks: 1,
    negativeMarks: 0,
    explanation: ''
  });

  // Bulk Import Modal
  const [bulkModal, setBulkModal] = useState({ open: false, rawText: '', parsing: false, errors: [] });

  // Delete Question Modal
  const [deleteQModal, setDeleteQModal] = useState({ open: false, qId: null, qText: '' });

  useEffect(() => {
    fetchExamData();
  }, [id]);

  const fetchExamData = async () => {
    try {
      const data = await apiFetch(`/exams/${id}`);
      setExam(data.exam);
      setQuestions(data.questions || []);
    } catch (err) {
      setToast({ message: err.message || 'Failed to load exam data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateExam = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/exams/${id}`, {
        method: 'PUT',
        body: JSON.stringify(exam)
      });
      setToast({ message: 'Exam settings updated successfully!', type: 'success' });
      fetchExamData();
    } catch (err) {
      setToast({ message: err.message || 'Failed to update exam', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Add or Edit Individual Question
  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    const { type, text, options, correctAnswer, acceptedAnswersText, marks, negativeMarks, explanation } = questionModal;

    if (!text.trim()) {
      setToast({ message: 'Question text is required', type: 'error' });
      return;
    }

    let payload = {
      type,
      text: text.trim(),
      marks: Number(marks) || 1,
      negativeMarks: Number(negativeMarks) || 0,
      explanation: explanation ? explanation.trim() : ''
    };

    if (type === 'mcq') {
      const validOptions = options.map(o => o.trim()).filter(Boolean);
      if (validOptions.length < 2) {
        setToast({ message: 'At least 2 options are required for MCQ', type: 'error' });
        return;
      }
      payload.options = validOptions;
      payload.correctAnswer = correctAnswer.trim().toUpperCase();
    } else {
      payload.correctAnswer = correctAnswer.trim();
      const accepted = acceptedAnswersText.split(/[;,|]/).map(s => s.trim()).filter(Boolean);
      payload.acceptedAnswers = accepted.length > 0 ? accepted : [correctAnswer.trim()];
    }

    try {
      if (questionModal.mode === 'create') {
        await apiFetch(`/exams/${id}/questions`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setToast({ message: 'Question added successfully!', type: 'success' });
      } else {
        await apiFetch(`/exams/${id}/questions/${questionModal.questionId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        setToast({ message: 'Question updated successfully!', type: 'success' });
      }
      setQuestionModal(prev => ({ ...prev, open: false }));
      fetchExamData();
    } catch (err) {
      setToast({ message: err.message || 'Failed to save question', type: 'error' });
    }
  };

  // Delete Question
  const handleDeleteQuestion = async () => {
    try {
      await apiFetch(`/exams/${id}/questions/${deleteQModal.qId}`, { method: 'DELETE' });
      setToast({ message: 'Question removed', type: 'success' });
      setDeleteQModal({ open: false, qId: null, qText: '' });
      fetchExamData();
    } catch (err) {
      setToast({ message: err.message || 'Failed to delete question', type: 'error' });
    }
  };

  // Duplicate Question
  const handleDuplicateQuestion = async (q) => {
    try {
      const payload = {
        type: q.question_type,
        text: q.question_text + ' (Copy)',
        options: typeof q.options_json === 'string' ? JSON.parse(q.options_json) : (q.options_json || []),
        correctAnswer: q.correct_answer,
        acceptedAnswers: typeof q.accepted_answers_json === 'string' ? JSON.parse(q.accepted_answers_json) : (q.accepted_answers_json || []),
        marks: q.marks,
        negativeMarks: q.negative_marks,
        explanation: q.explanation
      };
      await apiFetch(`/exams/${id}/questions`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setToast({ message: 'Question duplicated!', type: 'success' });
      fetchExamData();
    } catch (err) {
      setToast({ message: err.message || 'Failed to duplicate question', type: 'error' });
    }
  };

  // Bulk Import Submit
  const handleBulkSubmit = async () => {
    if (!bulkModal.rawText.trim()) {
      setToast({ message: 'Please paste questions text', type: 'error' });
      return;
    }
    setBulkModal(prev => ({ ...prev, parsing: true }));
    try {
      let res;
      try {
        res = await apiFetch(`/exams/${id}/questions/bulk`, {
          method: 'POST',
          body: JSON.stringify({ rawText: bulkModal.rawText })
        });
      } catch (postErr) {
        if (postErr.status === 404) {
          res = await apiFetch(`/exams/${id}/bulk-import`, {
            method: 'POST',
            body: JSON.stringify({ rawText: bulkModal.rawText })
          });
        } else {
          throw postErr;
        }
      }
      setToast({ message: res.message || 'Bulk questions imported successfully!', type: 'success' });
      setBulkModal({ open: false, rawText: '', parsing: false, errors: [] });
      fetchExamData();
    } catch (err) {
      setToast({ message: err.message || 'Bulk import failed', type: 'error' });
      if (err.data && err.data.errors) {
        setBulkModal(prev => ({ ...prev, errors: err.data.errors, parsing: false }));
      } else {
        setBulkModal(prev => ({ ...prev, parsing: false }));
      }
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem', color: '#64748b' }}>
        Loading examination settings...
      </div>
    );
  }

  if (!exam) {
    return (
      <div style={{ maxWidth: '800px', margin: '3rem auto', textAlign: 'center' }}>
        <h2>Exam not found</h2>
        <Link to="/admin/exams" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const hasAttempts = parseInt(exam.attempt_count) > 0;
  const totalCalculatedMarks = questions.reduce((acc, q) => acc + (parseFloat(q.marks) || 0), 0);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Top Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
        <Link
          to="/admin/exams"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: '#64748b',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.9rem'
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Exam Dashboard</span>
        </Link>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link
            to={`/admin/exams/${exam.id}/results`}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}
          >
            <BarChart3 size={16} />
            <span>View Results Hub</span>
          </Link>
        </div>
      </div>

      {/* Attempts Warning Banner */}
      {hasAttempts && (
        <div style={{
          backgroundColor: '#fffbeb',
          border: '1px solid #fef3c7',
          borderRadius: '10px',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1.5rem',
          color: '#92400e',
          fontSize: '0.9rem'
        }}>
          <AlertTriangle size={20} style={{ color: '#d97706', flexShrink: 0 }} />
          <div>
            <strong>Active Student Attempts Exist:</strong> This exam currently has {exam.attempt_count} student attempt(s).
            Question modifications are restricted to preserve grading accuracy and audit history for past submissions.
          </div>
        </div>
      )}

      {/* Grid: Left Settings & Right Question Bank */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Column: Exam Configuration */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '1.75rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Exam Settings
            </h2>
            <span style={{
              padding: '0.2rem 0.6rem',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              backgroundColor: exam.status === 'published' ? '#dcfce7' : '#fef3c7',
              color: exam.status === 'published' ? '#15803d' : '#b45309'
            }}>
              {exam.status}
            </span>
          </div>

          <form onSubmit={handleUpdateExam}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.35rem' }}>
                Title
              </label>
              <input
                type="text"
                value={exam.title || ''}
                onChange={(e) => setExam({ ...exam, title: e.target.value })}
                required
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.35rem' }}>
                Subject
              </label>
              <input
                type="text"
                value={exam.subject || ''}
                onChange={(e) => setExam({ ...exam, subject: e.target.value })}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.35rem' }}>
                  Duration (mins)
                </label>
                <input
                  type="number"
                  value={exam.duration_minutes || 30}
                  onChange={(e) => setExam({ ...exam, duration_minutes: parseInt(e.target.value) })}
                  min={5}
                  max={300}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.35rem' }}>
                  Passing Marks
                </label>
                <input
                  type="number"
                  value={exam.passing_marks || 0}
                  onChange={(e) => setExam({ ...exam, passing_marks: parseFloat(e.target.value) })}
                  min={0}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.35rem' }}>
                Instructions
              </label>
              <textarea
                value={exam.instructions || ''}
                onChange={(e) => setExam({ ...exam, instructions: e.target.value })}
                rows={3}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', lineHeight: 1.4 }}
              />
            </div>

            {/* Feature Checkboxes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '0.85rem', color: '#334155' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!exam.fullscreen_required}
                  onChange={(e) => setExam({ ...exam, fullscreen_required: e.target.checked })}
                  style={{ accentColor: '#4f46e5' }}
                />
                <span>Fullscreen Enforcement</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!exam.focus_monitoring_enabled}
                  onChange={(e) => setExam({ ...exam, focus_monitoring_enabled: e.target.checked })}
                  style={{ accentColor: '#4f46e5' }}
                />
                <span>Tab-Switch & Blur Monitoring</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!exam.negative_marking_enabled}
                  onChange={(e) => setExam({ ...exam, negative_marking_enabled: e.target.checked })}
                  style={{ accentColor: '#4f46e5' }}
                />
                <span>Negative Marking</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!exam.reveal_answers_after_submission}
                  onChange={(e) => setExam({ ...exam, reveal_answers_after_submission: e.target.checked })}
                  style={{ accentColor: '#4f46e5' }}
                />
                <span>Reveal Correct Answers to Students</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
              style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '0.75rem' }}
            >
              <Save size={16} />
              <span>{saving ? 'Saving...' : 'Update Exam Settings'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Question Bank */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '1.75rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Question Bank ({questions.length})
              </h2>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Total Marks: <strong>{totalCalculatedMarks}</strong>
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setBulkModal({ open: true, rawText: '', parsing: false, errors: [] })}
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem', padding: '0.45rem 0.75rem', gap: '0.4rem' }}
              >
                <Upload size={16} />
                <span>Bulk Import</span>
              </button>
              <button
                onClick={() => setQuestionModal({
                  open: true,
                  mode: 'create',
                  questionId: null,
                  type: 'mcq',
                  text: '',
                  options: ['', '', '', ''],
                  correctAnswer: 'A',
                  acceptedAnswersText: '',
                  marks: 1,
                  negativeMarks: 0,
                  explanation: ''
                })}
                className="btn btn-primary"
                style={{ fontSize: '0.85rem', padding: '0.45rem 0.75rem', gap: '0.4rem' }}
              >
                <PlusCircle size={16} />
                <span>Add Question</span>
              </button>
            </div>
          </div>

          {/* Question List */}
          {questions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', border: '1px dashed #cbd5e1', borderRadius: '12px' }}>
              <HelpCircle size={36} style={{ color: '#94a3b8', margin: '0 auto 0.75rem auto' }} />
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 1rem 0' }}>
                No questions added to this exam yet.
              </p>
              <button
                onClick={() => setBulkModal({ open: true, rawText: '', parsing: false, errors: [] })}
                className="btn btn-primary"
                style={{ fontSize: '0.85rem' }}
              >
                Bulk Import Questions Now
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {questions.map((q, idx) => {
                const options = typeof q.options_json === 'string' ? JSON.parse(q.options_json) : (q.options_json || []);
                const isMcq = q.question_type === 'mcq';

                return (
                  <div
                    key={q.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '1rem',
                      backgroundColor: '#f8fafc',
                      transition: 'border-color 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#4f46e5' }}>
                          #{idx + 1}
                        </span>
                        <span style={{
                          backgroundColor: isMcq ? '#e0e7ff' : '#fef3c7',
                          color: isMcq ? '#3730a3' : '#b45309',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          textTransform: 'uppercase'
                        }}>
                          {isMcq ? 'MCQ' : 'Fill in Blank'}
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                          {q.marks} Marks {exam.negative_marking_enabled && `(-${q.negative_marks || 0})`}
                        </span>
                      </div>

                      {/* Question Actions */}
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          onClick={() => handleDuplicateQuestion(q)}
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          title="Duplicate Question"
                        >
                          <DuplicateIcon size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteQModal({ open: true, qId: q.id, qText: q.question_text })}
                          className="btn btn-danger"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          title="Delete Question"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>
                      {q.question_text}
                    </p>

                    {/* Options or Answer */}
                    {isMcq ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.35rem', fontSize: '0.8rem' }}>
                        {options.map((opt, optIdx) => {
                          const letter = String.fromCharCode(65 + optIdx);
                          const isCorrect = (q.correct_answer || '').toUpperCase() === letter;
                          return (
                            <div
                              key={optIdx}
                              style={{
                                padding: '0.3rem 0.5rem',
                                borderRadius: '6px',
                                backgroundColor: isCorrect ? '#ecfdf5' : '#ffffff',
                                border: isCorrect ? '1px solid #10b981' : '1px solid #e2e8f0',
                                color: isCorrect ? '#065f46' : '#475569',
                                fontWeight: isCorrect ? 700 : 500
                              }}
                            >
                              <strong>{letter}.</strong> {opt} {isCorrect && '✓ (Key)'}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: '#065f46', backgroundColor: '#ecfdf5', padding: '0.35rem 0.65rem', borderRadius: '6px', display: 'inline-block' }}>
                        Accepted Answer: <strong>{q.correct_answer}</strong>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Question Modal */}
      <Modal
        isOpen={questionModal.open}
        onClose={() => setQuestionModal(prev => ({ ...prev, open: false }))}
        title={questionModal.mode === 'create' ? 'Add Question' : 'Edit Question'}
      >
        <form onSubmit={handleSaveQuestion}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
              Question Type
            </label>
            <select
              value={questionModal.type}
              onChange={(e) => setQuestionModal({ ...questionModal, type: e.target.value })}
              style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            >
              <option value="mcq">Single Correct Multiple Choice (MCQ)</option>
              <option value="fill_blank">Fill in the Blank</option>
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
              Question Text
            </label>
            <textarea
              value={questionModal.text}
              onChange={(e) => setQuestionModal({ ...questionModal, text: e.target.value })}
              required
              rows={3}
              placeholder="Enter question text..."
              style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
            />
          </div>

          {questionModal.type === 'mcq' ? (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                Options (A, B, C, D)
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {questionModal.options.map((opt, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 700, width: '20px' }}>{String.fromCharCode(65 + i)}.</span>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...questionModal.options];
                        newOpts[i] = e.target.value;
                        setQuestionModal({ ...questionModal, options: newOpts });
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + i)} text`}
                      style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '0.75rem' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                  Correct Answer Option
                </label>
                <select
                  value={questionModal.correctAnswer}
                  onChange={(e) => setQuestionModal({ ...questionModal, correctAnswer: e.target.value })}
                  style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  {['A', 'B', 'C', 'D'].map(l => (
                    <option key={l} value={l}>Option {l}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                Primary Accepted Answer
              </label>
              <input
                type="text"
                value={questionModal.correctAnswer}
                onChange={(e) => setQuestionModal({ ...questionModal, correctAnswer: e.target.value })}
                required
                placeholder="e.g. printf"
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '0.5rem' }}
              />
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                Alternative Accepted Answers (semicolon separated)
              </label>
              <input
                type="text"
                value={questionModal.acceptedAnswersText}
                onChange={(e) => setQuestionModal({ ...questionModal, acceptedAnswersText: e.target.value })}
                placeholder="e.g. printf; PRINTF; printf()"
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                Marks
              </label>
              <input
                type="number"
                value={questionModal.marks}
                onChange={(e) => setQuestionModal({ ...questionModal, marks: e.target.value })}
                min={0.5}
                step={0.5}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                Negative Marks
              </label>
              <input
                type="number"
                value={questionModal.negativeMarks}
                onChange={(e) => setQuestionModal({ ...questionModal, negativeMarks: e.target.value })}
                min={0}
                step={0.25}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setQuestionModal(prev => ({ ...prev, open: false }))}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Question
            </button>
          </div>
        </form>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal
        isOpen={bulkModal.open}
        onClose={() => setBulkModal({ open: false, rawText: '', parsing: false, errors: [] })}
        title="Bulk Question Importer"
      >
        <div>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 0.75rem 0' }}>
            Paste MCQs and fill-in-the-blank questions in Tagged (TYPE: MCQ...) or Numbered (1. Which loop...) format.
          </p>

          <textarea
            value={bulkModal.rawText}
            onChange={(e) => setBulkModal({ ...bulkModal, rawText: e.target.value })}
            rows={10}
            placeholder="Paste multiple questions here..."
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              marginBottom: '1rem'
            }}
          />

          {bulkModal.errors.length > 0 && (
            <div style={{ backgroundColor: '#fef2f2', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem' }}>
              <div style={{ color: '#dc2626', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                Import Validation Errors:
              </div>
              <ul style={{ margin: 0, paddingLeft: '1rem', color: '#991b1b', fontSize: '0.8rem' }}>
                {bulkModal.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setBulkModal({ open: false, rawText: '', parsing: false, errors: [] })}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBulkSubmit}
              disabled={bulkModal.parsing || !bulkModal.rawText.trim()}
              className="btn btn-primary"
            >
              {bulkModal.parsing ? 'Importing...' : 'Parse & Import Questions'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Question Confirmation */}
      <Modal
        isOpen={deleteQModal.open}
        onClose={() => setDeleteQModal({ open: false, qId: null, qText: '' })}
        title="Delete Question"
      >
        <div>
          <p style={{ color: '#334155' }}>
            Are you sure you want to remove this question?
          </p>
          <p style={{ fontStyle: 'italic', color: '#64748b', fontSize: '0.9rem' }}>
            "{deleteQModal.qText}"
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
            <button
              onClick={() => setDeleteQModal({ open: false, qId: null, qText: '' })}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button onClick={handleDeleteQuestion} className="btn btn-danger">
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
