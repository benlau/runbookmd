import * as path from "path";
import * as os from "os";

export class PathUtils {
  basename(filePath: string): string {
    return path.basename(filePath);
  }

  dirname(filePath: string): string {
    return path.dirname(filePath);
  }

  resolve(base: string, relative?: string): string {
    if (relative == null) {
      return base;
    }
    if (relative.startsWith("~")) {
      return path.resolve(os.homedir(), relative.substring(2));
    }
    return path.resolve(base, relative);
  }
}
