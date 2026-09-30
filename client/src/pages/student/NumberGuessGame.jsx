import React, { useState, useEffect, useRef } from 'react';
import { 
  Gamepad2, 
  Sparkles, 
  RotateCcw, 
  ArrowUp, 
  ArrowDown, 
  Trophy, 
  CheckCircle2, 
  HelpCircle, 
  Zap,
  Target,
  Share2,
  Check
} from 'lucide-react';
import Toast from '../../components/Toast';

export default function NumberGuessGame() {
  const [targetNumber, setTargetNumber] = useState(null);
  const [guessInput, setGuessInput] = useState('');
  const [minRange, setMinRange] = useState(1);
  const [maxRange, setMaxRange] = useState(100);
  const [attempts, setAttempts] = useState(0);
  const [guessHistory, setGuessHistory] = useState([]);
  const [gameState, setGameState] = useState('playing'); // 'playing' | 'won'
  const [lastFeedback, setLastFeedback] = useState(null); // { type: 'high' | 'low' | 'correct', number: 45 }
  const [toast, setToast] = useState(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);

  // Initialize game on mount
  useEffect(() => {
    startNewGame();
  }, []);

  const startNewGame = () => {
    const randomNum = Math.floor(Math.random() * 100) + 1;
    setTargetNumber(randomNum);
    setMinRange(1);
    setMaxRange(100);
    setAttempts(0);
    setGuessHistory([]);
    setGameState('playing');
    setLastFeedback(null);
    setGuessInput('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleGuessSubmit = (e) => {
    e.preventDefault();
    if (gameState === 'won') return;

    const num = parseInt(guessInput, 10);

    if (isNaN(num) || num < 1 || num > 100) {
      setToast({ message: 'Please enter a valid number between 1 and 100.', type: 'error' });
      return;
    }

    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    if (num === targetNumber) {
      setGameState('won');
      setLastFeedback({ type: 'correct', number: num });
      setGuessHistory(prev => [{ number: num, result: 'correct', attempt: newAttempts }, ...prev]);
    } else if (num > targetNumber) {
      setLastFeedback({ type: 'high', number: num });
      if (num < maxRange) {
        setMaxRange(num - 1);
      }
      setGuessHistory(prev => [{ number: num, result: 'too_high', attempt: newAttempts }, ...prev]);
    } else {
      setLastFeedback({ type: 'low', number: num });
      if (num > minRange) {
        setMinRange(num + 1);
      }
      setGuessHistory(prev => [{ number: num, result: 'too_low', attempt: newAttempts }, ...prev]);
    }

    setGuessInput('');
  };

  const handleCopyLink = () => {
    const gameUrl = window.location.href;
    navigator.clipboard.writeText(gameUrl);
    setCopied(true);
    setToast({ message: 'Game link copied! Share with your friends.', type: 'success' });
    setTimeout(() => setCopied(false), 2500);
  };

  const getPerformanceBadge = (totalAttempts) => {
    if (totalAttempts <= 4) return { title: 'Genius Guesser! 🧠✨', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
    if (totalAttempts <= 7) return { title: 'Master Mind! 🎯⚡', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)' };
    if (totalAttempts <= 10) return { title: 'Great Job! 👏', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
    return { title: 'Never Gave Up! 💪', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' };
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '520px', margin: '0 auto', paddingBottom: '3rem' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header Banner */}
      <div className="card" style={{ padding: '1.5rem', textAlign: 'center', marginBottom: '1.25rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.08, pointerEvents: 'none' }}>
          <Gamepad2 size={140} color="#6366f1" />
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.85rem', borderRadius: '50px', background: 'rgba(99, 102, 241, 0.1)', color: '#4f46e5', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.75rem' }}>
          <Sparkles size={14} />
          <span>Interactive Student Game</span>
        </div>

        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
          Number Guessing Challenge 🎯
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '380px', margin: '0 auto 1rem' }}>
          The system selected a secret number between <strong>1 and 100</strong>. Can you guess what it is?
        </p>

        {/* Share button */}
        <button 
          onClick={handleCopyLink} 
          className="btn btn-secondary" 
          style={{ fontSize: '0.825rem', padding: '0.45rem 0.9rem', gap: '0.4rem', margin: '0 auto' }}
        >
          {copied ? <Check size={15} color="#10b981" /> : <Share2 size={15} />}
          <span>{copied ? 'Link Copied!' : 'Share Game Link'}</span>
        </button>
      </div>

      {/* Main Game Card */}
      {gameState === 'playing' ? (
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
          {/* Active Range Shrink Bar */}
          <div style={{ marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Possible Range
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4f46e5' }}>
                Attempts: {attempts}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#3b82f6', background: '#dbeafe', padding: '0.2rem 0.75rem', borderRadius: '8px' }}>
                {minRange}
              </span>
              <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#94a3b8' }}>➔</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ec4899', background: '#fce7f3', padding: '0.2rem 0.75rem', borderRadius: '8px' }}>
                {maxRange}
              </span>
            </div>
          </div>

          {/* Feedback Display */}
          {lastFeedback && (
            <div className="animate-scale-in" style={{
              padding: '1rem',
              borderRadius: '12px',
              textAlign: 'center',
              marginBottom: '1.5rem',
              background: lastFeedback.type === 'high' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(59, 130, 246, 0.08)',
              border: `1px solid ${lastFeedback.type === 'high' ? '#fca5a5' : '#93c5fd'}`
            }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 700, color: lastFeedback.type === 'high' ? '#dc2626' : '#2563eb' }}>
                {lastFeedback.type === 'high' ? <ArrowDown size={22} className="animate-bounce" /> : <ArrowUp size={22} className="animate-bounce" />}
                <span>{lastFeedback.number} is TOO {lastFeedback.type === 'high' ? 'HIGH! ⬇️' : 'LOW! ⬆️'}</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
                Try a {lastFeedback.type === 'high' ? 'smaller' : 'larger'} number between {minRange} and {maxRange}.
              </p>
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleGuessSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label htmlFor="guessInput" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                Enter Your Guess (1 - 100)
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  id="guessInput"
                  ref={inputRef}
                  type="number"
                  min="1"
                  max="100"
                  placeholder="e.g. 50"
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  style={{
                    flex: 1,
                    fontSize: '1.25rem',
                    padding: '0.85rem 1rem',
                    textAlign: 'center',
                    fontWeight: 700,
                    borderRadius: '12px',
                    border: '2px solid #cbd5e1',
                    outline: 'none'
                  }}
                  autoFocus
                />
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ padding: '0 1.5rem', fontSize: '1rem', borderRadius: '12px' }}
                >
                  Guess!
                </button>
              </div>
            </div>

            {/* Quick Helper Chips */}
            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              {[10, 25, 50, 75, 90].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setGuessInput(preset.toString())}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
          </form>
        </div>
      ) : (
        /* Victory Screen */
        <div className="card animate-scale-in" style={{ padding: '2rem 1.5rem', textAlign: 'center', marginBottom: '1.25rem', border: '2px solid #10b981' }}>
          <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Trophy size={40} color="#10b981" />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>
            Congratulations! 🎉
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '1rem' }}>
            You guessed the secret number <strong style={{ color: '#10b981', fontSize: '1.1rem' }}>{targetNumber}</strong> correctly!
          </p>

          {/* Performance Badge */}
          {(() => {
            const badge = getPerformanceBadge(attempts);
            return (
              <div style={{ background: badge.bg, border: `1px solid ${badge.color}`, borderRadius: '12px', padding: '0.85rem', marginBottom: '1.5rem' }}>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: badge.color, marginBottom: '0.25rem' }}>
                  {badge.title}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#334155' }}>
                  Total Attempts: <strong>{attempts}</strong>
                </div>
              </div>
            );
          })()}

          <button 
            onClick={startNewGame} 
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', gap: '0.5rem', borderRadius: '12px' }}
          >
            <RotateCcw size={18} />
            <span>Play Again</span>
          </button>
        </div>
      )}

      {/* Guess History */}
      {guessHistory.length > 0 && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#475569', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Attempt History ({guessHistory.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {guessHistory.map((item, idx) => (
              <div 
                key={idx} 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'space-between',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  background: item.result === 'correct' ? '#ecfdf5' : item.result === 'too_high' ? '#fef2f2' : '#eff6ff',
                  border: `1px solid ${item.result === 'correct' ? '#a7f3d0' : item.result === 'too_high' ? '#fecaca' : '#bfdbfe'}`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>
                    #{item.attempt}
                  </span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                    {item.number}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 600, color: item.result === 'correct' ? '#059669' : item.result === 'too_high' ? '#dc2626' : '#2563eb' }}>
                  {item.result === 'correct' ? (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Correct!</span>
                    </>
                  ) : item.result === 'too_high' ? (
                    <>
                      <ArrowDown size={15} />
                      <span>Too High</span>
                    </>
                  ) : (
                    <>
                      <ArrowUp size={15} />
                      <span>Too Low</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
