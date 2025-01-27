import * as vscode from "./__mocks__/vscode";
import { MarkdownParser } from "../src/markdownparser";
import { dedent } from "./fixture";
import { ActionType } from "../src/action";
import { FormItemType } from "../src/formparser";

jest.mock("vscode");

describe("MarkdownParser", () => {
  let parser: MarkdownParser;

  beforeEach(() => {
    parser = new MarkdownParser();
    jest.clearAllMocks();
  });

  describe("findFencedCodeBlock", () => {
    it("should parse simple language annotation", () => {
      const mockDocument = {
        getText: () =>
          dedent`\
        \`\`\`javascript
        const x = 1;
        \`\`\`
        `,
        positionAt: (index: number) => new vscode.Position(0, index),
      };

      const result = parser.findFencedCodeBlock(mockDocument as any);

      expect(result).toHaveLength(1);
      expect(result[0].content).toEqual("const x = 1;");
      expect(result[0].annotation.type).toEqual("javascript");
      expect(result[0].annotation.raw).toEqual("javascript");
    });

    it("should parse complex annotation with parameters", () => {
      const mockDocument = {
        getText: () => "```run send --terminal=bash\necho hello\n```\n",
        positionAt: (index: number) => new vscode.Position(0, index),
      };

      const result = parser.findFencedCodeBlock(mockDocument as any);

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe("echo hello");
      expect(result[0].annotation.action?.params.terminal).toEqual("bash");
    });

    it("should handle multiple code blocks with different annotations", () => {
      const mockDocument = {
        getText: () =>
          [
            "```js\ncode1\n```",
            "```python send --terminal='Python'\ncode2\n```",
          ].join("\n\n"),
        positionAt: (index: number) => new vscode.Position(0, index),
      };

      const result = parser.findFencedCodeBlock(mockDocument as any);

      expect(result).toHaveLength(2);
      expect(result[0].annotation.type).toEqual("js");

      expect(result[1].annotation.action?.params.terminal).toEqual("Python");
    });

    it("should handle code blocks without annotation", () => {
      const mockDocument = {
        getText: () => "```\nline1\nline2\n```",
        positionAt: (index: number) => new vscode.Position(0, index),
      };

      const result = parser.findFencedCodeBlock(mockDocument as any);

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe("line1\nline2");
      expect(result[0].annotation.type).toBe("");
    });

    it("should return empty array when no code blocks found", () => {
      const mockDocument = {
        getText: () => "No code blocks here",
        positionAt: (index: number) => new vscode.Position(0, index),
      };

      const result = parser.findFencedCodeBlock(mockDocument as any);

      expect(result).toHaveLength(0);
    });

    it("should find actionable fenced code blocks", () => {
      const mockDocument = {
        getText: () =>
          dedent`\
          \`\`\`bash send --terminal=bash
          code1
          \`\`\`

          \`\`\`python run --terminal=python
          code2
          \`\`\`

          \`\`\`javascript
          code3
          \`\`\`
          `,
        positionAt: (index: number) => new vscode.Position(0, index),
      };

      const result = parser.findActionableFencedCodeBlock(mockDocument as any);
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe("code1");
      expect(result[0].annotation.type).toEqual("bash");
      expect(result[0].annotation.action?.type).toEqual(ActionType.Send);
      expect(result[0].annotation.action?.params.terminal).toEqual("bash");
    });

    it("should parse form parameters within code blocks", () => {
      const mockDocument = {
        getText: () =>
          dedent`\
          \`\`\`bash run
          # @param Value1
          # @param Value2 ["Option1", "Option2"]
          echo "Hello World"
          \`\`\`
          `,
        positionAt: (index: number) => new vscode.Position(0, index),
      };

      const result = parser.findFencedCodeBlock(mockDocument as any);

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe(
        '# @param Value1\n# @param Value2 ["Option1", "Option2"]\necho "Hello World"'
      );
      expect(result[0].form).toEqual([
        { name: "Value1", type: FormItemType.String },
        {
          name: "Value2",
          options: ["Option1", "Option2"],
          type: FormItemType.Select,
        },
      ]);
    });
  });
});
