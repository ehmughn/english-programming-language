const inputEl = document.getElementById("input");
const lineNumbersEl = document.getElementById("lineNumbers");
const outputEl = document.getElementById("output");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const autocompleteEl = document.getElementById("autocomplete");

// Undo/Redo history
let history = [{ content: "", caret: 0 }];
let historyIndex = 0;
let isProgrammaticChange = false;

// Autocomplete state
const keywords = [
    "create a variable with the name of",
    "with the type of",
    "with the value of",
    "change the value of",
    "to",
    "display(\"\")",
    "when {}",
    "otherwise {}",
    "otherwise when {}",
    "True",
    "False",
    "int",
    "string",
    "boolean",
    "is equal to",
    "is not equal to",
    "is greater than or equal to",
    "is less than or equal to",
    "is greater than",
    "is less than",
    "and",
    "or",
    "not",
    "loop until {}",
    "loop beginning with x with the value of 0 that is updated incrementally and ending when x is less than 10 {}", // Updated to 'and ending when'
    "increment the", // Added for new statement
    "decrement the"  // Added for new statement
];
let autocompleteSuggestions = [];
let selectedSuggestionIndex = -1;

// Error state
let errorLine = null;

// Single global context for variables
let globalContext = {};

// NEW: Preprocess lines to normalize capitalization, periods, and 'and ending when'
function preprocessLines(rawLines) {
    return rawLines.map((line, index) => {
        const trimmed = line.trim();
        if (trimmed === "" || trimmed.startsWith("//")) return line;
        if (trimmed === "{" || trimmed === "}") return line;
        // Capitalize first character
        let normalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
        // Ensure trailing period for non-bracket lines
        if (!normalized.endsWith(".") && !normalized.endsWith("{") && !normalized.endsWith("}")) {
            normalized += ".";
        }
        // Replace 'and ending with' with 'and ending when' for for loops
        normalized = normalized.replace(/and ending with/i, "and ending when");
        return normalized;
    });
}

function replaceEnglishLogicalExpressions(input) {
    return input.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\bis equal to\b|\bis not equal to\b|\bis greater than or equal to\b|\bis less than or equal to\b|\bis greater than\b|\bis less than\b|\band\b|\bor\b|\bnot\b)/g, (match, stringLiteral, logicalExpression) => {
        if (stringLiteral) return stringLiteral;
        switch (logicalExpression) {
            case "is equal to": return "==";
            case "is not equal to": return "!=";
            case "is greater than or equal to": return ">=";
            case "is less than or equal to": return "<=";
            case "is greater than": return ">";
            case "is less than": return "<";
            case "and": return "&&";
            case "or": return "||";
            case "not": return "!";
            default: return logicalExpression;
        }
    });
}

function saveCaretPosition(el) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return 0;
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(el);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    return preCaretRange.toString().length;
}

function restoreCaretPosition(el, position) {
    const selection = window.getSelection();
    const range = document.createRange();
    let charCount = 0;
    let found = false;

    function traverseNodes(node) {
        if (node.nodeType === 3) {
            const nextCharCount = charCount + node.length;
            if (position <= nextCharCount) {
                const offset = Math.min(position - charCount, node.length);
                range.setStart(node, offset);
                range.collapse(true);
                found = true;
                return true;
            }
            charCount = nextCharCount;
        } else if (node.nodeType === 1) {
            for (let child of node.childNodes) {
                if (traverseNodes(child)) return true;
            }
        }
        return false;
    }

    traverseNodes(el);
    if (!found) {
        const lastSpan = el.querySelector("span[data-line]:last-child");
        if (lastSpan && lastSpan.lastChild) {
            range.setStart(lastSpan.lastChild, lastSpan.lastChild.length);
            range.collapse(true);
        } else {
            range.selectNodeContents(el);
            range.collapse(false);
        }
    }
    selection.removeAllRanges();
    selection.addRange(range);
}

function updateLineNumbers() {
    const lines = inputEl.textContent.split("\n");
    let lineNumberText = "";
    for (let i = 1; i <= lines.length; i++) {
        lineNumberText += i + "\n";
    }
    lineNumbersEl.textContent = lineNumberText;
    const scrollHeight = inputEl.scrollHeight;
    lineNumbersEl.style.height = `${scrollHeight}px`;
    inputEl.style.height = `${scrollHeight}px`;
}

function highlightErrorLine(lineNumber) {
    const spans = inputEl.querySelectorAll("span[data-line]");
    spans.forEach(span => span.classList.remove("line-error"));
    if (lineNumber) {
        const lineEl = inputEl.querySelector(`[data-line="${lineNumber}"]`);
        if (lineEl) lineEl.classList.add("line-error");
        errorLine = lineNumber;
    } else {
        errorLine = null;
    }
}

function updateHistory() {
    if (isProgrammaticChange) return;
    history = history.slice(0, historyIndex + 1);
    history.push({
        content: inputEl.textContent,
        caret: saveCaretPosition(inputEl)
    });
    historyIndex = history.length - 1;
    updateUndoRedoButtons();
}

function undo() {
    if (historyIndex <= 0) return;
    isProgrammaticChange = true;
    historyIndex--;
    inputEl.textContent = history[historyIndex].content;
    restoreCaretPosition(inputEl, history[historyIndex].caret);
    Prism.highlightElement(inputEl);
    updateLineNumbers();
    highlightErrorLine(null);
    showAutocomplete();
    updateUndoRedoButtons();
    isProgrammaticChange = false;
}

function redo() {
    if (historyIndex >= history.length - 1) return;
    isProgrammaticChange = true;
    historyIndex++;
    inputEl.textContent = history[historyIndex].content;
    restoreCaretPosition(inputEl, history[historyIndex].caret);
    Prism.highlightElement(inputEl);
    updateLineNumbers();
    highlightErrorLine(null);
    showAutocomplete();
    updateUndoRedoButtons();
    isProgrammaticChange = false;
}

function updateUndoRedoButtons() {
    undoBtn.disabled = historyIndex <= 0;
    redoBtn.disabled = historyIndex >= history.length - 1;
}

function showAutocomplete() {
    const selection = window.getSelection();
    if (!selection.rangeCount) {
        autocompleteEl.style.display = "none";
        return;
    }
    const range = selection.getRangeAt(0);
    const caretPosition = saveCaretPosition(inputEl);
    const textBeforeCaret = inputEl.textContent.slice(0, caretPosition);
    const wordMatch = textBeforeCaret.match(/\w*$/);
    if (!wordMatch || !wordMatch[0]) {
        autocompleteEl.style.display = "none";
        return;
    }
    const word = wordMatch[0].toLowerCase();
    autocompleteSuggestions = [
        ...keywords.filter(k => k.toLowerCase().startsWith(word)),
        ...Object.keys(globalContext).filter(v => v.toLowerCase().startsWith(word))
    ];
    if (autocompleteSuggestions.length === 0) {
        autocompleteEl.style.display = "none";
        return;
    }
    const rect = range.getBoundingClientRect();
    autocompleteEl.style.left = `${rect.left}px`;
    autocompleteEl.style.top = `${rect.bottom + window.scrollY}px`;
    autocompleteEl.innerHTML = autocompleteSuggestions
        .map((suggestion, index) =>
            `<div class="${index === selectedSuggestionIndex ? 'selected' : ''}">${suggestion}</div>`
        )
        .join("");
    autocompleteEl.style.display = "block";
}

function applyAutocomplete() {
    if (selectedSuggestionIndex === -1) return;
    const suggestion = autocompleteSuggestions[selectedSuggestionIndex];
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const caretPosition = saveCaretPosition(inputEl);
    const textBeforeCaret = inputEl.textContent.slice(0, caretPosition);
    const wordMatch = textBeforeCaret.match(/\w*$/);
    if (wordMatch && wordMatch[0]) {
        const wordLength = wordMatch[0].length;
        const startOffset = caretPosition - wordLength;
        const deleteRange = document.createRange();
        let node = range.startContainer;
        let offset = range.startOffset;
        let charsToStart = wordLength;
        while (node && charsToStart > 0) {
            if (node.nodeType === 3) {
                if (offset >= charsToStart) {
                    offset -= charsToStart;
                    break;
                }
                charsToStart -= offset;
                offset = 0;
            }
            node = node.previousSibling;
            if (node && node.nodeType === 3) {
                offset = node.length;
            } else {
                offset = 0;
            }
        }
        if (node) {
            deleteRange.setStart(node, offset);
            deleteRange.setEnd(range.startContainer, range.startOffset);
            deleteRange.deleteContents();
            const suggestionNode = document.createTextNode(suggestion + " ");
            deleteRange.insertNode(suggestionNode);
            const newCaretPosition = startOffset + suggestion.length + 1;
            range.setStart(suggestionNode, suggestion.length + 1);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            updateHistory();
            markLines();
            restoreCaretPosition(inputEl, newCaretPosition);
            updateLineNumbers();
            highlightErrorLine(null);
        }
    } else {
        const suggestionNode = document.createTextNode(suggestion + " ");
        range.insertNode(suggestionNode);
        range.setStart(suggestionNode, suggestion.length + 1);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        updateHistory();
        markLines();
        restoreCaretPosition(inputEl, caretPosition + suggestion.length + 1);
        updateLineNumbers();
        highlightErrorLine(null);
    }
    autocompleteEl.style.display = "none";
    selectedSuggestionIndex = -1;
}

function markLines() {
  const lines = inputEl.textContent.split("\n");
  inputEl.innerHTML = "";
  lines.forEach((line, index) => {
      const span = document.createElement("span");
      span.setAttribute("data-line", index + 1);
      span.textContent = line + (index < lines.length - 1 ? "\n" : "");
      inputEl.appendChild(span);
  });
  // Force Prism to re-highlight
  inputEl.classList.add('language-custom-lang');
  Prism.highlightElement(inputEl);
}

// Event Listeners
inputEl.addEventListener("input", () => {
    const caretPosition = saveCaretPosition(inputEl);
    updateHistory();
    markLines();
    restoreCaretPosition(inputEl, caretPosition);
    updateLineNumbers();
    highlightErrorLine(null);
    showAutocomplete();
});

inputEl.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.key === "z") {
        event.preventDefault();
        undo();
        return;
    }
    if (event.ctrlKey && (event.key === "y" || (event.key === "Z" && event.shiftKey))) {
        event.preventDefault();
        redo();
        return;
    }
    if (event.key === "ArrowDown" && autocompleteEl.style.display === "block") {
        event.preventDefault();
        selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, autocompleteSuggestions.length - 1);
        showAutocomplete();
        return;
    }
    if (event.key === "ArrowUp" && autocompleteEl.style.display === "block") {
        event.preventDefault();
        selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
        showAutocomplete();
        return;
    }
    if (event.key === "Enter" && autocompleteEl.style.display === "block") {
        event.preventDefault();
        applyAutocomplete();
        return;
    }
    if (event.key === "Enter") {
        event.preventDefault();
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        const caretPosition = saveCaretPosition(inputEl);
        const textBeforeCaret = inputEl.textContent.slice(0, caretPosition);
        const currentLine = textBeforeCaret.split("\n").pop();
        const indentationMatch = currentLine.match(/^\s*/);
        const currentIndentation = indentationMatch ? indentationMatch[0] : "";
        const additionalIndentation = /[\{\[\(]$/.test(currentLine) ? "    " : "";
        const newLineText = "\n" + currentIndentation + additionalIndentation;
        const newLineNode = document.createTextNode(newLineText);
        range.insertNode(newLineNode);
        const newCaretPosition = caretPosition + newLineText.length;
        range.setStart(newLineNode, newLineText.length);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        updateHistory();
        markLines();
        restoreCaretPosition(inputEl, newCaretPosition);
        updateLineNumbers();
        showAutocomplete();
        return;
    }
    if (event.key === "Tab") {
        event.preventDefault();
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const tabCharacter = document.createTextNode("    ");
        range.insertNode(tabCharacter);
        range.setStartAfter(tabCharacter);
        range.setEndAfter(tabCharacter);
        selection.removeAllRanges();
        selection.addRange(range);
        updateHistory();
        markLines();
        updateLineNumbers();
        return;
    }
    const openingChars = {
        "(": ")",
        "{": "}",
        "[": "]",
        '"': '"',
        "'": "'",
        "<": ">"
    };
    if (openingChars[event.key]) {
        event.preventDefault();
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        const caretPosition = saveCaretPosition(inputEl);
        range.deleteContents();
        const pairText = event.key + openingChars[event.key];
        const pairNode = document.createTextNode(pairText);
        range.insertNode(pairNode);
        range.setStart(pairNode, 1);
        range.setEnd(pairNode, 1);
        selection.removeAllRanges();
        selection.addRange(range);
        updateHistory();
        markLines();
        restoreCaretPosition(inputEl, caretPosition + 1);
        updateLineNumbers();
        return;
    }
    if (event.key === "Backspace") {
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        if (
            range.startContainer.nodeType === 3 &&
            range.startOffset > 0 &&
            range.startContainer.textContent[range.startOffset - 1] in openingChars &&
            range.startContainer.textContent[range.startOffset] === openingChars[range.startContainer.textContent[range.startOffset - 1]]
        ) {
            event.preventDefault();
            const text = range.startContainer.textContent;
            range.startContainer.textContent = text.slice(0, range.startOffset - 1) + text.slice(range.startOffset + 1);
            range.setStart(range.startContainer, range.startOffset - 1);
            range.setEnd(range.startContainer, range.startOffset - 1);
            selection.removeAllRanges();
            selection.addRange(range);
            updateHistory();
            markLines();
            updateLineNumbers();
        }
    }
});

inputEl.addEventListener("scroll", () => {
    lineNumbersEl.scrollTop = inputEl.scrollTop;
});

autocompleteEl.addEventListener("click", (event) => {
    const suggestion = event.target.textContent;
    if (suggestion) {
        selectedSuggestionIndex = autocompleteSuggestions.indexOf(suggestion);
        applyAutocomplete();
    }
});

document.getElementById("runBtn").addEventListener("click", () => {
    const input = inputEl.textContent;
    const lines = input.split("\n");
    const normalizedLines = preprocessLines(lines); // NEW: Preprocess lines
    globalContext = {}; // Reset global context
    const result = [];
    outputEl.innerHTML = "";
    highlightErrorLine(null);

    const convertFuncs = {
        string: val => String(val),
        int: val => {
            const parsed = parseInt(val);
            if (isNaN(parsed)) throw new Error(`Cannot convert to int: ${val}`);
            return parsed;
        },
        type: val => {
            if (typeof val === "number" && !Number.isInteger(val)) return "float";
            if (typeof val === "number") return "int";
            if (typeof val === "boolean") return "boolean";
            if (typeof val === "string") return "string";
            return "unknown";
        }
    };

    const evaluateExpression = (expr, evalContext) => {
        try {
            // Step 1: Replace logical expressions
            const processedExpr = replaceEnglishLogicalExpressions(expr);
            console.log(`After logical replacements: ${processedExpr}`);

            // Step 2: Store string literals
            const stringLiterals = [];
            let safeExpr = processedExpr.replace(/"(.*?)"|'(.*?)'/g, match => {
                const idx = stringLiterals.push(match.slice(1, -1));
                return `__STRING__${idx - 1}__`;
            });
            console.log(`After string literal replacement: ${safeExpr}`);

            // Step 3: Replace variables with values (no recursion)
            safeExpr = safeExpr.replace(/\b([A-Za-z_]\w*)\b/g, match => {
                if (match in evalContext) {
                    const value = evalContext[match].value;
                    const type = evalContext[match].type;
                    console.log(`Variable lookup: ${match} = ${value}, type: ${type}`);
                    if (value === undefined || value === null) {
                        throw new Error(`Variable '${match}' is undefined or null`);
                    }
                    return typeof value === 'string' ? JSON.stringify(value) : value.toString();
                }
                if (match === "True") return "true";
                if (match === "False") return "false";
                return match;
            });
            console.log(`After variable replacement: ${safeExpr}`);

            // Step 4: Restore string literals
            safeExpr = safeExpr.replace(/__STRING__(\d+)__/g, (_, idx) => JSON.stringify(stringLiterals[idx]));
            console.log(`Final expression: ${safeExpr}`);

            // Step 5: Evaluate
            const wrapped = `"use strict"; return (${safeExpr});`;
            const fn = new Function(wrapped);
            const result = fn();
            console.log(`Expression result: ${result}`);
            return result;
        } catch (e) {
            console.error(`Expression evaluation failed for "${expr}": ${e.message}, Stack: ${e.stack}`);
            throw new Error(`Expression evaluation failed: ${e.message}`);
        }
    };

    function parseBlock(lines, startIndex) {
        const block = [];
        let braceCount = 0;
        let i = startIndex;
        let inNestedBlock = false;
        let nestedBlockEnd = -1;

        if (lines[startIndex].includes("{")) {
            braceCount = 1;
            i++;
        } else {
            throw new Error(`Expected '{' at line ${startIndex + 1}`);
        }

        while (i < lines.length && braceCount > 0) {
            const line = lines[i].trim();
            if (line === "") {
                i++;
                continue;
            }

            if (line.startsWith("Loop beginning with ") || line.startsWith("Loop until ") || line.startsWith("When ")) {
                if (braceCount === 1) {
                    inNestedBlock = true;
                    const { nextIndex } = parseBlock(lines, i);
                    nestedBlockEnd = nextIndex;
                    block.push({ line: lines[i], index: i });
                    i = nextIndex;
                    inNestedBlock = false;
                    continue;
                }
            }

            if (inNestedBlock) {
                i++;
                if (i >= nestedBlockEnd) {
                    inNestedBlock = false;
                }
                continue;
            }

            if (line.includes("{")) braceCount++;
            if (line.includes("}")) braceCount--;

            if (braceCount > 0 || (braceCount === 0 && !line.includes("}"))) {
                block.push({ line: lines[i], index: i });
            }

            i++;
        }

        if (braceCount !== 0) {
            throw new Error(`Unmatched braces starting at line ${startIndex + 1}`);
        }

        console.log(`parseBlock from line ${startIndex + 1} returns block: ${block.map(b => `Line ${b.index + 1}: ${b.line.trim()}`).join(", ")}, nextIndex: ${i}`);
        return { block, nextIndex: i };
    }

    function validateType(value, declaredType, lineNumber) {
        const actualType = convertFuncs.type(value);
        if (declaredType === "int" && actualType !== "int") {
            throw new Error(`Type mismatch - expected int, got ${actualType} (line ${lineNumber})`);
        }
        if (declaredType === "string" && actualType !== "string") {
            throw new Error(`Type mismatch - expected string, got ${actualType} (line ${lineNumber})`);
        }
        if (declaredType === "boolean" && actualType !== "boolean") {
            throw new Error(`Type mismatch - expected boolean, got ${actualType} (line ${lineNumber})`);
        }
    }

    function executeLoop(condition, loopBlock, evalContext, lineNumber) {
        let iteration = 0;
        const maxIterations = 1000;
        console.log(`Starting loop until, condition: ${condition}, initial context: ${JSON.stringify(evalContext)}`);
        while (iteration < maxIterations) {
            const conditionResult = evaluateExpression(condition, evalContext);
            console.log(`Loop until iteration ${iteration}, condition: ${condition} = ${conditionResult}, context: ${JSON.stringify(evalContext)}`);
            if (typeof conditionResult !== "boolean") {
                throw new Error(`Loop condition must evaluate to boolean (line ${lineNumber})`);
            }
            if (conditionResult) break;
            for (const { line: subLine, index: subIndex } of loopBlock) {
                const trimmedLine = subLine.trim();
                if (trimmedLine === "" || trimmedLine.startsWith("//")) continue;
                console.log(`Executing loop until block line ${subIndex + 1}: ${trimmedLine}`);
                evalSingleLine(subLine, subIndex + 1, evalContext);
            }
            iteration++;
        }
        if (iteration >= maxIterations) {
            throw new Error(`Loop exceeded maximum iterations (${maxIterations}) - possible infinite loop (line ${lineNumber})`);
        }
        console.log(`Ended loop until, final context: ${JSON.stringify(evalContext)}`);
    }

    function evalSingleLine(line, lineNumber, evalContext) {
        const trimmed = line.trim();
        if (trimmed === "" || trimmed.startsWith("//") || trimmed === "}") return;

        // MODIFIED: Expect trailing period for display
        if (/^\s*Display\(/.test(trimmed)) {
            const match = trimmed.match(/^\s*Display\((.*)\)\.$/);
            if (!match) throw new Error(`Invalid display syntax (line ${lineNumber})`);
            const args = match[1].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(arg => arg.trim());
            if (args.length < 1) throw new Error(`Display requires at least one argument (line ${lineNumber})`);
            const str = evaluateExpression(args[0], evalContext);
            const newline = (args[1] ? args[1].toLowerCase() : "true") === "true";
            result.push(`<span>${String(str)}${newline ? "<br>" : ""}</span>`);
            return;
        }

        // MODIFIED: Expect capitalized keywords and trailing periods
        if (/^Create a variable with the name of\s+\w+\s+with the type of\s+(int|string|boolean)\s+with the value of\s+/.test(trimmed)) {
            const match = trimmed.match(/^Create a variable with the name of\s+(\w+)\s+with the type of\s+(int|string|boolean)\s+with the value of\s+(.+)\.$/);
            if (!match) throw new Error(`Invalid typed declaration syntax (line ${lineNumber})`);
            const varName = match[1];
            const declaredType = match[2];
            const valueExpr = match[3];
            const value = evaluateExpression(valueExpr, evalContext);
            validateType(value, declaredType, lineNumber);
            evalContext[varName] = { value, type: declaredType };
            return;
        }

        if (/^Create a variable with the name of\s+\w+\s+with the type of\s+(int|string|boolean)$/.test(trimmed)) {
            const match = trimmed.match(/^Create a variable with the name of\s+(\w+)\s+with the type of\s+(int|string|boolean)\.$/);
            if (!match) throw new Error(`Invalid typed declaration syntax (line ${lineNumber})`);
            const varName = match[1];
            const declaredType = match[2];
            evalContext[varName] = { value: undefined, type: declaredType };
            return;
        }

        if (/^Create a variable with the name of\s+\w+\s+with the value of\s+/.test(trimmed)) {
            const match = trimmed.match(/^Create a variable with the name of\s+(\w+)\s+with the value of\s+(.+)\.$/);
            if (!match) throw new Error(`Invalid untyped declaration syntax (line ${lineNumber})`);
            const varName = match[1];
            const value = evaluateExpression(match[2], evalContext);
            evalContext[varName] = { value, type: null };
            return;
        }

        if (/^Change the value of\s+\w+\s+to\s+/.test(trimmed)) {
            const match = trimmed.match(/^Change the value of\s+(\w+)\s+to\s+(.+)\.$/);
            if (!match) throw new Error(`Invalid assignment syntax (line ${lineNumber})`);
            const varName = match[1];
            const expr = match[2];
            if (!evalContext.hasOwnProperty(varName)) {
                throw new Error(`Variable '${varName}' is not declared (line ${lineNumber})`);
            }
            const value = evaluateExpression(expr, evalContext);
            console.log(`Evaluated ${expr} = ${value}, type: ${typeof value}`);
            if (evalContext[varName].type) {
                validateType(value, evalContext[varName].type, lineNumber);
            }
            evalContext[varName].value = value;
            console.log(`Changed ${varName} to: ${value}`);
            return;
        }

        // NEW: Increment statement
        if (trimmed.startsWith("Increment the ")) {
            const match = trimmed.match(/^Increment the\s+(\w+)\.$/);
            if (!match) throw new Error(`Invalid Increment syntax (line ${lineNumber})`);
            const varName = match[1];
            if (!evalContext[varName] || evalContext[varName].type !== "int") {
                throw new Error(`Variable ${varName} must be an integer (line ${lineNumber})`);
            }
            evalContext[varName].value += 1;
            console.log(`evalSingleLine: Incremented ${varName} to: ${evalContext[varName].value}`);
            return;
        }

        // NEW: Decrement statement
        if (trimmed.startsWith("Decrement the ")) {
            const match = trimmed.match(/^Decrement the\s+(\w+)\.$/);
            if (!match) throw new Error(`Invalid Decrement syntax (line ${lineNumber})`);
            const varName = match[1];
            if (!evalContext[varName] || evalContext[varName].type !== "int") {
                throw new Error(`Variable ${varName} must be an integer (line ${lineNumber})`);
            }
            evalContext[varName].value -= 1;
            console.log(`evalSingleLine: Decremented ${varName} to: ${evalContext[varName].value}`);
            return;
        }

        if (trimmed.startsWith("Loop until ")) {
            const untilMatch = trimmed.match(/^Loop until\s+(.+)\s*\{$/);
            if (!untilMatch) throw new Error(`Invalid loop until syntax (line ${lineNumber})`);
            const condition = untilMatch[1];
            const { block, nextIndex } = parseBlock(normalizedLines, lineNumber - 1);
            console.log(`evalSingleLine: Starting loop until, condition: ${condition}`);
            let iteration = 0;
            while (iteration < 1000) {
                const conditionResult = evaluateExpression(condition, evalContext);
                console.log(`evalSingleLine: Loop until iteration ${iteration}, condition: ${condition} = ${conditionResult}`);
                if (typeof conditionResult !== "boolean") {
                    throw new Error(`Loop condition must evaluate to boolean (line ${lineNumber})`);
                }
                if (conditionResult) break;
                for (const { line: subLine, index: subIndex } of block) {
                    const trimmedLine = subLine.trim();
                    if (trimmedLine === "" || trimmedLine.startsWith("//")) continue;
                    console.log(`evalSingleLine: Executing loop until block line ${subIndex + 1}: ${trimmedLine}`);
                    evalSingleLine(subLine, subIndex + 1, evalContext);
                }
                iteration++;
            }
            if (iteration >= 1000) {
                throw new Error(`Infinite loop detected (line ${lineNumber})`);
            }
            console.log(`evalSingleLine: Ended loop until, final context: ${JSON.stringify(evalContext)}`);
            return;
        }

        // MODIFIED: Update for 'and ending when'
        if (trimmed.startsWith("Loop beginning with ")) {
            const forMatch = trimmed.match(/^Loop beginning with\s+(\w+)\s+with the value of\s+(.+?)\s+that is updated\s+(incrementally|decrementally)\s+and ending when\s+(.+)\s*\{$/);
            if (!forMatch) throw new Error(`Invalid loop beginning with syntax (line ${lineNumber})`);
            const varName = forMatch[1];
            const initValueExpr = forMatch[2];
            const updateType = forMatch[3];
            const endCondition = forMatch[4];
            const { block, nextIndex } = parseBlock(normalizedLines, lineNumber - 1);
            const initValue = evaluateExpression(initValueExpr, evalContext);
            validateType(initValue, "int", lineNumber);
            evalContext[varName] = { value: initValue, type: "int" };
            console.log(`evalSingleLine: Starting loop beginning with, ${varName}: ${initValue}, end: ${endCondition}`);
            let iteration = 0;
            while (iteration < 1000) {
                for (const { line: subLine, index: subIndex } of block) {
                    const trimmedLine = subLine.trim();
                    if (trimmedLine === "" || trimmedLine.startsWith("//")) continue;
                    console.log(`evalSingleLine: Executing loop block line ${subIndex + 1}: ${trimmedLine}`);
                    evalSingleLine(subLine, subIndex + 1, evalContext);
                }
                const updateExpr = updateType === "incrementally" ? `${varName} + 1` : `${varName} - 1`;
                const newValue = evaluateExpression(updateExpr, evalContext);
                validateType(newValue, "int", lineNumber);
                evalContext[varName].value = newValue;
                console.log(`evalSingleLine: Updated ${varName} to: ${newValue}`);
                const conditionResult = evaluateExpression(endCondition, evalContext);
                console.log(`evalSingleLine: Loop iteration ${iteration}, ${varName}: ${evalContext[varName].value}, condition: ${endCondition} = ${conditionResult}`);
                if (typeof conditionResult !== "boolean") {
                    throw new Error(`Loop condition must evaluate to boolean (line ${lineNumber})`);
                }
                if (conditionResult) break;
                iteration++;
            }
            if (iteration >= 1000) {
                throw new Error(`Infinite loop detected (line ${lineNumber})`);
            }
            console.log(`evalSingleLine: Ended loop beginning with, final context: ${JSON.stringify(evalContext)}`);
            return;
        }

        if (trimmed.startsWith("When ")) {
            const conditionMatch = trimmed.match(/^When\s+(.*)\s*\{$/);
            if (!conditionMatch) throw new Error(`Invalid when statement syntax (line ${lineNumber})`);
            const condition = conditionMatch[1];
            const conditionResult = evaluateExpression(condition, evalContext);
            console.log(`evalSingleLine: Evaluating when condition at line ${lineNumber}: ${condition} = ${conditionResult}`);
            if (typeof conditionResult !== "boolean") {
                throw new Error(`Condition must evaluate to boolean (line ${lineNumber})`);
            }
            if (conditionResult) {
                const { block: whenBlock } = parseBlock(normalizedLines, lineNumber - 1);
                for (const { line: subLine, index: subIndex } of whenBlock) {
                    const trimmedLine = subLine.trim();
                    if (trimmedLine === "" || trimmedLine.startsWith("//")) continue;
                    console.log(`evalSingleLine: Executing when block line ${subIndex + 1}: ${trimmedLine}`);
                    evalSingleLine(subLine, subIndex + 1, evalContext);
                }
            }
            return;
        }

        throw new Error(`Unknown syntax (line ${lineNumber})`);
    }

    for (let i = 0; i < normalizedLines.length; i++) {
        const rawLine = normalizedLines[i];
        const line = rawLine.trim();
        if (line === "" || line.startsWith("//")) continue;
        try {
            if (line.startsWith("Loop until ")) {
                const untilMatch = line.match(/^Loop until\s+(.+)\s*\{$/);
                if (!untilMatch) throw new Error(`Invalid loop until syntax (line ${i + 1})`);
                const condition = untilMatch[1];
                const { block, nextIndex } = parseBlock(normalizedLines, i);
                console.log(`Starting loop until at line ${i + 1}, condition: ${condition}`);
                let iteration = 0;
                while (iteration < 1000) {
                    const conditionResult = evaluateExpression(condition, globalContext);
                    console.log(`Main loop: Loop until iteration ${iteration}, condition: ${condition} = ${conditionResult}`);
                    if (typeof conditionResult !== "boolean") {
                        throw new Error(`Loop condition must evaluate to boolean (line ${i + 1})`);
                    }
                    if (conditionResult) break;
                    for (const { line: subLine, index: subIndex } of block) {
                        const trimmedLine = subLine.trim();
                        if (trimmedLine === "" || trimmedLine.startsWith("//")) continue;
                        console.log(`Main loop: Executing loop until block line ${subIndex + 1}: ${trimmedLine}`);
                        evalSingleLine(subLine, subIndex + 1, globalContext);
                    }
                    iteration++;
                }
                if (iteration >= 1000) {
                    throw new Error(`Infinite loop detected (line ${i + 1})`);
                }
                console.log(`Ended loop until at line ${i + 1}`);
                i = nextIndex - 1;
                continue;
            }

            // MODIFIED: Update for 'and ending when'
            if (line.startsWith("Loop beginning with ")) {
                const forMatch = line.match(/^Loop beginning with\s+(\w+)\s+with the value of\s+(.+?)\s+that is updated\s+(incrementally|decrementally)\s+and ending when\s+(.+)\s*\{$/);
                if (!forMatch) throw new Error(`Invalid loop beginning with syntax (line ${i + 1})`);
                const varName = forMatch[1];
                const initValueExpr = forMatch[2];
                const updateType = forMatch[3];
                const endCondition = forMatch[4];
                const { block, nextIndex } = parseBlock(normalizedLines, i);
                const initValue = evaluateExpression(initValueExpr, globalContext);
                validateType(initValue, "int", i + 1);
                globalContext[varName] = { value: initValue, type: "int" };
                console.log(`Starting loop beginning with, ${varName}: ${initValue}, end: ${endCondition}`);
                let iteration = 0;
                while (iteration < 1000) {
                    for (const { line: subLine, index: subIndex } of block) {
                        const trimmedLine = subLine.trim();
                        if (trimmedLine === "" || trimmedLine.startsWith("//")) continue;
                        console.log(`Main loop: Executing loop block line ${subIndex + 1}: ${trimmedLine}`);
                        evalSingleLine(subLine, subIndex + 1, globalContext);
                    }
                    const updateExpr = updateType === "incrementally" ? `${varName} + 1` : `${varName} - 1`;
                    const newValue = evaluateExpression(updateExpr, globalContext);
                    validateType(newValue, "int", i + 1);
                    globalContext[varName].value = newValue;
                    console.log(`Updated ${varName} to: ${newValue}`);
                    const conditionResult = evaluateExpression(endCondition, globalContext);
                    console.log(`Outer loop iteration ${iteration}, ${varName}: ${globalContext[varName].value}, condition: ${endCondition} = ${conditionResult}`);
                    if (typeof conditionResult !== "boolean") {
                        throw new Error(`Loop condition must evaluate to boolean (line ${i + 1})`);
                    }
                    if (conditionResult) break;
                    iteration++;
                }
                if (iteration >= 1000) {
                    throw new Error(`Infinite loop detected (line ${i + 1})`);
                }
                console.log(`Ended loop beginning with, final context: ${JSON.stringify(globalContext)}`);
                i = nextIndex - 1;
                continue;
            }

            if (line.startsWith("When ")) {
                const conditionMatch = line.match(/^When\s+(.*)\s*\{$/);
                if (!conditionMatch) throw new Error(`Invalid when statement syntax (line ${i + 1})`);
                const condition = conditionMatch[1];
                const { block: whenBlock, nextIndex } = parseBlock(normalizedLines, i);
                const conditionResult = evaluateExpression(condition, globalContext);
                console.log(`Main loop: Evaluating when condition at line ${i + 1}: ${condition} = ${conditionResult}`);
                if (typeof conditionResult !== "boolean") {
                    throw new Error(`Condition must evaluate to boolean (line ${i + 1})`);
                }
                if (conditionResult) {
                    for (const { line: subLine, index: subIndex } of whenBlock) {
                        const trimmedLine = subLine.trim();
                        if (trimmedLine === "" || trimmedLine.startsWith("//")) continue;
                        if (trimmedLine.startsWith("When ")) {
                            const { nextIndex: skipIndex } = parseBlock(normalizedLines, subIndex);
                            console.log(`Main loop: Processing when header and skipping block from line ${subIndex + 1} to ${skipIndex}`);
                            evalSingleLine(subLine, subIndex + 1, globalContext);
                            for (let j = subIndex + 1; j < skipIndex; j++) {
                                console.log(`Main loop: Skipping nested when line ${j + 1}: ${normalizedLines[j].trim()}`);
                            }
                            continue;
                        }
                        console.log(`Main loop: Executing when block line ${subIndex + 1}: ${trimmedLine}`);
                        evalSingleLine(subLine, subIndex + 1, globalContext);
                    }
                }
                let currentIndex = nextIndex;
                let executedBlock = conditionResult;
                while (currentIndex < normalizedLines.length && !executedBlock) {
                    const currentLine = normalizedLines[currentIndex].trim();
                    if (currentLine.startsWith("Otherwise when ")) {
                        const otherwiseWhenMatch = currentLine.match(/^Otherwise when\s+(.*)\s*\{$/);
                        if (!otherwiseWhenMatch) throw new Error(`Invalid otherwise when syntax (line ${currentIndex + 1})`);
                        const otherwiseCondition = otherwiseWhenMatch[1];
                        const { block: otherwiseWhenBlock, nextIndex: nextInnerIndex } = parseBlock(normalizedLines, currentIndex);
                        const otherwiseConditionResult = evaluateExpression(otherwiseCondition, globalContext);
                        console.log(`Main loop: Evaluating otherwise when condition at line ${currentIndex + 1}: ${otherwiseCondition} = ${otherwiseConditionResult}`);
                        if (typeof otherwiseConditionResult !== "boolean") {
                            throw new Error(`Otherwise when condition must evaluate to boolean (line ${currentIndex + 1})`);
                        }
                        if (otherwiseConditionResult) {
                            for (const { line: subLine, index: subIndex } of otherwiseWhenBlock) {
                                const trimmedLine = subLine.trim();
                                if (trimmedLine === "" || trimmedLine.startsWith("//")) continue;
                                console.log(`Main loop: Executing otherwise when block line ${subIndex + 1}: ${trimmedLine}`);
                                evalSingleLine(subLine, subIndex + 1, globalContext);
                            }
                            executedBlock = true;
                        }
                        currentIndex = nextInnerIndex;
                    } else if (currentLine.startsWith("Otherwise {")) {
                        const { block: otherwiseBlock, nextIndex: nextInnerIndex } = parseBlock(normalizedLines, currentIndex);
                        for (const { line: subLine, index: subIndex } of otherwiseBlock) {
                            const trimmedLine = subLine.trim();
                            if (trimmedLine === "" || trimmedLine.startsWith("//")) continue;
                            console.log(`Main loop: Executing otherwise block line ${subIndex + 1}: ${trimmedLine}`);
                            evalSingleLine(subLine, subIndex + 1, globalContext);
                        }
                        executedBlock = true;
                        currentIndex = nextInnerIndex;
                    } else {
                        break;
                    }
                }
                i = currentIndex - 1;
                continue;
            }

            // NEW: Increment statement
            if (line.startsWith("Increment the ")) {
                const match = line.match(/^Increment the\s+(\w+)\.$/);
                if (!match) throw new Error(`Invalid Increment syntax (line ${i + 1})`);
                const varName = match[1];
                if (!globalContext[varName] || globalContext[varName].type !== "int") {
                    throw new Error(`Variable ${varName} must be an integer (line ${i + 1})`);
                }
                globalContext[varName].value += 1;
                console.log(`Incremented ${varName} to: ${globalContext[varName].value}`);
                i++;
                continue;
            }

            // NEW: Decrement statement
            if (line.startsWith("Decrement the ")) {
                const match = line.match(/^Decrement the\s+(\w+)\.$/);
                if (!match) throw new Error(`Invalid Decrement syntax (line ${i + 1})`);
                const varName = match[1];
                if (!globalContext[varName] || globalContext[varName].type !== "int") {
                    throw new Error(`Variable ${varName} must be an integer (line ${i + 1})`);
                }
                globalContext[varName].value -= 1;
                console.log(`Decremented ${varName} to: ${globalContext[varName].value}`);
                i++;
                continue;
            }

            evalSingleLine(rawLine, i + 1, globalContext);
        } catch (e) {
            result.push(`<br><span style="color:red">Error on line ${i + 1}: ${e.message}</span>`);
            highlightErrorLine(i + 1);
            outputEl.innerHTML = result.join("");
            return;
        }
    }
    outputEl.innerHTML = result.join("");
});

undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);

// Initialize
markLines();
updateLineNumbers();
updateUndoRedoButtons();