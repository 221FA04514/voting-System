/**
 * Bulk Question Import Parser for Exam Arena
 * Supports Format A (Tagged: TYPE, Q, A, B, C, D, ANSWER, MARKS)
 * and Format B (Numbered: 1. Question, A. opt, Answer: X, Marks: Y)
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

  // Determine splitting strategy: split by blank lines or explicit question starters (Numbered or TYPE: ... \n Q:)
  const blocks = text.split(/\n\s*\n+|\n+(?=\d+[\.\)]\s+)|\n+(?=TYPE:\s*(?:MCQ|FILL)\s*\n\s*Q:)/i)
    .map(b => b.trim())
    .filter(Boolean);

  blocks.forEach((blockText, blockIdx) => {
    const qNum = blockIdx + 1;
    const blockLines = blockText.split('\n').map(l => l.trim()).filter(Boolean);
    if (blockLines.length === 0) return;

    let qType = 'mcq';
    let qText = '';
    const options = [];
    let correctAnswer = '';
    const acceptedAnswers = [];
    let marks = defaultMarks;
    let explanation = '';

    // Check for explicit TYPE: in block
    const typeLine = blockLines.find(l => /^TYPE:\s*/i.test(l) || /Type:\s*fill/i.test(l));
    if (typeLine) {
      if (/fill/i.test(typeLine)) {
        qType = 'fill_blank';
      } else {
        qType = 'mcq';
      }
    } else if (blockLines.some(l => /fill/i.test(l) && !/^[A-D][\.\:\)]/i.test(l) && !l.toLowerCase().includes('printf'))) {
      const flLine = blockLines.find(l => /fill/i.test(l));
      if (flLine && flLine.toLowerCase().includes('fill')) {
        qType = 'fill_blank';
      }
    }

    // Parse each line in the block
    for (const line of blockLines) {
      if (/^TYPE:\s*/i.test(line)) {
        continue;
      }

      // Check if line specifies Type: FILL inline
      if (/^Type:\s*fill/i.test(line)) {
        qType = 'fill_blank';
        continue;
      }

      // Question line (Q: ... or 1. ... or 1) ...)
      if (/^Q:\s*/i.test(line)) {
        qText = line.replace(/^Q:\s*/i, '').trim();
      } else if (/^\d+[\.\)]\s*/.test(line)) {
        qText = line.replace(/^\d+[\.\)]\s*/, '').trim();
      }
      // Options: A. or A: or A)
      else if (/^[A-D][\.\:\)]\s*/i.test(line)) {
        const optLetter = line[0].toUpperCase();
        const optVal = line.replace(/^[A-D][\.\:\)]\s*/i, '').trim();
        options.push({ letter: optLetter, text: optVal });
      }
      // Answer line: ANSWER: B or Answer: main
      else if (/^(ANSWER|ANS):\s*/i.test(line)) {
        correctAnswer = line.replace(/^(ANSWER|ANS):\s*/i, '').trim();
      }
      // Accepted answers line for fill in blank: ACCEPTED: printf;PRINTF;printf()
      else if (/^ACCEPTED:\s*/i.test(line)) {
        const accStr = line.replace(/^ACCEPTED:\s*/i, '').trim();
        accStr.split(/[;,]/).forEach(a => {
          if (a.trim()) acceptedAnswers.push(a.trim());
        });
      }
      // Marks line: MARKS: 2 or Marks: 1
      else if (/^MARKS:\s*/i.test(line)) {
        const mVal = parseFloat(line.replace(/^MARKS:\s*/i, '').trim());
        if (!isNaN(mVal) && mVal >= 0) {
          marks = mVal;
        }
      }
      // Explanation line
      else if (/^EXPLANATION:\s*/i.test(line)) {
        explanation = line.replace(/^EXPLANATION:\s*/i, '').trim();
      } else if (!qText && !line.includes(':')) {
        qText = line;
      }
    }

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
        acceptedAnswers: acceptedAnswers.length > 0 ? acceptedAnswers : [correctAnswer.trim()],
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
