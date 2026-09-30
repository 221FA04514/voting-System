import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import StatCard from '../../components/StatCard';
import Toast from '../../components/Toast';
import confetti from 'canvas-confetti';
import { 
  ArrowLeft, 
  Download, 
  RefreshCw, 
  Trophy, 
  Users, 
  Vote, 
  ImageIcon, 
  Search, 
  Award,
  Sparkles
} from 'lucide-react';

export default function SessionResults() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchResults();
  }, [id]);

  useEffect(() => {
    let interval = null;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchResults(true);
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, id]);

  const fetchResults = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await apiFetch(`/sessions/${id}`);
      setData(res);

      // Trigger confetti if there's a clear winner with > 0 votes
      if (res.images && res.images.length > 0 && res.images[0].vote_count > 0 && !silent) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 }
        });
      }
    } catch (err) {
      if (!silent) setToast({ message: err.message || 'Failed to fetch session results', type: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleExportCSV = () => {
    const token = localStorage.getItem('mentorToken');
    const downloadUrl = `/api/export/session/${id}/csv`;
    
    // Trigger file download using a temporary link with auth header token if needed or fetch blob
    fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Results_${data?.session?.title || 'Session'}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setToast({ message: 'CSV results report downloaded successfully!', type: 'success' });
      })
      .catch(() => {
        setToast({ message: 'Failed to download CSV export', type: 'error' });
      });
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem', margin: '2rem auto', maxWidth: '600px' }}>
        <p style={{ color: '#64748b' }}>Calculating live vote results...</p>
      </div>
    );
  }

  if (!data || !data.session) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem', margin: '2rem auto', maxWidth: '600px' }}>
        <h3>Session Not Found</h3>
        <button onClick={() => navigate('/mentor/dashboard')} className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const { session, images, eligibleStudents, votedStudents } = data;

  const totalEligibleCount = eligibleStudents.length;
  const totalVotedCount = votedStudents.length;
  const participationPercent = totalEligibleCount > 0 ? ((totalVotedCount / totalEligibleCount) * 100).toFixed(1) : 0;
  
  // Calculate total votes cast
  const totalVotesCast = images.reduce((acc, img) => acc + img.vote_count, 0);

  // Sorting automatically Votes DESC, tie-breaker upload ID
  const sortedImages = [...images].sort((a, b) => {
    if (b.vote_count !== a.vote_count) {
      return b.vote_count - a.vote_count;
    }
    return a.id.localeCompare(b.id);
  });

  const winner = sortedImages.length > 0 && sortedImages[0].vote_count > 0 ? sortedImages[0] : null;

  const filteredImages = sortedImages.filter(img => 
    img.registration_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (img.title && img.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <button onClick={() => navigate(`/mentor/session/${session.id}`)} className="btn btn-secondary">
          <ArrowLeft size={16} />
          <span>Back to Session Settings</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`btn ${autoRefresh ? 'btn-success' : 'btn-secondary'}`}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>{autoRefresh ? 'Live Updates: ON (3s)' : 'Live Updates: OFF'}</span>
          </button>

          <button onClick={handleExportCSV} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Title Card */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className={`badge badge-${session.status}`}>{session.status}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4f46e5' }}>{session.section || 'General'}</span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
              {session.title} — Results & Analytics
            </h1>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        <StatCard title="Eligible Students" value={totalEligibleCount} subtitle="Target student pool" icon={Users} color="#4f46e5" />
        <StatCard title="Students Voted" value={totalVotedCount} subtitle={`${participationPercent}% turnout rate`} icon={Vote} color="#10b981" />
        <StatCard title="Total Votes Cast" value={totalVotesCast} subtitle="Aggregate votes recorded" icon={Award} color="#f59e0b" />
        <StatCard title="Total Images" value={images.length} subtitle="Creative entries" icon={ImageIcon} color="#0284c7" />
        <StatCard title="Highest Votes" value={winner ? winner.vote_count : 0} subtitle="Top entry score" icon={Trophy} color="#7c3aed" />
      </div>

      {/* Winner Spotlight Banner */}
      {winner && (
        <div
          className="card animate-fade-in"
          style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            color: '#ffffff',
            padding: '2rem',
            marginBottom: '2.5rem',
            boxShadow: '0 12px 24px rgba(124, 58, 237, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '2rem'
          }}
        >
          <div style={{ flex: 1, minWidth: '260px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(255, 255, 255, 0.2)', padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '1rem' }}>
              <Sparkles size={16} />
              <span>Highest Voted Winner</span>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.5rem' }}>
              Student Reg: {winner.registration_number}
            </h2>
            <p style={{ fontSize: '1rem', opacity: 0.9 }}>
              Achieved <strong>{winner.vote_count} votes</strong> ({totalVotesCast > 0 ? ((winner.vote_count / totalVotesCast) * 100).toFixed(1) : 0}% of all votes submitted)
            </p>
          </div>

          <div style={{ width: '160px', height: '160px', borderRadius: '16px', overflow: 'hidden', border: '4px solid rgba(255,255,255,0.4)', boxShadow: '0 8px 16px rgba(0,0,0,0.2)', flexShrink: 0 }}>
            <img src={winner.image_url} alt="Winner entry" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>
      )}

      {/* Leaderboard Table Section */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Trophy size={20} style={{ color: '#f59e0b' }} />
            <span>Leaderboard — Ranked Results</span>
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '240px' }}>
            <Search size={18} style={{ color: '#94a3b8' }} />
            <input
              type="text"
              className="form-input"
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.85rem' }}
              placeholder="Search Reg Number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Rank</th>
                <th style={{ width: '100px' }}>Image</th>
                <th>Student Reg Number</th>
                <th>Vote Count</th>
                <th>Percentage Share</th>
              </tr>
            </thead>
            <tbody>
              {filteredImages.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    No results found matching your search.
                  </td>
                </tr>
              ) : (
                filteredImages.map((img, idx) => {
                  const rank = idx + 1;
                  const isTop3 = rank <= 3;
                  const sharePercent = totalVotesCast > 0 ? ((img.vote_count / totalVotesCast) * 100).toFixed(1) : 0;

                  return (
                    <tr key={img.id} style={{ backgroundColor: rank === 1 ? '#fefce8' : 'transparent' }}>
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            backgroundColor: rank === 1 ? '#f59e0b' : rank === 2 ? '#94a3b8' : rank === 3 ? '#b45309' : '#f1f5f9',
                            color: isTop3 ? '#ffffff' : '#475569'
                          }}
                        >
                          {rank}
                        </span>
                      </td>
                      <td>
                        <div style={{ width: '54px', height: '54px', borderRadius: '8px', overflow: 'hidden', background: '#f1f5f9' }}>
                          <img src={img.image_url} alt={`Reg ${img.registration_number}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      </td>
                      <td>
                        <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
                          {img.registration_number}
                        </strong>
                      </td>
                      <td>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#4f46e5' }}>
                          {img.vote_count}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ flex: 1, height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', maxWidth: '140px' }}>
                            <div style={{ width: `${sharePercent}%`, height: '100%', backgroundColor: rank === 1 ? '#10b981' : '#4f46e5', borderRadius: '4px' }} />
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
                            {sharePercent}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
