const { Range } = require("lumine");

const URL = "https://example.com/manual.pdf?first=1&second=2";
const LINK_SCOPE = "markup.underline.link.hyperlink";

describe("Shell hyperlink injections", () => {
  let editor;

  beforeEach(async () => {
    await lumine.packages.activatePackage("language-hyperlink");
    await lumine.packages.activatePackage("language-shellscript");
  });

  afterEach(() => editor?.destroy());

  for (const [name, text] of [
    ["comments", String.raw`# \href{${URL}}{Manual}`],
    ["single-quoted strings", String.raw`printf '%s' '\href{${URL}}{Manual}'`],
    ["double-quoted strings", `printf '%s' "${URL}}{Manual"`],
    ["string fragments after expansions", `printf '%s' "\${NAME} ${URL} Manual"`],
  ]) {
    it(`highlights the exact URL in ${name}`, async () => {
      editor = await lumine.workspace.open();
      editor.setText(text);
      lumine.grammars.assignLanguageMode(editor.getBuffer(), "source.shell");
      await editor.whenGrammarSettled();
      await editor.languageMode.refresh?.();
      const buffer = editor.getBuffer();
      const index = text.indexOf(URL);
      const range = new Range(
        buffer.positionForCharacterIndex(index),
        buffer.positionForCharacterIndex(index + URL.length),
      );
      expect(editor.bufferRangeForScopeAtPosition(`.${LINK_SCOPE}`, range.start)).toEqual(range);
      expect(editor.scopeDescriptorForBufferPosition(range.end).getScopesArray()).not.toContain(
        LINK_SCOPE,
      );
    });
  }
});
