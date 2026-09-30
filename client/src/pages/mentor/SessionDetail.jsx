import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import Toast from '../../components/Toast';
import Modal from '../../components/Modal';
import { 
  ArrowLeft, 
  Copy, 
  Check, 
  BarChart3, 
  Play, 
  Square, 
  Upload, 
  Trash2, 
  Users, 
  Image as ImageIcon,
  Edit2,
  Save,
  FileText
} from 'lucide-react';

export default function SessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [copied, setCopied] = useState(false);

  // Edit Metadata State
  const [editTitle, setEditTitle] = useState('');
  const [editSection, setEditSection] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editMaxVotes, setEditMaxVotes] = useState(5);
  const [isEditingInfo, setIsEditingInfo] = useState(false);

  // Eligible Students List State
  const [studentsText, setStudentsText] = useState('');
  const [isSavingStudents, setIsSavingStudents] = useState(false);

  // New Image Upload State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [newImageFiles, setNewImageFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchSessionDetails();
  }, [id]);

  const fetchSessionDetails = async () => {
    try {
      const data = await apiFetch(`/sessions/${id}`);
      setSessionData(data);
      setEditTitle(data.session.title);
      setEditSection(data.session.section || '');
      setEditDescription(data.session.description || '');
      setEditMaxVotes(data.session.max_votes_per_student || 5);
      setStudentsText((data.eligibleStudents || []).join('\n'));
    } catch (err) {
      setToast({ message: err.message || 'Failed to load session details', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await apiFetch(`/sessions/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      setToast({ message: `Session status set to ${newStatus.toUpperCase()}`, type: 'success' });
      fetchSessionDetails();
    } catch (err) {
      setToast({ message: err.message || 'Failed to update status', type: 'error' });
    }
  };

  const handleSaveInfo = async () => {
    try {
      await apiFetch(`/sessions/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: editTitle,
          section: editSection,
          description: editDescription,
          maxVotesPerStudent: editMaxVotes
        })
      });
      setToast({ message: 'Session details updated successfully', type: 'success' });
      setIsEditingInfo(false);
      fetchSessionDetails();
    } catch (err) {
      setToast({ message: err.message || 'Failed to update session details', type: 'error' });
    }
  };

  const handleSaveStudentsList = async () => {
    setIsSavingStudents(true);
    try {
      await apiFetch(`/sessions/${id}/students`, {
        method: 'POST',
        body: JSON.stringify({
          registrationNumbers: studentsText,
          mode: 'replace'
        })
      });
      setToast({ message: 'Eligible student registration numbers saved!', type: 'success' });
      fetchSessionDetails();
    } catch (err) {
      setToast({ message: err.message || 'Failed to update student list', type: 'error' });
    } finally {
      setIsSavingStudents(false);
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (!window.confirm('Delete this image permanently?')) return;
    try {
      await apiFetch(`/sessions/${id}/images/${imageId}`, {
        method: 'DELETE'
      });
      setToast({ message: 'Image removed from session', type: 'success' });
      fetchSessionDetails();
    } catch (err) {
      setToast({ message: err.message || 'Failed to delete image', type: 'error' });
    }
  };

  const handleUploadNewImages = async () => {
    if (newImageFiles.length === 0) return;
    setUploading(true);

    try {
      const formData = new FormData();
      const regNos = newImageFiles.map(img => img.regNo.trim().toUpperCase());

      newImageFiles.forEach(img => {
        formData.append('images', img.file);
      });
      formData.append('registrationNumbers', JSON.stringify(regNos));

      await apiFetch(`/sessions/${id}/images`, {
        method: 'POST',
        body: formData
      });

      setToast({ message: 'New images uploaded successfully!', type: 'success' });
      setUploadModalOpen(false);
      setNewImageFiles([]);
      fetchSessionDetails();
    } catch (err) {
      setToast({ message: err.message || 'Failed to upload images', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleNewFileSelection = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const existingCount = (sessionData?.images || []).length;
    const entries = files.map((file, idx) => ({
      file,
      preview: URL.createObjectURL(file),
      regNo: `23A${String(existingCount + idx + 1).padStart(3, '0')}`
    }));

    setNewImageFiles(prev => [...prev, ...entries]);
  };

  const copyShareLink = () => {
    if (!sessionData?.session?.slug) return;
    const shareUrl = `${window.location.origin}/vote/${sessionData.session.slug}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setToast({ message: 'Shareable voting URL copied to clipboard!', type: 'success' });
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem', margin: '2rem auto', maxWidth: '600px' }}>
        <p style={{ color: '#64748b' }}>Loading session management...</p>
      </div>
    );
  }

  if (!sessionData || !sessionData.session) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem', margin: '2rem auto', maxWidth: '600px' }}>
        <h3>Session Not Found</h3>
        <button onClick={() => navigate('/mentor/dashboard')} className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Return to Dashboard
        </button>
      </div>
    );
  }

  const { session, images, eligibleStudents, votedStudents } = sessionData;
  const shareableUrl = `${window.location.origin}/vote/${session.slug}`;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <button onClick={() => navigate('/mentor/dashboard')} className="btn btn-secondary">
          <ArrowLeft size={16} />
          <span>Dashboard</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link to={`/mentor/session/${session.id}/results`} className="btn btn-primary">
            <BarChart3 size={18} />
            <span>View Live Results</span>
          </Link>

          {session.status === 'draft' && (
            <button onClick={() => handleStatusChange('open')} className="btn btn-success">
              <Play size={16} />
              <span>Publish & Open Voting</span>
            </button>
          )}

          {session.status === 'open' && (
            <button onClick={() => handleStatusChange('closed')} className="btn btn-secondary" style={{ color: '#b45309' }}>
              <Square size={16} />
              <span>Close Voting</span>
            </button>
          )}

          {session.status === 'closed' && (
            <button onClick={() => handleStatusChange('open')} className="btn btn-secondary">
              <Play size={16} />
              <span>Reopen Voting</span>
            </button>
          )}
        </div>
      </div>

      {/* Shareable Link Bar */}
      <div className="card" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', padding: '1.25rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Shareable Voting Link
          </span>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', wordBreak: 'break-all', marginTop: '2px' }}>
            {shareableUrl}
          </div>
        </div>
        <button onClick={copyShareLink} className="btn btn-primary" style={{ padding: '0.625rem 1.25rem' }}>
          {copied ? <Check size={18} /> : <Copy size={18} />}
          <span>{copied ? 'Copied Link!' : 'Copy Link for Students'}</span>
        </button>
      </div>

      {/* Session Header Card */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className={`badge badge-${session.status}`}>{session.status}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
                Section: {session.section || 'N/A'}
              </span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '0.35rem' }}>
              {session.title}
            </h1>
          </div>

          {!isEditingInfo && (
            <button onClick={() => setIsEditingInfo(true)} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
              <Edit2 size={16} />
              <span>Edit Details</span>
            </button>
          )}
        </div>

        {isEditingInfo ? (
          <div style={{ marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input type="text" className="form-input" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Section</label>
                <input type="text" className="form-input" value={editSection} onChange={e => setEditSection(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Max Votes Per Student</label>
                <input type="number" min={1} max={10} className="form-input" value={editMaxVotes} onChange={e => setEditMaxVotes(Number(e.target.value))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" rows={2} value={editDescription} onChange={e => setEditDescription(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setIsEditingInfo(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSaveInfo} className="btn btn-primary"><Save size={16} /><span>Save Changes</span></button>
            </div>
          </div>
        ) : (
          session.description && <p style={{ color: '#475569', fontSize: '0.95rem' }}>{session.description}</p>
        )}
      </div>

      {/* Grid Layout: Uploaded Images & Eligible Students */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        
        {/* Left Column: Images List */}
        <div style={{ gridColumn: 'span 2' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ImageIcon size={20} style={{ color: '#4f46e5' }} />
                  <span>Uploaded Creative Images ({images.length})</span>
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Internal registration numbers are visible ONLY to you as mentor.
                </span>
              </div>
              <button onClick={() => setUploadModalOpen(true)} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                <Upload size={16} />
                <span>Add Image</span>
              </button>
            </div>

            {images.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No images uploaded yet for this session.</p>
                <button onClick={() => setUploadModalOpen(true)} className="btn btn-primary" style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
                  <Upload size={16} /> Upload First Image
                </button>
              </div>
            ) : (
              <div className="image-grid">
                {images.map((img) => (
                  <div key={img.id} className="card" style={{ padding: '0.75rem', position: 'relative' }}>
                    <div className="image-wrapper" style={{ borderRadius: '8px', marginBottom: '0.5rem' }}>
                      <img src={img.image_url} alt={`Reg ${img.registration_number}`} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4f46e5' }}>
                        Reg: {img.registration_number}
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#10b981', background: '#ecfdf5', padding: '2px 6px', borderRadius: '4px' }}>
                        {img.vote_count} votes
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteImage(img.id)}
                      className="btn btn-danger"
                      style={{ width: '100%', padding: '0.25rem', fontSize: '0.75rem', marginTop: '0.25rem' }}
                    >
                      <Trash2 size={12} />
                      <span>Remove</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Eligible Students Manager */}
        <div>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} style={{ color: '#4f46e5' }} />
              <span>Eligible Students ({eligibleStudents.length})</span>
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
              Registration numbers allowed to vote in this session. One registration number per line.
            </p>

            <textarea
              className="form-textarea"
              rows={12}
              style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
              value={studentsText}
              onChange={(e) => setStudentsText(e.target.value)}
              placeholder="23A001&#10;23A002&#10;23A003"
            />

            <button
              onClick={handleSaveStudentsList}
              disabled={isSavingStudents}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1rem' }}
            >
              <Save size={16} />
              <span>{isSavingStudents ? 'Saving List...' : 'Save Student List'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => { setUploadModalOpen(false); setNewImageFiles([]); }}
        title="Add Images to Session"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setUploadModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleUploadNewImages} disabled={uploading || newImageFiles.length === 0}>
              {uploading ? 'Uploading...' : `Upload ${newImageFiles.length} Images`}
            </button>
          </>
        }
      >
        <div style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', backgroundColor: '#f8fafc', marginBottom: '1.25rem' }}>
          <input type="file" id="modal-upload-input" multiple accept="image/*" onChange={handleNewFileSelection} style={{ display: 'none' }} />
          <label htmlFor="modal-upload-input" className="btn btn-primary">
            <Upload size={18} /> Choose Images
          </label>
        </div>

        {newImageFiles.length > 0 && (
          <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
            {newImageFiles.map((img, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', background: '#f8fafc', padding: '0.5rem', borderRadius: '8px' }}>
                <img src={img.preview} alt="preview" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                    value={img.regNo}
                    onChange={(e) => {
                      const copy = [...newImageFiles];
                      copy[idx].regNo = e.target.value;
                      setNewImageFiles(copy);
                    }}
                    placeholder="Reg No e.g. 23A001"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
