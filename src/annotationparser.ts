import { Command as Commander } from "commander";
import { Action, ActionType } from "./action";

export interface Annotation {
  type: string;
  raw: string;
  action?: Action;
}

function unquote(str: any) {
  if (typeof str !== "string") return str;

  if (str.length < 2) return str;
  if (
    /* eslint-disable */
    (str[0] === '"' && str[str.length - 1] === '"') ||
    (str[0] === "'" && str[str.length - 1] === "'")
    /* eslint-enable */
  ) {
    return str.slice(1, -1);
  }
  return str;
}

export function parseCommand(command: string): string[] {
  const tokens: string[] = [];
  let currentToken = "";
  let inQuotes = false;
  let escapeNext = false;

  for (let i = 0; i < command.length; i++) {
    const char = command[i];

    if (escapeNext) {
      currentToken += char;
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      escapeNext = true;
      continue;
    }

    // eslint-disable-next-line
    if (char === '"' && !inQuotes) {
      inQuotes = true;
      currentToken += char;
      continue;
    }

    // eslint-disable-next-line
    if (char === '"' && inQuotes) {
      inQuotes = false;
      currentToken += char;
      continue;
    }

    if (char === " " && !inQuotes) {
      if (currentToken) {
        tokens.push(currentToken);
        currentToken = "";
      }
      continue;
    }

    currentToken += char;
  }

  if (currentToken) {
    tokens.push(currentToken);
  }

  return tokens;
}

export class AnnotationParser {
  constructor() {}

  parse(annotationString: string): Annotation {
    const program = new Commander();

    const noop = () => {};
    program.configureOutput({
      writeOut: noop,
      writeErr: noop,
      outputError: noop,
    });

    program
      .option("-t, --terminal [terminal]", "Specify terminal")
      .option("--ask-confirm", "Request User Confirmation")
      .option("-d, --cwd [cwd]", "Specify current working directory")
      .helpOption(false);

    program.exitOverride();
    program.configureHelp({
      helpWidth: 0,
      sortSubcommands: false,
      sortOptions: false,
    });
    program.showSuggestionAfterError(false);

    program.command("send");

    program.command("run");

    const tokens = parseCommand(annotationString);

    if (tokens.length === 0) {
      return { type: "", raw: annotationString };
    }

    const type = tokens.shift() as string;

    try {
      const parsed = program.parse(tokens, { from: "user" });
      const params = Object.fromEntries(
        Object.entries(parsed.opts()).map(([key, value]) => {
          return [key, unquote(value)];
        })
      );
      const subCommand = parsed.args[0];

      const actionType =
        subCommand === "send" ? ActionType.Send : ActionType.Run;
      const action = {
        type: actionType,
        params,
      };

      return { type, action, raw: annotationString };
    } catch (e) {
      return { type, raw: annotationString };
    }
  }
}
