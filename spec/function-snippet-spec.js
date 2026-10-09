const fs = require("node:fs");
const path = require("node:path");

describe("Shell Script function snippets in native editors", () => {
  let editor, service, packagePath, lease;

  beforeEach(async () => {
    for (const method of ["openExternal", "openPath", "showItemInFolder", "openApplication"])
      spyOn(lumine.shell, method).and.returnValue(Promise.resolve());
    spyOn(lumine.application, "openWindow").and.returnValue(Promise.resolve());
    spyOn(lumine.clipboard, "read").and.returnValue(Promise.resolve(""));
    packagePath = (await lumine.packages.activatePackage("language-shellscript")).path;
    lease = lumine.packages.serviceHub.consume("snippets", "^1.0.0", (provider) => {
      service = provider;
    });
    await (await lumine.packages.activatePackage("snippets")).mainModule.waitForSnippetsLoaded();
    editor = await lumine.workspace.open();
    editor.setGrammar(lumine.grammars.grammarForScopeName("source.shell"));
    await editor.languageMode.ready;
  });

  afterEach(() => {
    editor?.destroy();
    lease?.dispose();
    editor = service = packagePath = lease = null;
  });

  async function expand(name) {
    const data = JSON.parse(
      fs.readFileSync(path.join(packagePath, "snippets", "main.json"), "utf8"),
    );
    await service.insertSnippet(data[".source.shell"][name].body, editor);
    await editor.languageMode.atTransactionEnd();
  }

  it("declares a Bash function without a named parameter list", async () => {
    await expand("function …");
    // Complete the function with a real command while preserving its header.
    editor.setCursorBufferPosition([1, 0]);
    editor.insertText('  echo "$1"\n');
    await editor.languageMode.atTransactionEnd();
    expect(editor.lineTextForBufferRow(0)).toBe("function name() {");
    expect(editor.languageMode.tree.rootNode.hasError).toBe(false);
    expect(editor.languageMode.tree.rootNode.descendantsOfType("function_definition").length).toBe(
      1,
    );
  });

  it("preserves the ordinary Bash interpreter snippet", async () => {
    await expand("#!/usr/bin/env bash");
    expect(editor.getText()).toBe("#!/usr/bin/env bash\n");
    expect(editor.languageMode.tree.rootNode.hasError).toBe(false);
  });
});
