const fs = require("fs");
const path = require("path");

describe("Shell Script modeline selection", () => {
  let grammar;

  beforeEach(async () => {
    const pkg = await lumine.packages.activatePackage("language-shellscript");
    expect(fs.realpathSync(pkg.path)).toBe(path.resolve(__dirname, ".."));
    grammar = lumine.grammars.grammarForScopeName("source.shell");
  });

  it("selects extensionless files from Vim filetype, ft, and syntax modelines", () => {
    for (const key of ["filetype", "ft", "syntax"]) {
      const text = "// vim: set tabstop=4 set " + key + "=bash:";
      expect(lumine.grammars.selectGrammar("modeline", text).scopeName).toBe("source.shell");
    }
  });

  it("preserves token order and modelines on a later supplied prefix line", () => {
    expect(grammar.firstLineRegex.test("vim: ft=bash")).toBe(false);
    expect(grammar.firstLineRegex.test("ft=bash // vim: set tabstop=4")).toBe(false);
    expect(grammar.firstLineRegex.test("preceding line\n// vim: set ft=bash:")).toBe(true);
  });

  it("accepts a complete alias followed by a line ending without a colon", () => {
    for (const ending of ["\n", "\r\n"])
      for (const key of ["filetype", "ft", "syntax"])
        for (const shell of ["sh", "bash", "ksh", "zsh"]) {
          const prefix = "# vim: set " + key + "=";
          const text = prefix + shell + ending + ending + 'echo "hi"';
          expect(lumine.grammars.selectGrammar("modeline", text).scopeName)
            .withContext(text)
            .toBe("source.shell");
          expect(
            lumine.grammars.selectGrammar("modeline", prefix + shell + "-extra" + ending).scopeName,
          ).not.toBe("source.shell");
        }
  });

  it("keeps failed modelines from revisiting Vim and set tokens", () => {
    expect(grammar.firstLineRegex.source).toContain("(?:(?!vim\\b).)*vim\\b");
    expect(grammar.firstLineRegex.source).toContain("(?:(?!\\bset\\b).)*\\bset\\b");
    for (const text of ["vim " + " set ".repeat(16000) + "x", "vim ".repeat(16000) + "x"]) {
      expect(grammar.firstLineRegex.test(text)).toBe(false);
      expect(lumine.grammars.selectGrammar("modeline", text).scopeName).not.toBe("source.shell");
    }
  });
});
