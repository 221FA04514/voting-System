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
  ArrowDown,
  ArrowUp,
  Search,
  CheckSquare,
  Box
} from 'lucide-react';
import confetti from 'canvas-confetti';
import Toast from '../../components/Toast';

// 6 Array Preset Programs
const ARRAY_PRESETS = [
  {
    id: 'traversal',
    title: '1. Traversal & Print',
    subtitle: 'Print all array elements using a for loop',
    code: `#include <stdio.h>

int main() {
    int a[5] = {10, 20, 30, 40, 50};

    for (int i = 0; i < 5; i++) {
        printf("%d ", a[i]);
    }

    return 0;
}`,
    explanation: 'The loop starts at index i = 0 and visits each box up to i = 4, printing value at a[i].'
  },
  {
    id: 'write_op',
    title: '2. Array Write Operation',
    subtitle: 'Modify element at index 2 (a[2] = 99)',
    code: `#include <stdio.h>

int main() {
    int a[5] = {10, 20, 30, 40, 50};

    a[2] = 99;

    printf("%d", a[2]);

    return 0;
}`,
    explanation: 'Writing a[2] = 99 replaces the old value (30) at index 2 with 99.'
  },
  {
    id: 'accumulator',
    title: '3. Array Sum (Accumulator)',
    subtitle: 'Calculate total sum of array elements',
    code: `#include <stdio.h>

int main() {
    int a[5] = {10, 20, 30, 40, 50};
    int sum = 0;

    for (int i = 0; i < 5; i++) {
        sum = sum + a[i];
    }

    printf("%d", sum);

    return 0;
}`,
    explanation: 'The variable sum accumulates each array value: 0 + 10 = 10, + 20 = 30, up to 150.'
  },
  {
    id: 'max_element',
    title: '4. Find Maximum Element',
    subtitle: 'Track largest value in array',
    code: `#include <stdio.h>

int main() {
    int a[5] = {10, 25, 7, 40, 18};
    int max = a[0];

    for (int i = 1; i < 5; i++) {
        if (a[i] > max) {
            max = a[i];
        }
    }

    printf("%d", max);

    return 0;
}`,
    explanation: 'Compares each element a[i] against max. Updates max whenever a larger value is found.'
  },
  {
    id: 'linear_search',
    title: '5. Linear Search',
    subtitle: 'Search for target key (30) in array',
    code: `#include <stdio.h>

int main() {
    int a[5] = {10, 20, 30, 40, 50};
    int key = 30;

    for (int i = 0; i < 5; i++) {
        if (a[i] == key) {
            printf("Found");
        }
    }

    return 0;
}`,
    explanation: 'Checks if a[i] == key for each element. Finds 30 at index 2!'
  },
  {
    id: 'out_of_bounds',
    title: '6. Out-of-Bounds Access Bug',
    subtitle: 'Attempting to access index 5 in a size 5 array',
    code: `#include <stdio.h>

int main() {
    int a[5] = {10, 20, 30, 40, 50};

    printf("%d", a[5]);

    return 0;
}`,
    explanation: 'An array of size 5 has valid indexes 0 to 4. Accessing index 5 is OUT OF BOUNDS!'
  }
];

const ARRAY_CHALLENGES = [
  { id: 'ac1', title: 'Array Size vs Last Index', question: 'For int a[7]; what is the last valid index?', answer: '6', explanation: 'An array of size 7 has indexes 0 to 6.' },
  { id: 'ac2', title: 'Value Retrieval', question: 'For int a[5] = {10,20,30,40,50}; what is a[3]?', answer: '40', explanation: 'Index 3 holds the 4th element (40).' },
  { id: 'ac3', title: 'Write Operation', question: 'If a[2] = 100 is executed, what value is at index 2?', answer: '100', explanation: 'The value at index 2 changes to 100.' }
];

// -------------------------------------------------------------
// DYNAMIC ARRAY EXECUTION TRACE GENERATOR
// -------------------------------------------------------------
function parseAndGenerateArraySteps(sourceCode) {
  const lines = sourceCode.split('\n');

  // Find key line numbers
  let declLine = 4;
  let varInitLine = 5;
  let loopLine = 6;
  let bodyLine = 7;
  let printLine = 8;

  lines.forEach((txt, idx) => {
    const lNum = idx + 1;
    if (txt.includes('int a[')) declLine = lNum;
    else if (txt.includes('sum =') || txt.includes('max =') || txt.includes('key =')) varInitLine = lNum;
    else if (txt.includes('for')) loopLine = lNum;
    else if (txt.includes('a[') && txt.includes('=')) bodyLine = lNum;
    else if (txt.includes('printf')) printLine = lNum;
  });

  // Extract array size N
  let arraySize = 5;
  const sizeMatch = sourceCode.match(/int\s+a\[(\d+)\]/);
  if (sizeMatch) {
    arraySize = Math.min(Math.max(parseInt(sizeMatch[1], 10), 1), 10);
  }

  // Extract initial array values
  let initialValues = [10, 20, 30, 40, 50];
  const initMatch = sourceCode.match(/\{([^}]+)\}/);
  if (initMatch) {
    initialValues = initMatch[1].split(',').map(v => parseInt(v.trim(), 10)).filter(v => !isNaN(v));
  }
  // Fill array up to arraySize
  while (initialValues.length < arraySize) {
    initialValues.push((initialValues.length + 1) * 10);
  }
  initialValues = initialValues.slice(0, arraySize);

  let currentArrayState = [...initialValues];
  const steps = [];
  let terminalBuffer = '';

  // STEP 1: Declaration & Allocation
  steps.push({
    line: declLine,
    type: 'ARRAY_DECL',
    title: '🧠 DECLARING ARRAY',
    snippet: `int a[${arraySize}]`,
    arrayState: [...currentArrayState],
    arraySize,
    activeIndex: null,
    variables: { size: arraySize, validRange: `0 → ${arraySize - 1}` },
    condition: null,
    outputAdded: null,
    terminalBufferSoFar: '',
    whyExplanation: `Allocated array 'a' with size ${arraySize}. Valid indexes are 0 through ${arraySize - 1}.`
  });

  // Check if direct single-step access like printf("%d", a[5]) or a[2] = 99 outside loop
  const directReadMatch = sourceCode.match(/printf\([^,]+,\s*a\[(\d+)\]\)/);
  const directWriteMatch = sourceCode.match(/a\[(\d+)\]\s*=\s*(\d+)/);

  if (directWriteMatch && !sourceCode.includes('for')) {
    const targetIdx = parseInt(directWriteMatch[1], 10);
    const newVal = parseInt(directWriteMatch[2], 10);

    if (targetIdx < arraySize) {
      const oldVal = currentArrayState[targetIdx];
      currentArrayState[targetIdx] = newVal;

      steps.push({
        line: bodyLine,
        type: 'ARRAY_WRITE',
        title: '✏️ ARRAY WRITE OPERATION',
        snippet: `a[${targetIdx}] = ${newVal}`,
        arrayState: [...currentArrayState],
        arraySize,
        activeIndex: targetIdx,
        variables: { index: targetIdx, oldVal, newVal },
        condition: null,
        outputAdded: null,
        terminalBufferSoFar: '',
        whyExplanation: `Value at index ${targetIdx} updated from ${oldVal} to ${newVal}.`
      });
    }
  }

  if (directReadMatch && !sourceCode.includes('for')) {
    const targetIdx = parseInt(directReadMatch[1], 10);
    if (targetIdx >= arraySize || targetIdx < 0) {
      steps.push({
        line: printLine,
        type: 'OUT_OF_BOUNDS',
        title: '🚨 OUT OF BOUNDS ACCESS',
        snippet: `a[${targetIdx}]`,
        arrayState: [...currentArrayState],
        arraySize,
        activeIndex: targetIdx,
        isOutOfBounds: true,
        variables: { requestedIndex: targetIdx, validIndexes: `0 to ${arraySize - 1}` },
        condition: null,
        outputAdded: null,
        terminalBufferSoFar: '',
        whyExplanation: `Index ${targetIdx} is outside array boundaries! Valid indexes for size ${arraySize} are 0 through ${arraySize - 1}.`
      });

      steps.push({
        line: lines.length - 1 || 10,
        type: 'PROGRAM_FINISH',
        title: '🎉 PROGRAM FINISHED WITH ERROR ALERT',
        snippet: 'return 0',
        arrayState: [...currentArrayState],
        arraySize,
        activeIndex: null,
        variables: {},
        condition: null,
        outputAdded: null,
        terminalBufferSoFar: terminalBuffer,
        whyExplanation: 'Execution stopped after detecting out of bounds access.'
      });
      return steps;
    } else {
      const readVal = currentArrayState[targetIdx];
      terminalBuffer += readVal.toString();
      steps.push({
        line: printLine,
        type: 'ARRAY_READ',
        title: '👀 ARRAY READ OPERATION',
        snippet: `printf("%d", a[${targetIdx}])`,
        arrayState: [...currentArrayState],
        arraySize,
        activeIndex: targetIdx,
        variables: { index: targetIdx, value: readVal },
        condition: null,
        outputAdded: readVal.toString(),
        terminalBufferSoFar: terminalBuffer,
        whyExplanation: `Read value ${readVal} from index ${targetIdx} and sent to output.`
      });

      steps.push({
        line: lines.length - 1 || 10,
        type: 'PROGRAM_FINISH',
        title: '🎉 PROGRAM COMPLETED',
        snippet: 'return 0',
        arrayState: [...currentArrayState],
        arraySize,
        activeIndex: null,
        variables: {},
        condition: null,
        outputAdded: null,
        terminalBufferSoFar: terminalBuffer,
        whyExplanation: 'Direct array operation completed successfully.'
      });
      return steps;
    }
  }

  // Loop-based program execution
  let isReverse = sourceCode.includes('i--') || sourceCode.includes('i >= 0');
  let loopStart = isReverse ? arraySize - 1 : 0;
  let loopLimit = isReverse ? 0 : arraySize;
  let isStrictLess = sourceCode.includes('i < ') && !sourceCode.includes('i <= ');

  const loopCondMatch = sourceCode.match(/i\s*<\s*(\d+)/);
  if (loopCondMatch && !isReverse) {
    loopLimit = parseInt(loopCondMatch[1], 10);
  }

  let isSumProg = sourceCode.includes('sum');
  let isMaxProg = sourceCode.includes('max');
  let isSearchProg = sourceCode.includes('key');

  let currentSum = 0;
  let currentMax = currentArrayState[0];
  let searchKey = 30;

  if (isSumProg) {
    steps.push({
      line: varInitLine,
      type: 'VAR_INIT',
      title: '🧮 INITIALIZING ACCUMULATOR',
      snippet: 'int sum = 0',
      arrayState: [...currentArrayState],
      arraySize,
      activeIndex: null,
      variables: { sum: 0 },
      whyExplanation: 'Initialized sum variable to 0.'
    });
  }

  if (isMaxProg) {
    steps.push({
      line: varInitLine,
      type: 'VAR_INIT',
      title: '👑 INITIALIZING MAX VARIABLE',
      snippet: 'int max = a[0]',
      arrayState: [...currentArrayState],
      arraySize,
      activeIndex: 0,
      variables: { max: currentMax, 'a[0]': currentMax },
      whyExplanation: `Set initial max to first element a[0] = ${currentMax}.`
    });
    if (!isReverse) loopStart = 1;
  }

  if (isSearchProg) {
    steps.push({
      line: varInitLine,
      type: 'VAR_INIT',
      title: '🎯 INITIALIZING SEARCH KEY',
      snippet: 'int key = 30',
      arrayState: [...currentArrayState],
      arraySize,
      activeIndex: null,
      variables: { key: searchKey },
      whyExplanation: `Set search key to ${searchKey}.`
    });
  }

  // Loop Init
  steps.push({
    line: loopLine,
    type: 'LOOP_INIT',
    title: '🟢 INITIALIZING LOOP',
    snippet: `int i = ${loopStart}`,
    arrayState: [...currentArrayState],
    arraySize,
    activeIndex: loopStart < arraySize ? loopStart : null,
    variables: { i: loopStart },
    whyExplanation: `Loop variable i initialized to ${loopStart}.`
  });

  let iVal = loopStart;
  let safety = 0;

  const checkLoopCond = () => {
    if (isReverse) return iVal >= 0;
    if (isStrictLess) return iVal < loopLimit;
    return iVal <= loopLimit;
  };

  while (checkLoopCond() && safety < 50) {
    safety++;

    const condExprStr = isReverse ? `i >= 0` : (isStrictLess ? `i < ${loopLimit}` : `i <= ${loopLimit}`);
    const condEvalStr = isReverse ? `${iVal} >= 0` : `${iVal} ${isStrictLess ? '<' : '<='} ${loopLimit}`;

    // Loop Condition Check
    steps.push({
      line: loopLine,
      type: 'LOOP_COND',
      title: '🔵 CHECKING LOOP CONDITION',
      snippet: condExprStr,
      arrayState: [...currentArrayState],
      arraySize,
      activeIndex: iVal < arraySize ? iVal : null,
      variables: { i: iVal },
      condition: {
        expression: condExprStr,
        evaluated: condEvalStr,
        result: true,
        resultText: 'TRUE ✅'
      },
      whyExplanation: `Condition ${condEvalStr} is TRUE. Index ${iVal} will now be processed.`
    });

    // Check if index is out of bounds
    if (iVal >= arraySize || iVal < 0) {
      steps.push({
        line: bodyLine || printLine,
        type: 'OUT_OF_BOUNDS',
        title: '🚨 OUT OF BOUNDS ARRAY ACCESS',
        snippet: `a[${iVal}]`,
        arrayState: [...currentArrayState],
        arraySize,
        activeIndex: iVal,
        isOutOfBounds: true,
        variables: { i: iVal, arraySize, validRange: `0 → ${arraySize - 1}` },
        whyExplanation: `Index ${iVal} is OUT OF BOUNDS! Array size is ${arraySize} (indexes 0 to ${arraySize - 1}).`
      });

      steps.push({
        line: lines.length - 1 || 10,
        type: 'PROGRAM_FINISH',
        title: '🎉 PROGRAM STOPPED WITH ERROR ALERT',
        snippet: 'return 0',
        arrayState: [...currentArrayState],
        arraySize,
        activeIndex: null,
        variables: {},
        terminalBufferSoFar: terminalBuffer,
        whyExplanation: 'Execution stopped after detecting out of bounds access.'
      });
      return steps;
    }

    const valAtI = currentArrayState[iVal];

    // Array Read
    steps.push({
      line: bodyLine || printLine,
      type: 'ARRAY_READ',
      title: '👀 ARRAY ELEMENT READ',
      snippet: `a[${iVal}]`,
      arrayState: [...currentArrayState],
      arraySize,
      activeIndex: iVal,
      variables: { i: iVal, [`a[${iVal}]`]: valAtI },
      whyExplanation: `Accessed index ${iVal} containing value ${valAtI}.`
    });

    if (isSumProg) {
      const prevSum = currentSum;
      currentSum += valAtI;
      steps.push({
        line: bodyLine,
        type: 'ACCUMULATE',
        title: '🧮 ACCUMULATING SUM',
        snippet: `sum = sum + a[${iVal}]`,
        arrayState: [...currentArrayState],
        arraySize,
        activeIndex: iVal,
        variables: { i: iVal, prevSum, addedVal: valAtI, newSum: currentSum },
        whyExplanation: `sum = ${prevSum} + ${valAtI} = ${currentSum}.`
      });
    } else if (isMaxProg) {
      const isNewMax = valAtI > currentMax;
      const oldMax = currentMax;
      if (isNewMax) currentMax = valAtI;

      steps.push({
        line: bodyLine,
        type: 'CHECK_MAX',
        title: isNewMax ? '👑 NEW MAXIMUM FOUND!' : '🔍 COMPARING MAXIMUM',
        snippet: `if (a[${iVal}] > max)`,
        arrayState: [...currentArrayState],
        arraySize,
        activeIndex: iVal,
        variables: { i: iVal, valAtI, max: currentMax },
        condition: {
          expression: `a[i] > max`,
          evaluated: `${valAtI} > ${oldMax}`,
          result: isNewMax,
          resultText: isNewMax ? 'TRUE ✅ (Updated Max)' : 'FALSE ❌'
        },
        whyExplanation: isNewMax ? `New max found! Updated max from ${oldMax} to ${valAtI}.` : `${valAtI} is not greater than ${oldMax}. Max remains ${oldMax}.`
      });
    } else if (isSearchProg) {
      const isMatch = valAtI === searchKey;
      steps.push({
        line: bodyLine,
        type: 'CHECK_SEARCH',
        title: isMatch ? '🎯 TARGET KEY FOUND!' : '🔍 SEARCHING KEY',
        snippet: `if (a[${iVal}] == key)`,
        arrayState: [...currentArrayState],
        arraySize,
        activeIndex: iVal,
        variables: { i: iVal, valAtI, key: searchKey },
        condition: {
          expression: `a[i] == key`,
          evaluated: `${valAtI} == ${searchKey}`,
          result: isMatch,
          resultText: isMatch ? 'MATCH ✅' : 'NO MATCH ❌'
        },
        whyExplanation: isMatch ? `Found key ${searchKey} at index ${iVal}!` : `a[${iVal}] (${valAtI}) != ${searchKey}. Moving to next index.`
      });

      if (isMatch) {
        terminalBuffer += 'Found';
        steps.push({
          line: printLine,
          type: 'PRINT',
          title: '🖨 PRINT OUTPUT',
          snippet: 'printf("Found")',
          arrayState: [...currentArrayState],
          arraySize,
          activeIndex: iVal,
          variables: { i: iVal },
          outputAdded: 'Found',
          terminalBufferSoFar: terminalBuffer,
          whyExplanation: 'Printed "Found" to terminal output.'
        });
      }
    } else {
      // Standard print
      let printedStr = `${valAtI} `;
      if (sourceCode.includes('\\n')) printedStr = `${valAtI}\n`;
      terminalBuffer += printedStr;

      steps.push({
        line: printLine,
        type: 'PRINT',
        title: '🖨 PRINT OUTPUT',
        snippet: `printf("%d ", a[${iVal}])`,
        arrayState: [...currentArrayState],
        arraySize,
        activeIndex: iVal,
        variables: { i: iVal, printedVal: valAtI },
        outputAdded: printedStr,
        terminalBufferSoFar: terminalBuffer,
        whyExplanation: `Printed ${valAtI} to output.`
      });
    }

    // Loop increment
    if (isReverse) iVal--;
    else iVal++;

    steps.push({
      line: loopLine,
      type: 'LOOP_INC',
      title: '🔴 INCREMENTING INDEX',
      snippet: isReverse ? 'i--' : 'i++',
      arrayState: [...currentArrayState],
      arraySize,
      activeIndex: iVal < arraySize && iVal >= 0 ? iVal : null,
      variables: { i: iVal },
      whyExplanation: `Index variable i updated to ${iVal}.`
    });
  }

  // Final print for sum or max
  if (isSumProg) {
    terminalBuffer += currentSum.toString();
    steps.push({
      line: printLine,
      type: 'PRINT',
      title: '🖨 PRINT FINAL SUM',
      snippet: 'printf("%d", sum)',
      arrayState: [...currentArrayState],
      arraySize,
      activeIndex: null,
      variables: { sum: currentSum },
      outputAdded: currentSum.toString(),
      terminalBufferSoFar: terminalBuffer,
      whyExplanation: `Printed final accumulated sum = ${currentSum}.`
    });
  } else if (isMaxProg) {
    terminalBuffer += currentMax.toString();
    steps.push({
      line: printLine,
      type: 'PRINT',
      title: '🖨 PRINT FINAL MAXIMUM',
      snippet: 'printf("%d", max)',
      arrayState: [...currentArrayState],
      arraySize,
      activeIndex: null,
      variables: { max: currentMax },
      outputAdded: currentMax.toString(),
      terminalBufferSoFar: terminalBuffer,
      whyExplanation: `Printed final maximum value = ${currentMax}.`
    });
  }

  // Program Completed
  steps.push({
    line: lines.length - 1 || 10,
    type: 'PROGRAM_FINISH',
    title: '🎉 PROGRAM EXECUTION COMPLETED',
    snippet: 'return 0',
    arrayState: [...currentArrayState],
    arraySize,
    activeIndex: null,
    variables: {},
    terminalBufferSoFar: terminalBuffer,
    whyExplanation: 'Array operation completed successfully!'
  });

  return steps;
}

export default function ArrayArena() {
  const [currentPresetIdx, setCurrentPresetIdx] = useState(0);
  const activePreset = ARRAY_PRESETS[currentPresetIdx];

  const [code, setCode] = useState(activePreset.code);
  const [toast, setToast] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [xp, setXp] = useState(120);

  // Classroom Mode
  const [classroomMode, setClassroomMode] = useState(false);

  // Execution Simulator State
  const [traceSteps, setTraceSteps] = useState([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(700);
  const timerRef = useRef(null);

  // Challenge State
  const [activeChallengeIdx, setActiveChallengeIdx] = useState(0);
  const [challengeInput, setChallengeInput] = useState('');
  const [challengeFeedback, setChallengeFeedback] = useState(null);

  // Generate trace on code change
  useEffect(() => {
    try {
      const generatedSteps = parseAndGenerateArraySteps(code);
      setTraceSteps(generatedSteps);
      setCurrentStepIdx(0);
    } catch (err) {
      console.error('Array trace parse error:', err);
    }
  }, [code]);

  // Reset on preset switch
  useEffect(() => {
    setCode(activePreset.code);
    setIsPlaying(false);
    setCurrentStepIdx(0);
  }, [currentPresetIdx]);

  // Auto-play Timer
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
    setCode(activePreset.code);
    setCurrentStepIdx(0);
    setToast({ message: 'Array simulator reset to initial preset state.', type: 'info' });
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setToast({ message: 'Array Arena link copied to clipboard!', type: 'success' });
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleChallengeSubmit = (e) => {
    e.preventDefault();
    const ch = ARRAY_CHALLENGES[activeChallengeIdx];
    if (challengeInput.trim() === ch.answer) {
      setChallengeFeedback({ type: 'success', text: `🎉 Correct! ${ch.explanation}` });
      setXp(prev => prev + 30);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } else {
      setChallengeFeedback({ type: 'error', text: `❌ Not quite! ${ch.explanation}` });
    }
  };

  const currentStep = traceSteps[currentStepIdx] || traceSteps[0] || {};
  const linesOfCode = code.split('\n');

  return (
    <div className="animate-fade-in" style={{ maxWidth: classroomMode ? '1400px' : '1240px', margin: '0 auto', paddingBottom: '4rem' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header Banner */}
      <div className="card" style={{ padding: classroomMode ? '1rem 1.5rem' : '1.5rem', marginBottom: '1.25rem', background: 'linear-gradient(135deg, #0f172a 0%, #0369a1 100%)', color: '#ffffff', borderRadius: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(56, 189, 248, 0.25)', padding: '0.35rem 0.85rem', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 700, color: '#7dd3fc', marginBottom: '0.5rem' }}>
              <Box size={16} />
              <span>Interactive C Array Simulator</span>
            </div>
            <h1 style={{ fontSize: classroomMode ? '2rem' : '1.65rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.2rem' }}>
              🧠 ARRAY ARENA
            </h1>
            <p style={{ fontSize: classroomMode ? '1rem' : '0.875rem', color: '#cbd5e1' }}>
              See your array. See your index. See your memory!
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setClassroomMode(!classroomMode)}
              style={{
                padding: '0.6rem 1rem',
                borderRadius: '10px',
                fontSize: '0.85rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: classroomMode ? '#10b981' : 'rgba(255,255,255,0.15)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Monitor size={16} />
              <span>{classroomMode ? '🎓 Classroom Mode ON' : '🎓 Enable Classroom Mode'}</span>
            </button>

            <button onClick={handleCopyShareLink} className="btn btn-secondary" style={{ padding: '0.6rem 0.9rem', fontSize: '0.85rem', gap: '0.4rem', background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: 'none' }}>
              {copiedLink ? <Check size={16} color="#34d399" /> : <Share2 size={16} />}
              <span>{copiedLink ? 'Copied!' : 'Share'}</span>
            </button>
          </div>
        </div>

        {/* Preset Selection Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {ARRAY_PRESETS.map((preset, idx) => (
            <button
              key={preset.id}
              onClick={() => setCurrentPresetIdx(idx)}
              style={{
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                border: 'none',
                background: idx === currentPresetIdx ? '#0284c7' : 'rgba(255,255,255,0.08)',
                color: idx === currentPresetIdx ? '#ffffff' : '#cbd5e1'
              }}
            >
              {preset.title}
            </button>
          ))}
        </div>
      </div>

      {/* PLAYBACK CONTROLS TOOLBAR */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem', background: '#ffffff', border: '2px solid #0284c7', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button 
            onClick={handleTogglePlay}
            className="btn btn-primary"
            style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem', gap: '0.5rem', borderRadius: '10px', background: isPlaying ? '#ef4444' : '#0284c7' }}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            <span>{isPlaying ? 'Pause' : '▶ Run Array Simulator'}</span>
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
                  background: speedMs === sp.val ? '#0284c7' : '#f1f5f9',
                  color: speedMs === sp.val ? '#ffffff' : '#475569'
                }}
              >
                {sp.label}
              </button>
            ))}
          </div>

          <div style={{ background: '#f0f9ff', padding: '0.4rem 0.85rem', borderRadius: '8px', border: '1px solid #bae6fd', fontSize: '0.85rem', fontWeight: 800, color: '#0369a1' }}>
            Step: {currentStepIdx + 1} / {traceSteps.length || 1}
          </div>
        </div>
      </div>

      {/* 🧠 PRIMARY ARRAY MEMORY VISUALIZER (Center Box) */}
      <div className="card animate-scale-in" style={{ padding: '1.5rem', marginBottom: '1.25rem', background: '#090d16', color: '#ffffff', borderRadius: '16px', border: '2px solid #0369a1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: classroomMode ? '1.3rem' : '1.1rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Box size={22} color="#38bdf8" />
              <span>ARRAY MEMORY VIEW: int a[{currentStep.arraySize || 5}]</span>
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
              Array Size: <strong>{currentStep.arraySize || 5}</strong> | Valid Indexes: <strong>0 → {(currentStep.arraySize || 5) - 1}</strong>
            </p>
          </div>

          {currentStep.isOutOfBounds && (
            <div style={{ background: '#ef4444', color: '#ffffff', padding: '0.4rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <AlertCircle size={18} />
              <span>🚨 OUT OF BOUNDS ACCESS ATTEMPTED!</span>
            </div>
          )}
        </div>

        {/* Array Boxes Render */}
        <div style={{ overflowX: 'auto', padding: '1rem 0' }}>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', minWidth: '320px' }}>
            {(currentStep.arrayState || [10, 20, 30, 40, 50]).map((val, idx) => {
              const isActiveCell = currentStep.activeIndex === idx;
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                  
                  {/* Top Index Label */}
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isActiveCell ? '#38bdf8' : '#64748b' }}>
                    INDEX {idx}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>↓</span>

                  {/* Memory Box */}
                  <div
                    style={{
                      width: classroomMode ? '85px' : '72px',
                      height: classroomMode ? '85px' : '72px',
                      borderRadius: '12px',
                      background: isActiveCell ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : '#1e293b',
                      border: `3px solid ${isActiveCell ? '#38bdf8' : '#334155'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: classroomMode ? '1.5rem' : '1.3rem',
                      fontWeight: 800,
                      color: isActiveCell ? '#ffffff' : '#f8fafc',
                      boxShadow: isActiveCell ? '0 0 20px rgba(56, 189, 248, 0.4)' : 'none',
                      transition: 'all 0.25s ease',
                      transform: isActiveCell ? 'scale(1.08)' : 'scale(1)'
                    }}
                  >
                    {val}
                  </div>

                  {/* Bottom Pointer */}
                  <div style={{ height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isActiveCell && (
                      <div className="animate-bounce" style={{ color: '#38bdf8', fontWeight: 800, fontSize: '0.8rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span>↑</span>
                        <span>a[{idx}]</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Out of Bounds Box (if index requested is out of range) */}
            {currentStep.isOutOfBounds && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ef4444' }}>
                  INDEX {currentStep.activeIndex} ❌
                </span>
                <span style={{ fontSize: '0.85rem', color: '#ef4444' }}>↓</span>

                <div
                  style={{
                    width: classroomMode ? '85px' : '72px',
                    height: classroomMode ? '85px' : '72px',
                    borderRadius: '12px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '3px dashed #ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    fontWeight: 800,
                    color: '#ef4444'
                  }}
                >
                  ?
                </div>

                <div style={{ color: '#ef4444', fontWeight: 800, fontSize: '0.75rem' }}>
                  INVALID!
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Current Array Expression Breakdown */}
        {currentStep.activeIndex !== null && currentStep.activeIndex !== undefined && !currentStep.isOutOfBounds && (
          <div style={{ background: '#1e293b', padding: '0.65rem 1rem', borderRadius: '10px', textAlign: 'center', fontSize: '0.9rem', color: '#e2e8f0', marginTop: '0.5rem' }}>
            Current Array Access: <code>a[{currentStep.variables?.i !== undefined ? `i (${currentStep.variables.i})` : currentStep.activeIndex}]</code> ➔ Index <strong>{currentStep.activeIndex}</strong> ➔ Value: <strong style={{ color: '#38bdf8', fontSize: '1.1rem' }}>{currentStep.arrayState[currentStep.activeIndex]}</strong>
          </div>
        )}
      </div>

      {/* 2-COLUMN MAIN LAYOUT: CODE VS EXECUTION DETAILS */}
      <div style={{ display: 'grid', gridTemplateColumns: classroomMode ? '1fr 1fr' : 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        
        {/* LEFT COLUMN: CODE EDITOR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card" style={{ padding: '1.25rem', background: '#0f172a', color: '#f8fafc', borderRadius: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Code2 size={18} />
                <span>Line-by-Line C Code Execution</span>
              </span>
            </div>

            {/* Code Lines Display */}
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
                      background: isActiveLine ? 'rgba(2, 132, 199, 0.35)' : 'transparent',
                      borderLeft: isActiveLine ? '4px solid #38bdf8' : '4px solid transparent',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ width: '32px', color: isActiveLine ? '#7dd3fc' : '#475569', fontSize: '0.75rem', userSelect: 'none', fontWeight: 700 }}>
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

            {/* Editable Code Drawer */}
            <details style={{ marginTop: '0.75rem' }}>
              <summary style={{ fontSize: '0.8rem', color: '#94a3b8', cursor: 'pointer', fontWeight: 600 }}>
                ✏️ Edit C Code Text Directly
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

          {/* VARIABLES WATCH & CONDITION CHECK */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="card" style={{ padding: '1rem', background: '#f8fafc', border: '1px solid #cbd5e1' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🧠 VARIABLES WATCH
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {Object.entries(currentStep.variables || {}).map(([key, val]) => (
                  <div key={key} style={{ background: '#ffffff', padding: '0.4rem 0.65rem', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0284c7' }}>{key}</span>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', background: '#e0f2fe', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                      {val?.toString() ?? '-'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: '1rem', background: currentStep.condition?.result === false ? '#fef2f2' : currentStep.condition?.result === true ? '#ecfdf5' : '#f8fafc', border: `1px solid ${currentStep.condition?.result === false ? '#fca5a5' : currentStep.condition?.result === true ? '#86efac' : '#cbd5e1'}` }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🔍 CONDITION CHECK
              </h4>
              {currentStep.condition ? (
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
                    Checking: <code>{currentStep.condition.expression}</code>
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>
                    {currentStep.condition.evaluated}
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: currentStep.condition.result ? '#059669' : '#dc2626' }}>
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

        {/* RIGHT COLUMN: EXECUTION DETAILS & TERMINAL OUTPUT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* STEP EXPLANATION CARD */}
          <div className="card" style={{ padding: '1.25rem', border: '2px solid #0284c7', background: 'linear-gradient(135deg, #f8fafc 0%, #f0f9ff 100%)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
              CURRENT EXECUTION STEP ({currentStepIdx + 1}/{traceSteps.length})
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>
              {currentStep.title}
            </h3>
            <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', background: '#0f172a', color: '#38bdf8', padding: '0.4rem 0.75rem', borderRadius: '6px', display: 'inline-block', marginBottom: '0.6rem' }}>
              Line {currentStep.line}: {currentStep.snippet}
            </div>

            <div style={{ background: '#ffffff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0369a1', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Lightbulb size={15} color="#f59e0b" />
                <span>WHY THIS HAPPENED:</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#334155', lineHeight: '1.45', margin: 0 }}>
                {currentStep.whyExplanation}
              </p>
            </div>
          </div>

          {/* ACTUAL C TERMINAL OUTPUT */}
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

            <pre style={{
              fontFamily: 'monospace',
              fontSize: classroomMode ? '1.3rem' : '1.1rem',
              color: '#34d399',
              lineHeight: '1.5',
              margin: 0,
              minHeight: '120px',
              whiteSpace: 'pre-wrap'
            }}>
              {currentStep.terminalBufferSoFar || '(Executing...)'}
              <span className="animate-pulse" style={{ color: '#ffffff', fontWeight: 900 }}>█</span>
            </pre>
          </div>

          {/* ARRAY CHALLENGES CARD */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Trophy size={18} color="#f59e0b" />
              <span>Array Arena Challenge #{activeChallengeIdx + 1}</span>
            </h3>

            <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
                {ARRAY_CHALLENGES[activeChallengeIdx].title}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                {ARRAY_CHALLENGES[activeChallengeIdx].question}
              </div>
            </div>

            <form onSubmit={handleChallengeSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Enter your answer..."
                value={challengeInput}
                onChange={(e) => setChallengeInput(e.target.value)}
                style={{ flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', background: '#0284c7' }}>
                Submit Answer
              </button>
            </form>

            {challengeFeedback && (
              <div style={{ marginTop: '0.65rem', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, background: challengeFeedback.type === 'success' ? '#ecfdf5' : '#fef2f2', color: challengeFeedback.type === 'success' ? '#047857' : '#b91c1c' }}>
                {challengeFeedback.text}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
