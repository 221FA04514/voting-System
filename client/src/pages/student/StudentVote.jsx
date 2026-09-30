import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import Toast from '../../components/Toast';
import Modal from '../../components/Modal';
import { 
  Check, 
  Vote, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  Eye, 
  Lock, 
  ArrowRight,
  ShieldAlert,
  Award,
  ChevronRight
} from 'lucide-react';

export default function StudentVote() {
  const { slug } = useParams();
  const navigate = useNavigate();

  // Session & Images state
  const [sessionInfo, setSessionInfo] = useState(null);
  const [images, setImages] = useState([]);
  const [loadingSession, setLoadingSession] = useState(true);
  const [toast, setToast] = useState(null);

  // Student Verification State
  const [regNumberInput, setRegNumberInput] = useState('');
  const [verifiedRegNo, setVerifiedRegNo] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState(null);
  const [alreadyVotedState, setAlreadyVotedState] = useState(false);

  // Voting Selection State
  const [selectedImageIds, setSelectedImageIds] = useState([]);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Image Zoom Modal
  const [zoomImage, setZoomImage] = useState(null);

  useEffect(() => {
    fetchPublicSession();
  }, [slug]);

  const fetchPublicSession = async () => {
    try {
      const data = await apiFetch(`/vote/${slug}`);
      setSessionInfo(data.session);
      setImages(data.images || []);
    } catch (err) {
      if (err.data && err.data.session) {
        setSessionInfo(err.data.session);
      }
      setVerificationError(err.message || 'Unable to load voting session.');
    } finally {
      setLoadingSession(false);
    }
  };

  const handleVerifyStudent = async (e) => {
    e.preventDefault();
    if (!regNumberInput.trim()) {
      setToast({ message: 'Please enter your registration number.', type: 'error' });
      return;
    }

    setVerifying(true);
    setVerificationError(null);

    try {
      const result = await apiFetch(`/vote/${slug}/verify`, {
        method: 'POST',
        body: JSON.stringify({ registrationNumber: regNumberInput })
      });

      if (result.alreadyVoted) {
        setAlreadyVotedState(true);
        setVerifiedRegNo(regNumberInput.trim().toUpperCase());
      } else if (result.eligible) {
        setVerifiedRegNo(regNumberInput.trim().toUpperCase());
      } else {
        setVerificationError(result.message || 'Your registration number is not eligible for this voting session.');
      }
    } catch (err) {
      setVerificationError(err.message || 'Your registration number is not eligible for this voting session.');
    } finally {
      setVerifying(false);
    }
  };

  const toggleImageSelection = (imageId) => {
    const maxAllowed = sessionInfo?.maxVotesPerStudent || 5;

    if (selectedImageIds.includes(imageId)) {
      setSelectedImageIds(prev => prev.filter(id => id !== imageId));
    } else {
      if (selectedImageIds.length >= maxAllowed) {
        setToast({
          message: `You can select a maximum of ${maxAllowed} images. Tap a selected image to deselect it.`,
          type: 'error'
        });
        return;
      }
      setSelectedImageIds(prev => [...prev, imageId]);
    }
  };

  const handleFinalSubmit = async () => {
    if (selectedImageIds.length === 0) {
      setToast({ message: 'Please select at least 1 image before submitting.', type: 'error' });
      return;
    }

    setSubmitting(true);

    try {
      const result = await apiFetch(`/vote/${slug}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          registrationNumber: verifiedRegNo,
          selectedImageIds
        })
      });

      setConfirmModalOpen(false);
      navigate(`/vote/${slug}/success`, {
        state: {
          sessionTitle: sessionInfo?.title,
          votesCount: selectedImageIds.length,
          registrationNumber: verifiedRegNo
        }
      });
    } catch (err) {
      setConfirmModalOpen(false);
      setToast({ message: err.message || 'Your votes were not submitted. Please try again.', type: 'error' });
      if (err.status === 409) {
        setAlreadyVotedState(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingSession) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3.5rem', margin: '3rem auto', maxWidth: '480px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '4px solid #eef2ff', borderTopColor: '#4f46e5', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#64748b', fontSize: '0.95rem', fontWeight: 600 }}>Loading voting session...</p>
      </div>
    );
  }

  // Session Closed or Draft Warning Screen
  if (sessionInfo && sessionInfo.status !== 'open') {
    return (
      <div style={{ maxWidth: '480px', margin: '2rem auto', padding: '0 0.5rem' }}>
        <div className="card animate-fade-in" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: sessionInfo.status === 'closed' ? '#fef2f2' : '#fffbe6', color: sessionInfo.status === 'closed' ? '#ef4444' : '#f59e0b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <Lock size={32} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
            {sessionInfo.status === 'closed' ? 'Voting Session Ended' : 'Voting Not Yet Open'}
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            {sessionInfo.status === 'closed' 
              ? `Voting for "${sessionInfo.title}" has officially closed.`
              : `Voting for "${sessionInfo.title}" will open soon.`}
          </p>
        </div>
      </div>
    );
  }

  // STEP 1: Registration Number Verification Form (Mobile Optimized)
  if (!verifiedRegNo) {
    return (
      <div style={{ maxWidth: '440px', margin: '1.5rem auto', padding: '0 0.5rem' }}>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        <div className="card animate-fade-in" style={{ padding: '2rem 1.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                boxShadow: '0 8px 16px rgba(79, 70, 229, 0.25)'
              }}
            >
              <Award size={30} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {sessionInfo?.section || 'Student Creative Activity'}
            </span>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginTop: '2px', lineHeight: 1.25 }}>
              {sessionInfo?.title}
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>
              Enter your student registration number below to cast your votes.
            </p>
          </div>

          {verificationError && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '0.875rem', color: '#991b1b', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
              <ShieldAlert size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ fontSize: '0.85rem' }}>Authentication Notice:</strong>
                <p style={{ marginTop: '2px' }}>{verificationError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleVerifyStudent}>
            <div className="form-group">
              <label className="form-label" style={{ textAlign: 'center', fontSize: '0.8rem', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>
                Your Registration Number
              </label>
              <input
                type="text"
                className="form-input"
                style={{
                  fontSize: '1.25rem',
                  letterSpacing: '0.08em',
                  textAlign: 'center',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '0.875rem',
                  borderRadius: '14px',
                  borderColor: '#cbd5e1',
                  backgroundColor: '#ffffff'
                }}
                placeholder="e.g. 23A001"
                value={regNumberInput}
                onChange={(e) => setRegNumberInput(e.target.value.toUpperCase())}
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary pulse-button"
              disabled={verifying}
              style={{ width: '100%', padding: '0.875rem', fontSize: '1rem', borderRadius: '14px', marginTop: '0.5rem' }}
            >
              <span>{verifying ? 'Verifying...' : 'Continue to Vote'}</span>
              <ChevronRight size={20} />
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>
            🔒 Student Privacy: Registration numbers are strictly confidential & hidden from all voters.
          </div>
        </div>
      </div>
    );
  }

  // STEP 2: Already Voted Warning Page (Mobile Optimized)
  if (alreadyVotedState) {
    return (
      <div style={{ maxWidth: '480px', margin: '2rem auto', padding: '0 0.5rem' }}>
        <div className="card animate-fade-in" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#ecfdf5', color: '#10b981', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <CheckCircle2 size={36} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
            Voting Completed
          </h2>
          <p style={{ color: '#475569', fontSize: '0.9rem', marginTop: '0.5rem', lineHeight: 1.4 }}>
            Registration number <strong style={{ color: '#4f46e5' }}>"{verifiedRegNo}"</strong> has already voted in <strong>"{sessionInfo?.title}"</strong>.
          </p>
          <div style={{ marginTop: '1.25rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.875rem', borderRadius: '12px', fontSize: '0.8rem', color: '#64748b' }}>
            🛡️ Duplicate voting is strictly prevented. You may participate again when your mentor creates a new session.
          </div>
        </div>
      </div>
    );
  }

  // STEP 3: Active Voting Interface (Mobile First Design)
  const maxVotesAllowed = sessionInfo?.maxVotesPerStudent || 5;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '6rem' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Floating Action Bar (Mobile Bottom & Desktop Sticky Top) */}
      <div className="mobile-bottom-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.15)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Vote size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.02em' }}>
              Reg: <span style={{ color: '#818cf8' }}>{verifiedRegNo}</span>
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
              Selected: <strong style={{ color: selectedImageIds.length > 0 ? '#34d399' : '#ffffff' }}>{selectedImageIds.length} / {maxVotesAllowed}</strong>
            </div>
          </div>
        </div>

        <button
          onClick={() => setConfirmModalOpen(true)}
          disabled={selectedImageIds.length === 0}
          className={`btn btn-primary ${selectedImageIds.length > 0 ? 'pulse-button' : ''}`}
          style={{ padding: '0.6rem 1.15rem', fontSize: '0.875rem', borderRadius: '12px' }}
        >
          <span>Submit Votes</span>
          <ArrowRight size={16} />
        </button>
      </div>

      {/* Session Header */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1.25rem 1.5rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {sessionInfo?.section || 'Creative Activity'}
        </span>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '2px', lineHeight: 1.25 }}>
          {sessionInfo?.title}
        </h1>
        {sessionInfo?.description && (
          <p style={{ color: '#475569', fontSize: '0.875rem', marginTop: '0.4rem' }}>
            {sessionInfo.description}
          </p>
        )}

        <div style={{ marginTop: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#eef2ff', color: '#3730a3', padding: '0.5rem 0.85rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600 }}>
          <Sparkles size={16} style={{ color: '#4f46e5', flexShrink: 0 }} />
          <span>Tap images to select up to {maxVotesAllowed} choices. Tap again to deselect.</span>
        </div>
      </div>

      {/* Images Grid (STRICT PRIVACY: NO Reg Numbers or Vote Counts!) */}
      <div className="image-grid">
        {images.map((img, idx) => {
          const isSelected = selectedImageIds.includes(img.id);
          const selectionIndex = selectedImageIds.indexOf(img.id) + 1;

          return (
            <div
              key={img.id}
              className={`image-card ${isSelected ? 'selected' : ''}`}
              onClick={() => toggleImageSelection(img.id)}
            >
              <div className="image-wrapper">
                <img src={img.imageUrl} alt={`Creative Entry ${idx + 1}`} loading="lazy" />

                {/* Selection Order Badge */}
                <div className="select-badge">
                  {isSelected ? `#${selectionIndex}` : idx + 1}
                </div>

                {/* Zoom Preview Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomImage(img.imageUrl);
                  }}
                  style={{
                    position: 'absolute',
                    bottom: '0.5rem',
                    right: '0.5rem',
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    color: '#ffffff',
                    padding: '6px',
                    borderRadius: '50%',
                    backdropFilter: 'blur(4px)',
                    display: 'flex'
                  }}
                  title="View High Resolution"
                >
                  <Eye size={14} />
                </button>
              </div>

              <div style={{ padding: '0.6rem', textAlign: 'center', borderTop: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isSelected ? '#4f46e5' : '#0f172a' }}>
                  {isSelected ? `Selected (#${selectionIndex})` : `Entry #${idx + 1}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Confirm Submission"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setConfirmModalOpen(false)}>
              Review Choices
            </button>
            <button className="btn btn-primary" onClick={handleFinalSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Confirm & Submit'}
            </button>
          </>
        }
      >
        <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#eef2ff', color: '#4f46e5', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.875rem' }}>
            <Vote size={28} />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>
            Submit {selectedImageIds.length} Vote(s)?
          </h3>
          <p style={{ color: '#475569', fontSize: '0.875rem', lineHeight: 1.4 }}>
            Submitting votes for registration number <strong style={{ color: '#4f46e5' }}>"{verifiedRegNo}"</strong> in session <strong>"{sessionInfo?.title}"</strong>.
          </p>
          <div style={{ marginTop: '0.875rem', backgroundColor: '#fffbe6', border: '1px solid #fde68a', borderRadius: '10px', padding: '0.75rem', color: '#b45309', fontSize: '0.8rem', fontWeight: 600 }}>
            ⚠️ Note: Once submitted, your vote is permanent and cannot be changed or submitted again.
          </div>
        </div>
      </Modal>

      {/* Image Zoom Modal */}
      <Modal
        isOpen={!!zoomImage}
        onClose={() => setZoomImage(null)}
        title="Image Preview"
      >
        {zoomImage && (
          <div style={{ textAlign: 'center' }}>
            <img
              src={zoomImage}
              alt="Zoomed entry preview"
              style={{ maxWidth: '100%', maxHeight: '65vh', borderRadius: '12px', objectFit: 'contain' }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
