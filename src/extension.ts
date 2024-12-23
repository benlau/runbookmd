import * as vscode from "vscode";
import { CodeLensProvider } from "./codelensprovider";
import { TerminalManager } from "./terminalmanager";
import { ScriptRunner } from "./scriptrunner";
import { Action } from "./action";
import { MarkdownParser } from "./markdownparser";
import { FormItem } from "./formparser";

export function activate(context: vscode.ExtensionContext): void {
  const terminalManager = new TerminalManager();
  const scriptRunner = new ScriptRunner(context, terminalManager);

  const runCodeBlockCommand = vscode.commands.registerCommand(
    "runbookmd.runCodeBlock",
    async (
      action: Action,
      script: string,
      form: FormItem[],
      languageType: string
    ) => {
      scriptRunner.exec(action, script, form, languageType);
    }
  );

  const sendCodeBlockCommand = vscode.commands.registerCommand(
    "runbookmd.sendCodeBlock",
    async (
      action: Action,
      script: string,
      form: FormItem[],
      languageType: string
    ) => {
      scriptRunner.exec(action, script, form, languageType);
    }
  );

  const execCurrentCodeBlockCommand = vscode.commands.registerCommand(
    "runbookmd.execCurrentCodeBlock",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      const parser = new MarkdownParser();
      const codeBlocks = parser.findActionableFencedCodeBlock(editor.document);

      const currentPosition = editor.selection.active;
      const currentBlock = codeBlocks.find((block) =>
        block.range.contains(currentPosition)
      );

      if (currentBlock && currentBlock.annotation.action) {
        const action = currentBlock.annotation.action;
        const script = currentBlock.content;
        const form = currentBlock.form;
        const languageType = currentBlock.annotation.type;

        scriptRunner.exec(action, script, form, languageType);
      }
    }
  );

  context.subscriptions.push(
    runCodeBlockCommand,
    sendCodeBlockCommand,
    execCurrentCodeBlockCommand
  );

  vscode.languages.registerCodeLensProvider(
    { scheme: "file", language: "markdown" },
    new CodeLensProvider()
  );
}

export function deactivate(): void {}
