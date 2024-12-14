import * as vscode from "vscode";

export class TerminalManager {
  getDefaultShell(): string {
    const shell = vscode.env.shell;
    return shell;
  }

  createTerminal(name: string): vscode.Terminal {
    return vscode.window.createTerminal(name);
  }

  openOrCreateTerminal(name: string, cwd: string): vscode.Terminal {
    let terminal = vscode.window.terminals.find((t) => t.name === name);
    if (!terminal) {
      terminal = vscode.window.createTerminal({ name, cwd });
    }
    terminal.show(true);
    return terminal;
  }

  sendToTerminal(name: string, content: string): void {
    let terminal = vscode.window.terminals.find((t) => t.name === name);
    if (!terminal) {
      terminal = this.createTerminal(name);
    }
    terminal.show(true);
    terminal.sendText(content);
  }
}
