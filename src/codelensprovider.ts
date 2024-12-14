import * as vscode from "vscode";
import { MarkdownParser } from "./markdownparser";
import { ActionType } from "./action";

export class CodeLensProvider implements vscode.CodeLensProvider {
  onDidChangeCodeLenses?: vscode.Event<void>;
  private parser: MarkdownParser;

  constructor() {
    this.parser = new MarkdownParser();
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const codeBlocks = this.parser.findActionableFencedCodeBlock(document);

    return codeBlocks.map((block) => {
      let command, title;
      if (block.annotation.action?.type === ActionType.Send) {
        command = "runbookmd.sendCodeBlock";
        title = "$(run) Send";
      } else {
        command = "runbookmd.runCodeBlock";
        title = "$(run) Run";
      }

      const commandInfo: vscode.Command = {
        title,
        command,
        arguments: [block.annotation.action, block.content],
      };
      return new vscode.CodeLens(block.range, commandInfo);
    });
  }
}
