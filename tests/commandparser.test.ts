import { CommandParser, QuoteType } from "../src/commandparser";

describe("CommandParser - CommentHandler", () => {
  let parser: CommandParser;

  beforeEach(() => {
    parser = new CommandParser();
  });

  describe("stripComments", () => {
    // Helper to access private method for testing
    const getStripComments = () => (parser as any).stripComments.bind(parser);

    it("should preserve input with no comments", () => {
      const input = "bash run --terminal name";
      const result = getStripComments()(input);
      expect(result).toBe("bash run --terminal name");
    });

    it("should truncate input with comment at end", () => {
      const input = "bash run --terminal name # this is a comment";
      const result = getStripComments()(input);
      expect(result).toBe("bash run --terminal name ");
    });

    it("should truncate input with comment in middle", () => {
      const input = "bash run # comment here --terminal name";
      const result = getStripComments()(input);
      expect(result).toBe("bash run ");
    });

    it("should not truncate when # is inside double quoted string", () => {
      const input = 'bash run --terminal "value # comment" --another';
      const result = getStripComments()(input);
      expect(result).toBe('bash run --terminal "value # comment" --another');
    });

    it("should not truncate when # is inside single quoted string", () => {
      const input = "bash run --terminal 'value # comment' --another";
      const result = getStripComments()(input);
      expect(result).toBe("bash run --terminal 'value # comment' --another");
    });

    it("should handle empty string", () => {
      const input = "";
      const result = getStripComments()(input);
      expect(result).toBe("");
    });

    it("should truncate string that starts with #", () => {
      const input = "# this is a comment";
      const result = getStripComments()(input);
      expect(result).toBe("");
    });

    it("should handle # after closing quote", () => {
      const input = 'bash run --terminal "value" # comment';
      const result = getStripComments()(input);
      expect(result).toBe('bash run --terminal "value" ');
    });

    it("should handle nested quotes correctly", () => {
      const input =
        "bash run --terminal \"outer 'inner # not comment'\" # real comment";
      const result = getStripComments()(input);
      expect(result).toBe(
        "bash run --terminal \"outer 'inner # not comment'\" "
      );
    });

    it("should handle unclosed quote", () => {
      const input = 'bash run --terminal "unclosed quote # should not truncate';
      const result = getStripComments()(input);
      expect(result).toBe(
        'bash run --terminal "unclosed quote # should not truncate'
      );
    });
  });

  describe("tokenizeInput", () => {
    // Helper to access private method for testing
    const getTokenizeInput = () => (parser as any).tokenizeInput.bind(parser);

    it("should tokenize simple command", () => {
      const input = "bash run";
      const result = getTokenizeInput()(input);
      expect(result).toEqual([
        {
          value: "bash",
          offset: 0,
          length: 4,
          hasQuotes: false,
          quoteType: null,
        },
        {
          value: "run",
          offset: 5,
          length: 3,
          hasQuotes: false,
          quoteType: null,
        },
      ]);
    });

    it("should tokenize command with options", () => {
      const input = "bash run --terminal name";
      const result = getTokenizeInput()(input);
      expect(result).toEqual([
        {
          value: "bash",
          offset: 0,
          length: 4,
          hasQuotes: false,
          quoteType: null,
        },
        {
          value: "run",
          offset: 5,
          length: 3,
          hasQuotes: false,
          quoteType: null,
        },
        {
          value: "--terminal",
          offset: 9,
          length: 10,
          hasQuotes: false,
          quoteType: null,
        },
        {
          value: "name",
          offset: 20,
          length: 4,
          hasQuotes: false,
          quoteType: null,
        },
      ]);
    });

    it("should preserve multiple consecutive spaces", () => {
      const input = "bash  run   --terminal";
      const result = getTokenizeInput()(input);
      expect(result).toEqual([
        {
          value: "bash",
          offset: 0,
          length: 4,
          hasQuotes: false,
          quoteType: null,
        },
        {
          value: "run",
          offset: 6,
          length: 3,
          hasQuotes: false,
          quoteType: null,
        },
        {
          value: "--terminal",
          offset: 12,
          length: 10,
          hasQuotes: false,
          quoteType: null,
        },
      ]);
    });

    it("should handle quoted strings with quotes included", () => {
      const input = 'bash run --terminal "my name"';
      const result = getTokenizeInput()(input);
      expect(result).toEqual([
        {
          value: "bash",
          offset: 0,
          length: 4,
          hasQuotes: false,
          quoteType: null,
        },
        {
          value: "run",
          offset: 5,
          length: 3,
          hasQuotes: false,
          quoteType: null,
        },
        {
          value: "--terminal",
          offset: 9,
          length: 10,
          hasQuotes: false,
          quoteType: null,
        },
        {
          value: '"my name"',
          offset: 20,
          length: 9,
          hasQuotes: true,
          quoteType: QuoteType.DoubleQuote,
        },
      ]);
    });

    it("should handle single quoted strings", () => {
      const input = "bash run --terminal 'my name'";
      const result = getTokenizeInput()(input);
      expect(result).toEqual([
        {
          value: "bash",
          offset: 0,
          length: 4,
          hasQuotes: false,
          quoteType: null,
        },
        {
          value: "run",
          offset: 5,
          length: 3,
          hasQuotes: false,
          quoteType: null,
        },
        {
          value: "--terminal",
          offset: 9,
          length: 10,
          hasQuotes: false,
          quoteType: null,
        },
        {
          value: "'my name'",
          offset: 20,
          length: 9,
          hasQuotes: true,
          quoteType: QuoteType.SingleQuote,
        },
      ]);
    });

    it("should handle equals sign in option", () => {
      const input = "bash run --terminal=name";
      const result = getTokenizeInput()(input);
      expect(result).toEqual([
        {
          value: "bash",
          offset: 0,
          length: 4,
          hasQuotes: false,
          quoteType: null,
        },
        {
          value: "run",
          offset: 5,
          length: 3,
          hasQuotes: false,
          quoteType: null,
        },
        {
          value: "--terminal=name",
          offset: 9,
          length: 15,
          hasQuotes: false,
          quoteType: null,
        },
      ]);
    });

    it("should handle empty string", () => {
      const input = "";
      const result = getTokenizeInput()(input);
      expect(result).toEqual([]);
    });

    it("should handle string with only whitespace", () => {
      const input = "   ";
      const result = getTokenizeInput()(input);
      expect(result).toEqual([]);
    });

    it("should handle tokens with leading/trailing spaces", () => {
      const input = "  bash  run  ";
      const result = getTokenizeInput()(input);
      expect(result).toEqual([
        {
          value: "bash",
          offset: 2,
          length: 4,
          hasQuotes: false,
          quoteType: null,
        },
        {
          value: "run",
          offset: 8,
          length: 3,
          hasQuotes: false,
          quoteType: null,
        },
      ]);
    });

    it("should handle quoted string with spaces", () => {
      const input = 'bash run --terminal "my long name"';
      const result = getTokenizeInput()(input);
      expect(result).toEqual([
        {
          value: "bash",
          offset: 0,
          length: 4,
          hasQuotes: false,
          quoteType: null,
        },
        {
          value: "run",
          offset: 5,
          length: 3,
          hasQuotes: false,
          quoteType: null,
        },
        {
          value: "--terminal",
          offset: 9,
          length: 10,
          hasQuotes: false,
          quoteType: null,
        },
        {
          value: '"my long name"',
          offset: 20,
          length: 14,
          hasQuotes: true,
          quoteType: QuoteType.DoubleQuote,
        },
      ]);
    });

    it("should handle unclosed quote", () => {
      const input = 'bash run --terminal "unclosed';
      const result = getTokenizeInput()(input);
      expect(result).toEqual([
        {
          value: "bash",
          offset: 0,
          length: 4,
          hasQuotes: false,
          quoteType: null,
        },
        {
          value: "run",
          offset: 5,
          length: 3,
          hasQuotes: false,
          quoteType: null,
        },
        {
          value: "--terminal",
          offset: 9,
          length: 10,
          hasQuotes: false,
          quoteType: null,
        },
        {
          value: '"unclosed',
          offset: 20,
          length: 9,
          hasQuotes: true,
          quoteType: QuoteType.DoubleQuote,
        },
      ]);
    });
  });

  describe("processQuotes", () => {
    // Helper to access private method for testing
    const getProcessQuotes = () => (parser as any).processQuotes.bind(parser);

    it("should strip double quotes from token value", () => {
      const token = {
        value: '"value"',
        offset: 10,
        length: 7,
        hasQuotes: true,
        quoteType: QuoteType.DoubleQuote,
      };
      const result = getProcessQuotes()(token);
      expect(result).toEqual({
        value: "value",
        offset: 10,
        length: 5,
        originalLength: 7,
      });
    });

    it("should strip single quotes from token value", () => {
      const token = {
        value: "'value'",
        offset: 10,
        length: 7,
        hasQuotes: true,
        quoteType: QuoteType.SingleQuote,
      };
      const result = getProcessQuotes()(token);
      expect(result).toEqual({
        value: "value",
        offset: 10,
        length: 5,
        originalLength: 7,
      });
    });

    it("should preserve token without quotes", () => {
      const token = {
        value: "value",
        offset: 10,
        length: 5,
        hasQuotes: false,
        quoteType: null,
      };
      const result = getProcessQuotes()(token);
      expect(result).toEqual({
        value: "value",
        offset: 10,
        length: 5,
        originalLength: 5,
      });
    });

    it("should handle mismatched quotes gracefully", () => {
      // Token with opening quote but no closing quote (unclosed quote)
      const token = {
        value: '"value',
        offset: 10,
        length: 6,
        hasQuotes: true,
        quoteType: QuoteType.DoubleQuote,
      };
      const result = getProcessQuotes()(token);
      // Should strip the opening quote if present
      expect(result).toEqual({
        value: "value",
        offset: 10,
        length: 5,
        originalLength: 6,
      });
    });

    it("should handle empty quoted string", () => {
      const token = {
        value: '""',
        offset: 10,
        length: 2,
        hasQuotes: true,
        quoteType: QuoteType.DoubleQuote,
      };
      const result = getProcessQuotes()(token);
      expect(result).toEqual({
        value: "",
        offset: 10,
        length: 0,
        originalLength: 2,
      });
    });

    it("should handle quoted string with spaces", () => {
      const token = {
        value: '"my name"',
        offset: 10,
        length: 9,
        hasQuotes: true,
        quoteType: QuoteType.DoubleQuote,
      };
      const result = getProcessQuotes()(token);
      expect(result).toEqual({
        value: "my name",
        offset: 10,
        length: 7,
        originalLength: 9,
      });
    });

    it("should treat nested quotes as literal", () => {
      // Token with nested quotes - the quotes inside should be treated as literal
      const token = {
        value: "\"outer 'inner'\"",
        offset: 10,
        length: 15,
        hasQuotes: true,
        quoteType: QuoteType.DoubleQuote,
      };
      const result = getProcessQuotes()(token);
      // Should strip only the outer double quotes
      expect(result).toEqual({
        value: "outer 'inner'",
        offset: 10,
        length: 13,
        originalLength: 15,
      });
    });

    it("should handle single quoted string with double quotes inside", () => {
      const token = {
        value: "'outer \"inner\"'",
        offset: 10,
        length: 15,
        hasQuotes: true,
        quoteType: QuoteType.SingleQuote,
      };
      const result = getProcessQuotes()(token);
      // Should strip only the outer single quotes
      expect(result).toEqual({
        value: 'outer "inner"',
        offset: 10,
        length: 13,
        originalLength: 15,
      });
    });

    it("should handle token with only opening quote", () => {
      const token = {
        value: '"',
        offset: 10,
        length: 1,
        hasQuotes: true,
        quoteType: QuoteType.DoubleQuote,
      };
      const result = getProcessQuotes()(token);
      expect(result).toEqual({
        value: "",
        offset: 10,
        length: 0,
        originalLength: 1,
      });
    });
  });

  describe("splitEqualsSyntax", () => {
    // Helper to access private method for testing
    const getSplitEqualsSyntax = () =>
      (parser as any).splitEqualsSyntax.bind(parser);

    it("should split --option=value format into two tokens", () => {
      const token = {
        value: "--terminal=name",
        offset: 10,
        length: 15,
        hasQuotes: false,
        quoteType: null,
      };
      const result = getSplitEqualsSyntax()(token);
      expect(result).toEqual([
        {
          value: "--terminal",
          offset: 10,
          length: 10,
          hasQuotes: false,
          quoteType: null,
        },
        {
          value: "name",
          offset: 21,
          length: 4,
          hasQuotes: false,
          quoteType: null,
        },
      ]);
    });

    it("should split -o=value format (short option) into two tokens", () => {
      const token = {
        value: "-t=name",
        offset: 10,
        length: 7,
        hasQuotes: false,
        quoteType: null,
      };
      const result = getSplitEqualsSyntax()(token);
      expect(result).toEqual([
        {
          value: "-t",
          offset: 10,
          length: 2,
          hasQuotes: false,
          quoteType: null,
        },
        {
          value: "name",
          offset: 13,
          length: 4,
          hasQuotes: false,
          quoteType: null,
        },
      ]);
    });

    it("should return single token if no equals sign", () => {
      const token = {
        value: "--terminal",
        offset: 10,
        length: 10,
        hasQuotes: false,
        quoteType: null,
      };
      const result = getSplitEqualsSyntax()(token);
      expect(result).toEqual([token]);
    });

    it("should split at first equals sign when multiple equals signs present", () => {
      const token = {
        value: "--option=value=extra",
        offset: 10,
        length: 19,
        hasQuotes: false,
        quoteType: null,
      };
      const result = getSplitEqualsSyntax()(token);
      expect(result).toEqual([
        {
          value: "--option",
          offset: 10,
          length: 8,
          hasQuotes: false,
          quoteType: null,
        },
        {
          value: "value=extra",
          offset: 19,
          length: 11,
          hasQuotes: false,
          quoteType: null,
        },
      ]);
    });

    it("should handle equals sign at start", () => {
      const token = {
        value: "=value",
        offset: 10,
        length: 6,
        hasQuotes: false,
        quoteType: null,
      };
      const result = getSplitEqualsSyntax()(token);
      expect(result).toEqual([
        {
          value: "",
          offset: 10,
          length: 0,
          hasQuotes: false,
          quoteType: null,
        },
        {
          value: "value",
          offset: 11,
          length: 5,
          hasQuotes: false,
          quoteType: null,
        },
      ]);
    });

    it("should handle equals sign at end", () => {
      const token = {
        value: "--option=",
        offset: 10,
        length: 9,
        hasQuotes: false,
        quoteType: null,
      };
      const result = getSplitEqualsSyntax()(token);
      expect(result).toEqual([
        {
          value: "--option",
          offset: 10,
          length: 8,
          hasQuotes: false,
          quoteType: null,
        },
        {
          value: "",
          offset: 19,
          length: 0,
          hasQuotes: false,
          quoteType: null,
        },
      ]);
    });

    it('should handle quoted value after equals: --option="value"', () => {
      const token = {
        value: '--option="value"',
        offset: 10,
        length: 15,
        hasQuotes: false,
        quoteType: null,
      };
      const result = getSplitEqualsSyntax()(token);
      expect(result).toEqual([
        {
          value: "--option",
          offset: 10,
          length: 8,
          hasQuotes: false,
          quoteType: null,
        },
        {
          value: '"value"',
          offset: 19,
          length: 7,
          hasQuotes: false,
          quoteType: null,
        },
      ]);
    });

    it("should handle quoted value with single quotes after equals", () => {
      const token = {
        value: "--option='value'",
        offset: 10,
        length: 15,
        hasQuotes: false,
        quoteType: null,
      };
      const result = getSplitEqualsSyntax()(token);
      expect(result).toEqual([
        {
          value: "--option",
          offset: 10,
          length: 8,
          hasQuotes: false,
          quoteType: null,
        },
        {
          value: "'value'",
          offset: 19,
          length: 7,
          hasQuotes: false,
          quoteType: null,
        },
      ]);
    });

    it("should verify offset calculations for split tokens", () => {
      const token = {
        value: "--terminal=name",
        offset: 5,
        length: 15,
        hasQuotes: false,
        quoteType: null,
      };
      const result = getSplitEqualsSyntax()(token);
      // First token: "--terminal" starts at offset 5, length 10
      expect(result[0].offset).toBe(5);
      expect(result[0].length).toBe(10);
      // Second token: "name" starts at offset 5 + 10 + 1 (for =) = 16
      expect(result[1].offset).toBe(16);
      expect(result[1].length).toBe(4);
      // Verify total length is preserved: 10 + 1 + 4 = 15
      expect(result[0].length + 1 + result[1].length).toBe(15);
    });

    it("should handle token with only equals sign", () => {
      const token = {
        value: "=",
        offset: 10,
        length: 1,
        hasQuotes: false,
        quoteType: null,
      };
      const result = getSplitEqualsSyntax()(token);
      expect(result).toEqual([
        {
          value: "",
          offset: 10,
          length: 0,
          hasQuotes: false,
          quoteType: null,
        },
        {
          value: "",
          offset: 11,
          length: 0,
          hasQuotes: false,
          quoteType: null,
        },
      ]);
    });
  });

  describe("extractOptionName", () => {
    // Helper to access private method for testing
    const getExtractOptionName = () =>
      (parser as any).extractOptionName.bind(parser);

    it("should extract name from long option: --terminal -> terminal", () => {
      const result = getExtractOptionName()("--terminal");
      expect(result).toBe("terminal");
    });

    it("should extract name from short option: -t -> t", () => {
      const result = getExtractOptionName()("-t");
      expect(result).toBe("t");
    });

    it("should return null for single dash (not an option)", () => {
      const result = getExtractOptionName()("terminal");
      expect(result).toBeNull();
    });

    it("should handle option with single dash: -terminal", () => {
      const result = getExtractOptionName()("-terminal");
      expect(result).toBe("terminal");
    });

    it("should return null for empty string", () => {
      const result = getExtractOptionName()("");
      expect(result).toBeNull();
    });

    it("should return null for just double dashes: --", () => {
      const result = getExtractOptionName()("--");
      expect(result).toBeNull();
    });

    it("should return null for just single dash: -", () => {
      const result = getExtractOptionName()("-");
      expect(result).toBeNull();
    });

    it("should extract name from long option with multiple dashes", () => {
      const result = getExtractOptionName()("--my-option");
      expect(result).toBe("my-option");
    });

    it("should extract name from short option with multiple characters", () => {
      const result = getExtractOptionName()("-abc");
      expect(result).toBe("abc");
    });

    it("should handle long option with underscores", () => {
      const result = getExtractOptionName()("--my_option");
      expect(result).toBe("my_option");
    });

    it("should return null for string starting with single dash followed by space", () => {
      // This shouldn't happen in practice, but test edge case
      const result = getExtractOptionName()("- ");
      expect(result).toBe(" ");
    });
  });

  describe("util.parseArgs integration", () => {
    // Helper to access private method for testing
    const getParseArgsIntegration = () =>
      (parser as any).parseArgsIntegration.bind(parser);

    it("should parse basic command and arguments", () => {
      const tokens = ["bash", "run", "test"];
      const result = getParseArgsIntegration()(tokens);
      expect(result.positionals).toEqual(["bash", "run", "test"]);
      expect(result.values).toEqual({});
    });

    it("should parse options with values", () => {
      const tokens = ["bash", "run", "--terminal", "name"];
      const result = getParseArgsIntegration()(tokens);
      expect(result.positionals).toEqual(["bash", "run"]);
      expect(result.values).toEqual({ terminal: "name" });
    });

    it("should parse boolean flags (options without values)", () => {
      const tokens = ["bash", "run", "--verbose"];
      const result = getParseArgsIntegration()(tokens);
      expect(result.positionals).toEqual(["bash", "run"]);
      expect(result.values).toEqual({ verbose: true });
    });

    it("should parse mixed options and arguments", () => {
      const tokens = ["bash", "run", "--terminal", "name", "extra"];
      const result = getParseArgsIntegration()(tokens);
      expect(result.positionals).toEqual(["bash", "run", "extra"]);
      expect(result.values).toEqual({ terminal: "name" });
    });

    it("should parse short and long options", () => {
      const tokens = ["bash", "run", "-t", "name", "--verbose"];
      const result = getParseArgsIntegration()(tokens);
      expect(result.positionals).toEqual(["bash", "run"]);
      expect(result.values).toEqual({ t: "name", verbose: true });
    });

    it("should parse options with equals sign (pre-split)", () => {
      const tokens = ["bash", "run", "--terminal", "name"];
      // Note: equals syntax should be split before this, so we test with already split tokens
      const result = getParseArgsIntegration()(tokens);
      expect(result.positionals).toEqual(["bash", "run"]);
      expect(result.values).toEqual({ terminal: "name" });
    });

    it("should handle missing option values", () => {
      const tokens = ["bash", "run", "--terminal"];
      const result = getParseArgsIntegration()(tokens);
      expect(result.positionals).toEqual(["bash", "run"]);
      expect(result.values).toEqual({ terminal: true });
    });

    it("should ignore -- token", () => {
      const tokens = ["bash", "run", "--", "arg1", "arg2"];
      const result = getParseArgsIntegration()(tokens);
      // util.parseArgs treats -- as a separator, so everything after -- becomes positionals
      expect(result.positionals).toContain("bash");
      expect(result.positionals).toContain("run");
      expect(result.positionals).toContain("arg1");
      expect(result.positionals).toContain("arg2");
    });

    it("should handle multiple options", () => {
      const tokens = ["bash", "run", "--terminal", "name", "--cwd", "/path"];
      const result = getParseArgsIntegration()(tokens);
      expect(result.positionals).toEqual(["bash", "run"]);
      expect(result.values).toEqual({ terminal: "name", cwd: "/path" });
    });

    it("should handle short option followed by another option", () => {
      const tokens = ["bash", "run", "-t", "name", "--verbose"];
      const result = getParseArgsIntegration()(tokens);
      expect(result.positionals).toEqual(["bash", "run"]);
      expect(result.values).toEqual({ t: "name", verbose: true });
    });

    it("should handle option followed by option (missing value)", () => {
      const tokens = ["bash", "run", "--terminal", "--another"];
      const result = getParseArgsIntegration()(tokens);
      expect(result.positionals).toEqual(["bash", "run"]);
      expect(result.values).toEqual({ terminal: true, another: true });
    });
  });

  describe("token classification", () => {
    // Helper to access private method for testing
    const getMergeUtilParseResult = () =>
      (parser as any).mergeUtilParseResult.bind(parser);

    it("should classify first positional as command", () => {
      const rawTokens: Array<{
        value: string;
        offset: number;
        length: number;
      }> = [
        { value: "bash", offset: 0, length: 4 },
        { value: "run", offset: 5, length: 3 },
      ];
      const parseResult = {
        positionals: ["bash", "run"],
        values: {},
        tokens: [
          { kind: "positional", value: "bash", index: 0 },
          { kind: "positional", value: "run", index: 1 },
        ],
      };
      const result = getMergeUtilParseResult()(rawTokens, parseResult);
      expect(result[0].type).toBe("command");
      expect(result[0].value).toBe("bash");
      expect(result[0].offset).toBe(0);
      expect(result[0].length).toBe(4);
    });

    it("should classify subsequent positionals as argument", () => {
      const rawTokens: Array<{
        value: string;
        offset: number;
        length: number;
      }> = [
        { value: "bash", offset: 0, length: 4 },
        { value: "run", offset: 5, length: 3 },
        { value: "test", offset: 9, length: 4 },
      ];
      const parseResult = {
        positionals: ["bash", "run", "test"],
        values: {},
        tokens: [
          { kind: "positional", value: "bash", index: 0 },
          { kind: "positional", value: "run", index: 1 },
          { kind: "positional", value: "test", index: 2 },
        ],
      };
      const result = getMergeUtilParseResult()(rawTokens, parseResult);
      expect(result[0].type).toBe("command");
      expect(result[1].type).toBe("argument");
      expect(result[1].value).toBe("run");
      expect(result[2].type).toBe("argument");
      expect(result[2].value).toBe("test");
    });

    it("should classify options from util.parseArgs as option", () => {
      const rawTokens: Array<{
        value: string;
        offset: number;
        length: number;
      }> = [
        { value: "bash", offset: 0, length: 4 },
        { value: "run", offset: 5, length: 3 },
        { value: "--terminal", offset: 9, length: 10 },
        { value: "name", offset: 20, length: 4 },
      ];
      const parseResult = {
        positionals: ["bash", "run"],
        values: { terminal: "name" },
        tokens: [
          { kind: "positional", value: "bash", index: 0 },
          { kind: "positional", value: "run", index: 1 },
          { kind: "option", value: "--terminal", name: "terminal", index: 2 },
          { kind: "positional", value: "name", index: 3 },
        ],
      };
      const result = getMergeUtilParseResult()(rawTokens, parseResult);
      expect(result[2].type).toBe("option");
      expect(result[2].value).toBe("--terminal");
      expect(result[2].option_name).toBe("terminal");
      expect(result[2].offset).toBe(9);
      expect(result[2].length).toBe(10);
    });

    it("should classify option values as option_argument", () => {
      const rawTokens: Array<{
        value: string;
        offset: number;
        length: number;
      }> = [
        { value: "bash", offset: 0, length: 4 },
        { value: "run", offset: 5, length: 3 },
        { value: "--terminal", offset: 9, length: 10 },
        { value: "name", offset: 20, length: 4 },
      ];
      const parseResult = {
        positionals: ["bash", "run"],
        values: { terminal: "name" },
        tokens: [
          { kind: "positional", value: "bash", index: 0 },
          { kind: "positional", value: "run", index: 1 },
          { kind: "option", value: "--terminal", name: "terminal", index: 2 },
          { kind: "positional", value: "name", index: 3 },
        ],
      };
      const result = getMergeUtilParseResult()(rawTokens, parseResult);
      expect(result[3].type).toBe("option_argument");
      expect(result[3].value).toBe("name");
      expect(result[3].option_name).toBe("terminal");
      expect(result[3].offset).toBe(20);
      expect(result[3].length).toBe(4);
    });

    it("should handle boolean flag (option without option_argument)", () => {
      const rawTokens: Array<{
        value: string;
        offset: number;
        length: number;
      }> = [
        { value: "bash", offset: 0, length: 4 },
        { value: "run", offset: 5, length: 3 },
        { value: "--verbose", offset: 9, length: 9 },
      ];
      const parseResult = {
        positionals: ["bash", "run"],
        values: { verbose: true },
        tokens: [
          { kind: "positional", value: "bash", index: 0 },
          { kind: "positional", value: "run", index: 1 },
          { kind: "option", value: "--verbose", name: "verbose", index: 2 },
        ],
      };
      const result = getMergeUtilParseResult()(rawTokens, parseResult);
      expect(result.length).toBe(3);
      expect(result[2].type).toBe("option");
      expect(result[2].value).toBe("--verbose");
      expect(result[2].option_name).toBe("verbose");
      // No option_argument token should be created
    });

    it("should handle option with missing value", () => {
      const rawTokens: Array<{
        value: string;
        offset: number;
        length: number;
      }> = [
        { value: "bash", offset: 0, length: 4 },
        { value: "run", offset: 5, length: 3 },
        { value: "--terminal", offset: 9, length: 10 },
      ];
      const parseResult = {
        positionals: ["bash", "run"],
        values: { terminal: true },
        tokens: [
          { kind: "positional", value: "bash", index: 0 },
          { kind: "positional", value: "run", index: 1 },
          { kind: "option", value: "--terminal", name: "terminal", index: 2 },
        ],
      };
      const result = getMergeUtilParseResult()(rawTokens, parseResult);
      expect(result.length).toBe(3);
      expect(result[2].type).toBe("option");
      expect(result[2].option_name).toBe("terminal");
      // No option_argument token should be created
    });

    it("should handle mixed sequence: command, argument, option, option_argument", () => {
      const rawTokens: Array<{
        value: string;
        offset: number;
        length: number;
      }> = [
        { value: "bash", offset: 0, length: 4 },
        { value: "run", offset: 5, length: 3 },
        { value: "test", offset: 9, length: 4 },
        { value: "--terminal", offset: 14, length: 10 },
        { value: "name", offset: 25, length: 4 },
      ];
      const parseResult = {
        positionals: ["bash", "run", "test"],
        values: { terminal: "name" },
        tokens: [
          { kind: "positional", value: "bash", index: 0 },
          { kind: "positional", value: "run", index: 1 },
          { kind: "positional", value: "test", index: 2 },
          { kind: "option", value: "--terminal", name: "terminal", index: 3 },
          { kind: "positional", value: "name", index: 4 },
        ],
      };
      const result = getMergeUtilParseResult()(rawTokens, parseResult);
      expect(result[0].type).toBe("command");
      expect(result[0].value).toBe("bash");
      expect(result[1].type).toBe("argument");
      expect(result[1].value).toBe("run");
      expect(result[2].type).toBe("argument");
      expect(result[2].value).toBe("test");
      expect(result[3].type).toBe("option");
      expect(result[3].value).toBe("--terminal");
      expect(result[3].option_name).toBe("terminal");
      expect(result[4].type).toBe("option_argument");
      expect(result[4].value).toBe("name");
      expect(result[4].option_name).toBe("terminal");
    });

    it("should handle short options", () => {
      const rawTokens: Array<{
        value: string;
        offset: number;
        length: number;
      }> = [
        { value: "bash", offset: 0, length: 4 },
        { value: "run", offset: 5, length: 3 },
        { value: "-t", offset: 9, length: 2 },
        { value: "name", offset: 12, length: 4 },
      ];
      const parseResult = {
        positionals: ["bash", "run"],
        values: { t: "name" },
        tokens: [
          { kind: "positional", value: "bash", index: 0 },
          { kind: "positional", value: "run", index: 1 },
          { kind: "option", value: "-t", name: "t", index: 2 },
          { kind: "positional", value: "name", index: 3 },
        ],
      };
      const result = getMergeUtilParseResult()(rawTokens, parseResult);
      expect(result[2].type).toBe("option");
      expect(result[2].option_name).toBe("t");
      expect(result[3].type).toBe("option_argument");
      expect(result[3].option_name).toBe("t");
    });
  });

  describe("CommandParser.parse()", () => {
    let parser: CommandParser;

    beforeEach(() => {
      parser = new CommandParser();
    });

    it("should parse basic example: bash run --terminal name", () => {
      const result = parser.parse("bash run --terminal name");
      expect(result).toEqual([
        { type: "command", offset: 0, length: 4, value: "bash" },
        { type: "argument", offset: 5, length: 3, value: "run" },
        {
          type: "option",
          offset: 9,
          length: 10,
          value: "--terminal",
          option_name: "terminal",
        },
        {
          type: "option_argument",
          offset: 20,
          length: 4,
          value: "name",
          option_name: "terminal",
        },
      ]);
    });

    it('should parse with quotes: bash run --terminal "my name"', () => {
      const result = parser.parse('bash run --terminal "my name"');
      expect(result).toEqual([
        { type: "command", offset: 0, length: 4, value: "bash" },
        { type: "argument", offset: 5, length: 3, value: "run" },
        {
          type: "option",
          offset: 9,
          length: 10,
          value: "--terminal",
          option_name: "terminal",
        },
        {
          type: "option_argument",
          offset: 20,
          length: 7,
          value: "my name",
          option_name: "terminal",
        },
      ]);
    });

    it("should parse with equals: bash run --terminal=name", () => {
      const result = parser.parse("bash run --terminal=name");
      expect(result).toEqual([
        { type: "command", offset: 0, length: 4, value: "bash" },
        { type: "argument", offset: 5, length: 3, value: "run" },
        {
          type: "option",
          offset: 9,
          length: 10,
          value: "--terminal",
          option_name: "terminal",
        },
        {
          type: "option_argument",
          offset: 20,
          length: 4,
          value: "name",
          option_name: "terminal",
        },
      ]);
    });

    it("should parse boolean flag: bash run --verbose", () => {
      const result = parser.parse("bash run --verbose");
      expect(result).toEqual([
        { type: "command", offset: 0, length: 4, value: "bash" },
        { type: "argument", offset: 5, length: 3, value: "run" },
        {
          type: "option",
          offset: 9,
          length: 9,
          value: "--verbose",
          option_name: "verbose",
        },
      ]);
    });

    it("should parse short option: bash run -t name", () => {
      const result = parser.parse("bash run -t name");
      expect(result).toEqual([
        { type: "command", offset: 0, length: 4, value: "bash" },
        { type: "argument", offset: 5, length: 3, value: "run" },
        { type: "option", offset: 9, length: 2, value: "-t", option_name: "t" },
        {
          type: "option_argument",
          offset: 12,
          length: 4,
          value: "name",
          option_name: "t",
        },
      ]);
    });

    it("should parse with comment: bash run --terminal name # comment", () => {
      const result = parser.parse("bash run --terminal name # comment");
      expect(result).toEqual([
        { type: "command", offset: 0, length: 4, value: "bash" },
        { type: "argument", offset: 5, length: 3, value: "run" },
        {
          type: "option",
          offset: 9,
          length: 10,
          value: "--terminal",
          option_name: "terminal",
        },
        {
          type: "option_argument",
          offset: 20,
          length: 4,
          value: "name",
          option_name: "terminal",
        },
      ]);
    });

    it("should handle empty string", () => {
      const result = parser.parse("");
      expect(result).toEqual([]);
    });

    it("should parse only command: bash", () => {
      const result = parser.parse("bash");
      expect(result).toEqual([
        { type: "command", offset: 0, length: 4, value: "bash" },
      ]);
    });

    it("should parse multiple arguments: bash run test --terminal name", () => {
      const result = parser.parse("bash run test --terminal name");
      expect(result).toEqual([
        { type: "command", offset: 0, length: 4, value: "bash" },
        { type: "argument", offset: 5, length: 3, value: "run" },
        { type: "argument", offset: 9, length: 4, value: "test" },
        {
          type: "option",
          offset: 14,
          length: 10,
          value: "--terminal",
          option_name: "terminal",
        },
        {
          type: "option_argument",
          offset: 25,
          length: 4,
          value: "name",
          option_name: "terminal",
        },
      ]);
    });

    it("should parse multiple options: bash run --terminal name --cwd /path", () => {
      const result = parser.parse("bash run --terminal name --cwd /path");
      expect(result).toEqual([
        { type: "command", offset: 0, length: 4, value: "bash" },
        { type: "argument", offset: 5, length: 3, value: "run" },
        {
          type: "option",
          offset: 9,
          length: 10,
          value: "--terminal",
          option_name: "terminal",
        },
        {
          type: "option_argument",
          offset: 20,
          length: 4,
          value: "name",
          option_name: "terminal",
        },
        {
          type: "option",
          offset: 25,
          length: 5,
          value: "--cwd",
          option_name: "cwd",
        },
        {
          type: "option_argument",
          offset: 31,
          length: 5,
          value: "/path",
          option_name: "cwd",
        },
      ]);
    });

    it("should ignore -- token", () => {
      const result = parser.parse("bash run -- arg1 arg2");
      expect(result.length).toBeGreaterThan(0);
      // The -- should be ignored, and arg1, arg2 should be positionals
      expect(result[0].type).toBe("command");
      expect(result[0].value).toBe("bash");
    });

    it("should handle missing option value: bash run --terminal", () => {
      const result = parser.parse("bash run --terminal");
      expect(result).toEqual([
        { type: "command", offset: 0, length: 4, value: "bash" },
        { type: "argument", offset: 5, length: 3, value: "run" },
        {
          type: "option",
          offset: 9,
          length: 10,
          value: "--terminal",
          option_name: "terminal",
        },
      ]);
    });

    it("should handle option followed by option: bash run --terminal --another", () => {
      const result = parser.parse("bash run --terminal --another");
      expect(result).toEqual([
        { type: "command", offset: 0, length: 4, value: "bash" },
        { type: "argument", offset: 5, length: 3, value: "run" },
        {
          type: "option",
          offset: 9,
          length: 10,
          value: "--terminal",
          option_name: "terminal",
        },
        {
          type: "option",
          offset: 20,
          length: 9,
          value: "--another",
          option_name: "another",
        },
      ]);
    });

    it("should handle multiple spaces: bash  run  --terminal  name", () => {
      const result = parser.parse("bash  run  --terminal  name");
      expect(result).toEqual([
        { type: "command", offset: 0, length: 4, value: "bash" },
        { type: "argument", offset: 6, length: 3, value: "run" },
        {
          type: "option",
          offset: 11,
          length: 10,
          value: "--terminal",
          option_name: "terminal",
        },
        {
          type: "option_argument",
          offset: 23,
          length: 4,
          value: "name",
          option_name: "terminal",
        },
      ]);
    });
  });
});
