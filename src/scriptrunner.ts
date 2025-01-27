import * as vscode from "vscode";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import { TerminalManager } from "./terminalmanager";
import { accessAction, Action, ActionType } from "./action";
import { PathUtils } from "./pathutils";
import { FormItem, FormItemType } from "./formparser";

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

  // The exported script file to be executed
  scriptFile?: string;

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
  terminalManager: TerminalManager;
  pathUtils: PathUtils;
  extensionContext: vscode.ExtensionContext;
  environmentVariableMemento: EnvironmentVariableMemento;

  private runCountTable: Map<string, number> = new Map();

  constructor(
    extensionContext: vscode.ExtensionContext,
    terminalManager: TerminalManager
  ) {
    this.terminalManager = terminalManager;
    this.pathUtils = new PathUtils();
    this.extensionContext = extensionContext;
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
        } else if (item.type === FormItemType.Password) {
          value = await vscode.window.showInputBox({
            prompt: `Enter value for ${item.name}`,
            placeHolder: item.name,
            value: mementoValue,
            password: true,
          });
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
    const terminalName = accessAction(action).getTerminal();

    const runCount = this.runCountTable.get(terminalName) ?? 0;
    this.runCountTable.set(terminalName, runCount + 1);

    const normalizedName = this.normalizeTerminalName(terminalName);
    const tmpDir = os.tmpdir();
    const runCountStr = runCount.toString().padStart(3, "0");
    const tmpFile = path.join(
      tmpDir,
      `script-${normalizedName}-${runCountStr}.sh`
    );

    const context = new ScriptContext(action, script, form, languageType);
    context.scriptFile = tmpFile;

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

    if (action.params.cwd != null && workingDirectory != null) {
      const cmd = `cd "${this.escape(workingDirectory)}"`;
      content.push(cmd);
    }

    content.push(script);
    const scriptFile = context.scriptFile ?? os.tmpdir() + "/script.sh";

    await fs.writeFile(scriptFile, content.join("\n"));

    return `${shell} ${scriptFile}`;
  }

  private escape(str: string): string {
    // eslint-disable-next-line
    return str.replace(/"/g, '\\"');
  }

  normalizeTerminalName(name: string): string {
    const normalized = name
      .replace(/[\\/:"*?<>|]/g, "_")
      .replace(/\s/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toLowerCase();

    if (normalized === "_" || normalized === "") {
      return "terminal";
    }
    return normalized;
  }
}
