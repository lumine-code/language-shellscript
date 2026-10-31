[
  "then"
  "do"
  "("
  "else"
] @indent

(compound_statement "{" @indent)

[
  "fi"
  "done"
  ")"
  "elif"
  "else"
] @dedent

(compound_statement "}" @dedent)

; Reindent code without rewriting whitespace that belongs to multiline text.
([(string) (raw_string)] @preserve
  (#is? indent.reindent true)
  (#is-not? indent.matchesCurrentRow startPosition)
  (#set! indent.force true))

; Heredoc bodies start on the line after their redirection, including its first row.
([(heredoc_body) (heredoc_end)] @preserve
  (#is? indent.reindent true)
  (#set! indent.force true))

; A case pattern opens a body; its terminator returns to the pattern level.
("in" @indent
  (#is? test.childOfType case_statement))

(")" @indent
  (#is? test.childOfType case_item))

([";;" ";&" ";;&"] @match.next
  (#set! indent.matchIndentOf parent.parent.startPosition)
  (#set! indent.offsetIndent 1)
  (#is-not? test.endsOnSameRowAs parent.parent.endPosition))

([";;" ";&" ";;&"] @dedent
  (#is? indent.matchesComparisonRow startPosition))

("esac" @dedent @match
  (#set! indent.matchIndentOf parent.startPosition))
