/**
 * Bulk Question Import Parser for Exam Arena
 * Supports:
 * - Format A (Tagged: TYPE, Q, A, B, C, D, ANSWER, MARKS)
 * - Format B (Numbered: 1. Question, A. opt, Answer: X, Marks: Y)
 * - Multi-line questions containing C programming code snippets (between Q and options)
 * - Code formatting preservation (indentation, braces, line breaks)
 */

function parseBulkQuestions(rawText, defaultMarks = 1) {
  if (!rawText || !rawText.trim()) {
    return {
      questions: [],
      errors: ['Paste text is empty. Please provide questions to import.'],
      totalParsed: 0,
      validCount: 0,
      invalidCount: 1
    };
  }

  const questions = [];
  const errors = [];

  // Normalize line breaks
  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  // Split by blank lines or explicit question starters (Numbered or TYPE: ... \n Q:)
  const blocks = text.split(/\n\s*\n+|\n+(?=\d+[\.\)]\s+)|\n+(?=TYPE:\s*(?:MCQ|FILL)\s*\n\s*Q:)/i)
    .map(b => b.trim())
    .filter(Boolean);

  blocks.forEach((blockText, blockIdx) => {
    const qNum = blockIdx + 1;
    const rawLines = blockText.split('\n');
    if (rawLines.length === 0 || !rawLines.some(l => l.trim())) return;

    let qType = 'mcq';
    const questionLines = [];
    const options = [];
    let correctAnswer = '';
    const acceptedAnswers = [];
    let marks = defaultMarks;
    let explanation = '';

    // Check for explicit TYPE: in block
    const typeLine = rawLines.find(l => /^TYPE:\s*/i.test(l.trim()) || /^Type:\s*fill/i.test(l.trim()));
    if (typeLine) {
      if (/fill/i.test(typeLine.trim())) {
        qType = 'fill_blank';
      } else {
        qType = 'mcq';
      }
    } else if (rawLines.some(l => /fill/i.test(l.trim()) && !/^[A-D][\.\:\)]/i.test(l.trim()) && !l.toLowerCase().includes('printf'))) {
      const flLine = rawLines.find(l => /fill/i.test(l.trim()));
      if (flLine && flLine.toLowerCase().includes('fill')) {
        qType = 'fill_blank';
      }
    }

    let inOptions = false;
    let afterOptions = false;

    for (const line of rawLines) {
      const trimmed = line.trim();

      if (/^TYPE:\s*/i.test(trimmed)) {
        continue;
      }

      if (/^Type:\s*fill/i.test(trimmed)) {
        qType = 'fill_blank';
        continue;
      }

      // Check Option pattern: A. or A: or A) or (A) or [A]
      const optionMatch = trimmed.match(/^(?:([A-D])[\.\:\)]|\(([A-D])\)|\[([A-D])\])\s*(.*)/i);

      // Check Answer pattern
      const answerMatch = trimmed.match(/^(?:ANSWER|ANS|Correct Answer|Correct):\s*(.*)/i);

      // Check Marks pattern
      const marksMatch = trimmed.match(/^MARKS?:\s*(.*)/i);

      // Check Accepted answers pattern
      const acceptedMatch = trimmed.match(/^ACCEPTED:\s*(.*)/i);

      // Check Explanation pattern
      const explanationMatch = trimmed.match(/^EXPLANATION:\s*(.*)/i);

      if (answerMatch) {
        afterOptions = true;
        inOptions = false;
        correctAnswer = answerMatch[1].trim();
        continue;
      }

      if (marksMatch) {
        const mVal = parseFloat(marksMatch[1].trim());
        if (!isNaN(mVal) && mVal >= 0) {
          marks = mVal;
        }
        continue;
      }

      if (acceptedMatch) {
        acceptedMatch[1].split(/[;,|]/).forEach(a => {
          if (a.trim()) acceptedAnswers.push(a.trim());
        });
        continue;
      }

      if (explanationMatch) {
        afterOptions = true;
        inOptions = false;
        explanation = explanationMatch[1].trim();
        continue;
      }

      // Before options:
      if (!inOptions && !afterOptions) {
        if (optionMatch) {
          inOptions = true;
          const letter = (optionMatch[1] || optionMatch[2] || optionMatch[3]).toUpperCase();
          const optText = optionMatch[4].trim();
          options.push({ letter, text: optText });
          continue;
        }

        // Check if line starts the question prompt: Q: or 1.
        const qPromptMatch = trimmed.match(/^(?:Q\d*|Question\s*\d*)\s*[:\.\)]\s*(.*)/i) ||
                             trimmed.match(/^\d+[\.\)]\s+(.*)/);

        if (qPromptMatch && questionLines.length === 0) {
          const prompt = qPromptMatch[1].trim();
          if (prompt) questionLines.push(prompt);
          continue;
        }

        // Check CODE: or SNIPPET: marker
        if (/^(?:CODE|SNIPPET):\s*(.*)/i.test(trimmed)) {
          const rest = trimmed.replace(/^(?:CODE|SNIPPET):\s*/i, '');
          if (rest) questionLines.push(rest);
          continue;
        }

        // If questionLines is empty and this is the first non-tag line
        if (questionLines.length === 0) {
          if (trimmed) questionLines.push(trimmed);
        } else {
          // Keep original line (preserving code indentation)
          questionLines.push(line);
        }
        continue;
      }

      // In options:
      if (inOptions) {
        if (optionMatch) {
          const letter = (optionMatch[1] || optionMatch[2] || optionMatch[3]).toUpperCase();
          const optText = optionMatch[4].trim();
          options.push({ letter, text: optText });
          continue;
        }

        // Continuation of previous option
        if (options.length > 0 && trimmed) {
          options[options.length - 1].text += ' ' + trimmed;
        }
        continue;
      }

      // After options:
      if (afterOptions) {
        if (explanation && trimmed) {
          explanation += '\n' + trimmed;
        }
      }
    }

    const qText = questionLines.join('\n').trim();

    // Validation
    const blockErrors = [];

    if (!qText) {
      blockErrors.push(`Question #${qNum}: Missing question text.`);
    }

    if (qType === 'mcq') {
      if (options.length < 2) {
        blockErrors.push(`Question #${qNum} (MCQ): At least 2 answer options (A, B, C, D) are required. Found: ${options.length}.`);
      }

      if (!correctAnswer) {
        blockErrors.push(`Question #${qNum} (MCQ): Missing correct answer (e.g., ANSWER: B).`);
      } else {
        const normAns = correctAnswer.trim().toUpperCase();
        const validLetters = options.map(o => o.letter);
        if (!validLetters.includes(normAns) && !options.some(o => o.text.toLowerCase() === correctAnswer.toLowerCase())) {
          blockErrors.push(`Question #${qNum} (MCQ): Correct answer '${correctAnswer}' does not match any available option (${validLetters.join(', ')}).`);
        } else if (!validLetters.includes(normAns)) {
          // If admin typed option text e.g. "do-while" instead of "C", map it to the letter
          const matchedOpt = options.find(o => o.text.toLowerCase() === correctAnswer.toLowerCase());
          if (matchedOpt) {
            correctAnswer = matchedOpt.letter;
          }
        }
      }
    } else if (qType === 'fill_blank') {
      if (!correctAnswer) {
        blockErrors.push(`Question #${qNum} (Fill in Blank): Missing correct answer (e.g., ANSWER: printf).`);
      } else {
        if (!acceptedAnswers.includes(correctAnswer)) {
          acceptedAnswers.unshift(correctAnswer);
        }
      }
    }

    if (blockErrors.length > 0) {
      errors.push(...blockErrors);
    } else {
      questions.push({
        order: qNum,
        type: qType,
        text: qText,
        options: options.map(o => o.text), // Array of option strings
        optionLetters: options.map(o => o.letter),
        correctAnswer: qType === 'mcq' ? correctAnswer.trim().toUpperCase() : correctAnswer.trim(),
        acceptedAnswers: acceptedAnswers.length > 0 ? acceptedAnswers : (correctAnswer ? [correctAnswer.trim()] : []),
        marks: Number(marks) || 1,
        negativeMarks: 0,
        explanation
      });
    }
  });

  return {
    questions,
    errors,
    totalParsed: blocks.length,
    validCount: questions.length,
    invalidCount: errors.length
  };
}

module.exports = {
  parseBulkQuestions
};
