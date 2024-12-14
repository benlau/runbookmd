import { FormParser } from "../src/formparser";

describe("FormParser", () => {
  let parser: FormParser;

  beforeEach(() => {
    parser = new FormParser();
  });

  describe("parse", () => {
    it("should parse single parameter without options", () => {
      const text = "# @param Value1";
      const result = parser.parse(text);
      expect(result).toEqual([{ name: "Value1" }]);
    });

    it("should parse single parameter with options", () => {
      const text = '# @param Value2 ["Option1", "Option2", "Option3"]';
      const result = parser.parse(text);
      expect(result).toEqual([
        { name: "Value2", options: ["Option1", "Option2", "Option3"] },
      ]);
    });

    it("should parse multiple parameters", () => {
      const text = `
        # @param Value1
        # @param Value2 ["Option1", "Option2"]
        echo 123
      `;
      const result = parser.parse(text);
      expect(result).toEqual([
        { name: "Value1" },
        { name: "Value2", options: ["Option1", "Option2"] },
      ]);
    });

    it("should skip lines without parameters", () => {
      const text = `
        Some random text
        # @param Value1
        Another line
        @param Value2
      `;
      const result = parser.parse(text);
      expect(result).toEqual([{ name: "Value1" }]);
    });

    it("should handle invalid JSON in options gracefully", () => {
      const text = '# @param Value1 ["Option1", "Option2"';
      const result = parser.parse(text);
      expect(result).toEqual([{ name: "Value1" }]);
    });

    it("should return an empty array if no parameters are found", () => {
      const text = "No parameters here";
      const result = parser.parse(text);
      expect(result).toEqual([]);
    });
  });
});
