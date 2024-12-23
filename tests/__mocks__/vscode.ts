export class Position {
  line: number;
  character: number;

  constructor(line: number, character: number) {
    this.line = line;
    this.character = character;
  }
}

export class Range {
  start: Position;
  end: Position;

  constructor(start: Position, end: Position) {
    this.start = start;
    this.end = end;
  }
}

export class TextDocument {
  getText(): string {
    return "";
  }

  positionAt(offset: number): Position {
    return new Position(0, offset);
  }
}

export const window = {
  activeTextEditor: undefined,
  showErrorMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  createTerminal: jest.fn(),
  terminals: [],
  onDidCloseTerminal: jest.fn(),
  onDidOpenTerminal: jest.fn(),
};

export const workspace = {
  getConfiguration: jest.fn().mockReturnValue({
    get: jest.fn((key: string, defaultValue: any) => {
      if (key === "defaultBashShell") {
        return "/bin/bash"; // Default value for testing
      }
      return defaultValue;
    }),
  }),
};

export class ExtensionContext {
  globalState = {
    get: jest.fn(),
    update: jest.fn(),
    keys: jest.fn(),
  };
  secrets = {
    get: jest.fn(),
    store: jest.fn(),
  };
  extensionUri = { fsPath: "" };
  extensionPath = "";
  subscriptions: { dispose(): any }[] = [];
  workspaceState = {
    get: jest.fn(),
    update: jest.fn(),
    keys: jest.fn(),
  };
  asAbsolutePath = jest.fn((relativePath: string) => relativePath);
  storagePath = "";
  globalStoragePath = "";
  logPath = "";
  extensionMode = 1;
  environmentVariableCollection = {
    replace: jest.fn(),
    append: jest.fn(),
    prepend: jest.fn(),
    get: jest.fn(),
    forEach: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
  };
  storageUri = { fsPath: "" };
  globalStorageUri = { fsPath: "" };
  logUri = { fsPath: "" };
  extension = {
    id: "mock.extension",
    extensionUri: { fsPath: "" },
    extensionPath: "",
    isActive: true,
    packageJSON: {},
    activate: jest.fn(),
    exports: {},
  };
  languageModelAccessInformation = {
    getLanguageModel: jest.fn(),
  };
}
