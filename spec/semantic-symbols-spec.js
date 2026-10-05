const fs = require("fs");
const path = require("path");
const fixtures = require("./fixtures/symbols.json");
const packagePath = (name) => {
  const sibling = path.resolve(__dirname, "..", "..", name);
  return fs.existsSync(sibling) ? sibling : name;
};

describe(`${path.basename(path.resolve(__dirname, ".."))} semantic buffer symbols`, () => {
  let editor;
  beforeEach(async () => {
    jasmine.useRealClock();
    await lumine.packages.activatePackage(path.resolve(__dirname, ".."));
    await lumine.packages.activatePackage(packagePath("symbol-tree-sitter"));
  });
  afterEach(() => editor?.destroy());
  for (const [scope, fixture] of Object.entries(fixtures)) {
    it(`extracts named structures for ${scope} without treating values as declarations`, async () => {
      editor = await lumine.workspace.open();
      editor.setGrammar(lumine.grammars.grammarForId(scope));
      editor.setText(fixture.text);
      await editor.whenGrammarSettled();
      const main = lumine.packages.getActivePackage("symbol-tree-sitter").mainModule;
      const provider = main.provideDocumentSymbolProvider();
      const symbols = await provider.getDocumentSymbols(editor, {
        sourceId: "symbol-tree-sitter",
        signal: new AbortController().signal,
      });
      const found = symbols.map(({ name, tag }) => ({ name, tag }));
      for (const expected of fixture.symbols)
        expect(found).toContain(jasmine.objectContaining(expected));
      for (const name of fixture.absent ?? [])
        expect(symbols.map((symbol) => symbol.name)).not.toContain(name);
      if (fixture.only) expect(found).toEqual(fixture.symbols);
      for (const symbol of symbols) {
        expect(symbol.range.isEmpty()).toBe(false);
        expect(symbol.range.containsPoint(symbol.position)).toBe(true);
      }
      editor.setText(fixture.text.replace(fixture.symbols[0].name.split(".")[0], "renamed"));
      await editor.whenGrammarSettled();
      const updated = await provider.getDocumentSymbols(editor, {
        sourceId: "symbol-tree-sitter",
        signal: new AbortController().signal,
      });
      expect(updated.some((symbol) => symbol.name === fixture.symbols[0].name)).toBe(false);
    });
  }
});
