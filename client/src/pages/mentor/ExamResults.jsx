import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import Toast from '../../components/Toast';
import Modal from '../../components/Modal';
import { 
  ArrowLeft, 
  Download, 
  Users, 
  Award, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Search, 
  Filter, 
  HelpCircle, 
  Eye, 
  Maximize2, 
  BarChart3,
  TrendingUp,
  Percent,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';

export default function ExamResults() {
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('score_desc');

  // Individual Attempt Review Modal
  const [selectedAttemptId, setSelectedAttemptId] = useState(null);
  const [attemptDetail, setAttemptDetail] = useState(null);
  const [loadingAttempt, setLoadingAttempt] = useState(false);

  useEffect(() => {
    fetchResults();
  }, [id]);

  const fetchResults = async () => {
    try {
      const res = await apiFetch(`/exams/${id}/results`);
      setData(res);
    } catch (err) {
      setToast({ message: err.message || 'Failed to load exam results', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    const token = localStorage.getItem('mentorToken');
    // Trigger download with auth token header or direct window
    const exportUrl = `/api/exams/${id}/export-csv`;
    fetch(exportUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Export failed');
        return res.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `exam_${data?.exam?.title || id}_results.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setToast({ message: 'CSV export downloaded successfully!', type: 'success' });
      })
      .catch(err => {
        setToast({ message: 'Failed to export CSV: ' + err.message, type: 'error' });
      });
  };

  const openAttemptModal = async (attemptId) => {
    setSelectedAttemptId(attemptId);
    setLoadingAttempt(true);
    try {
      const res = await apiFetch(`/exams/${id}/attempts/${attemptId}`);
      setAttemptDetail(res);
    } catch (err) {
      setToast({ message: err.message || 'Failed to load student attempt details', type: 'error' });
    } finally {
      setLoadingAttempt(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem', color: '#64748b' }}>
        Loading examination analytics & student results...
      </div>
    );
  }

  if (!data || !data.exam) {
    return (
      <div style={{ maxWidth: '800px', margin: '3rem auto', textAlign: 'center' }}>
        <h2>Exam not found</h2>
        <Link to="/admin/exams" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const { exam, summary, attempts = [], questions = [] } = data;

  // Dynamically extract all available sections from attempts, plus known default sections
  const availableSections = Array.from(
    new Set([
      'sec-9',
      'sec-25',
      'sec-53',
      ...attempts.map(att => att.section).filter(Boolean)
    ])
  ).sort();

  // Filter & Sort Attempts
  const filteredAttempts = attempts.filter(att => {
    const matchesSearch = 
      (att.student_name && att.student_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (att.registration_number && att.registration_number.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSection = sectionFilter === 'all' || 
      (att.section && att.section.trim().toLowerCase() === sectionFilter.trim().toLowerCase());
    const matchesStatus = statusFilter === 'all' || att.attempt_status === statusFilter;
    return matchesSearch && matchesSection && matchesStatus;
  }).sort((a, b) => {
    if (sortBy === 'score_desc') return (Number(b.score) || 0) - (Number(a.score) || 0);
    if (sortBy === 'score_asc') return (Number(a.score) || 0) - (Number(b.score) || 0);
    if (sortBy === 'time_asc') return (Number(a.time_taken_seconds) || 0) - (Number(b.time_taken_seconds) || 0);
    if (sortBy === 'time_desc') return (Number(b.time_taken_seconds) || 0) - (Number(a.time_taken_seconds) || 0);
    if (sortBy === 'date_desc') return new Date(b.started_at) - new Date(a.started_at);
    return 0;
  });

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Top Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <Link
            to="/admin/exams"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: '#64748b',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              marginBottom: '0.5rem'
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Exam Dashboard</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {exam.title} — Analytics & Results
            </h1>
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
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={fetchResults}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="btn"
            style={{
              backgroundColor: '#059669',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 700,
              padding: '0.65rem 1.15rem',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)'
            }}
          >
            <FileSpreadsheet size={18} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary Analytics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
            <Users size={16} style={{ color: '#4f46e5' }} />
            <span>Total Attempts</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', marginTop: '0.35rem' }}>
            {summary?.totalAttempts || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, marginTop: '0.2rem' }}>
            {summary?.completedAttempts || 0} Completed ({summary?.autoSubmittedAttempts || 0} Auto)
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
            <TrendingUp size={16} style={{ color: '#10b981' }} />
            <span>Average Score</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', marginTop: '0.35rem' }}>
            {summary?.averageScore || 0} <span style={{ fontSize: '1rem', color: '#64748b' }}>/ {summary?.maximumPossibleMarks || 0}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
            Avg Percentage: <strong>{summary?.averagePercentage || 0}%</strong>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
            <Award size={16} style={{ color: '#f59e0b' }} />
            <span>Score Range</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', marginTop: '0.35rem' }}>
            {summary?.highestScore || 0} <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>High</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
            Lowest: <strong>{summary?.lowestScore || 0}</strong>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
            <Percent size={16} style={{ color: '#8b5cf6' }} />
            <span>Pass Rate</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#8b5cf6', marginTop: '0.35rem' }}>
            {summary?.passPercentage || 0}%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
            {summary?.passedCount || 0} Passed, {summary?.failedCount || 0} Failed
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
            <Clock size={16} style={{ color: '#0ea5e9' }} />
            <span>Avg Completion Time</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0ea5e9', marginTop: '0.35rem' }}>
            {Math.floor((summary?.averageTimeSeconds || 0) / 60)}m {(summary?.averageTimeSeconds || 0) % 60}s
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
            Configured: {exam.duration_minutes}m limit
          </div>
        </div>
      </div>

      {/* Question-wise Accuracy Section */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '1.5rem',
        marginBottom: '2rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <BarChart3 size={20} style={{ color: '#4f46e5' }} />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Question-wise Accuracy & Performance
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          {questions.map((q, idx) => {
            const pct = q.accuracy_percentage || 0;
            const barColor = pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444';

            return (
              <div
                key={q.id}
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#4f46e5' }}>
                    Q{idx + 1} ({q.question_type === 'mcq' ? 'MCQ' : 'Fill-in'})
                  </span>
                  <span style={{ fontWeight: 800, fontSize: '0.85rem', color: barColor }}>
                    {pct}% Correct
                  </span>
                </div>

                <p style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#334155',
                  margin: '0 0 0.65rem 0',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {q.question_text}
                </p>

                {/* Progress bar */}
                <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                  <div style={{ height: '100%', width: `${pct}%`, backgroundColor: barColor, borderRadius: '3px' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
                  <span>✓ {q.correct_answers_count || 0} Correct</span>
                  <span>✗ {q.incorrect_answers_count || 0} Wrong</span>
                  <span>- {q.unanswered_count || 0} Skipped</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Student Results Table Header & Search/Filters */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Student Submissions ({filteredAttempts.length})
            </h2>
            <p style={{ margin: '0.2rem 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
              Enforced backend invariant: exactly 1 attempt per registration number.
            </p>
          </div>

          {/* Search & Filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search Reg No or Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem 0.5rem 2rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  width: '210px'
                }}
              />
            </div>

            {/* Section Filter */}
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="all">All Sections</option>
              {availableSections.map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="auto_submitted">Auto Submitted</option>
              <option value="in_progress">In Progress</option>
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="score_desc">Highest Score First</option>
              <option value="score_asc">Lowest Score First</option>
              <option value="time_asc">Fastest Time First</option>
              <option value="time_desc">Slowest Time First</option>
              <option value="date_desc">Latest Submission</option>
            </select>
          </div>
        </div>

        {/* Results Table */}
        {filteredAttempts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
            No student attempts match the selected criteria.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Student</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Reg No</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Section</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Score</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Percentage</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Correct / Wrong</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Time Taken</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Tab / Exit</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttempts.map((att) => {
                  const isPass = parseFloat(att.score) >= (exam.passing_marks || 0);
                  const isSubmitted = att.attempt_status === 'submitted' || att.attempt_status === 'auto_submitted';

                  return (
                    <tr
                      key={att.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s'
                      }}
                    >
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#1e293b' }}>
                        {att.student_name || 'Anonymous Student'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: '#4f46e5' }}>
                        {att.registration_number}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#1e293b', fontWeight: 600 }}>
                        {att.section || 'N/A'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: '12px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          backgroundColor: att.attempt_status === 'submitted' ? '#dcfce7' : att.attempt_status === 'auto_submitted' ? '#fed7aa' : '#e0e7ff',
                          color: att.attempt_status === 'submitted' ? '#15803d' : att.attempt_status === 'auto_submitted' ? '#c2410c' : '#3730a3'
                        }}>
                          {att.attempt_status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.95rem', color: isPass ? '#10b981' : '#ef4444' }}>
                        {att.score} <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>/ {att.maximum_marks}</span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>
                        {Number(att.percentage) > 0 
                          ? Number(att.percentage).toFixed(2) + '%' 
                          : (Number(att.maximum_marks) > 0 ? ((Number(att.score) / Number(att.maximum_marks)) * 100).toFixed(2) + '%' : '0.00%')}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                        <span style={{ color: '#10b981', fontWeight: 700 }}>{att.correct_count}</span> / <span style={{ color: '#ef4444', fontWeight: 700 }}>{att.incorrect_count}</span> <span style={{ color: '#94a3b8' }}>({att.unanswered_count} skipped)</span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                        {att.time_taken_seconds ? `${Math.floor(att.time_taken_seconds / 60)}m ${att.time_taken_seconds % 60}s` : '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {(att.focus_loss_count > 0 || att.fullscreen_exit_count > 0) ? (
                          <span style={{ color: '#dc2626', fontWeight: 700 }}>
                            {att.focus_loss_count || 0} blur / {att.fullscreen_exit_count || 0} exit
                          </span>
                        ) : (
                          <span style={{ color: '#10b981' }}>Clean (0)</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <button
                          onClick={() => openAttemptModal(att.id)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', gap: '0.3rem' }}
                        >
                          <Eye size={14} />
                          <span>Review</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Individual Attempt Review Modal */}
      <Modal
        isOpen={!!selectedAttemptId}
        onClose={() => { setSelectedAttemptId(null); setAttemptDetail(null); }}
        title="Student Examination Review & Audit"
      >
        {loadingAttempt || !attemptDetail ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            Loading attempt answers and security log...
          </div>
        ) : (
          <div>
            {/* Student Info Card */}
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '1rem',
              marginBottom: '1.25rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.75rem',
              fontSize: '0.85rem'
            }}>
              <div>
                <span style={{ color: '#64748b' }}>Student Name:</span>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{attemptDetail.attempt.student_name || 'N/A'}</div>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Registration Number:</span>
                <div style={{ fontWeight: 800, color: '#4f46e5', fontFamily: 'monospace' }}>{attemptDetail.attempt.registration_number}</div>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Section:</span>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{attemptDetail.attempt.section || 'General'}</div>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Score Awarded:</span>
                <div style={{ fontWeight: 800, color: '#10b981', fontSize: '1rem' }}>
                  {attemptDetail.attempt.score} / {attemptDetail.attempt.maximum_marks} ({attemptDetail.attempt.percentage}%)
                </div>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Time Taken:</span>
                <div style={{ fontWeight: 700, color: '#334155' }}>
                  {Math.floor(attemptDetail.attempt.time_taken_seconds / 60)}m {attemptDetail.attempt.time_taken_seconds % 60}s
                </div>
              </div>
            </div>

            {/* Security Events Callout if any */}
            {attemptDetail.securityEvents && attemptDetail.securityEvents.length > 0 && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecdd3',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#dc2626', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                  <AlertTriangle size={16} />
                  <span>Monitored Security Events ({attemptDetail.securityEvents.length})</span>
                </div>
                <div style={{ maxHeight: '100px', overflowY: 'auto', fontSize: '0.8rem', color: '#991b1b' }}>
                  {attemptDetail.securityEvents.map((ev, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0' }}>
                      <span>• {ev.event_type}</span>
                      <span>{new Date(ev.occurred_at).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Question Breakdown List */}
            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.75rem 0' }}>
              Question-by-Question Response Audit
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '420px', overflowY: 'auto' }}>
              {attemptDetail.questions.map((q, idx) => {
                const isCorrect = q.evaluation_status === 'correct';
                const isIncorrect = q.evaluation_status === 'incorrect';
                const isUnanswered = q.evaluation_status === 'unanswered' || !q.evaluation_status;

                return (
                  <div
                    key={q.id}
                    style={{
                      border: '1px solid',
                      borderColor: isCorrect ? '#bbf7d0' : isIncorrect ? '#fecdd3' : '#e2e8f0',
                      borderRadius: '8px',
                      padding: '0.85rem 1rem',
                      backgroundColor: isCorrect ? '#f0fdf4' : isIncorrect ? '#fff1f2' : '#f8fafc'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b' }}>
                        Q{idx + 1}. ({q.question_type === 'mcq' ? 'MCQ' : 'Fill-in'})
                      </span>
                      <span style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '12px',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        backgroundColor: isCorrect ? '#dcfce7' : isIncorrect ? '#fee2e2' : '#f1f5f9',
                        color: isCorrect ? '#15803d' : isIncorrect ? '#dc2626' : '#64748b'
                      }}>
                        {isCorrect ? `+${q.marks_awarded} Marks (Correct)` : isIncorrect ? `${q.marks_awarded} Marks (Incorrect)` : '0 Marks (Unanswered)'}
                      </span>
                    </div>

                    <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>
                      {q.question_text}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                      <div style={{ padding: '0.4rem', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', fontWeight: 700 }}>STUDENT RESPONSE:</span>
                        <strong style={{ color: isCorrect ? '#10b981' : isIncorrect ? '#ef4444' : '#94a3b8' }}>
                          {q.question_type === 'mcq' ? (q.student_selected_option || 'None selected') : (q.student_text_response || 'Blank')}
                        </strong>
                      </div>

                      <div style={{ padding: '0.4rem', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', fontWeight: 700 }}>CORRECT ANSWER KEY:</span>
                        <strong style={{ color: '#10b981' }}>
                          {q.correct_answer}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button
                onClick={() => { setSelectedAttemptId(null); setAttemptDetail(null); }}
                className="btn btn-primary"
              >
                Close Audit
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
