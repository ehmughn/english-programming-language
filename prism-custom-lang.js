Prism.languages['custom-lang'] = {
    'comment': {
      pattern: /\/\/.*$/,
      greedy: true
    },
    'string': {
      pattern: /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/,
      greedy: true
    },
    'keyword': {
      pattern: /\b(Create a variable with the name of|with the type of|with the value of|Change the value of|to|Display|When|Otherwise when|Otherwise|Increment the|Decrement the|Loop until|Loop beginning with|that is updated incrementally|that is updated decrementally|and ending when|is equal to|is not equal to|is greater than or equal to|is less than or equal to|is greater than|is less than|and|or|not|True|False)\b/,
      greedy: true
    },
    'type': {
      pattern: /\b(int|string|boolean)\b/,
      greedy: true
    },
    'operator': {
      pattern: /\b(is equal to|is not equal to|is greater than or equal to|is less than or equal to|is greater than|is less than|and|or|not)\b|[+\-*/%]=?|&&?|\|\|?|!/,
      greedy: true
    },
    'variable': {
      pattern: /\b[A-Za-z_]\w*(?!\s*(is equal to|is not equal to|is greater than or equal to|is less than or equal to|is greater than|is less than|and|or|not|with the type of|with the value of|to))\b/,
      greedy: true
    },
    'number': {
      pattern: /\b\d+\.?\d*\b/,
      greedy: true
    },
    'punctuation': {
      pattern: /[{}[\](),]/,
      greedy: true
    }
};