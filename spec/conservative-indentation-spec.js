describe("Shell conservative indentation", () => {
  let editor;
  beforeEach(async () => {
    jasmine.useRealClock();
    await lumine.packages.activatePackage("language-shellscript");
    editor = await lumine.workspace.open("indentation.sh");
    editor.update({ autoIndent: true, tabLength: 2, softTabs: true });
  });
  afterEach(() => editor.destroy());
  async function start(source) {
    editor.setText(source);
    expect(await editor.whenGrammarSettled()).toBe(true);
  }

  it("indents then and else bodies and aligns their closing fi", async () => {
    await start("if true; then\necho one\nelse\necho two\nfi");
    await editor.autoIndentBufferRows(0, 4);
    expect(editor.getText()).toBe("if true; then\n  echo one\nelse\n  echo two\nfi");
  });

  it("indents case patterns and their bodies separately", async () => {
    await start('case "$value" in\none)\necho one\n;;\ntwo)\necho two\n;;\nesac');
    await editor.autoIndentBufferRows(0, 7);
    expect(editor.getText()).toBe(
      'case "$value" in\n  one)\n    echo one\n    ;;\n  two)\n    echo two\n    ;;\nesac',
    );
  });

  it("returns to the pattern indentation after each case terminator", async () => {
    for (const token of [";;", ";&", ";;&"]) {
      await start('case "$value" in\n  one)\n    echo one\n    ' + token + "\nesac");
      editor.setCursorBufferPosition([3, Infinity]);
      await editor.insertNewline();
      expect(editor.lineTextForBufferRow(4)).toBe("  ");
    }
  });

  it("indents Enter in a function", async () => {
    await start("run() {\n}");
    editor.setCursorBufferPosition([0, Infinity]);
    await editor.insertNewline();
    expect(editor.lineTextForBufferRow(1)).toBe("  ");
  });

  it("dedents a typed closing brace", async () => {
    await start("run() {\n  echo hi\n  ");
    editor.setCursorBufferPosition([2, Infinity]);
    await editor.insertText("}", { autoIndent: true, autoDecreaseIndent: true });
    await editor.whenGrammarSettled();
    expect(editor.lineTextForBufferRow(2)).toBe("}");
  });

  it("does not add indentation after complete one-line constructs or a comment", async () => {
    for (const source of [
      "if true; then echo one; fi",
      'case "$value" in one) echo one ;; esac',
      "# then do ( {",
    ]) {
      await start(source);
      editor.setCursorBufferPosition([0, Infinity]);
      await editor.insertNewline();
      expect(editor.lineTextForBufferRow(1)).toBe("");
    }
  });

  it("preserves heredoc and quoted text during reindent", async () => {
    for (const source of [
      "cat <<EOF\n      then { (\n  last\nEOF",
      'value="first\n      then { (\n  last"',
    ]) {
      await start(source);
      await editor.autoIndentBufferRows(0, editor.getLastBufferRow());
      expect(editor.getText()).toBe(source);
    }
  });
});
