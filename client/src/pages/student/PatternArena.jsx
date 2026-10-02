import React, { useState, useEffect, useRef } from 'react';
import { 
  Gamepad2, 
  Sparkles, 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  HelpCircle, 
  Trophy, 
  Flame, 
  Bug, 
  Eye, 
  Zap, 
  Code2, 
  ArrowRight, 
  ChevronRight, 
  Share2, 
  Check, 
  AlertCircle,
  Lightbulb,
  Award,
  Layers,
  StepForward,
  PlayCircle,
  FastForward,
  Monitor,
  Terminal,
  Activity,
  ArrowDown
} from 'lucide-react';
import confetti from 'canvas-confetti';
import Toast from '../../components/Toast';

// 5 Pattern Definitions
const PATTERN_LEVELS = [
  {
    id: 'square',
    level: 1,
    title: 'LEVEL 1: Square Pattern',
    subtitle: 'Outer loop = 5 rows, Inner loop = 5 columns',
    concept: 'Fixed Rows & Columns (5 x 5)',
    defaultCode: `#include <stdio.h>

int main() {
    for (int i = 1; i <= 5; i++) {
        for (int j = 1; j <= 5; j++) {
            printf("* ");
        }
        printf("\\n");
    }
    return 0;
}`,
    explanation: 'Both the outer loop (rows) and inner loop (columns) run exactly 5 times. That is why it forms a 5x5 square grid.'
  },
  {
    id: 'increasing_triangle',
    level: 2,
    title: 'LEVEL 2: Increasing Triangle',
    subtitle: 'Inner loop condition depends on row number (j <= i)',
    concept: 'j <= i (Columns grow with Row number)',
    defaultCode: `#include <stdio.h>

int main() {
    for (int i = 1; i <= 5; i++) {
        for (int j = 1; j <= i; j++) {
            printf("* ");
        }
        printf("\\n");
    }
    return 0;
}`,
    explanation: 'Because j <= i, Row 1 prints 1 symbol, Row 2 prints 2 symbols, up to Row 5 printing 5 symbols.'
  },
  {
    id: 'decreasing_triangle',
    level: 3,
    title: 'LEVEL 3: Decreasing Triangle',
    subtitle: 'Outer loop counts down (i = 5; i >= 1; i--)',
    concept: 'i counts DOWN from 5 to 1',
    defaultCode: `#include <stdio.h>

int main() {
    for (int i = 5; i >= 1; i--) {
        for (int j = 1; j <= i; j++) {
            printf("* ");
        }
        printf("\\n");
    }
    return 0;
}`,
    explanation: 'Starting with i = 5, Row 1 prints 5 symbols. As i decreases each row (i--), the row length shrinks down to 1.'
  },
  {
    id: 'right_aligned_triangle',
    level: 4,
    title: 'LEVEL 4: Right-Aligned Triangle',
    subtitle: 'Spaces before symbols (k loop prints spaces)',
    concept: 'Space loop (5-i) + Symbol loop (i)',
    defaultCode: `#include <stdio.h>

int main() {
    int rows = 5;
    for (int i = 1; i <= rows; i++) {
        for (int k = 1; k <= rows - i; k++) {
            printf("  ");
        }
        for (int j = 1; j <= i; j++) {
            printf("* ");
        }
        printf("\\n");
    }
    return 0;
}`,
    explanation: 'Row 1 prints (5 - 1) = 4 double-spaces then 1 star. Row 5 prints 0 spaces and 5 stars, right-aligning the triangle.'
  },
  {
    id: 'pyramid',
    level: 5,
    title: 'LEVEL 5: Pyramid Pattern',
    subtitle: 'Spaces (rows-i) + Odd Symbols (2*i - 1)',
    concept: 'Center Alignment with (2*i - 1) formula',
    defaultCode: `#include <stdio.h>

int main() {
    int rows = 5;
    for (int i = 1; i <= rows; i++) {
        for (int k = 1; k <= rows - i; k++) {
            printf(" ");
        }
        for (int j = 1; j <= (2 * i - 1); j++) {
            printf("*");
        }
        printf("\\n");
    }
    return 0;
}`,
    explanation: 'Odd numbers formula (2*i - 1) produces 1, 3, 5, 7, 9 symbols centered by leading spaces.'
  }
];

const AVAILABLE_SYMBOLS = ['⭐', '❤️', '🍕', '🚀', '😂', '🐱', '👨‍🎓', '*', '#', 'A'];

// -------------------------------------------------------------
// DYNAMIC MICRO-STEP TRACE GENERATOR FOR C PATTERN CODE
// -------------------------------------------------------------
function parseAndGenerateMicroSteps(sourceCode, customSymbol = null) {
  const lines = sourceCode.split('\n');
  
  // Locate line numbers
  let outerLoopLine = 4;
  let innerLoopLine = 5;
  let spaceLoopLine = 0;
  let printSymbolLine = 6;
  let printNewlineLine = 8;

  lines.forEach((lineText, index) => {
    const lineNum = index + 1;
    if (lineText.includes('for') && (lineText.includes('i =') || lineText.includes('int i'))) {
      outerLoopLine = lineNum;
    } else if (lineText.includes('for') && (lineText.includes('k =') || lineText.includes('int k'))) {
      spaceLoopLine = lineNum;
    } else if (lineText.includes('for') && (lineText.includes('j =') || lineText.includes('int j'))) {
      innerLoopLine = lineNum;
    } else if (lineText.includes('printf') && !lineText.includes('\\n')) {
      printSymbolLine = lineNum;
    } else if (lineText.includes('printf') && lineText.includes('\\n')) {
      printNewlineLine = lineNum;
    }
  });

  // Extract outer loop bounds
  let outerStart = 1;
  let outerLimit = 5;
  let isOuterDecreasing = sourceCode.includes('i--');
  let outerLimitMatch = sourceCode.match(/i\s*<=\s*(\d+)/) || sourceCode.match(/i\s*<\s*(\d+)/) || sourceCode.match(/rows\s*=\s*(\d+)/);
  if (outerLimitMatch) {
    outerLimit = parseInt(outerLimitMatch[1], 10);
    if (sourceCode.includes('i < ') && !sourceCode.includes('i <= ')) {
      outerLimit = outerLimit - 1;
    }
  }
  if (isOuterDecreasing) {
    let startMatch = sourceCode.match(/i\s*=\s*(\d+)/);
    if (startMatch) outerStart = parseInt(startMatch[1], 10);
  }

  // Extract inner loop bounds
  let innerCondType = 'i'; // 'i' | 'number' | 'pyramid' | 'strict_less'
  if (sourceCode.includes('j <= 5')) innerCondType = '5';
  else if (sourceCode.includes('j <= 7')) innerCondType = '7';
  else if (sourceCode.includes('2 * i - 1') || sourceCode.includes('2*i - 1')) innerCondType = 'pyramid';
  else if (/j\s*<\s*i/.test(sourceCode) && !/j\s*<=\s*i/.test(sourceCode)) innerCondType = 'strict_less';
  else if (sourceCode.match(/j\s*<=\s*(\d+)/)) {
    innerCondType = sourceCode.match(/j\s*<=\s*(\d+)/)[1];
  }

  // Extract print symbol text
  let printText = '* ';
  let printfMatch = sourceCode.match(/printf\(\s*"([^"]+)"\s*\)/);
  if (printfMatch && !printfMatch[1].includes('\\n')) {
    printText = printfMatch[1];
  }
  if (customSymbol) {
    printText = customSymbol.length === 1 && customSymbol !== '*' && customSymbol !== '#' && customSymbol !== 'A' ? customSymbol + ' ' : customSymbol;
  }

  const steps = [];
  let terminalBuffer = '';

  // STEP 1: Outer loop init
  steps.push({
    line: outerLoopLine,
    type: 'OUTER_INIT',
    title: '🟢 INITIALIZING OUTER LOOP',
    snippet: isOuterDecreasing ? `int i = ${outerStart}` : `int i = ${outerStart}`,
    variables: { i: outerStart, j: undefined },
    condition: null,
    outputAdded: null,
    terminalBufferSoFar: '',
    whyExplanation: `The outer loop variable i starts at ${outerStart}. Variable i represents the current ROW.`
  });

  // Loop execution
  let iVal = outerStart;
  let safetyCounter = 0;

  const checkOuterCond = () => {
    if (isOuterDecreasing) return iVal >= 1;
    return iVal <= outerLimit;
  };

  while (checkOuterCond() && safetyCounter < 300) {
    safetyCounter++;

    // Outer loop condition check
    const outerCondExpr = isOuterDecreasing ? `i >= 1` : `i <= ${outerLimit}`;
    const outerCondEval = `${iVal} ${isOuterDecreasing ? '>=' : '<='} ${isOuterDecreasing ? 1 : outerLimit}`;
    
    steps.push({
      line: outerLoopLine,
      type: 'OUTER_COND',
      title: '🔵 CHECKING OUTER LOOP CONDITION',
      snippet: outerCondExpr,
      variables: { i: iVal, j: undefined },
      condition: {
        expression: outerCondExpr,
        evaluated: outerCondEval,
        result: true,
        resultText: 'TRUE ✅'
      },
      outputAdded: null,
      terminalBufferSoFar: terminalBuffer,
      whyExplanation: `Condition ${outerCondEval} is TRUE. Row ${iVal} will now execute.`
    });

    // Space loop execution (if present)
    if (spaceLoopLine > 0) {
      let spaceCount = Math.max(0, outerLimit - iVal);
      for (let k = 1; k <= spaceCount; k++) {
        const spaceStr = sourceCode.includes('printf("  ")') ? '  ' : ' ';
        terminalBuffer += spaceStr;
        steps.push({
          line: spaceLoopLine,
          type: 'PRINT_SPACE',
          title: '⚪ PRINTING LEADING SPACES',
          snippet: `printf("${spaceStr}")`,
          variables: { i: iVal, k, j: undefined },
          condition: null,
          outputAdded: spaceStr,
          terminalBufferSoFar: terminalBuffer,
          whyExplanation: `Printing ${spaceCount} spaces for right/center alignment.`
        });
      }
    }

    // Inner loop init
    steps.push({
      line: innerLoopLine,
      type: 'INNER_INIT',
      title: '🟣 INITIALIZING INNER LOOP',
      snippet: 'int j = 1',
      variables: { i: iVal, j: 1 },
      condition: null,
      outputAdded: null,
      terminalBufferSoFar: terminalBuffer,
      whyExplanation: `The inner loop variable j resets to 1 for Row ${iVal}. Variable j controls how many symbols are printed.`
    });

    // Calculate max inner loop limit for current i
    let currentJLimit = iVal;
    let limitExprStr = 'j <= i';
    if (innerCondType === '5') { currentJLimit = 5; limitExprStr = 'j <= 5'; }
    else if (innerCondType === '7') { currentJLimit = 7; limitExprStr = 'j <= 7'; }
    else if (innerCondType === 'pyramid') { currentJLimit = 2 * iVal - 1; limitExprStr = `j <= (2 * i - 1)`; }
    else if (innerCondType === 'strict_less') { currentJLimit = iVal - 1; limitExprStr = `j < i`; }
    else if (!isNaN(parseInt(innerCondType, 10))) { currentJLimit = parseInt(innerCondType, 10); limitExprStr = `j <= ${currentJLimit}`; }

    let jVal = 1;
    let innerSafety = 0;

    while (jVal <= currentJLimit && innerSafety < 50) {
      innerSafety++;

      // Inner loop condition TRUE
      steps.push({
        line: innerLoopLine,
        type: 'INNER_COND',
        title: '🟡 CHECKING INNER LOOP CONDITION',
        snippet: limitExprStr,
        variables: { i: iVal, j: jVal },
        condition: {
          expression: limitExprStr,
          evaluated: innerCondType === 'pyramid' ? `${jVal} <= ${2 * iVal - 1}` : `${jVal} <= ${innerCondType === 'strict_less' ? iVal : (innerCondType === 'i' ? iVal : currentJLimit)}`,
          result: true,
          resultText: 'TRUE ✅'
        },
        outputAdded: null,
        terminalBufferSoFar: terminalBuffer,
        whyExplanation: `Because j (${jVal}) <= ${currentJLimit} is TRUE, we execute printf("${printText}").`
      });

      // Print symbol
      terminalBuffer += printText;
      steps.push({
        line: printSymbolLine,
        type: 'PRINT',
        title: '🟠 EXECUTING printf()',
        snippet: `printf("${printText}")`,
        variables: { i: iVal, j: jVal },
        condition: null,
        outputAdded: printText,
        terminalBufferSoFar: terminalBuffer,
        whyExplanation: `printf("${printText}") printed "${printText}" to output.`
      });

      // Increment j
      jVal++;
      steps.push({
        line: innerLoopLine,
        type: 'INNER_INC',
        title: '🔴 INCREMENTING j',
        snippet: 'j++',
        variables: { i: iVal, j: jVal },
        condition: null,
        outputAdded: null,
        terminalBufferSoFar: terminalBuffer,
        whyExplanation: `j increments to ${jVal}.`
      });
    }

    // Inner loop condition FALSE -> Exits
    steps.push({
      line: innerLoopLine,
      type: 'INNER_COND_FALSE',
      title: '🔴 INNER LOOP FINISHED (FALSE)',
      snippet: limitExprStr,
      variables: { i: iVal, j: jVal },
      condition: {
        expression: limitExprStr,
        evaluated: innerCondType === 'pyramid' ? `${jVal} <= ${2 * iVal - 1}` : `${jVal} <= ${innerCondType === 'strict_less' ? iVal : (innerCondType === 'i' ? iVal : currentJLimit)}`,
        result: false,
        resultText: 'FALSE ❌'
      },
      outputAdded: null,
      terminalBufferSoFar: terminalBuffer,
      whyExplanation: `j (${jVal}) is now greater than ${currentJLimit}. Inner loop terminates!`
    });

    // Print Newline
    terminalBuffer += '\n';
    steps.push({
      line: printNewlineLine,
      type: 'NEWLINE',
      title: '🔵 PRINTING NEW LINE',
      snippet: 'printf("\\n")',
      variables: { i: iVal, j: jVal },
      condition: null,
      outputAdded: '\n',
      terminalBufferSoFar: terminalBuffer,
      whyExplanation: `printf("\\n") moves the terminal cursor down to start Row ${isOuterDecreasing ? iVal - 1 : iVal + 1}.`
    });

    // Outer loop increment
    if (isOuterDecreasing) iVal--;
    else iVal++;

    steps.push({
      line: outerLoopLine,
      type: 'OUTER_INC',
      title: '🟣 INCREMENTING i (NEXT ROW)',
      snippet: isOuterDecreasing ? 'i--' : 'i++',
      variables: { i: iVal, j: undefined },
      condition: null,
      outputAdded: null,
      terminalBufferSoFar: terminalBuffer,
      whyExplanation: `Outer loop increments i to ${iVal}.`
    });
  }

  // Program Finish
  steps.push({
    line: lines.length - 1 || 10,
    type: 'PROGRAM_FINISH',
    title: '🎉 PROGRAM EXECUTION COMPLETED',
    snippet: 'return 0',
    variables: { i: iVal, j: undefined },
    condition: null,
    outputAdded: null,
    terminalBufferSoFar: terminalBuffer,
    whyExplanation: 'The outer loop condition evaluated to FALSE. The pattern is completely printed!'
  });

  return steps;
}

export default function PatternArena() {
  // Level State
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const activePattern = PATTERN_LEVELS[currentLevelIdx];

  // Editor & Symbol State
  const [code, setCode] = useState(activePattern.defaultCode);
  const [selectedSymbol, setSelectedSymbol] = useState('*');
  const [toast, setToast] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [xp, setXp] = useState(150);

  // Classroom Mode Toggle
  const [classroomMode, setClassroomMode] = useState(false);

  // Execution Simulator State
  const [traceSteps, setTraceSteps] = useState([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(700); // 1200ms (Slow), 700ms (Normal), 250ms (Fast)
  const timerRef = useRef(null);

  // Re-generate execution trace when code or symbol changes
  useEffect(() => {
    try {
      const generatedSteps = parseAndGenerateMicroSteps(code, selectedSymbol);
      setTraceSteps(generatedSteps);
      setCurrentStepIdx(0);
    } catch (err) {
      console.error('Trace parse error:', err);
    }
  }, [code, selectedSymbol]);

  // Level switch reset
  useEffect(() => {
    setCode(activePattern.defaultCode);
    setIsPlaying(false);
    setCurrentStepIdx(0);
  }, [currentLevelIdx]);

  // Auto-play timer effect
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentStepIdx((prev) => {
          if (prev >= traceSteps.length - 1) {
            setIsPlaying(false);
            clearInterval(timerRef.current);
            return prev;
          }
          return prev + 1;
        });
      }, speedMs);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying, traceSteps.length, speedMs]);

  const handleNextStep = () => {
    if (currentStepIdx < traceSteps.length - 1) {
      setCurrentStepIdx(prev => prev + 1);
    }
  };

  const handleTogglePlay = () => {
    if (currentStepIdx >= traceSteps.length - 1) {
      setCurrentStepIdx(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCode(activePattern.defaultCode);
    setCurrentStepIdx(0);
    setToast({ message: 'Simulator reset to original level state.', type: 'info' });
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setToast({ message: 'Pattern Arena share link copied to clipboard!', type: 'success' });
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const currentStep = traceSteps[currentStepIdx] || traceSteps[0] || {};
  const linesOfCode = code.split('\n');

  return (
    <div className="animate-fade-in" style={{ maxWidth: classroomMode ? '1400px' : '1240px', margin: '0 auto', paddingBottom: '4rem' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header Banner */}
      <div className="card" style={{ padding: classroomMode ? '1rem 1.5rem' : '1.5rem', marginBottom: '1.25rem', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', color: '#ffffff', borderRadius: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(99, 102, 241, 0.25)', padding: '0.35rem 0.85rem', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 700, color: '#a5b4fc', marginBottom: '0.5rem' }}>
              <Gamepad2 size={16} />
              <span>Visual C Loop Simulator</span>
            </div>
            <h1 style={{ fontSize: classroomMode ? '2rem' : '1.65rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.2rem' }}>
              🎮 PATTERN ARENA — C Execution Simulator
            </h1>
            <p style={{ fontSize: classroomMode ? '1rem' : '0.875rem', color: '#94a3b8' }}>
              Line-by-line nested loop execution: <strong>Outer loop = Rows</strong>, <strong>Inner loop = Columns</strong>!
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Classroom Mode Toggle */}
            <button
              onClick={() => setClassroomMode(!classroomMode)}
              style={{
                padding: '0.6rem 1rem',
                borderRadius: '10px',
                fontSize: '0.85rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: classroomMode ? '#10b981' : 'rgba(255,255,255,0.12)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Monitor size={16} />
              <span>{classroomMode ? '🎓 Classroom Mode ON' : '🎓 Enable Classroom Mode'}</span>
            </button>

            {/* Share Link */}
            <button onClick={handleCopyShareLink} className="btn btn-secondary" style={{ padding: '0.6rem 0.9rem', fontSize: '0.85rem', gap: '0.4rem', background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: 'none' }}>
              {copiedLink ? <Check size={16} color="#34d399" /> : <Share2 size={16} />}
              <span>{copiedLink ? 'Copied!' : 'Share'}</span>
            </button>
          </div>
        </div>

        {/* Level Navigation Bar */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {PATTERN_LEVELS.map((pattern, idx) => (
            <button
              key={pattern.id}
              onClick={() => setCurrentLevelIdx(idx)}
              style={{
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                border: 'none',
                background: idx === currentLevelIdx ? '#4f46e5' : 'rgba(255,255,255,0.08)',
                color: idx === currentLevelIdx ? '#ffffff' : '#cbd5e1'
              }}
            >
              {pattern.title.split(':')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* PLAYBACK CONTROLS TOOLBAR */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem', background: '#ffffff', border: '2px solid #6366f1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Main Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button 
            onClick={handleTogglePlay}
            className="btn btn-primary"
            style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem', gap: '0.5rem', borderRadius: '10px', background: isPlaying ? '#ef4444' : '#4f46e5' }}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            <span>{isPlaying ? 'Pause' : '▶ Run Simulator'}</span>
          </button>

          <button 
            onClick={handleNextStep}
            disabled={isPlaying || currentStepIdx >= traceSteps.length - 1}
            className="btn btn-secondary"
            style={{ padding: '0.65rem 1.1rem', fontSize: '0.9rem', gap: '0.4rem', borderRadius: '10px' }}
          >
            <StepForward size={18} />
            <span>⏭ Next Step</span>
          </button>

          <button 
            onClick={handleReset}
            className="btn btn-outline"
            style={{ padding: '0.65rem 1rem', fontSize: '0.9rem', gap: '0.4rem', borderRadius: '10px' }}
          >
            <RotateCcw size={16} />
            <span>Reset</span>
          </button>
        </div>

        {/* Speed Selector & Step Counter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Speed:</span>
            {[
              { label: '🐢 Slow', val: 1200 },
              { label: '▶ Normal', val: 700 },
              { label: '⚡ Fast', val: 250 }
            ].map(sp => (
              <button
                key={sp.val}
                onClick={() => setSpeedMs(sp.val)}
                style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: speedMs === sp.val ? '#4f46e5' : '#f1f5f9',
                  color: speedMs === sp.val ? '#ffffff' : '#475569'
                }}
              >
                {sp.label}
              </button>
            ))}
          </div>

          <div style={{ background: '#f8fafc', padding: '0.4rem 0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 800, color: '#3b82f6' }}>
            Step: {currentStepIdx + 1} / {traceSteps.length || 1}
          </div>
        </div>
      </div>

      {/* MAIN TEACHING GRID (2 Columns: Code Editor vs Live Execution) */}
      <div style={{ display: 'grid', gridTemplateColumns: classroomMode ? '1fr 1fr' : 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        
        {/* LEFT COLUMN: ACTIVE C CODE EDITOR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="card" style={{ padding: '1.25rem', background: '#0f172a', color: '#f8fafc', borderRadius: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #334155', paddingBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Code2 size={18} />
                <span>Line-by-Line C Code Execution</span>
              </span>

              {/* Symbol Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Symbol:</span>
                <select
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                  style={{ background: '#1e293b', color: '#ffffff', border: '1px solid #475569', borderRadius: '6px', padding: '0.2rem 0.5rem', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
                >
                  {AVAILABLE_SYMBOLS.map(sym => (
                    <option key={sym} value={sym}>{sym}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Line-by-Line Highlight Code Visualizer */}
            <div style={{ fontFamily: 'monospace', fontSize: classroomMode ? '1.05rem' : '0.9rem', lineHeight: '1.7', background: '#090d16', padding: '0.75rem', borderRadius: '10px', overflowX: 'auto' }}>
              {linesOfCode.map((lineText, idx) => {
                const lineNum = idx + 1;
                const isActiveLine = currentStep.line === lineNum;
                return (
                  <div 
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '6px',
                      background: isActiveLine ? 'rgba(99, 102, 241, 0.35)' : 'transparent',
                      borderLeft: isActiveLine ? '4px solid #6366f1' : '4px solid transparent',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ width: '32px', color: isActiveLine ? '#a5b4fc' : '#475569', fontSize: '0.75rem', userSelect: 'none', fontWeight: 700 }}>
                      {lineNum}
                    </span>
                    <span style={{ width: '24px', color: '#fbbf24', fontWeight: 800 }}>
                      {isActiveLine ? '👉' : ''}
                    </span>
                    <span style={{ color: isActiveLine ? '#ffffff' : '#cbd5e1', fontWeight: isActiveLine ? 700 : 400 }}>
                      {lineText}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Editable Source Code Drawer */}
            <details style={{ marginTop: '0.75rem' }}>
              <summary style={{ fontSize: '0.8rem', color: '#94a3b8', cursor: 'pointer', fontWeight: 600 }}>
                ✏️ Edit C Source Code Text Directly
              </summary>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={10}
                style={{
                  width: '100%',
                  marginTop: '0.5rem',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  background: '#1e293b',
                  color: '#e2e8f0',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </details>
          </div>

          {/* BLOCK 2 & 3: VARIABLES WATCH & CONDITION CHECK PANEL */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            
            {/* Variables Watch */}
            <div className="card" style={{ padding: '1rem', background: '#f8fafc', border: '1px solid #cbd5e1' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🧠 VARIABLES WATCH
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ background: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4f46e5' }}>i (Row Count)</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', background: '#dbeafe', padding: '0.1rem 0.5rem', borderRadius: '6px' }}>
                    {currentStep.variables?.i ?? '-'}
                  </span>
                </div>
                <div style={{ background: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ec4899' }}>j (Print Count)</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', background: '#fce7f3', padding: '0.1rem 0.5rem', borderRadius: '6px' }}>
                    {currentStep.variables?.j ?? '-'}
                  </span>
                </div>
              </div>
              <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '0.5rem', lineHeight: '1.3' }}>
                • <code>i</code> controls current row<br />
                • <code>j</code> controls symbols printed per row
              </div>
            </div>

            {/* Condition Evaluation */}
            <div className="card" style={{ padding: '1rem', background: currentStep.condition?.result === false ? '#fef2f2' : currentStep.condition?.result === true ? '#ecfdf5' : '#f8fafc', border: `1px solid ${currentStep.condition?.result === false ? '#fca5a5' : currentStep.condition?.result === true ? '#86efac' : '#cbd5e1'}` }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🔍 CONDITION CHECK
              </h4>
              {currentStep.condition ? (
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
                    Checking: <code>{currentStep.condition.expression}</code>
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0.25rem 0' }}>
                    {currentStep.condition.evaluated}
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: currentStep.condition.result ? '#059669' : '#dc2626' }}>
                    {currentStep.condition.resultText}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', paddingTop: '0.5rem' }}>
                  No condition evaluated at this step.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: LIVE TERMINAL OUTPUT & TEACHING EXPLANATIONS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* CURRENT EXECUTION STEP CARD */}
          <div className="card" style={{ padding: '1.25rem', border: '2px solid #4f46e5', background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
              CURRENT EXECUTION STEP ({currentStepIdx + 1}/{traceSteps.length})
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>
              {currentStep.title}
            </h3>
            <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', background: '#0f172a', color: '#38bdf8', padding: '0.4rem 0.75rem', borderRadius: '6px', display: 'inline-block', marginBottom: '0.6rem' }}>
              Line {currentStep.line}: {currentStep.snippet}
            </div>

            {/* WHY Explanation Card */}
            <div style={{ background: '#ffffff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e40af', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Lightbulb size={15} color="#f59e0b" />
                <span>WHY THIS HAPPENED:</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#334155', lineHeight: '1.45', margin: 0 }}>
                {currentStep.whyExplanation}
              </p>
            </div>
          </div>

          {/* EXACT LIVE TERMINAL OUTPUT PANEL */}
          <div className="card" style={{ padding: '1.25rem', background: '#090d16', color: '#f8fafc', borderRadius: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Terminal size={18} />
                <span>ACTUAL C PROGRAM TERMINAL OUTPUT</span>
              </span>
              <span style={{ fontSize: '0.725rem', color: '#64748b' }}>
                Preserves exact printf() semantics
              </span>
            </div>

            {/* Real-Time Building Terminal Output */}
            <pre style={{
              fontFamily: 'monospace',
              fontSize: classroomMode ? '1.3rem' : '1.1rem',
              color: '#34d399',
              lineHeight: '1.5',
              margin: 0,
              minHeight: '180px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }}>
              {currentStep.terminalBufferSoFar || '(Executing...)'}
              <span className="animate-pulse" style={{ color: '#ffffff', fontWeight: 900 }}>█</span>
            </pre>
          </div>

        </div>

      </div>
    </div>
  );
}
