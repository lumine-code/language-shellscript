const fs = require("fs");
const path = require("path");

const highlightsPath = path.join(__dirname, "..", "grammars", "tree-sitter", "highlights.scm");

describe("WASM Tree-sitter Shell Script grammar", () => {
  beforeEach(async () => {
    await lumine.packages.activatePackage("language-shellscript");
  });

  it("passes grammar tests", async () => {
    await runGrammarTests(path.join(__dirname, "fixtures", "sample.sh"), /#/);
  });

  it("roots array, list-operator, and compound-delimiter captures on leaf nodes", () => {
    const query = fs.readFileSync(highlightsPath, "utf8");

    expect(query).not.toContain("(array\n  (word)");
    expect(query).not.toContain('(list ["&&" "||"]');
    expect(query).not.toMatch(/\((?:compound_statement|test_command)\s*\n\s*"/);
    for (const type of ["array", "list", "compound_statement", "test_command"]) {
      expect(query).toContain(`(#is? test.childOfType ${type})`);
    }
  });
});
