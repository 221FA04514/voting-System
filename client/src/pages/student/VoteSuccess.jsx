import React, { useEffect } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { CheckCircle2, Award, ShieldCheck, Heart } from 'lucide-react';

export default function VoteSuccess() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state || {};
  const sessionTitle = state.sessionTitle || 'Creative Voting Session';
  const votesCount = state.votesCount || 5;
  const regNo = state.registrationNumber || 'Student';

  useEffect(() => {
    // Fire confetti on load
    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.5 }
    });
  }, []);

  return (
    <div style={{ maxWidth: '520px', margin: '3rem auto', padding: '0 1rem' }}>
      <div className="card animate-fade-in" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#ffffff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem',
            boxShadow: '0 10px 20px rgba(16, 185, 129, 0.3)'
          }}
        >
          <CheckCircle2 size={44} />
        </div>

        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Submission Successful
        </span>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
          Votes Submitted!
        </h1>

        <p style={{ color: '#475569', fontSize: '0.95rem', marginTop: '0.75rem', lineHeight: 1.5 }}>
          Thank you, <strong>{regNo}</strong>! Your <strong>{votesCount} votes</strong> have been permanently recorded for:
        </p>

        <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', margin: '1.5rem 0', fontWeight: 700, color: '#0f172a', fontSize: '1.05rem' }}>
          {sessionTitle}
        </div>

        <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '1rem', fontSize: '0.85rem', color: '#065f46', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <ShieldCheck size={20} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Voting Locked:</strong> Your registration number is now permanently marked as completed for this session. Duplicate votes will be rejected.
          </div>
        </div>

        <div style={{ marginTop: '2rem', fontSize: '0.85rem', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
          <span>Made with passion for creative education</span>
          <Heart size={14} style={{ color: '#ef4444' }} />
        </div>
      </div>
    </div>
  );
}
