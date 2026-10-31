describe("shellscript editing settings", () => {
  let editor;
  beforeEach(async () => {
    jasmine.useRealClock();
    editor = null;
    await lumine.packages.activatePackage("language-shellscript");
  });
  afterEach(() => editor?.destroy());
  async function start(scope, text = "value") {
    editor ??= await lumine.workspace.open();
    editor.setGrammar(lumine.grammars.grammarForScopeName(scope));
    editor.setText(text);
    expect(await editor.whenGrammarSettled()).toBe(true);
    editor.update({ autoIndent: false });
  }
  it("selects supported shell interpreters with no final newline and env -S", () => {
    for (const shell of ["sh", "bash", "ksh", "zsh"])
      for (const text of [
        "#!/bin/" + shell,
        "#!/usr/bin/env " + shell,
        "#!/usr/bin/env -S " + shell + " -eu",
        "#!/bin/" + shell + "\r\n",
      ])
        expect(lumine.grammars.selectGrammar("script", text).scopeName).toBe("source.shell");
    for (const text of [
      "#!/usr/bin/env fish",
      "#!/bin/csh",
      "#!/usr/bin/env nu",
      "#!/usr/bin/env bashful",
      "#!/usr/bin/python -c sh",
    ])
      expect(lumine.grammars.selectGrammar("script", text).scopeName).not.toBe("source.shell");
  });
  it("keeps supported modelines in the supplied second prefix row", () => {
    for (const shell of ["sh", "bash", "ksh", "zsh"])
      expect(
        lumine.grammars.selectGrammar("modeline", "# Header\n# vim: set ft=" + shell + ":")
          .scopeName,
      ).toBe("source.shell");
  });
  it("keeps the line comment syntax for scripts selected by their shebang", async () => {
    await start("source.shell", "printf value");
    await editor.toggleLineCommentsForBufferRows(0, 0);
    expect(editor.getText()).toBe("# printf value");
    await editor.toggleLineCommentsForBufferRows(0, 0);
    expect(editor.getText()).toBe("printf value");
  });
});
