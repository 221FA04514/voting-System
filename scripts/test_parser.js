const { parseBulkQuestions } = require('../server/utils/examParser');

console.log('Testing Bulk Question Parser...\n');

const formatA = `
TYPE: MCQ
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
ACCEPTED: printf;PRINTF;printf()
MARKS: 2
`;

const resA = parseBulkQuestions(formatA);
console.log('Format A Results:');
console.log(`Parsed: ${resA.totalParsed}, Valid: ${resA.validCount}, Errors: ${resA.errors.length}`);
if (resA.errors.length > 0) console.error('Errors:', resA.errors);

const formatB = `
1. Which loop executes its body at least once?
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
Marks: 1
`;

const resB = parseBulkQuestions(formatB);
console.log('\nFormat B Results:');
console.log(`Parsed: ${resB.totalParsed}, Valid: ${resB.validCount}, Errors: ${resB.errors.length}`);
if (resB.errors.length > 0) console.error('Errors:', resB.errors);

// Invalid test
const invalidFormat = `
TYPE: MCQ
Q: Broken question with missing options
ANSWER: A
`;

const resInvalid = parseBulkQuestions(invalidFormat);
console.log('\nInvalid Format Results (Should catch errors):');
console.log(`Errors caught (${resInvalid.errors.length}):`, resInvalid.errors);

if (resA.validCount === 3 && resB.validCount === 3 && resInvalid.errors.length > 0) {
  console.log('\n🎉 Parser Verification PASSED 100%!');
} else {
  console.error('\n❌ Parser Verification Failed.');
  process.exit(1);
}
