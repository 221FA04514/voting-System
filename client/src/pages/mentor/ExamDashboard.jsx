import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import StatCard from '../../components/StatCard';
import Toast from '../../components/Toast';
import Modal from '../../components/Modal';
import { 
  FileText, 
  PlusCircle, 
  CheckCircle, 
  Clock, 
  Users, 
  Award, 
  Copy, 
  Check, 
  Play, 
  Square, 
  BarChart3, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  Search,
  Filter,
  AlertCircle,
  HelpCircle,
  Sparkles
} from 'lucide-react';

export default function ExamDashboard() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [copiedId, setCopiedId] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, examId: null, title: '' });

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const data = await apiFetch('/exams');
      setExams(data.exams || []);
    } catch (err) {
      setToast({ message: err.message || 'Failed to load exams', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePublishToggle = async (exam) => {
    try {
      if (exam.status === 'draft') {
        await apiFetch(`/exams/${exam.id}/publish`, { method: 'POST' });
        setToast({ message: `"${exam.title}" has been published!`, type: 'success' });
      } else if (exam.status === 'published') {
        await apiFetch(`/exams/${exam.id}/close`, { method: 'POST' });
        setToast({ message: `"${exam.title}" has been closed.`, type: 'info' });
      }
      fetchExams();
    } catch (err) {
      setToast({ message: err.message || 'Failed to update exam status', type: 'error' });
    }
  };

  const handleDelete = async () => {
    try {
      await apiFetch(`/exams/${deleteModal.examId}`, { method: 'DELETE' });
      setToast({ message: 'Exam deleted successfully', type: 'success' });
      setDeleteModal({ open: false, examId: null, title: '' });
      fetchExams();
    } catch (err) {
      setToast({ message: err.message || 'Failed to delete exam', type: 'error' });
    }
  };

  const copyStudentLink = (publicId) => {
    const url = `${window.location.origin}/exam/${publicId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(publicId);
    setToast({ message: 'Student exam URL copied to clipboard!', type: 'success' });
    setTimeout(() => setCopiedId(null), 3000);
  };

  // Stats calculation
  const totalExams = exams.length;
  const publishedExams = exams.filter(e => e.status === 'published').length;
  const draftExams = exams.filter(e => e.status === 'draft').length;
  const closedExams = exams.filter(e => e.status === 'closed').length;
  const totalQuestions = exams.reduce((acc, e) => acc + (parseInt(e.question_count) || 0), 0);
  const totalAttempts = exams.reduce((acc, e) => acc + (parseInt(e.attempt_count) || 0), 0);

  // Filtered exams
  const filteredExams = exams.filter(exam => {
    const matchesSearch = 
      exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exam.subject && exam.subject.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || exam.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header Banner */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '2rem',
        padding: '1.75rem 2rem',
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
        borderRadius: '16px',
        color: '#ffffff',
        boxShadow: '0 10px 25px -5px rgba(67, 56, 202, 0.3)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span style={{ 
              background: 'rgba(255, 255, 255, 0.15)', 
              padding: '0.2rem 0.6rem', 
              borderRadius: '20px', 
              fontSize: '0.75rem', 
              fontWeight: 700, 
              letterSpacing: '0.05em',
              textTransform: 'uppercase'
            }}>
              VIGNAN C-CODE ARENA
            </span>
            <span style={{ 
              background: '#10b981', 
              color: '#ffffff',
              padding: '0.15rem 0.5rem', 
              borderRadius: '12px', 
              fontSize: '0.7rem', 
              fontWeight: 800 
            }}>
              EXAM ARENA
            </span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            Admin Examination Hub
          </h1>
          <p style={{ margin: '0.35rem 0 0 0', opacity: 0.85, fontSize: '0.95rem' }}>
            Create secure online C programming exams, bulk-import MCQs & fill-in questions, share student links, and monitor live submissions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link
            to="/admin/exams/create"
            className="btn"
            style={{
              backgroundColor: '#10b981',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 700,
              padding: '0.75rem 1.25rem',
              borderRadius: '10px',
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
            }}
          >
            <PlusCircle size={20} />
            <span>Create New Exam</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <StatCard title="Total Exams" value={totalExams} icon={FileText} color="indigo" />
        <StatCard title="Published / Active" value={publishedExams} icon={CheckCircle} color="emerald" />
        <StatCard title="Drafts" value={draftExams} icon={Clock} color="amber" />
        <StatCard title="Total Questions" value={totalQuestions} icon={HelpCircle} color="blue" />
        <StatCard title="Student Attempts" value={totalAttempts} icon={Users} color="purple" />
      </div>

      {/* Search and Filters Bar */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '1rem 1.25rem',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        marginBottom: '1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search exams by title or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 1rem 0.65rem 2.4rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              outline: 'none'
            }}
          />
        </div>

        {/* Status Filters */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['all', 'published', 'draft', 'closed'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              style={{
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: statusFilter === status ? '#4f46e5' : '#e2e8f0',
                backgroundColor: statusFilter === status ? '#4f46e5' : '#ffffff',
                color: statusFilter === status ? '#ffffff' : '#64748b',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Exam List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
          Loading examinations...
        </div>
      ) : filteredExams.length === 0 ? (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px dashed #cbd5e1',
          padding: '4rem 2rem',
          textAlign: 'center'
        }}>
          <FileText size={48} style={{ color: '#94a3b8', margin: '0 auto 1rem auto' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
            No examinations found
          </h3>
          <p style={{ color: '#64748b', maxWidth: '450px', margin: '0 auto 1.5rem auto', fontSize: '0.95rem' }}>
            {searchQuery ? 'No exams matched your search query.' : 'Get started by creating your first online examination with MCQs and fill-in-the-blank questions.'}
          </p>
          <Link
            to="/admin/exams/create"
            className="btn btn-primary"
            style={{ textDecoration: 'none' }}
          >
            Create Your First Exam
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredExams.map(exam => {
            const isPublished = exam.status === 'published';
            const isDraft = exam.status === 'draft';
            const isClosed = exam.status === 'closed';

            return (
              <div
                key={exam.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  padding: '1.5rem',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1.25rem',
                  transition: 'box-shadow 0.2s, border-color 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                {/* Left: Info */}
                <div style={{ flex: '1', minWidth: '300px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                      {exam.title}
                    </h3>
                    <span style={{
                      padding: '0.2rem 0.6rem',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      backgroundColor: isPublished ? '#dcfce7' : isDraft ? '#fef3c7' : '#f1f5f9',
                      color: isPublished ? '#15803d' : isDraft ? '#b45309' : '#475569'
                    }}>
                      {exam.status}
                    </span>
                    {exam.subject && (
                      <span style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: '#e0e7ff',
                        color: '#3730a3'
                      }}>
                        {exam.subject}
                      </span>
                    )}
                  </div>

                  {exam.description && (
                    <p style={{ margin: '0 0 0.75rem 0', color: '#64748b', fontSize: '0.9rem', lineHeight: 1.4 }}>
                      {exam.description}
                    </p>
                  )}

                  {/* Badges / Metrics */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.85rem', color: '#64748b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <HelpCircle size={15} style={{ color: '#4f46e5' }} />
                      <span><strong>{exam.question_count || 0}</strong> Questions</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Award size={15} style={{ color: '#10b981' }} />
                      <span><strong>{exam.total_marks || 0}</strong> Max Marks</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock size={15} style={{ color: '#f59e0b' }} />
                      <span><strong>{exam.duration_minutes}</strong> mins</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Users size={15} style={{ color: '#8b5cf6' }} />
                      <span><strong>{exam.attempt_count || 0}</strong> Completed Attempts</span>
                    </div>
                    {exam.negative_marking_enabled && (
                      <span style={{ color: '#dc2626', fontWeight: 600, fontSize: '0.8rem' }}>
                        • Negative Marking
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.6rem' }}>
                  {/* Share Link button (if published) */}
                  {isPublished && (
                    <button
                      onClick={() => copyStudentLink(exam.public_id)}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.85rem', padding: '0.5rem 0.85rem', gap: '0.4rem' }}
                      title="Copy Student Exam URL"
                    >
                      {copiedId === exam.public_id ? <Check size={16} style={{ color: '#10b981' }} /> : <Copy size={16} />}
                      <span>{copiedId === exam.public_id ? 'Link Copied!' : 'Copy Link'}</span>
                    </button>
                  )}

                  {/* Publish / Close toggle button */}
                  <button
                    onClick={() => handlePublishToggle(exam)}
                    className="btn"
                    style={{
                      fontSize: '0.85rem',
                      padding: '0.5rem 0.85rem',
                      gap: '0.4rem',
                      backgroundColor: isPublished ? '#fff1f2' : isDraft ? '#f0fdf4' : '#f8fafc',
                      color: isPublished ? '#e11d48' : isDraft ? '#16a34a' : '#64748b',
                      border: '1px solid',
                      borderColor: isPublished ? '#fecdd3' : isDraft ? '#bbf7d0' : '#e2e8f0'
                    }}
                  >
                    {isPublished ? <Square size={16} /> : <Play size={16} />}
                    <span>{isPublished ? 'Close Exam' : isDraft ? 'Publish Exam' : 'Reopen Exam'}</span>
                  </button>

                  {/* Manage / Edit Questions */}
                  <Link
                    to={`/admin/exams/${exam.id}`}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.85rem', padding: '0.5rem 0.85rem', gap: '0.4rem', textDecoration: 'none' }}
                  >
                    <Edit3 size={16} />
                    <span>Manage</span>
                  </Link>

                  {/* View Results / Analytics */}
                  <Link
                    to={`/admin/exams/${exam.id}/results`}
                    className="btn btn-primary"
                    style={{ fontSize: '0.85rem', padding: '0.5rem 0.85rem', gap: '0.4rem', textDecoration: 'none' }}
                  >
                    <BarChart3 size={16} />
                    <span>Results</span>
                  </Link>

                  {/* Delete Button */}
                  <button
                    onClick={() => setDeleteModal({ open: true, examId: exam.id, title: exam.title })}
                    className="btn btn-danger"
                    style={{ padding: '0.5rem 0.65rem' }}
                    title="Delete Exam"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, examId: null, title: '' })}
        title="Delete Examination"
      >
        <div style={{ color: '#334155', lineHeight: 1.5 }}>
          <p>
            Are you sure you want to permanently delete <strong>{deleteModal.title}</strong>?
          </p>
          <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>
            Warning: This action will permanently remove all questions, student responses, and scored attempts associated with this exam. This cannot be undone.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              onClick={() => setDeleteModal({ open: false, examId: null, title: '' })}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button onClick={handleDelete} className="btn btn-danger">
              Yes, Delete Permanently
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
