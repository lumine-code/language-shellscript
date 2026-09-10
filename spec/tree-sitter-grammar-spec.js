const fs = require("fs");
const path = require("path");
const { Point } = require("lumine");

const highlightsPath = path.join(__dirname, "..", "grammars", "bash-highlights.scm");

describe("WASM Tree-sitter Shell Script grammar", () => {
  beforeEach(async () => {
    await lumine.packages.activatePackage("language-shellscript");
  });

  it("passes grammar tests", async () => {
    await runGrammarTests(path.join(__dirname, "fixtures", "sample.sh"), /#/);
  });

  it("roots unbounded-container captures on leaf nodes", () => {
    const query = fs.readFileSync(highlightsPath, "utf8");

    expect(query).not.toContain("(array\n  (word)");
    expect(query).not.toContain('(list\n  ["&&" "||"]');
    expect(query).not.toContain('(pipeline "|"');
    expect(query).not.toContain("(string\n  (command_substitution)");
    expect(query).not.toMatch(/\((?:compound_statement|test_command)\s*\n\s*"/);
    for (const type of ["array", "list", "pipeline", "compound_statement", "test_command"]) {
      expect(query).toContain(`(#is? test.childOfType ${type})`);
    }
  });

  it("distinguishes both delimiters of an empty string", async () => {
    const editor = await lumine.workspace.open("empty-string.sh");
    editor.setText('value=""');
    await editor.languageMode.ready;

    const opening = editor.scopeDescriptorForBufferPosition([0, 6]).getScopesArray();
    const closing = editor.scopeDescriptorForBufferPosition([0, 7]).getScopesArray();
    expect(opening).toContain("punctuation.definition.string.begin.shell");
    expect(opening).not.toContain("punctuation.definition.string.end.shell");
    expect(closing).toContain("punctuation.definition.string.end.shell");
    expect(closing).not.toContain("punctuation.definition.string.begin.shell");
  });

  it("keeps leaf-rooted captures viewport-local and bounded", async () => {
    const editor = await lumine.workspace.open("capture-budget.sh");
    editor.setText(
      Array.from(
        { length: 1000 },
        (_, index) =>
          `values_${index}=(one two); if [[ -n "x" ]] && true; then (( count += 1 )); fi # generated`,
      ).join("\r\n"),
    );
    await editor.languageMode.ready;
    const layer = editor.languageMode.rootLanguageLayer;

    expect(layer.queries.highlightsQuery.captures(layer.tree.rootNode).length).toBeLessThanOrEqual(
      33000,
    );
    expect(
      layer.queries.highlightsQuery.captures(layer.tree.rootNode, {
        startPosition: new Point(400, 0),
        endPosition: new Point(406, 0),
      }).length,
    ).toBeLessThanOrEqual(200);

    editor.setText(["values=(", ...Array(6000).fill("middle"), ")"].join("\r\n"));
    await editor.languageMode.atTransactionEnd();
    const middleCaptures = layer.queries.highlightsQuery.captures(layer.tree.rootNode, {
      startPosition: new Point(3000, 0),
      endPosition: new Point(3006, 0),
    });
    expect(
      middleCaptures.some(
        ({ name, node }) => name === "string.unquoted.shell" && node.startPosition.row === 3000,
      ),
    ).toBe(true);
    expect(middleCaptures.length).toBeLessThanOrEqual(100);

    editor.setText(
      Array.from(
        { length: 6000 },
        (_, index) => `printf value_${index}${index < 5999 ? " |" : ""}`,
      ).join("\r\n"),
    );
    await editor.languageMode.atTransactionEnd();
    const pipelineColumn = editor.lineTextForBufferRow(3000).indexOf("|");
    expect(
      editor.scopeDescriptorForBufferPosition([3000, pipelineColumn]).getScopesArray(),
    ).toContain("keyword.operator.pipe.shell");
    const pipelineCaptures = layer.queries.highlightsQuery.captures(layer.tree.rootNode, {
      startPosition: new Point(3000, 0),
      endPosition: new Point(3006, 0),
    });
    expect(
      pipelineCaptures.some(
        ({ name, node }) =>
          name === "keyword.operator.pipe.shell" && node.startPosition.row === 3000,
      ),
    ).toBe(true);
    expect(
      pipelineCaptures.every(
        ({ node }) => node.startPosition.row >= 3000 && node.startPosition.row < 3006,
      ),
    ).toBe(true);
    expect(pipelineCaptures.length).toBeLessThanOrEqual(100);

    editor.setText(
      [
        'value="',
        ...Array.from({ length: 6000 }, (_, index) => `  $(printf value_${index})`),
        '"',
      ].join("\r\n"),
    );
    await editor.languageMode.atTransactionEnd();
    expect(editor.scopeDescriptorForBufferPosition([3000, 2]).getScopesArray()).toContain(
      "meta.embedded.line.subshell.shell",
    );
    const substitutionCaptures = layer.queries.highlightsQuery
      .captures(layer.tree.rootNode, {
        startPosition: new Point(3000, 0),
        endPosition: new Point(3006, 0),
      })
      .filter(({ name }) => name === "meta.embedded.line.subshell.shell");
    expect(substitutionCaptures.length).toBe(6);
    expect(
      substitutionCaptures.every(
        ({ node }) => node.startPosition.row >= 3000 && node.startPosition.row < 3006,
      ),
    ).toBe(true);
  });
});
