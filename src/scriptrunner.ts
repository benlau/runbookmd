import * as vscode from "vscode";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import { TerminalManager } from "./terminalmanager";
import { accessAction, Action, ActionType } from "./action";
import { PathUtils } from "./pathutils";
import { FormItem } from "./formparser";

class EnvironmentVariableMemento {
  static KEY = "runbookmd.environmentVariables";

  state: vscode.Memento;
  context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext, state: vscode.Memento) {
    this.context = context;
    this.state = state;
  }

  set(key: string, value: string) {
    const editor = vscode.window.activeTextEditor;
    const filePath = editor?.document.uri.fsPath ?? "";

    const envVars =
      this.state.get<Record<string, Record<string, string>>>(
        EnvironmentVariableMemento.KEY
      ) || {};

    const values: Record<string, string> = envVars[filePath] || {};
    values[key] = value;
    envVars[filePath] = values;

    this.state.update(EnvironmentVariableMemento.KEY, envVars);
  }

  get(key: string): any | undefined {
    const editor = vscode.window.activeTextEditor;
    const filePath = editor?.document.uri.fsPath ?? "";

    const envVars =
      this.state.get<Record<string, string>>(EnvironmentVariableMemento.KEY) ||
      {};
    return envVars[filePath]?.[key];
  }
}

class ScriptContext {
  action: Action;
  script: string;
  form: FormItem[];
  languageType: string;

  filePath?: string;
  workingDirectory?: string;
  environmentVariables: [string, string][];

  constructor(
    action: Action,
    script: string,
    form: FormItem[],
    languageType: string
  ) {
    this.script = script;
    this.action = action;
    this.form = form;
    this.languageType = languageType;
    this.environmentVariables = [];
  }
}

export class ScriptRunner {
  tmpFile: string;

  terminalManager: TerminalManager;
  pathUtils: PathUtils;
  extensionContext: vscode.ExtensionContext;
  environmentVariableMemento: EnvironmentVariableMemento;

  constructor(
    extensionContext: vscode.ExtensionContext,
    terminalManager: TerminalManager
  ) {
    this.terminalManager = terminalManager;
    this.pathUtils = new PathUtils();
    this.extensionContext = extensionContext;
    const tmpDir = os.tmpdir();
    this.tmpFile = path.join(tmpDir, `script-${Date.now()}.sh`);
    this.environmentVariableMemento = new EnvironmentVariableMemento(
      extensionContext,
      extensionContext.workspaceState
    );
  }

  async prepareExec(context: ScriptContext): Promise<boolean> {
    const { action, form } = context;
    const editor = vscode.window.activeTextEditor;
    const filePath = editor?.document.uri.fsPath;

    if (filePath == null) {
      vscode.window.showErrorMessage("Runbook.md: Unexpected Error");
      return false;
    }
    context.filePath = filePath;

    const dirname = this.pathUtils.dirname(filePath);

    context.workingDirectory = action.params.cwd
      ? this.pathUtils.resolve(dirname, action.params.cwd)
      : dirname;

    if (form) {
      const formValues: [string, string][] = [];
      for (const item of form) {
        let value: string | undefined;
        const mementoValue = this.environmentVariableMemento.get(item.name);

        if (item.options) {
          const options: vscode.QuickPickItem[] = item.options.map(
            (option) => ({
              label: option,
            })
          );

          if (mementoValue) {
            options.unshift(
              {
                label: mementoValue,
                description: "(default)",
              },
              {
                label: "",
                kind: vscode.QuickPickItemKind.Separator,
              }
            );
          }

          const selected = await vscode.window.showQuickPick(options, {
            placeHolder: `Pick value for ${item.name}`,
          });
          if (selected) {
            value = selected.label;
          }
        } else {
          value = await vscode.window.showInputBox({
            prompt: `Enter value for ${item.name}`,
            placeHolder: item.name,
            value: mementoValue,
          });
        }

        if (!value) {
          return false;
        }
        formValues.push([item.name, value]);
        this.environmentVariableMemento.set(item.name, value);
      }
      context.environmentVariables = formValues;
    }

    const askConfirm = action.params.askConfirm ?? false;
    if (askConfirm) {
      const answer = await vscode.window.showWarningMessage(
        "Runbook.md: Are you sure you want to execute this script?",
        "Yes",
        "No"
      );
      if (answer !== "Yes") {
        return false;
      }
    }

    this.terminalManager.openOrCreateTerminal(
      accessAction(action).getTerminal(),
      this.pathUtils.dirname(filePath)
    );

    return true;
  }

  async exec(
    action: Action,
    script: string,
    form: FormItem[],
    languageType: string
  ): Promise<void> {
    const context = new ScriptContext(action, script, form, languageType);

    if ((await this.prepareExec(context)) === false) {
      return;
    }
    if (action.type === ActionType.Run) {
      const cmd = await this.writeScriptToFile(context);

      this.terminalManager.sendToTerminal(
        accessAction(action).getTerminal(),
        cmd
      );
    } else if (action.type === ActionType.Send) {
      this.terminalManager.sendToTerminal(
        accessAction(action).getTerminal(),
        script
      );
    }
  }

  getShell(context: ScriptContext): string {
    const config = vscode.workspace.getConfiguration("runbookmd");
    const defaultBashShell = config.get<string>(
      "defaultBashShell",
      "/bin/bash"
    );

    if (context.languageType === "bash") {
      return defaultBashShell;
    }
    return this.terminalManager.getDefaultShell();
  }

  async writeScriptToFile(context: ScriptContext): Promise<string> {
    const { script, workingDirectory, action } = context;
    const shell = this.getShell(context);

    const content: string[] = [];

    for (const [key, value] of context.environmentVariables) {
      content.push(`export ${key}="${this.escape(value)}"`);
    }

    if (action.params.cwd != null) {
      const cmd = `cd ${workingDirectory}`;
      content.push(cmd);
    }

    content.push(script);

    await fs.writeFile(this.tmpFile, content.join("\n"));

    return `${shell} ${this.tmpFile}`;
  }

  private escape(str: string): string {
    // eslint-disable-next-line
    return str.replace(/"/g, '\\"');
  }
}
