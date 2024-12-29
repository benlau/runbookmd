import * as vscode from "./__mocks__/vscode";
import { promises as fs } from "fs";
import { ScriptRunner } from "../src/scriptrunner";
import { TerminalManager } from "../src/terminalmanager";
import { Action, ActionType } from "../src/action";
import { dedent } from "./fixture";

jest.mock("fs");
jest.mock("vscode");
jest.mock("../src/terminalmanager");

describe("ScriptRunner", () => {
  let scriptRunner: ScriptRunner;
  let terminalManager: TerminalManager;
  let extensionContext: vscode.ExtensionContext;

  beforeEach(() => {
    terminalManager = new TerminalManager();
    extensionContext = new vscode.ExtensionContext();
    scriptRunner = new ScriptRunner(extensionContext as any, terminalManager);
    jest.clearAllMocks();
  });

  describe("prepareExec", () => {
    it("should return false if no active editor", async () => {
      vscode.window.activeTextEditor = undefined;
      const context = { action: { params: {} } } as any;
      const result = await scriptRunner.prepareExec(context);
      expect(result).toBe(false);
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        "Runbook.md: Unexpected Error"
      );
    });

    it("should set filePath and workingDirectory", async () => {
      const mockEditor = {
        document: { uri: { fsPath: "/path/to/file.md" } },
      };
      vscode.window.activeTextEditor = mockEditor as any;

      const context = { action: { params: {} } } as any;
      const result = await scriptRunner.prepareExec(context);

      expect(result).toBe(true);
      expect(context.filePath).toBe("/path/to/file.md");
      expect(context.workingDirectory).toBe("/path/to");
    });

    it("should ask for confirmation if askConfirm is true", async () => {
      const mockEditor = {
        document: { uri: { fsPath: "/path/to/file.md" } },
      };
      vscode.window.activeTextEditor = mockEditor as any;

      const context = { action: { params: { askConfirm: true } } } as any;
      vscode.window.showWarningMessage = jest.fn().mockResolvedValue("Yes");

      const result = await scriptRunner.prepareExec(context);

      expect(result).toBe(true);
      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        "Runbook.md: Are you sure you want to execute this script?",
        "Yes",
        "No"
      );
    });

    it("should return false if user declines confirmation", async () => {
      const mockEditor = {
        document: { uri: { fsPath: "/path/to/file.md" } },
      };
      vscode.window.activeTextEditor = mockEditor as any;

      const context = { action: { params: { askConfirm: true } } } as any;
      vscode.window.showWarningMessage = jest.fn().mockResolvedValue("No");

      const result = await scriptRunner.prepareExec(context);

      expect(result).toBe(false);
    });
  });

  describe("exec", () => {
    it("should not execute if prepareExec returns false", async () => {
      jest.spyOn(scriptRunner, "prepareExec").mockResolvedValue(false);
      const action = { type: ActionType.Run, params: {} } as Action;
      await scriptRunner.exec(action, "echo 'Hello World'", [], "sh");
      expect(terminalManager.sendToTerminal).not.toHaveBeenCalled();
    });

    it("should execute script in Run mode", async () => {
      jest.spyOn(scriptRunner, "prepareExec").mockResolvedValue(true);
      jest.spyOn(scriptRunner, "writeScriptToFile").mockResolvedValue("cmd");
      const action = { type: ActionType.Run, params: {} } as Action;
      await scriptRunner.exec(action, "echo 'Hello World'", [], "sh");
      expect(terminalManager.sendToTerminal).toHaveBeenCalledWith(
        expect.any(String),
        "cmd"
      );
    });

    it("should execute script in Send mode", async () => {
      jest.spyOn(scriptRunner, "prepareExec").mockResolvedValue(true);
      const action = { type: ActionType.Send, params: {} } as Action;
      await scriptRunner.exec(action, "echo 'Hello World'", [], "sh");
      expect(terminalManager.sendToTerminal).toHaveBeenCalledWith(
        expect.any(String),
        "echo 'Hello World'"
      );
    });
  });

  describe("writeScriptToFile", () => {
    it("should write script to a temporary file", async () => {
      const context = {
        script: "echo 'Hello World'",
        workingDirectory: "/path/to",
        action: { params: { cwd: "." } },
        environmentVariables: [],
      } as any;
      const shell = "/bin/bash";
      jest.spyOn(terminalManager, "getDefaultShell").mockReturnValue(shell);

      await scriptRunner.writeScriptToFile(context);

      expect((fs.writeFile as any).mock.calls[0][1]).toBe(
        dedent`\
        cd "/path/to"
        echo 'Hello World'`
      );
    });

    it("should write environment variables to the script", async () => {
      const context = {
        script: "echo 'Hello World'",
        workingDirectory: "/path/to",
        action: { params: { cwd: "." } },
        environmentVariables: [["FOO", "BAR"]],
      } as any;

      const shell = "/bin/bash";
      jest.spyOn(terminalManager, "getDefaultShell").mockReturnValue(shell);

      await scriptRunner.writeScriptToFile(context);

      expect((fs.writeFile as any).mock.calls[0][1]).toBe(
        dedent`\
        export FOO="BAR"
        cd "/path/to"
        echo 'Hello World'`
      );
    });

    it("should escape double quotes in environment variables", async () => {
      const context = {
        script: "echo 'Hello World'",
        workingDirectory: "/path/to",
        action: { params: { cwd: "." } },
        environmentVariables: [["FOO", '"1"2"3"']],
      } as any;

      const shell = "/bin/bash";
      jest.spyOn(terminalManager, "getDefaultShell").mockReturnValue(shell);

      await scriptRunner.writeScriptToFile(context);

      expect((fs.writeFile as any).mock.calls[0][1]).toBe(
        dedent`\
        export FOO="\\"1\\"2\\"3\\""
        cd "/path/to"
        echo 'Hello World'`
      );
    });

    it("should escape double quotes in working directory path", async () => {
      const context = {
        script: "echo 'Hello World'",
        workingDirectory: '/path/with"quotes',
        action: { params: { cwd: "." } },
        environmentVariables: [],
      } as any;

      const shell = "/bin/bash";
      jest.spyOn(terminalManager, "getDefaultShell").mockReturnValue(shell);

      await scriptRunner.writeScriptToFile(context);

      expect((fs.writeFile as any).mock.calls[0][1]).toBe(
        dedent`\
        cd "/path/with\\"quotes"
        echo 'Hello World'`
      );
    });

    it("should use /bin/bash if languageType is bash", async () => {
      const context = {
        languageType: "bash",
      } as any;
      const shell = scriptRunner.getShell(context);
      expect(shell).toBe("/bin/bash");
    });

    it("it should get the default shell if languageType is sh", async () => {
      const context = {
        languageType: "sh",
      } as any;
      const defaultShell = "/bin/zsh";
      jest
        .spyOn(terminalManager, "getDefaultShell")
        .mockReturnValue(defaultShell);
      const shell = scriptRunner.getShell(context);
      expect(shell).toBe(defaultShell);
    });
  });

  describe("getShell", () => {
    it("should use the configured default bash shell", () => {
      const context = {
        languageType: "bash",
      } as any;
      const shell = scriptRunner.getShell(context);
      expect(shell).toBe("/bin/bash");
    });

    it("should get the default shell if languageType is sh", () => {
      const context = {
        languageType: "sh",
      } as any;
      const defaultShell = "/bin/zsh";
      jest
        .spyOn(terminalManager, "getDefaultShell")
        .mockReturnValue(defaultShell);
      const shell = scriptRunner.getShell(context);
      expect(shell).toBe(defaultShell);
    });
  });
});
