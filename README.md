# Very English Programming Language

**Very English** is a beginner-friendly programming language I made designed to over-utilize natural English sentences, making codes readable to non-programmers. All of the syntax used is an english word, no abbreviation, and somehow easy-to-read for non-programmers, but hard-to-read for programmers. Built with JavaScript, HTML, and CSS, Very English runs in the browser and is ideal for educational purposes, but not for serious programming.

## Features
- **English-like Syntax**: Write code using phrases like "Create a variable," "Loop until," or "Display."
- **Interactive Editor**: Contenteditable input with line numbers, syntax highlighting (via Prism), and autocomplete.
- **Undo/Redo**: Ctrl+Z/Ctrl+Y support for editing.
- **Error Highlighting**: Visual feedback for syntax errors with line-specific messages.
- **Type Safety**: Supports typed variables (`int`, `string`, `boolean`) with runtime type checking.

## Setup
1. **Clone or download the Repository **:
   ```bash
   git clone https://github.com/yourusername/very-english.git
   cd very-english
   ```
2. **Open the Editor**:
   - Open `index.html` in a modern web browser (e.g., Chrome, Firefox).
   - No server is required; the project runs locally.
3. **Write and Run Code**:
   - Enter code in the editor (top section).
   - Click "Run" to execute and view output (bottom section).
   - Use "Undo" (Ctrl+Z) or "Redo" (Ctrl+Y) to navigate edits.
   - Autocomplete suggests keywords and variables as you type.

## Syntax
Very English uses a 'sentence' syntax. Statements are capitalized and end with a period (`.`), except for blocks (`{`, `}`). The interpreter normalizes input, so lowercase and missing periods are accepted.

### 1. Variables
- **Declare with Value**:
  ```input
  Create a variable with the name of x with the type of int with the value of 5.
  Create a variable with the name of name with the type of string with the value of "Eman".
  ```
- **Declare without Value**:
  ```input
  Create a variable with the name of flag with the type of boolean.
  ```
- **Untyped Declaration**:
  ```input
  Create a variable with the name of counter with the value of 10.
  ```
- **Assignment**:
  ```input
  Change the value of x to 3.
  Change the value of y to x + 1.
  ```

### 2. Output
- **Display**:
  ```input
  Display("Hello, world!", true).
  ```
  - First argument: Expression or string to display.
  - Second argument (optional): `true` for newline, `false` for inline (defaults to `true`).

### 3. Loops
- **While Loop**:
  ```input
  Loop until x is equal to 0 {
      Display(x, true).
      Decrement the x.
  }
  ```
- **For Loop**:
  ```input
  Loop beginning with i with the value of 0 that is updated incrementally and ending when i is less than 5 {
      Display(i, true).
  }
  ```
  - Supports `incrementally` or `decrementally` updates.

### 4. Conditionals
- **If Statement**:
  ```input
  When x is greater than 0 {
      Display("Positive", true).
  }
  ```
- **Else If**:
  ```input
  Otherwise when x is equal to 0 {
      Display("Zero", true).
  }
  ```
- **Else**:
  ```input
  Otherwise {
      Display("Negative", true).
  }
  ```

### 5. Increment/Decrement
- **Increment** (int only):
  ```input
  Increment the x.
  ```
- **Decrement** (int only):
  ```input
  Decrement the x.
  ```

### 6. Operators
- **Logical**: `is equal to` (`==`), `is not equal to` (`!=`), `is greater than` (`>`), etc.
- **Boolean**: `and` (`&&`), `or` (`||`), `not` (`!`).
- **Arithmetic**: `+`, `-`, `*`, `/`, `%` (in expressions).

### 7. Comments
- Single-line comments start with `//`:
  ```input
  // This is a comment.
  ```

### Example: Rectangle (3 × 5)
  ```input
Create a variable with the name of rows with the type of int with the value of 3.
Create a variable with the name of cols with the type of int with the value of 5.
Loop beginning with i with the value of 0 that is updated incrementally and ending when i is equal to rows {
    Create a variable with the name of line with the type of string with the value of "".
    Create a variable with the name of j with the type of int with the value of 0.
    Loop until j is equal to cols {
        Change the value of line to line + "*".
        Increment the j.
        }
    Display(line, true).
}
```
**Output**:
```
*****
*****
*****
```

## Project Structure
```
english-programming-language/
├── index.html          # Editor interface
├── script.js           # Interpreter and editor logic
├── styles.css          # Editor and syntax highlighting styles
├── prism-custom-lang.js # Very English syntax highlighting
├── README.md           # This file
```

## Troubleshooting
- **Syntax Highlighting Colors Incorrect**:
  - Clear browser cache (DevTools → Right-click refresh → Empty Cache and Hard Reload).
  - Ensure `styles.css` load in `index.html`.
  - Inspect `#input` spans in DevTools; verify `.token.keyword` has `color: #c792ea`.
- **Editor Not Responding**:
  - Check console for JavaScript errors (F12 → Console).
  - Ensure all scripts load in the correct order.
- **Autocomplete Not Showing**:
  - Type partial keywords (e.g., `cre`) and check if suggestions appear.
  - Verify `keywords` array in `script.js` includes expected terms.
- **Issues?** File a GitHub issue with a screenshot, code sample, and console logs.

## Contributing
Contributions are welcome! To contribute:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature-name`).
3. Commit changes (`git commit -m "Add feature"`).
4. Push to the branch (`git push origin feature-name`).
5. Open a pull request.

## License
MIT License. See [LICENSE](LICENSE) for details.

## Acknowledgments
- Built with [Prism.js](https://prismjs.com) for syntax highlighting.
- Inspired by educational programming languages like Scratch and BASIC.