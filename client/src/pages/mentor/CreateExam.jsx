import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import Toast from '../../components/Toast';
import QuestionContent from '../../components/QuestionContent';
import { 
  FileText, 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  HelpCircle, 
  Upload, 
  Copy, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Eye, 
  Maximize2,
  Sparkles,
  Plus
} from 'lucide-react';

const SAMPLE_FORMAT_A = `TYPE: MCQ
Q: Which function is the entry point of a standard C program?
A: start()
B: main()
C: begin()
D: execute()
ANSWER: B
MARKS: 2

TYPE: MCQ
Q: Which header file declares printf()?
A: stdlib.h
B: string.h
C: stdio.h
D: math.h
ANSWER: C
MARKS: 2

TYPE: FILL
Q: The function used to display formatted output in C is ______.
ANSWER: printf
ACCEPTED: printf; PRINTF; printf()
MARKS: 2`;

const SAMPLE_FORMAT_B = `1. Which loop executes its body at least once?
A. for
B. while
C. do-while
D. none
Answer: C
Marks: 2

2. Which operator checks equality in C?
A. =
B. ==
C. !=
D. <=
Answer: B
Marks: 1

3. The keyword used to return a value from a function is ______.
Type: FILL
Answer: return
Marks: 1`;

export default function CreateExam() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  // Step 1: Basic Details
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '1. Enter fullscreen mode when prompted.\n2. Do not switch tabs or minimize the window during the test.\n3. Each registration number is allowed only ONE attempt.\n4. Answers autosave automatically.\n5. Click Submit Exam when finished.',
    subject: 'C Programming',
    durationMinutes: 30,
    passingMarks: 10,
    negativeMarkingEnabled: false,
    negativeMarkValue: 0.5,
    questionNavigationEnabled: true,
    shuffleQuestions: false,
    showScoreAfterSubmission: true,
    revealAnswersAfterSubmission: false,
    fullscreenRequired: true,
    focusMonitoringEnabled: true,
    accessScope: 'all_enrolled'
  });

  // Step 2: Bulk Import Questions
  const [bulkText, setBulkText] = useState('');
  const [parsedPreview, setParsedPreview] = useState(null);
  const [parsing, setParsing] = useState(false);

  // Created Exam Details after step 1
  const [createdExamId, setCreatedExamId] = useState(null);
  const [createdPublicId, setCreatedPublicId] = useState(null);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // STEP 1: Save Basic Details to create Exam Draft
  const handleSaveBasicDetails = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setToast({ message: 'Exam title is required', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch('/exams', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setCreatedExamId(res.exam.id);
      setCreatedPublicId(res.exam.publicId);
      setToast({ message: 'Exam details saved as draft!', type: 'success' });
      setStep(2);
    } catch (err) {
      setToast({ message: err.message || 'Failed to create exam', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Client-side quick parser preview
  const handleParseQuestions = () => {
    if (!bulkText.trim()) {
      setToast({ message: 'Please paste question text before parsing', type: 'error' });
      return;
    }
    setParsing(true);
    try {
      // Split by blank lines or explicit question starters (Numbered or TYPE: ... \n Q:)
      const text = bulkText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
      const blocks = text.split(/\n\s*\n+|\n+(?=\d+[\.\)]\s+)|\n+(?=TYPE:\s*(?:MCQ|FILL)\s*\n\s*Q:)/i)
        .map(b => b.trim())
        .filter(Boolean);

      const parsedQuestions = [];
      const errors = [];

      blocks.forEach((block, idx) => {
        const qNum = idx + 1;
        const rawLines = block.split('\n');
        if (rawLines.length === 0 || !rawLines.some(l => l.trim())) return;

        let qType = 'mcq';
        const questionLines = [];
        const options = [];
        let correctAnswer = '';
        let acceptedAnswers = [];
        let marks = 1;

        // Check for TYPE:
        const typeLine = rawLines.find(l => /^TYPE:\s*/i.test(l.trim()) || /^Type:\s*fill/i.test(l.trim()));
        if (typeLine && /fill/i.test(typeLine.trim())) {
          qType = 'fill_blank';
        } else if (rawLines.some(l => /fill/i.test(l.trim()) && !/^[A-D][\.\:\)]/i.test(l.trim()) && !l.toLowerCase().includes('printf'))) {
          qType = 'fill_blank';
        }

        let inOptions = false;
        let afterOptions = false;

        for (const line of rawLines) {
          const trimmed = line.trim();

          if (/^TYPE:\s*/i.test(trimmed) || /^Type:\s*fill/i.test(trimmed)) {
            continue;
          }

          const optionMatch = trimmed.match(/^(?:([A-D])[\.\:\)]|\(([A-D])\)|\[([A-D])\])\s*(.*)/i);
          const ansMatch = trimmed.match(/^(?:ANSWER|Ans|Correct):\s*(.*)/i);
          const marksMatch = trimmed.match(/^MARKS?:\s*(.*)/i);
          const accMatch = trimmed.match(/^ACCEPTED:\s*(.*)/i);

          if (ansMatch) {
            afterOptions = true;
            inOptions = false;
            correctAnswer = ansMatch[1].trim();
            continue;
          }

          if (marksMatch) {
            const num = parseFloat(marksMatch[1].trim());
            if (!isNaN(num) && num > 0) marks = num;
            continue;
          }

          if (accMatch) {
            accMatch[1].split(/[;,|]/).forEach(s => {
              if (s.trim()) acceptedAnswers.push(s.trim());
            });
            continue;
          }

          if (!inOptions && !afterOptions) {
            if (optionMatch) {
              inOptions = true;
              options.push({ letter: (optionMatch[1] || optionMatch[2] || optionMatch[3]).toUpperCase(), text: optionMatch[4].trim() });
              continue;
            }

            const qPromptMatch = trimmed.match(/^(?:Q\d*|Question\s*\d*)\s*[:\.\)]\s*(.*)/i) || trimmed.match(/^\d+[\.\)]\s+(.*)/);
            if (qPromptMatch && questionLines.length === 0) {
              if (qPromptMatch[1].trim()) questionLines.push(qPromptMatch[1].trim());
              continue;
            }

            if (/^(?:CODE|SNIPPET):\s*(.*)/i.test(trimmed)) {
              const rest = trimmed.replace(/^(?:CODE|SNIPPET):\s*/i, '');
              if (rest) questionLines.push(rest);
              continue;
            }

            if (questionLines.length === 0) {
              if (trimmed) questionLines.push(trimmed);
            } else {
              questionLines.push(line);
            }
            continue;
          }

          if (inOptions) {
            if (optionMatch) {
              options.push({ letter: (optionMatch[1] || optionMatch[2] || optionMatch[3]).toUpperCase(), text: optionMatch[4].trim() });
              continue;
            }
            if (options.length > 0 && trimmed) {
              options[options.length - 1].text += ' ' + trimmed;
            }
            continue;
          }
        }

        const qText = questionLines.join('\n').trim();

        // Validate
        if (!qText) {
          errors.push(`Question #${qNum}: Missing question text.`);
        } else if (qType === 'mcq') {
          if (options.length < 2) {
            errors.push(`Question #${qNum} (MCQ): At least 2 options (A, B, C, D) are required. Found: ${options.length}.`);
          } else if (!correctAnswer) {
            errors.push(`Question #${qNum} (MCQ): Missing correct answer (e.g. ANSWER: B).`);
          } else {
            parsedQuestions.push({
              order: qNum,
              type: 'mcq',
              text: qText,
              options: options.map(o => o.text),
              correctAnswer: correctAnswer.toUpperCase(),
              acceptedAnswers: [],
              marks
            });
          }
        } else {
          // Fill blank
          if (!correctAnswer && acceptedAnswers.length === 0) {
            errors.push(`Question #${qNum} (Fill in Blank): Missing correct answer.`);
          } else {
            parsedQuestions.push({
              order: qNum,
              type: 'fill_blank',
              text: qText,
              options: [],
              correctAnswer: correctAnswer || (acceptedAnswers[0] || ''),
              acceptedAnswers: acceptedAnswers.length > 0 ? acceptedAnswers : [correctAnswer],
              marks
            });
          }
        }
      });

      setParsedPreview({
        questions: parsedQuestions,
        errors,
        totalBlocks: blocks.length,
        validCount: parsedQuestions.length,
        invalidCount: errors.length,
        totalMarks: parsedQuestions.reduce((acc, q) => acc + q.marks, 0)
      });

      if (errors.length === 0) {
        setToast({ message: `Successfully parsed all ${parsedQuestions.length} questions!`, type: 'success' });
      } else {
        setToast({ message: `Parsed ${parsedQuestions.length} questions with ${errors.length} validation errors.`, type: 'info' });
      }
    } catch (err) {
      setToast({ message: 'Parsing failed: ' + err.message, type: 'error' });
    } finally {
      setParsing(false);
    }
  };

  // STEP 2: Import parsed questions to backend
  const handleImportQuestions = async () => {
    if (!createdExamId) {
      setToast({ message: 'Exam draft ID missing. Please redo step 1.', type: 'error' });
      return;
    }
    if (!parsedPreview || parsedPreview.questions.length === 0) {
      setToast({ message: 'No valid parsed questions to import.', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      let res;
      try {
        res = await apiFetch(`/exams/${createdExamId}/questions/bulk`, {
          method: 'POST',
          body: JSON.stringify({ rawText: bulkText })
        });
      } catch (postErr) {
        if (postErr.status === 404) {
          res = await apiFetch(`/exams/${createdExamId}/bulk-import`, {
            method: 'POST',
            body: JSON.stringify({ rawText: bulkText })
          });
        } else {
          throw postErr;
        }
      }

      setToast({ message: res.message || 'Questions imported successfully!', type: 'success' });
      setStep(3);
    } catch (err) {
      setToast({ message: err.message || 'Bulk import failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: Final Publish
  const handlePublishExam = async () => {
    setLoading(true);
    try {
      await apiFetch(`/exams/${createdExamId}/publish`, { method: 'POST' });
      setToast({ message: 'Exam published successfully!', type: 'success' });
      setStep(4);
    } catch (err) {
      setToast({ message: err.message || 'Failed to publish exam', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const copyStudentUrl = () => {
    const url = `${window.location.origin}/exam/${createdPublicId}`;
    navigator.clipboard.writeText(url);
    setToast({ message: 'Student exam URL copied to clipboard!', type: 'success' });
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Breadcrumb & Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
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
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4f46e5' }}>
          Step {step} of 4
        </span>
      </div>

      {/* Step Indicator Progress Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '0.5rem',
        marginBottom: '2rem'
      }}>
        {[
          { num: 1, label: '1. Basic Details' },
          { num: 2, label: '2. Bulk Import' },
          { num: 3, label: '3. Review' },
          { num: 4, label: '4. Publish & Share' }
        ].map(s => (
          <div
            key={s.num}
            style={{
              padding: '0.65rem',
              borderRadius: '8px',
              backgroundColor: step >= s.num ? '#4f46e5' : '#f1f5f9',
              color: step >= s.num ? '#ffffff' : '#64748b',
              fontWeight: 700,
              fontSize: '0.8rem',
              textAlign: 'center',
              transition: 'background-color 0.2s'
            }}
          >
            {s.label}
          </div>
        ))}
      </div>

      {/* ================= STEP 1: BASIC DETAILS ================= */}
      {step === 1 && (
        <form onSubmit={handleSaveBasicDetails} style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '2rem',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem 0' }}>
              Step 1: Examination Configuration
            </h2>
            <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>
              Set up the examination title, duration, security parameters, and submission rules.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
            {/* Title */}
            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.35rem' }}>
                Exam Title <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., C Programming Mid-Term Assessment"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.95rem'
                }}
              />
            </div>

            {/* Subject */}
            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.35rem' }}>
                Subject / Topic
              </label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                placeholder="e.g., C Programming, Data Structures"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.95rem'
                }}
              />
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.35rem' }}>
              Description (Optional)
            </label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="e.g., Covers loops, arrays, functions, pointers and control structures."
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.95rem'
              }}
            />
          </div>

          {/* Instructions */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.35rem' }}>
              Student Instructions <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              name="instructions"
              value={formData.instructions}
              onChange={handleInputChange}
              rows={4}
              required
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                lineHeight: 1.5
              }}
            />
          </div>

          {/* Duration & Passing Marks */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.35rem' }}>
                Duration (Minutes)
              </label>
              <input
                type="number"
                name="durationMinutes"
                value={formData.durationMinutes}
                onChange={handleInputChange}
                min={5}
                max={300}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.95rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.35rem' }}>
                Passing Marks
              </label>
              <input
                type="number"
                name="passingMarks"
                value={formData.passingMarks}
                onChange={handleInputChange}
                min={0}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.95rem'
                }}
              />
            </div>
          </div>

          {/* Security & Feature Toggles */}
          <div style={{
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '1.75rem',
            border: '1px solid #e2e8f0'
          }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155', margin: '0 0 1rem 0' }}>
              Security, Monitoring & Evaluation Settings
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="fullscreenRequired"
                  checked={formData.fullscreenRequired}
                  onChange={handleInputChange}
                  style={{ width: '18px', height: '18px', accentColor: '#4f46e5' }}
                />
                <span><strong>Fullscreen Required</strong> (Prompts browser fullscreen)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="focusMonitoringEnabled"
                  checked={formData.focusMonitoringEnabled}
                  onChange={handleInputChange}
                  style={{ width: '18px', height: '18px', accentColor: '#4f46e5' }}
                />
                <span><strong>Tab-Switch Monitoring</strong> (Tracks focus loss)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="showScoreAfterSubmission"
                  checked={formData.showScoreAfterSubmission}
                  onChange={handleInputChange}
                  style={{ width: '18px', height: '18px', accentColor: '#4f46e5' }}
                />
                <span><strong>Instant Score</strong> (Student sees score immediately)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="revealAnswersAfterSubmission"
                  checked={formData.revealAnswersAfterSubmission}
                  onChange={handleInputChange}
                  style={{ width: '18px', height: '18px', accentColor: '#4f46e5' }}
                />
                <span><strong>Reveal Answer Keys</strong> (Post-submission review)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="negativeMarkingEnabled"
                  checked={formData.negativeMarkingEnabled}
                  onChange={handleInputChange}
                  style={{ width: '18px', height: '18px', accentColor: '#4f46e5' }}
                />
                <span><strong>Negative Marking</strong> (Deducts on wrong answer)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="questionNavigationEnabled"
                  checked={formData.questionNavigationEnabled}
                  onChange={handleInputChange}
                  style={{ width: '18px', height: '18px', accentColor: '#4f46e5' }}
                />
                <span><strong>Free Question Navigation</strong> (Prev / Next buttons)</span>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontWeight: 700 }}
            >
              <span>Continue to Question Import</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </form>
      )}

      {/* ================= STEP 2: BULK IMPORT ================= */}
      {step === 2 && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '2rem',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ backgroundColor: '#10b981', color: '#ffffff', fontSize: '0.75rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                CRITICAL HIGHEST PRIORITY FEATURE
              </span>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Step 2: Bulk Question Importer
              </h2>
            </div>
            <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>
              Copy and paste multiple MCQs and fill-in-the-blank questions into the large text area below. The parser supports both Tagged format and Plain-text Numbered format.
            </p>
          </div>

          {/* Format selector templates */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            backgroundColor: '#f1f5f9',
            padding: '0.85rem 1.25rem',
            borderRadius: '10px',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
              <Sparkles size={16} style={{ color: '#4f46e5' }} />
              <span>Load Working Sample Format:</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setBulkText(SAMPLE_FORMAT_A)}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
              >
                Load Format A (Tagged: TYPE, Q, A, B...)
              </button>
              <button
                type="button"
                onClick={() => setBulkText(SAMPLE_FORMAT_B)}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
              >
                Load Format B (Numbered: 1. ..., 2. ...)
              </button>
              <button
                type="button"
                onClick={() => setBulkText('')}
                style={{
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.4rem 0.65rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Large Text Area */}
          <div style={{ marginBottom: '1.25rem' }}>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder="Paste your questions here... e.g.:&#10;&#10;1. Which function is the entry point of a C program?&#10;A. start()&#10;B. main()&#10;C. begin()&#10;D. run()&#10;Answer: B&#10;Marks: 2&#10;&#10;2. The function used for formatted output is ______.&#10;Type: FILL&#10;Answer: printf&#10;Marks: 2"
              rows={14}
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.9rem',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                lineHeight: 1.5,
                backgroundColor: '#ffffff'
              }}
            />
          </div>

          {/* Actions: Parse Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <ArrowLeft size={16} />
              <span>Back to Details</span>
            </button>

            <button
              type="button"
              onClick={handleParseQuestions}
              disabled={parsing || !bulkText.trim()}
              className="btn"
              style={{
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 700,
                padding: '0.75rem 1.5rem',
                borderRadius: '8px'
              }}
            >
              <FileText size={18} />
              <span>{parsing ? 'Parsing...' : 'Parse & Validate Questions'}</span>
            </button>
          </div>

          {/* Live Parsed Preview & Error Reporting */}
          {parsedPreview && (
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.5rem',
              marginTop: '1.5rem'
            }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Question Import Preview
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '0.3rem 0.65rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>
                    {parsedPreview.validCount} Valid Questions
                  </span>
                  {parsedPreview.invalidCount > 0 && (
                    <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '0.3rem 0.65rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>
                      {parsedPreview.invalidCount} Validation Errors
                    </span>
                  )}
                  <span style={{ backgroundColor: '#e0e7ff', color: '#3730a3', padding: '0.3rem 0.65rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>
                    Total Marks: {parsedPreview.totalMarks}
                  </span>
                </div>
              </div>

              {/* Validation Errors Callout */}
              {parsedPreview.errors.length > 0 && (
                <div style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecdd3',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1.25rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    <AlertCircle size={18} />
                    <span>Errors detected in pasted text. Please fix in the textarea above:</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#991b1b', fontSize: '0.85rem' }}>
                    {parsedPreview.errors.map((err, i) => (
                      <li key={i} style={{ marginBottom: '0.25rem' }}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Parsed List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto' }}>
                {parsedPreview.questions.map((q, i) => (
                  <div
                    key={i}
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '1rem'
                    }}
                  >
                    <div style={{ flex: '1' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#4f46e5' }}>
                          Q{i + 1}.
                        </span>
                        <span style={{
                          backgroundColor: q.type === 'mcq' ? '#e0e7ff' : '#fef3c7',
                          color: q.type === 'mcq' ? '#3730a3' : '#b45309',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          textTransform: 'uppercase'
                        }}>
                          {q.type === 'mcq' ? 'MCQ' : 'Fill in Blank'}
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                          {q.marks} Marks
                        </span>
                      </div>
                      <QuestionContent text={q.text} compact />

                      {/* Options */}
                      {q.type === 'mcq' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.35rem', fontSize: '0.8rem', color: '#475569' }}>
                          {q.options.map((opt, optIdx) => {
                            const letter = String.fromCharCode(65 + optIdx);
                            const isCorrect = q.correctAnswer === letter;
                            return (
                              <div
                                key={optIdx}
                                style={{
                                  padding: '0.35rem 0.5rem',
                                  borderRadius: '6px',
                                  backgroundColor: isCorrect ? '#ecfdf5' : '#f8fafc',
                                  border: isCorrect ? '1px solid #a7f3d0' : '1px solid #f1f5f9',
                                  color: isCorrect ? '#065f46' : '#475569',
                                  fontWeight: isCorrect ? 700 : 500
                                }}
                              >
                                <strong>{letter}.</strong> {opt} {isCorrect && '✓ (Key)'}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Fill in blank answer */}
                      {q.type === 'fill_blank' && (
                        <div style={{ fontSize: '0.8rem', color: '#065f46', backgroundColor: '#ecfdf5', padding: '0.35rem 0.65rem', borderRadius: '6px', display: 'inline-block' }}>
                          Accepted Answer: <strong>{q.correctAnswer}</strong>
                          {q.acceptedAnswers.length > 1 && ` (or ${q.acceptedAnswers.join(', ')})`}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Confirm Import Button */}
              {parsedPreview.validCount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    onClick={handleImportQuestions}
                    disabled={loading}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontWeight: 700 }}
                  >
                    <span>Import {parsedPreview.validCount} Questions</span>
                    <ArrowRight size={18} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================= STEP 3: REVIEW & PUBLISH ================= */}
      {step === 3 && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '2rem',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem 0' }}>
              Step 3: Review Examination
            </h2>
            <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>
              Review your examination details and question distribution before publishing.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Total Questions</span>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', margin: '0.25rem 0 0 0' }}>
                {parsedPreview ? parsedPreview.validCount : 0}
              </h3>
            </div>
            <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Total Marks</span>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', margin: '0.25rem 0 0 0' }}>
                {parsedPreview ? parsedPreview.totalMarks : 0}
              </h3>
            </div>
            <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Duration</span>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b', margin: '0.25rem 0 0 0' }}>
                {formData.durationMinutes} <span style={{ fontSize: '1rem' }}>mins</span>
              </h3>
            </div>
            <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Allowed Attempts</span>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#8b5cf6', margin: '0.25rem 0 0 0' }}>
                1 <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>/ Reg No</span>
              </h3>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <ArrowLeft size={16} />
              <span>Back to Question Import</span>
            </button>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => navigate('/admin/exams')}
                className="btn btn-secondary"
              >
                Save as Draft & Exit
              </button>
              <button
                type="button"
                onClick={handlePublishExam}
                disabled={loading}
                className="btn"
                style={{
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: 700,
                  padding: '0.75rem 1.75rem',
                  borderRadius: '8px'
                }}
              >
                <CheckCircle2 size={18} />
                <span>Publish Exam Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= STEP 4: PUBLISHED & SHARE URL ================= */}
      {step === 4 && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '2.5rem 2rem',
          textAlign: 'center',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            backgroundColor: '#dcfce7',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto',
            color: '#15803d'
          }}>
            <Check size={36} />
          </div>

          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
            Examination Published Successfully!
          </h2>
          <p style={{ color: '#64748b', maxWidth: '520px', margin: '0 auto 1.75rem auto', fontSize: '0.95rem' }}>
            The exam is now live. Share the unique student URL below with eligible students. Each student registration number (261FA0XXXX) is permitted exactly one verified attempt.
          </p>

          {/* Shareable Link Box */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1.5px solid #cbd5e1',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            maxWidth: '650px',
            margin: '0 auto 2rem auto'
          }}>
            <div style={{ textAlign: 'left', flex: '1', overflow: 'hidden' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Student Shareable Link:
              </span>
              <div style={{
                fontSize: '0.95rem',
                fontWeight: 600,
                color: '#4f46e5',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {window.location.origin}/exam/{createdPublicId}
              </div>
            </div>

            <button
              type="button"
              onClick={copyStudentUrl}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem' }}
            >
              <Copy size={16} />
              <span>Copy Link</span>
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <Link to="/admin/exams" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
              Back to Exam Dashboard
            </Link>
            <Link to={`/admin/exams/${createdExamId}/results`} className="btn btn-primary" style={{ textDecoration: 'none' }}>
              View Live Results Hub
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
