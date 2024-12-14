import { PathUtils } from "../src/pathutils";
import * as os from "os";

describe("PathUtils", () => {
  let pathUtils: PathUtils;

  beforeEach(() => {
    pathUtils = new PathUtils();
  });

  describe("resolve", () => {
    it("should resolve '~' to the home directory", () => {
      const homeDir = os.homedir();
      const result = pathUtils.resolve("/xxx/xxx", "~/sdf");
      expect(result).toBe(`${homeDir}/sdf`);
    });

    it("should resolve '.' to the base directory", () => {
      const result = pathUtils.resolve("/xxx/xxx", ".");
      expect(result).toBe("/xxx/xxx");
    });

    it("should resolve relative paths correctly", () => {
      const result = pathUtils.resolve("/xxx/xxx", "subdir/file.txt");
      expect(result).toBe("/xxx/xxx/subdir/file.txt");
    });

    it("should return the relative path if it is absolute", () => {
      const result = pathUtils.resolve("/xxx/xxx", "/absolute/path");
      expect(result).toBe("/absolute/path");
    });
  });
});
