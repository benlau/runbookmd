import { ActionType } from "../src/action";
import { AnnotationParser, parseCommand } from "../src/annotationparser";

describe("AnnotationParser", () => {
  let parser: AnnotationParser;

  beforeEach(() => {
    parser = new AnnotationParser();
  });

  it("should parse empty string", () => {
    const result = parser.parse("");
    expect(result).toEqual({
      type: "",
      raw: "",
    });
  });

  it("should parse command with no parameters", () => {
    const result = parser.parse("bash");
    expect(result).toEqual({
      type: "bash",
      raw: "bash",
    });
  });

  it("should handle arguments", () => {
    const result = parser.parse("bash send --terminal=123");
    expect(result).toEqual({
      type: "bash",
      action: {
        type: ActionType.Send,
        params: {
          terminal: "123",
        },
      },
      raw: "bash send --terminal=123",
    });
  });

  it("should parse terminal parameter", () => {
    const result = parser.parse("run send --terminal=bash");
    expect(result).toEqual({
      type: "run",
      action: {
        type: ActionType.Send,
        params: { terminal: "bash" },
      },
      raw: "run send --terminal=bash",
    });
  });

  it("should parse invalid", () => {
    const result = parser.parse("run test --terminal=bash");
    expect(result).toEqual({
      type: "run",
      raw: "run test --terminal=bash",
    });
  });

  it("should parse run command", () => {
    const result = parser.parse("run run --terminal=bash");
    expect(result).toEqual({
      type: "run",
      action: {
        type: ActionType.Run,
        params: { terminal: "bash" },
      },
      raw: "run run --terminal=bash",
    });
  });

  describe("parseCommand", () => {
    it("should parse a simple command", () => {
      const command = "run --terminal=bash";
      const result = parseCommand(command);
      expect(result).toEqual(["run", "--terminal=bash"]);
    });

    it("should handle quoted strings", () => {
      const command = 'run --terminal="bash terminal"';
      const result = parseCommand(command);
      expect(result).toEqual(["run", '--terminal="bash terminal"']);
    });

    it("should handle escaped characters", () => {
      const command = "run --path=C:\\\\Program\\ Files";
      const result = parseCommand(command);
      expect(result).toEqual(["run", "--path=C:\\Program Files"]);
    });

    it("should handle mixed quotes and spaces", () => {
      const command = "run --name=\"John Doe\" --path='/usr/local/bin'";
      const result = parseCommand(command);
      expect(result).toEqual([
        "run",
        '--name="John Doe"',
        "--path='/usr/local/bin'",
      ]);
    });

    it("should handle empty command", () => {
      const command = "";
      const result = parseCommand(command);
      expect(result).toEqual([]);
    });
  });
});
