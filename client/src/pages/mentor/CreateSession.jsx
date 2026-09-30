import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import Toast from '../../components/Toast';
import { ArrowLeft, Save, Play, Upload, Plus, Trash2, HelpCircle, FileText } from 'lucide-react';

export default function CreateSession() {
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [section, setSection] = useState('Section A');
  const [description, setDescription] = useState('');
  const [maxVotesPerStudent, setMaxVotesPerStudent] = useState(5);
  const [eligibleInput, setEligibleInput] = useState('');

  // Image Upload State
  const [imageFiles, setImageFiles] = useState([]); // Array of { file, preview, regNo }

  const handleImageFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const newEntries = files.map((file, idx) => {
      const currentCount = imageFiles.length + idx + 1;
      const autoReg = `23A${String(currentCount).padStart(3, '0')}`;
      return {
        file,
        preview: URL.createObjectURL(file),
        regNo: autoReg
      };
    });

    setImageFiles(prev => [...prev, ...newEntries]);
  };

  const updateImageRegNo = (index, newRegNo) => {
    setImageFiles(prev => {
      const copy = [...prev];
      copy[index].regNo = newRegNo;
      return copy;
    });
  };

  const removeImage = (index) => {
    setImageFiles(prev => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[index].preview);
      copy.splice(index, 1);
      return copy;
    });
  };

  const handleBulkRegFill = () => {
    // Helper to generate sample reg numbers based on images
    if (imageFiles.length > 0) {
      const list = imageFiles.map(img => img.regNo).join('\n');
      setEligibleInput(list);
      setToast({ message: 'Auto-filled eligible list from uploaded image registration numbers.', type: 'success' });
    } else {
      setEligibleInput('23A001\n23A002\n23A003\n23A004\n23A005');
      setToast({ message: 'Sample registration numbers inserted.', type: 'success' });
    }
  };

  const handleSubmit = async (publishImmediately = false) => {
    if (!title.trim()) {
      setToast({ message: 'Session title is required.', type: 'error' });
      return;
    }

    setLoading(true);

    try {
      // 1. Create Session
      const sessionData = await apiFetch('/sessions', {
        method: 'POST',
        body: JSON.stringify({
          title,
          section,
          description,
          maxVotesPerStudent,
          eligibleStudents: eligibleInput
        })
      });

      const sessionId = sessionData.session.id;

      // 2. Upload Images if any
      if (imageFiles.length > 0) {
        const formData = new FormData();
        const regNumbersArray = imageFiles.map(img => img.regNo.trim().toUpperCase());
        
        imageFiles.forEach(img => {
          formData.append('images', img.file);
        });
        formData.append('registrationNumbers', JSON.stringify(regNumbersArray));

        await apiFetch(`/sessions/${sessionId}/images`, {
          method: 'POST',
          body: formData
        });
      }

      // 3. Publish if requested
      if (publishImmediately) {
        await apiFetch(`/sessions/${sessionId}`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'open' })
        });
      }

      setToast({
        message: publishImmediately ? 'Session created and published! Voting is now OPEN.' : 'Session saved as Draft.',
        type: 'success'
      });

      setTimeout(() => {
        navigate(`/mentor/session/${sessionId}`);
      }, 1000);

    } catch (err) {
      setToast({ message: err.message || 'Failed to create voting session.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '4rem' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => navigate('/mentor/dashboard')} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>
          Create New Voting Session
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '2rem' }}>
          Set up a creative-thinking voting session for your section students.
        </p>

        {/* Section 1: Basic Information */}
        <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1.75rem', marginBottom: '1.75rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#4f46e5', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={18} />
            <span>1. Session Details</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Session Title *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Creative Thinking — Section A — September 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Section Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Section A"
                value={section}
                onChange={(e) => setSection(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Max Votes Allowed per Student</label>
              <select
                className="form-select"
                value={maxVotesPerStudent}
                onChange={(e) => setMaxVotesPerStudent(Number(e.target.value))}
              >
                <option value={1}>1 Vote</option>
                <option value={2}>2 Votes</option>
                <option value={3}>3 Votes</option>
                <option value={4}>4 Votes</option>
                <option value={5}>5 Votes (Default standard)</option>
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Description / Student Instructions (Optional)</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Instructions for students when voting on creative entries..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Eligible Students */}
        <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1.75rem', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <HelpCircle size={18} />
              <span>2. Eligible Student Registration Numbers</span>
            </h3>
            <button type="button" onClick={handleBulkRegFill} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
              Auto-fill Sample / From Images
            </button>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
            Enter eligible student registration numbers separated by newlines, commas, or spaces. Only these registration numbers will be allowed to cast votes.
          </p>
          <textarea
            className="form-textarea"
            rows={4}
            placeholder="23A001&#10;23A002&#10;23A003&#10;23A004&#10;23A005"
            value={eligibleInput}
            onChange={(e) => setEligibleInput(e.target.value)}
          />
        </div>

        {/* Section 3: Upload Student Images */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#4f46e5', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Upload size={18} />
            <span>3. Upload Student Creative Images</span>
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
            Upload creative work submitted by your students. Each image will be internally associated with a Registration Number. <strong>Note: Registration numbers are NEVER exposed to voting students.</strong>
          </p>

          <div style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', backgroundColor: '#f8fafc', marginBottom: '1.5rem' }}>
            <input
              type="file"
              id="multi-image-input"
              multiple
              accept="image/*"
              onChange={handleImageFileChange}
              style={{ display: 'none' }}
            />
            <label htmlFor="multi-image-input" className="btn btn-primary" style={{ cursor: 'pointer' }}>
              <Upload size={18} />
              <span>Choose Image Files</span>
            </label>
            <span style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>
              Select multiple PNG, JPG, WEBP images from your computer
            </span>
          </div>

          {/* Uploaded Images Preview Grid */}
          {imageFiles.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                  {imageFiles.length} Images Selected for Upload
                </span>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Assign Registration Number for each image below:
                </span>
              </div>

              <div className="image-grid">
                {imageFiles.map((img, idx) => (
                  <div key={idx} className="card" style={{ padding: '0.75rem' }}>
                    <div className="image-wrapper" style={{ borderRadius: '8px', marginBottom: '0.75rem' }}>
                      <img src={img.preview} alt={`Upload ${idx + 1}`} />
                    </div>
                    <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Associated Student Reg No *</label>
                      <input
                        type="text"
                        className="form-input"
                        style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                        value={img.regNo}
                        onChange={(e) => updateImageRegNo(idx, e.target.value)}
                        placeholder="23A001"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="btn btn-danger"
                      style={{ width: '100%', padding: '0.25rem', fontSize: '0.75rem' }}
                    >
                      <Trash2 size={12} />
                      <span>Remove</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleSubmit(false)}
            disabled={loading}
          >
            <Save size={18} />
            <span>Save as Draft</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleSubmit(true)}
            disabled={loading}
          >
            <Play size={18} />
            <span>{loading ? 'Processing...' : 'Save & Publish Session'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
