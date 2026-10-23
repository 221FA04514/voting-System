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
  Box,
  Cpu,
  CornerDownRight,
  GitCommit,
  GitPullRequest
} from 'lucide-react';
import confetti from 'canvas-confetti';
import Toast from '../../components/Toast';

// 6 Built-in Function Presets
const FUNCTION_PRESETS = [
  {
    id: 'add_func',
    title: '1. Addition Function',
    subtitle: 'Pass parameters (10, 20), calculate result, and return 30',
    code: `#include <stdio.h>

int add(int a, int b) {
    int result = a + b;
    return result;
}

int main(void) {
    int answer = add(10, 20);
    printf("%d\\n", answer);
    return 0;
}`,
    explanation: 'main() calls add(10, 20). Arguments 10 and 20 are passed into parameters a and b. add() calculates 30 and returns it to main().'
  },
  {
    id: 'pass_by_value',
    title: '2. Pass By Value (Mandatory Concept)',
    subtitle: 'Demonstrates why modifying x inside change() does NOT alter n in main()',
    code: `#include <stdio.h>

void change(int x) {
    x = 100;
}

int main(void) {
    int n = 5;
    change(n);
    printf("%d\\n", n);
    return 0;
}`,
    explanation: 'C passes integer arguments by VALUE. Parameter x is a local copy inside change(). Changing x to 100 does not affect n = 5 in main()!'
  },
  {
    id: 'void_func',
    title: '3. Void Function (No Return)',
    subtitle: 'Executes statements without returning a value',
    code: `#include <stdio.h>

void greet(void) {
    printf("Hello\\n");
}

int main(void) {
    greet();
    return 0;
}`,
    explanation: 'greet() has a void return type. It prints "Hello" and finishes cleanly without returning any value.'
  },
  {
    id: 'multiple_calls',
    title: '4. Multiple Function Calls',
    subtitle: 'Calling square(3) then square(4) creates distinct stack frames',
    code: `#include <stdio.h>

int square(int n) {
    return n * n;
}

int main(void) {
    int a = square(3);
    int b = square(4);
    printf("%d %d\\n", a, b);
    return 0;
}`,
    explanation: 'First square(3) runs and returns 9. Then square(4) runs independently and returns 16.'
  },
  {
    id: 'nested_calls',
    title: '5. Nested Function Calls',
    subtitle: 'add(square(3), 4) evaluates inner call square(3) first',
    code: `#include <stdio.h>

int square(int n) {
    return n * n;
}

int add(int a, int b) {
    return a + b;
}

int main(void) {
    printf("%d\\n", add(square(3), 4));
    return 0;
}`,
    explanation: 'square(3) evaluates to 9 first. Then add(9, 4) evaluates to 13, which is printed.'
  },
  {
    id: 'recursion_factorial',
    title: '6. Recursion (Factorial)',
    subtitle: 'Function calling itself recursively until base condition n <= 1',
    code: `#include <stdio.h>

int factorial(int n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
}

int main(void) {
    printf("%d\\n", factorial(4));
    return 0;
}`,
    explanation: 'factorial(4) calls factorial(3) -> factorial(2) -> factorial(1). Then unwinds returns: 1 -> 2 -> 6 -> 24!'
  }
];

const FUNCTION_CHALLENGES = [
  { id: 'fc1', title: 'Return Value', question: 'For int add(int a, int b) { return a+b; } what is add(3, 4)?', answer: '7', explanation: 'add(3, 4) calculates 3 + 4 = 7.' },
  { id: 'fc2', title: 'Pass By Value', question: 'void change(int x){x=100;} int main(){int n=5; change(n); printf("%d", n);}', answer: '5', explanation: 'n remains 5 because x is a local copy in change().' },
  { id: 'fc3', title: 'Nested Calls', question: 'int square(int n){return n*n;} printf("%d", square(3) + 1);', answer: '10', explanation: 'square(3) returns 9, then 9 + 1 = 10.' },
  { id: 'fc4', title: 'Factorial Recursion', question: 'What is the return value of factorial(4)?', answer: '24', explanation: '4 * 3 * 2 * 1 = 24.' }
];

// -------------------------------------------------------------
// DYNAMIC C FUNCTION EXECUTION TRACE GENERATOR
// -------------------------------------------------------------
function parseAndGenerateFunctionSteps(sourceCode) {
  const lines = sourceCode.split('\n');

  // Locate function definitions and main
  let mainLine = 7;
  let funcDeclLine = 3;
  let funcBodyLine = 4;
  let returnLine = 5;
  let mainCallLine = 8;
  let printLine = 9;

  lines.forEach((txt, idx) => {
    const lNum = idx + 1;
    if (txt.includes('int main') || txt.includes('void main')) mainLine = lNum;
    else if (txt.includes('int add') || txt.includes('void change') || txt.includes('void greet') || txt.includes('int square') || txt.includes('int factorial')) {
      funcDeclLine = lNum;
    } else if (txt.includes('return ')) returnLine = lNum;
    else if (txt.includes('printf')) printLine = lNum;
    else if (txt.includes('= add(') || txt.includes('change(') || txt.includes('greet()') || txt.includes('= square(')) mainCallLine = lNum;
  });

  const steps = [];
  let terminalBuffer = '';

  // Determine scenario
  const isPassByValue = sourceCode.includes('void change') || sourceCode.includes('x = 100');
  const isVoidGreet = sourceCode.includes('void greet') || sourceCode.includes('Hello');
  const isMultipleSquare = sourceCode.includes('square(3)') && sourceCode.includes('square(4)');
  const isNestedCall = sourceCode.includes('add(square(3)');
  const isRecursion = sourceCode.includes('factorial');

  // EVENT 1: PROGRAM START IN main()
  steps.push({
    line: mainLine,
    type: 'PROGRAM_START',
    title: '🟢 PROGRAM START IN main()',
    snippet: 'int main(void)',
    activeFunction: 'main',
    callStack: [
      { name: 'main()', status: 'ACTIVE 🟢', vars: {} }
    ],
    functionMap: { caller: null, active: 'main()', target: null },
    whyExplanation: 'Execution begins at main(). main() is the entry point of every C program.'
  });

  if (isPassByValue) {
    // 1. Variable init n = 5
    steps.push({
      line: mainLine + 1,
      type: 'VAR_INIT',
      title: '📦 INITIALIZING LOCAL VARIABLE',
      snippet: 'int n = 5;',
      activeFunction: 'main',
      callStack: [
        { name: 'main()', status: 'ACTIVE 🟢', vars: { n: 5 } }
      ],
      functionMap: { caller: null, active: 'main()', target: null },
      whyExplanation: 'Local variable n is created in main() and initialized to 5.'
    });

    // 2. Call change(n)
    steps.push({
      line: mainCallLine,
      type: 'CALL_ENCOUNTER',
      title: '📞 ENCOUNTER FUNCTION CALL',
      snippet: 'change(n);',
      activeFunction: 'main',
      callStack: [
        { name: 'main()', status: 'WAITING FOR RETURN ⏸', vars: { n: 5 } }
      ],
      functionMap: { caller: 'main()', active: 'main()', target: 'change(5)' },
      argumentTransfer: { arg: 'n (5)', param: 'x' },
      whyExplanation: 'main() calls change(n). Value of n (5) is passed into argument slot.'
    });

    // 3. Argument Transfer -> Enter change()
    steps.push({
      line: funcDeclLine,
      type: 'FUNCTION_ENTRY',
      title: '📥 ENTER FUNCTION change(x = 5)',
      snippet: 'void change(int x)',
      activeFunction: 'change',
      callStack: [
        { name: 'change(x = 5)', status: 'ACTIVE 🟢', vars: { x: 5 } },
        { name: 'main()', status: 'WAITING FOR RETURN ⏸', vars: { n: 5 } }
      ],
      functionMap: { caller: 'main()', active: 'change(5)', target: null },
      argumentTransfer: { arg: 'n (5)', param: 'x (5)' },
      whyExplanation: 'Parameter x receives a COPY of value 5. x is a local variable inside change().'
    });

    // 4. Execute x = 100 inside change()
    steps.push({
      line: funcDeclLine + 1,
      type: 'LOCAL_VAR_ASSIGN',
      title: '✏️ MODIFYING LOCAL PARAMETER x',
      snippet: 'x = 100;',
      activeFunction: 'change',
      callStack: [
        { name: 'change(x = 100)', status: 'ACTIVE 🟢', vars: { x: 100 } },
        { name: 'main()', status: 'WAITING FOR RETURN ⏸', vars: { n: 5 } }
      ],
      functionMap: { caller: 'main()', active: 'change(100)', target: null },
      whyExplanation: 'x is changed to 100 inside change(). Notice n in main() is STILL 5 because C passes by value!'
    });

    // 5. change() finishes
    steps.push({
      line: funcDeclLine + 2,
      type: 'FUNCTION_FINISH',
      title: '🔴 FUNCTION change() COMPLETED',
      snippet: '}',
      activeFunction: 'change',
      callStack: [
        { name: 'change(x = 100)', status: 'FINISHING 🔴', vars: { x: 100 } },
        { name: 'main()', status: 'RESUMING 🟢', vars: { n: 5 } }
      ],
      functionMap: { caller: 'main()', active: 'change()', target: null },
      whyExplanation: 'change() finishes execution. Its stack frame is popped from the Call Stack.'
    });

    // 6. Resume main() -> printf("%d\n", n)
    terminalBuffer += '5\n';
    steps.push({
      line: printLine,
      type: 'PRINT',
      title: '🖨 PRINT OUTPUT IN main()',
      snippet: 'printf("%d\\n", n);',
      activeFunction: 'main',
      callStack: [
        { name: 'main()', status: 'ACTIVE 🟢', vars: { n: 5 } }
      ],
      functionMap: { caller: null, active: 'main()', target: null },
      outputAdded: '5\n',
      terminalBufferSoFar: terminalBuffer,
      whyExplanation: 'Printed n = 5 to output. Proves that modifying parameter x inside change() had zero effect on n in main()!'
    });

  } else if (isVoidGreet) {
    // Void function greet()
    steps.push({
      line: mainCallLine,
      type: 'CALL_ENCOUNTER',
      title: '📞 ENCOUNTER VOID FUNCTION CALL',
      snippet: 'greet();',
      activeFunction: 'main',
      callStack: [
        { name: 'main()', status: 'WAITING FOR RETURN ⏸', vars: {} }
      ],
      functionMap: { caller: 'main()', active: 'main()', target: 'greet()' },
      whyExplanation: 'main() calls greet(). No arguments required.'
    });

    steps.push({
      line: funcDeclLine,
      type: 'FUNCTION_ENTRY',
      title: '📥 ENTER FUNCTION greet()',
      snippet: 'void greet(void)',
      activeFunction: 'greet',
      callStack: [
        { name: 'greet()', status: 'ACTIVE 🟢', vars: {} },
        { name: 'main()', status: 'WAITING FOR RETURN ⏸', vars: {} }
      ],
      functionMap: { caller: 'main()', active: 'greet()', target: null },
      whyExplanation: 'Entered greet(). Void function returns no value.'
    });

    terminalBuffer += 'Hello\n';
    steps.push({
      line: funcDeclLine + 1,
      type: 'PRINT',
      title: '🖨 EXECUTING printf IN greet()',
      snippet: 'printf("Hello\\n");',
      activeFunction: 'greet',
      callStack: [
        { name: 'greet()', status: 'ACTIVE 🟢', vars: {} },
        { name: 'main()', status: 'WAITING FOR RETURN ⏸', vars: {} }
      ],
      functionMap: { caller: 'main()', active: 'greet()', target: null },
      outputAdded: 'Hello\n',
      terminalBufferSoFar: terminalBuffer,
      whyExplanation: 'Printed "Hello\\n" to output.'
    });

    steps.push({
      line: funcDeclLine + 2,
      type: 'FUNCTION_FINISH',
      title: '🔴 VOID FUNCTION COMPLETED',
      snippet: '}',
      activeFunction: 'greet',
      callStack: [
        { name: 'greet()', status: 'FINISHING 🔴', vars: {} },
        { name: 'main()', status: 'RESUMING 🟢', vars: {} }
      ],
      functionMap: { caller: 'main()', active: 'greet()', target: null },
      whyExplanation: 'greet() finished. No return value. Execution resumes in main().'
    });

  } else if (isMultipleSquare) {
    // Multiple calls: square(3) and square(4)
    steps.push({
      line: mainCallLine,
      type: 'CALL_ENCOUNTER',
      title: '📞 FIRST CALL: square(3)',
      snippet: 'int a = square(3);',
      activeFunction: 'main',
      callStack: [
        { name: 'main()', status: 'WAITING FOR RETURN ⏸', vars: { a: 'unassigned' } }
      ],
      functionMap: { caller: 'main()', active: 'main()', target: 'square(3)' },
      argumentTransfer: { arg: '3', param: 'n (3)' },
      whyExplanation: 'First call: main() calls square(3).'
    });

    steps.push({
      line: funcDeclLine,
      type: 'FUNCTION_ENTRY',
      title: '📥 ENTER FUNCTION square(n = 3)',
      snippet: 'int square(int n)',
      activeFunction: 'square',
      callStack: [
        { name: 'square(n = 3)', status: 'ACTIVE 🟢', vars: { n: 3 } },
        { name: 'main()', status: 'WAITING FOR RETURN ⏸', vars: { a: 'unassigned' } }
      ],
      functionMap: { caller: 'main()', active: 'square(3)', target: null },
      whyExplanation: 'Entered square(3). Calculates 3 * 3 = 9.'
    });

    steps.push({
      line: returnLine,
      type: 'RETURN_EVAL',
      title: '↩️ RETURN VALUE 9',
      snippet: 'return n * n;',
      activeFunction: 'square',
      callStack: [
        { name: 'square(n = 3)', status: 'RETURNING ↩️', vars: { n: 3, returnVal: 9 } },
        { name: 'main()', status: 'RESUMING 🟢', vars: { a: 9 } }
      ],
      functionMap: { caller: 'main()', active: 'square(3)', target: null },
      returnValue: 9,
      whyExplanation: 'square(3) returned 9. Value assigned to a = 9.'
    });

    // Second call: square(4)
    steps.push({
      line: mainCallLine + 1,
      type: 'CALL_ENCOUNTER',
      title: '📞 SECOND CALL: square(4)',
      snippet: 'int b = square(4);',
      activeFunction: 'main',
      callStack: [
        { name: 'main()', status: 'WAITING FOR RETURN ⏸', vars: { a: 9, b: 'unassigned' } }
      ],
      functionMap: { caller: 'main()', active: 'main()', target: 'square(4)' },
      argumentTransfer: { arg: '4', param: 'n (4)' },
      whyExplanation: 'Second call: main() calls square(4) creating a new distinct stack frame!'
    });

    steps.push({
      line: funcDeclLine,
      type: 'FUNCTION_ENTRY',
      title: '📥 ENTER FUNCTION square(n = 4)',
      snippet: 'int square(int n)',
      activeFunction: 'square',
      callStack: [
        { name: 'square(n = 4)', status: 'ACTIVE 🟢', vars: { n: 4 } },
        { name: 'main()', status: 'WAITING FOR RETURN ⏸', vars: { a: 9, b: 'unassigned' } }
      ],
      functionMap: { caller: 'main()', active: 'square(4)', target: null },
      whyExplanation: 'Entered square(4). Calculates 4 * 4 = 16.'
    });

    steps.push({
      line: returnLine,
      type: 'RETURN_EVAL',
      title: '↩️ RETURN VALUE 16',
      snippet: 'return n * n;',
      activeFunction: 'square',
      callStack: [
        { name: 'square(n = 4)', status: 'RETURNING ↩️', vars: { n: 4, returnVal: 16 } },
        { name: 'main()', status: 'RESUMING 🟢', vars: { a: 9, b: 16 } }
      ],
      functionMap: { caller: 'main()', active: 'square(4)', target: null },
      returnValue: 16,
      whyExplanation: 'square(4) returned 16. Value assigned to b = 16.'
    });

    terminalBuffer += '9 16\n';
    steps.push({
      line: printLine,
      type: 'PRINT',
      title: '🖨 PRINT OUTPUT IN main()',
      snippet: 'printf("%d %d\\n", a, b);',
      activeFunction: 'main',
      callStack: [
        { name: 'main()', status: 'ACTIVE 🟢', vars: { a: 9, b: 16 } }
      ],
      functionMap: { caller: null, active: 'main()', target: null },
      outputAdded: '9 16\n',
      terminalBufferSoFar: terminalBuffer,
      whyExplanation: 'Printed "9 16\\n" to output.'
    });

  } else if (isRecursion) {
    // Recursion Factorial(4)
    const recSteps = [
      { n: 4, ret: 24 },
      { n: 3, ret: 6 },
      { n: 2, ret: 2 },
      { n: 1, ret: 1 }
    ];

    // Push frames 4 -> 3 -> 2 -> 1
    let stackFrames = [{ name: 'main()', status: 'WAITING FOR RETURN ⏸', vars: {} }];
    recSteps.forEach(rs => {
      stackFrames.unshift({ name: `factorial(n = ${rs.n})`, status: 'ACTIVE 🟢', vars: { n: rs.n } });
      steps.push({
        line: funcDeclLine,
        type: 'RECURSION_PUSH',
        title: `📥 RECURSIVE CALL: factorial(${rs.n})`,
        snippet: `factorial(${rs.n})`,
        activeFunction: `factorial(${rs.n})`,
        callStack: JSON.parse(JSON.stringify(stackFrames)),
        functionMap: { caller: rs.n === 4 ? 'main()' : `factorial(${rs.n + 1})`, active: `factorial(${rs.n})`, target: null },
        whyExplanation: rs.n === 1 ? 'Reached base condition (n <= 1). factorial(1) returns 1!' : `n = ${rs.n} > 1. Recursive call to factorial(${rs.n - 1}).`
      });
      if (rs.n > 1) {
        stackFrames[0].status = 'WAITING FOR CHILD ⏸';
      }
    });

    // Unwind returns 1 -> 2 -> 6 -> 24
    let currentRet = 1;
    for (let i = recSteps.length - 1; i >= 0; i--) {
      const rs = recSteps[i];
      if (rs.n === 1) currentRet = 1;
      else currentRet = rs.n * recSteps[i + 1].ret;

      steps.push({
        line: returnLine || funcDeclLine + 3,
        type: 'RECURSION_POP',
        title: `↩️ UNWINDING RETURN: factorial(${rs.n}) = ${currentRet}`,
        snippet: `return ${rs.n === 1 ? 1 : `${rs.n} * ${recSteps[i + 1].ret}`};`,
        activeFunction: `factorial(${rs.n})`,
        callStack: JSON.parse(JSON.stringify(stackFrames)),
        functionMap: { caller: rs.n === 4 ? 'main()' : `factorial(${rs.n + 1})`, active: `factorial(${rs.n})`, target: null },
        returnValue: currentRet,
        whyExplanation: rs.n === 1 ? 'factorial(1) returns 1.' : `factorial(${rs.n}) returns ${rs.n} * ${recSteps[i + 1].ret} = ${currentRet}.`
      });
      stackFrames.shift();
    }

    terminalBuffer += '24\n';
    steps.push({
      line: printLine,
      type: 'PRINT',
      title: '🖨 PRINT FINAL FACTORIAL RESULT',
      snippet: 'printf("%d\\n", factorial(4));',
      activeFunction: 'main',
      callStack: [
        { name: 'main()', status: 'ACTIVE 🟢', vars: { result: 24 } }
      ],
      functionMap: { caller: null, active: 'main()', target: null },
      outputAdded: '24\n',
      terminalBufferSoFar: terminalBuffer,
      whyExplanation: 'Printed final factorial(4) result = 24.'
    });

  } else {
    // Default Addition Example: add(10, 20)
    steps.push({
      line: mainCallLine,
      type: 'CALL_ENCOUNTER',
      title: '📞 ENCOUNTER FUNCTION CALL',
      snippet: 'int answer = add(10, 20);',
      activeFunction: 'main',
      callStack: [
        { name: 'main()', status: 'WAITING FOR RETURN ⏸', vars: { answer: 'unassigned' } }
      ],
      functionMap: { caller: 'main()', active: 'main()', target: 'add(10, 20)' },
      argumentTransfer: { arg: '10, 20', param: 'a=10, b=20' },
      whyExplanation: 'main() is calling add() with arguments (10, 20) and waiting for return value.'
    });

    steps.push({
      line: funcDeclLine,
      type: 'FUNCTION_ENTRY',
      title: '📥 ENTER FUNCTION add(a = 10, b = 20)',
      snippet: 'int add(int a, int b)',
      activeFunction: 'add',
      callStack: [
        { name: 'add(a = 10, b = 20)', status: 'ACTIVE 🟢', vars: { a: 10, b: 20 } },
        { name: 'main()', status: 'WAITING FOR RETURN ⏸', vars: { answer: 'unassigned' } }
      ],
      functionMap: { caller: 'main()', active: 'add(10, 20)', target: null },
      argumentTransfer: { arg: '10 -> a, 20 -> b', param: 'a = 10, b = 20' },
      whyExplanation: 'Argument 10 initializes parameter a. Argument 20 initializes parameter b.'
    });

    steps.push({
      line: funcBodyLine,
      type: 'LOCAL_VAR_DECL',
      title: '📦 CALCULATING LOCAL VARIABLE result',
      snippet: 'int result = a + b;',
      activeFunction: 'add',
      callStack: [
        { name: 'add(a = 10, b = 20)', status: 'ACTIVE 🟢', vars: { a: 10, b: 20, result: 30 } },
        { name: 'main()', status: 'WAITING FOR RETURN ⏸', vars: { answer: 'unassigned' } }
      ],
      functionMap: { caller: 'main()', active: 'add(10, 20)', target: null },
      whyExplanation: 'Calculated 10 + 20 = 30 and assigned to local variable result inside add().'
    });

    steps.push({
      line: returnLine,
      type: 'RETURN_EVAL',
      title: '↩️ EXECUTING return result (30)',
      snippet: 'return result;',
      activeFunction: 'add',
      callStack: [
        { name: 'add(a = 10, b = 20)', status: 'RETURNING ↩️', vars: { a: 10, b: 20, result: 30, returnVal: 30 } },
        { name: 'main()', status: 'RESUMING 🟢', vars: { answer: 30 } }
      ],
      functionMap: { caller: 'main()', active: 'add(10, 20)', target: null },
      returnValue: 30,
      whyExplanation: 'add() returns value 30 back to caller main(). add() stack frame will now pop.'
    });

    steps.push({
      line: mainCallLine,
      type: 'CALLER_ASSIGN',
      title: '📥 RESUMING main(): answer = 30',
      snippet: 'int answer = 30;',
      activeFunction: 'main',
      callStack: [
        { name: 'main()', status: 'ACTIVE 🟢', vars: { answer: 30 } }
      ],
      functionMap: { caller: null, active: 'main()', target: null },
      whyExplanation: 'main() resumes. Returned value 30 is assigned to variable answer.'
    });

    terminalBuffer += '30\n';
    steps.push({
      line: printLine,
      type: 'PRINT',
      title: '🖨 PRINT OUTPUT IN main()',
      snippet: 'printf("%d\\n", answer);',
      activeFunction: 'main',
      callStack: [
        { name: 'main()', status: 'ACTIVE 🟢', vars: { answer: 30 } }
      ],
      functionMap: { caller: null, active: 'main()', target: null },
      outputAdded: '30\n',
      terminalBufferSoFar: terminalBuffer,
      whyExplanation: 'Printed answer = 30 to terminal output.'
    });
  }

  // Program Completion
  steps.push({
    line: lines.length - 1 || 10,
    type: 'PROGRAM_FINISH',
    title: '🎉 PROGRAM EXECUTION COMPLETED',
    snippet: 'return 0;',
    activeFunction: 'main',
    callStack: [
      { name: 'main()', status: 'FINISHED 🔴', vars: {} }
    ],
    functionMap: { caller: null, active: 'main()', target: null },
    terminalBufferSoFar: terminalBuffer,
    whyExplanation: 'main() returned 0. Program execution completed cleanly!'
  });

  return steps;
}

export default function FunctionArena() {
  const [currentPresetIdx, setCurrentPresetIdx] = useState(0);
  const activePreset = FUNCTION_PRESETS[currentPresetIdx];

  const [code, setCode] = useState(activePreset.code);
  const [toast, setToast] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [xp, setXp] = useState(180);

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
      const generatedSteps = parseAndGenerateFunctionSteps(code);
      setTraceSteps(generatedSteps);
      setCurrentStepIdx(0);
    } catch (err) {
      console.error('Function trace parse error:', err);
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
    setToast({ message: 'Function simulator reset to initial preset state.', type: 'info' });
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setToast({ message: 'Function Arena link copied to clipboard!', type: 'success' });
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleChallengeSubmit = (e) => {
    e.preventDefault();
    const ch = FUNCTION_CHALLENGES[activeChallengeIdx];
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
      <div className="card" style={{ padding: classroomMode ? '1rem 1.5rem' : '1.5rem', marginBottom: '1.25rem', background: 'linear-gradient(135deg, #0f172a 0%, #6d28d9 100%)', color: '#ffffff', borderRadius: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(167, 139, 250, 0.25)', padding: '0.35rem 0.85rem', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 700, color: '#c4b5fd', marginBottom: '0.5rem' }}>
              <Cpu size={16} />
              <span>Interactive C Function Simulator</span>
            </div>
            <h1 style={{ fontSize: classroomMode ? '2rem' : '1.65rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.2rem' }}>
              ⚙️ FUNCTION ARENA
            </h1>
            <p style={{ fontSize: classroomMode ? '1rem' : '0.875rem', color: '#e9d5ff' }}>
              Call a Function. Follow the Flow. Understand the Return!
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
          {FUNCTION_PRESETS.map((preset, idx) => (
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
                background: idx === currentPresetIdx ? '#7c3aed' : 'rgba(255,255,255,0.08)',
                color: idx === currentPresetIdx ? '#ffffff' : '#e9d5ff'
              }}
            >
              {preset.title}
            </button>
          ))}
        </div>
      </div>

      {/* PLAYBACK CONTROLS TOOLBAR */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem', background: '#ffffff', border: '2px solid #7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button 
            onClick={handleTogglePlay}
            className="btn btn-primary"
            style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem', gap: '0.5rem', borderRadius: '10px', background: isPlaying ? '#ef4444' : '#7c3aed' }}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            <span>{isPlaying ? 'Pause' : '▶ Run Function Simulator'}</span>
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
                  background: speedMs === sp.val ? '#7c3aed' : '#f1f5f9',
                  color: speedMs === sp.val ? '#ffffff' : '#475569'
                }}
              >
                {sp.label}
              </button>
            ))}
          </div>

          <div style={{ background: '#f5f3ff', padding: '0.4rem 0.85rem', borderRadius: '8px', border: '1px solid #ddd6fe', fontSize: '0.85rem', fontWeight: 800, color: '#6d28d9' }}>
            Step: {currentStepIdx + 1} / {traceSteps.length || 1}
          </div>
        </div>
      </div>

      {/* CENTER VISUAL ARCHITECTURE: FUNCTION CALL STACK & MAP */}
      <div style={{ display: 'grid', gridTemplateColumns: classroomMode ? '1fr 1fr' : 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        
        {/* FUNCTION CALL STACK (Visual Stack Frames) */}
        <div className="card" style={{ padding: '1.25rem', background: '#090d16', color: '#ffffff', borderRadius: '16px', border: '2px solid #7c3aed' }}>
          <h3 style={{ fontSize: classroomMode ? '1.25rem' : '1.1rem', fontWeight: 800, color: '#a78bfa', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={20} color="#a78bfa" />
            <span>FUNCTION CALL STACK (Top = Active Frame)</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {(currentStep.callStack || []).map((frame, fIdx) => {
              const isTop = fIdx === 0;
              return (
                <div
                  key={fIdx}
                  className="animate-scale-in"
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '12px',
                    background: isTop ? 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 100%)' : '#1e293b',
                    border: `2px solid ${isTop ? '#a78bfa' : '#334155'}`,
                    boxShadow: isTop ? '0 0 15px rgba(167, 139, 250, 0.3)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>
                      {frame.name}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '50px', background: isTop ? '#10b981' : '#475569', color: '#ffffff' }}>
                      {frame.status}
                    </span>
                  </div>

                  {/* Frame Variables Scope */}
                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {Object.keys(frame.vars || {}).length > 0 ? (
                      Object.entries(frame.vars).map(([k, v]) => (
                        <span key={k} style={{ background: 'rgba(0,0,0,0.25)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                          <code>{k}</code> = <strong style={{ color: '#fef08a' }}>{v?.toString()}</strong>
                        </span>
                      ))
                    ) : (
                      <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>No active local variables</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FUNCTION MAP & ARGUMENT TRANSFER */}
        <div className="card" style={{ padding: '1.25rem', background: '#090d16', color: '#ffffff', borderRadius: '16px', border: '2px solid #7c3aed' }}>
          <h3 style={{ fontSize: classroomMode ? '1.25rem' : '1.1rem', fontWeight: 800, color: '#c4b5fd', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <GitPullRequest size={20} color="#c4b5fd" />
            <span>FUNCTION CALL GRAPH & ARGUMENT MAPPING</span>
          </h3>

          <div style={{ background: '#1e293b', padding: '1rem', borderRadius: '12px', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <div style={{ padding: '0.5rem 0.85rem', background: '#4f46e5', borderRadius: '8px', fontWeight: 800, fontSize: '0.9rem' }}>
                main()
              </div>

              {currentStep.functionMap?.target && (
                <>
                  <span style={{ color: '#a78bfa', fontWeight: 800, fontSize: '1.1rem' }}>➔ calls ➔</span>
                  <div style={{ padding: '0.5rem 0.85rem', background: '#7c3aed', borderRadius: '8px', fontWeight: 800, fontSize: '0.9rem' }}>
                    {currentStep.functionMap.target}
                  </div>
                </>
              )}
            </div>

            {/* Argument to Parameter Transfer Details */}
            {currentStep.argumentTransfer && (
              <div className="animate-fade-in" style={{ background: '#2e1065', padding: '0.75rem', borderRadius: '8px', border: '1px solid #a78bfa', fontSize: '0.85rem', color: '#e9d5ff' }}>
                <strong>Argument Transfer:</strong> {currentStep.argumentTransfer.arg} ➔ <strong>Parameter Slot:</strong> {currentStep.argumentTransfer.param}
              </div>
            )}

            {/* Return Value Evaluation */}
            {currentStep.returnValue !== undefined && (
              <div className="animate-fade-in" style={{ marginTop: '0.5rem', background: '#065f46', padding: '0.75rem', borderRadius: '8px', border: '1px solid #34d399', fontSize: '0.85rem', color: '#a7f3d0' }}>
                <strong>↩️ Return Value Evaluation:</strong> Returns <strong style={{ fontSize: '1.05rem', color: '#ffffff' }}>{currentStep.returnValue}</strong> back to caller!
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 2-COLUMN MAIN LAYOUT: CODE VS EXECUTION DETAILS */}
      <div style={{ display: 'grid', gridTemplateColumns: classroomMode ? '1fr 1fr' : 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        
        {/* LEFT COLUMN: LINE-BY-LINE CODE EDITOR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card" style={{ padding: '1.25rem', background: '#0f172a', color: '#f8fafc', borderRadius: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#c4b5fd', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Code2 size={18} />
                <span>Line-by-Line C Code Execution</span>
              </span>
            </div>

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
                      background: isActiveLine ? 'rgba(124, 58, 237, 0.35)' : 'transparent',
                      borderLeft: isActiveLine ? '4px solid #a78bfa' : '4px solid transparent',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ width: '32px', color: isActiveLine ? '#c4b5fd' : '#475569', fontSize: '0.75rem', userSelect: 'none', fontWeight: 700 }}>
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
        </div>

        {/* RIGHT COLUMN: EXECUTION DETAILS & TERMINAL OUTPUT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* STEP EXPLANATION CARD */}
          <div className="card" style={{ padding: '1.25rem', border: '2px solid #7c3aed', background: 'linear-gradient(135deg, #f8fafc 0%, #f5f3ff 100%)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
              CURRENT EXECUTION STEP ({currentStepIdx + 1}/{traceSteps.length})
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>
              {currentStep.title}
            </h3>
            <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', background: '#0f172a', color: '#c4b5fd', padding: '0.4rem 0.75rem', borderRadius: '6px', display: 'inline-block', marginBottom: '0.6rem' }}>
              Line {currentStep.line}: {currentStep.snippet}
            </div>

            <div style={{ background: '#ffffff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#6d28d9', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
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
              minHeight: '100px',
              whiteSpace: 'pre-wrap'
            }}>
              {currentStep.terminalBufferSoFar || '(Executing...)'}
              <span className="animate-pulse" style={{ color: '#ffffff', fontWeight: 900 }}>█</span>
            </pre>
          </div>

          {/* FUNCTION CHALLENGES CARD */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Trophy size={18} color="#f59e0b" />
              <span>Function Arena Challenge #{activeChallengeIdx + 1}</span>
            </h3>

            <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
                {FUNCTION_CHALLENGES[activeChallengeIdx].title}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                {FUNCTION_CHALLENGES[activeChallengeIdx].question}
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
              <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', background: '#7c3aed' }}>
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
