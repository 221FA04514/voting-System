import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import StatCard from '../../components/StatCard';
import Toast from '../../components/Toast';
import Modal from '../../components/Modal';
import { 
  PlusCircle, 
  Layers, 
  CheckCircle, 
  Users, 
  Vote, 
  Copy, 
  Check, 
  Play, 
  Square, 
  BarChart3, 
  Trash2, 
  Copy as DuplicateIcon, 
  ExternalLink, 
  Search,
  Eye,
  Gamepad2,
  Share2
} from 'lucide-react';

export default function Dashboard() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedSlug, setCopiedSlug] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, sessionId: null, title: '' });

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const data = await apiFetch('/sessions');
      setSessions(data.sessions || []);
    } catch (err) {
      setToast({ message: err.message || 'Failed to load sessions', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (sessionId, newStatus) => {
    try {
      await apiFetch(`/sessions/${sessionId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      setToast({ message: `Session status changed to ${newStatus.toUpperCase()}`, type: 'success' });
      fetchSessions();
    } catch (err) {
      setToast({ message: err.message || 'Failed to update session status', type: 'error' });
    }
  };

  const handleDuplicate = async (sessionId) => {
    try {
      const data = await apiFetch(`/sessions/${sessionId}/duplicate`, {
        method: 'POST'
      });
      setToast({ message: 'Session duplicated successfully!', type: 'success' });
      fetchSessions();
    } catch (err) {
      setToast({ message: err.message || 'Failed to duplicate session', type: 'error' });
    }
  };

  const confirmDeleteSession = async () => {
    if (!deleteModal.sessionId) return;
    try {
      await apiFetch(`/sessions/${deleteModal.sessionId}`, {
        method: 'DELETE'
      });
      setToast({ message: 'Session deleted successfully', type: 'success' });
      setDeleteModal({ open: false, sessionId: null, title: '' });
      fetchSessions();
    } catch (err) {
      setToast({ message: err.message || 'Failed to delete session', type: 'error' });
    }
  };

  const copyVotingLink = (slug) => {
    const votingUrl = `${window.location.origin}/vote/${slug}`;
    navigator.clipboard.writeText(votingUrl);
    setCopiedSlug(slug);
    setToast({ message: 'Voting link copied to clipboard!', type: 'success' });
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  const copyGameLink = () => {
    const gameUrl = `${window.location.origin}/game/number-guessing`;
    navigator.clipboard.writeText(gameUrl);
    setToast({ message: 'Number Guessing Game link copied to clipboard!', type: 'success' });
  };

  // Metrics
  const activeSessionsCount = sessions.filter(s => s.status === 'open').length;
  const closedSessionsCount = sessions.filter(s => s.status === 'closed').length;
  const totalEligible = sessions.reduce((acc, s) => acc + (s.eligible_count || 0), 0);
  const totalVotesCast = sessions.reduce((acc, s) => acc + (s.total_votes_cast || 0), 0);

  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.section && s.section.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>Mentor Dashboard</h1>
          <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '0.25rem' }}>
            Manage student voting sessions, images, eligibility, and view live results
          </p>
        </div>
        <Link to="/mentor/create-session" className="btn btn-primary" style={{ padding: '0.75rem 1.25rem' }}>
          <PlusCircle size={20} />
          <span>Create New Session</span>
        </Link>
      </div>

      {/* Overview Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <StatCard title="Active Sessions" value={activeSessionsCount} subtitle="Currently accepting votes" icon={Layers} color="#10b981" />
        <StatCard title="Closed Sessions" value={closedSessionsCount} subtitle="Completed voting rounds" icon={CheckCircle} color="#64748b" />
        <StatCard title="Total Students" value={totalEligible} subtitle="Eligible across sessions" icon={Users} color="#4f46e5" />
        <StatCard title="Total Votes Cast" value={totalVotesCast} subtitle="Submitted image votes" icon={Vote} color="#f59e0b" />
      </div>

      {/* Student Activity & Game Share Section */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '2.5rem', background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '280px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}>
            <Gamepad2 size={26} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              Student Activity: 1–100 Number Guessing Game
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>
              Interactive icebreaker game for students. Share the link anytime without database setup!
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={copyGameLink} className="btn btn-secondary" style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', gap: '0.4rem' }}>
            <Share2 size={16} />
            <span>Copy Game Link</span>
          </button>
          <a href={`${window.location.origin}/game/number-guessing`} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', gap: '0.4rem', background: '#ffffff' }}>
            <ExternalLink size={16} />
            <span>Preview Game</span>
          </a>
        </div>
      </div>

      {/* Session Filter Bar */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '240px' }}>
          <Search size={18} style={{ color: '#94a3b8' }} />
          <input
            type="text"
            className="form-input"
            style={{ border: 'none', padding: '0.35rem', fontSize: '0.95rem' }}
            placeholder="Search sessions by title or section..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
          Showing {filteredSessions.length} of {sessions.length} sessions
        </span>
      </div>

      {/* Session Cards Grid */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#64748b' }}>Loading voting sessions...</p>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#f1f5f9', color: '#94a3b8', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <Layers size={32} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>No Voting Sessions Found</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '400px', margin: '0.5rem auto 1.5rem' }}>
            {searchQuery ? 'No sessions match your search criteria.' : 'Get started by creating your first creative image voting session for your students.'}
          </p>
          {!searchQuery && (
            <Link to="/mentor/create-session" className="btn btn-primary">
              <PlusCircle size={18} />
              <span>Create First Session</span>
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {filteredSessions.map((session) => (
            <div key={session.id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {session.section || 'General Section'}
                    </span>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.3, marginTop: '2px' }}>
                      {session.title}
                    </h3>
                  </div>
                  <span className={`badge badge-${session.status}`}>
                    {session.status}
                  </span>
                </div>

                {session.description && (
                  <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {session.description}
                  </p>
                )}

                {/* Metrics Pill Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '10px', marginBottom: '1.25rem', textAlign: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', fontWeight: 600 }}>Students</span>
                    <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{session.eligible_count || 0}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', fontWeight: 600 }}>Images</span>
                    <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{session.image_count || 0}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', fontWeight: 600 }}>Voted</span>
                    <strong style={{ fontSize: '1rem', color: '#10b981' }}>{session.voted_students_count || 0}</strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link to={`/mentor/session/${session.id}/results`} className="btn btn-primary" style={{ flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>
                    <BarChart3 size={16} />
                    <span>View Results</span>
                  </Link>
                  <button
                    onClick={() => copyVotingLink(session.slug)}
                    className="btn btn-secondary"
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                    title="Copy Shareable Voting Link"
                  >
                    {copiedSlug === session.slug ? <Check size={16} style={{ color: '#10b981' }} /> : <Copy size={16} />}
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Link to={`/mentor/session/${session.id}`} className="btn btn-secondary" style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}>
                    <Eye size={14} />
                    <span>Manage</span>
                  </Link>

                  {session.status === 'draft' && (
                    <button
                      onClick={() => handleStatusChange(session.id, 'open')}
                      className="btn btn-success"
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                    >
                      <Play size={14} />
                      <span>Publish / Open</span>
                    </button>
                  )}

                  {session.status === 'open' && (
                    <button
                      onClick={() => handleStatusChange(session.id, 'closed')}
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', color: '#b45309' }}
                    >
                      <Square size={14} />
                      <span>Close</span>
                    </button>
                  )}

                  {session.status === 'closed' && (
                    <button
                      onClick={() => handleStatusChange(session.id, 'open')}
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                    >
                      <Play size={14} />
                      <span>Reopen</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleDuplicate(session.id)}
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                    title="Duplicate Session"
                  >
                    <DuplicateIcon size={14} />
                  </button>

                  <button
                    onClick={() => setDeleteModal({ open: true, sessionId: session.id, title: session.title })}
                    className="btn btn-danger"
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                    title="Delete Session"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, sessionId: null, title: '' })}
        title="Confirm Session Deletion"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setDeleteModal({ open: false, sessionId: null, title: '' })}>
              Cancel
            </button>
            <button className="btn btn-danger" onClick={confirmDeleteSession}>
              Yes, Delete Session
            </button>
          </>
        }
      >
        <p style={{ color: '#0f172a', fontSize: '0.95rem' }}>
          Are you sure you want to delete session <strong>"{deleteModal.title}"</strong>?
        </p>
        <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.5rem' }}>
          ⚠️ This will permanently delete all associated student image uploads, eligibility records, and vote responses. This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
