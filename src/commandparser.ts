/**
 * Token type classification
 */
export type TokenType = "command" | "argument" | "option" | "option_argument";

/**
 * Quote type enumeration
 */
export enum QuoteType {
  SingleQuote = "'",
  // eslint-disable-next-line quotes
  DoubleQuote = '"',
}

/**
 * Token interface representing a parsed command token
 */
export interface Token {
  type: TokenType;
  offset: number;
  length: number;
  value: string;
  option_name?: string;
}

/**
 * Internal interface for raw tokens during tokenization phase
 * Used to track position information before semantic analysis
 */
interface RawToken {
  value: string;
  offset: number;
  length: number;
  hasQuotes: boolean;
  quoteType: QuoteType | null;
}

/**
 * Internal interface for processed tokens after quote handling
 * Used to track tokens with quotes stripped but original positions preserved
 */
interface ProcessedToken {
  value: string;
  offset: number;
  length: number;
  originalLength: number;
}

import { parseArgs } from "util";

/**
 * CommandParser class for parsing command strings into tokens
 */
export class CommandParser {
  /**
   * Parses a command string into an array of tokens
   *
   * @param input - The command string to parse
   * @returns Array of tokens with type, offset, length, value, and optional option_name
   */
  parse(input: string): Token[] {
    // Step 1: Strip comments
    const inputWithoutComments = this.stripComments(input);

    // Step 2: Tokenize input to get raw tokens with position information
    const rawTokens = this.tokenizeInput(inputWithoutComments);

    if (rawTokens.length === 0) {
      return [];
    }

    // Step 3: Process tokens - split equals syntax and strip quotes
    const processedTokens: Array<{
      value: string;
      offset: number;
      length: number;
    }> = [];

    for (const rawToken of rawTokens) {
      // Split tokens with equals signs (e.g., --option=value)
      const splitTokens = this.splitEqualsSyntax(rawToken);

      for (const splitToken of splitTokens) {
        // Process quotes - strip quotes but preserve position info
        const processed = this.processQuotes(splitToken);
        processedTokens.push({
          value: processed.value,
          offset: processed.offset,
          length: processed.length,
        });
      }
    }

    // Step 4: Extract token values for util.parseArgs
    const tokenValues = processedTokens.map((t) => t.value);

    // Step 5: Use util.parseArgs for semantic analysis
    const parseResult = this.parseArgsIntegration(tokenValues);

    // Step 6: Merge position information with semantic information
    // Convert processedTokens to RawToken format for mergeUtilParseResult
    const tokensForMerging: RawToken[] = processedTokens.map((t) => ({
      value: t.value,
      offset: t.offset,
      length: t.length,
      hasQuotes: false,
      quoteType: null,
    }));

    const result = this.mergeUtilParseResult(tokensForMerging, parseResult);

    return result;
  }

  /**
   * Tokenizes input string into raw tokens with position information.
   * Splits by whitespace while preserving accurate offset and length.
   * Handles quoted strings as single tokens (quotes included).
   *
   * @param input - The input string to tokenize
   * @returns Array of raw tokens with value, offset, length, and quote information
   */
  private tokenizeInput(input: string): RawToken[] {
    const tokens: RawToken[] = [];
    let currentToken = "";
    let tokenStart = -1;
    let inDoubleQuotes = false;
    let inSingleQuotes = false;
    let quoteType: QuoteType | null = null;

    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      const isWhitespace =
        char === " " || char === "\t" || char === "\n" || char === "\r";

      // Handle quote toggling
      if (char === QuoteType.DoubleQuote && !inSingleQuotes) {
        if (!inDoubleQuotes) {
          // Starting a double-quoted string
          inDoubleQuotes = true;
          quoteType = QuoteType.DoubleQuote;
          if (tokenStart === -1) {
            tokenStart = i;
          }
          currentToken += char;
        } else {
          // Ending a double-quoted string
          inDoubleQuotes = false;
          currentToken += char;
          // Token is complete
          if (currentToken) {
            tokens.push({
              value: currentToken,
              offset: tokenStart,
              length: currentToken.length,
              hasQuotes: true,
              quoteType: quoteType,
            });
            currentToken = "";
            tokenStart = -1;
            quoteType = null;
          }
        }
        continue;
      }

      if (char === QuoteType.SingleQuote && !inDoubleQuotes) {
        if (!inSingleQuotes) {
          // Starting a single-quoted string
          inSingleQuotes = true;
          quoteType = QuoteType.SingleQuote;
          if (tokenStart === -1) {
            tokenStart = i;
          }
          currentToken += char;
        } else {
          // Ending a single-quoted string
          inSingleQuotes = false;
          currentToken += char;
          // Token is complete
          if (currentToken) {
            tokens.push({
              value: currentToken,
              offset: tokenStart,
              length: currentToken.length,
              hasQuotes: true,
              quoteType: quoteType,
            });
            currentToken = "";
            tokenStart = -1;
            quoteType = null;
          }
        }
        continue;
      }

      // Handle whitespace outside of quotes
      if (isWhitespace && !inDoubleQuotes && !inSingleQuotes) {
        if (currentToken) {
          // Complete the current token
          tokens.push({
            value: currentToken,
            offset: tokenStart,
            length: currentToken.length,
            hasQuotes: false,
            quoteType: null,
          });
          currentToken = "";
          tokenStart = -1;
        }
        // Skip whitespace
        continue;
      }

      // Start tracking token position if this is the first character
      if (tokenStart === -1) {
        tokenStart = i;
      }

      // Add character to current token
      currentToken += char;
    }

    // Handle any remaining token
    if (currentToken) {
      tokens.push({
        value: currentToken,
        offset: tokenStart,
        length: currentToken.length,
        hasQuotes: inDoubleQuotes || inSingleQuotes,
        quoteType: quoteType,
      });
    }

    return tokens;
  }

  /**
   * Splits a token containing an equals sign into two separate tokens.
   * For example, "--option=value" becomes ["--option", "value"].
   * If no equals sign is found, returns the original token as a single-element array.
   *
   * @param token - The raw token to potentially split
   * @returns Array of raw tokens (one or two tokens)
   */
  private splitEqualsSyntax(token: RawToken): RawToken[] {
    const equalsIndex = token.value.indexOf("=");

    // If no equals sign found, return original token
    if (equalsIndex === -1) {
      return [token];
    }

    // Split at the first equals sign
    const optionPart = token.value.substring(0, equalsIndex);
    const valuePart = token.value.substring(equalsIndex + 1);

    // Calculate offsets
    const optionToken: RawToken = {
      value: optionPart,
      offset: token.offset,
      length: optionPart.length,
      hasQuotes: false,
      quoteType: null,
    };

    const valueToken: RawToken = {
      value: valuePart,
      offset: token.offset + optionPart.length + 1, // +1 for the equals sign
      length: valuePart.length,
      hasQuotes: false,
      quoteType: null,
    };

    return [optionToken, valueToken];
  }

  /**
   * Integrates Node.js util.parseArgs to understand semantic structure of tokens.
   * This phase identifies which tokens are options vs arguments and establishes option-value relationships.
   *
   * @param tokenValues - Array of token values (strings) to parse
   * @returns The result from util.parseArgs containing values, positionals, and tokens
   */
  private parseArgsIntegration(
    tokenValues: string[]
  ): ReturnType<typeof parseArgs> {
    // Filter out empty tokens
    // Note: "--" is handled specially by util.parseArgs - it marks the end of options
    // We keep it in the array so util.parseArgs can process it correctly
    const filteredTokens = tokenValues.filter(
      (token) => token.length > 0 || token === "--"
    );

    // Configure parseArgs to allow positionals and return tokens
    const result = parseArgs({
      args: filteredTokens,
      allowPositionals: true,
      tokens: true,
      strict: false,
    });

    // Post-process to identify option-value relationships from tokens
    // util.parseArgs without option definitions treats unknown options as boolean flags
    // We need to use the tokens array to identify option-value pairs
    if (result.tokens) {
      const processedValues: { [key: string]: string | boolean | string[] } =
        {};
      const processedPositionals: string[] = [];
      let afterDoubleDash = false;

      for (let i = 0; i < result.tokens.length; i++) {
        const token = result.tokens[i];

        if (token.kind === "option-terminator") {
          // "--" marks the end of options
          afterDoubleDash = true;
          continue;
        }

        if (afterDoubleDash) {
          // Everything after "--" is a positional
          if (token.value) {
            processedPositionals.push(token.value);
          }
          continue;
        }

        if (token.kind === "option") {
          const tokenValue = token.value || "";
          const optionName =
            token.name || this.extractOptionName(tokenValue) || "";
          if (optionName) {
            // Check if next token is a value (not an option)
            const nextToken = result.tokens[i + 1];
            if (
              nextToken &&
              nextToken.kind === "positional" &&
              nextToken.value &&
              !nextToken.value.startsWith("-")
            ) {
              // This option has a value
              processedValues[optionName] = nextToken.value;
              i++; // Skip the next token as we've consumed it
            } else {
              // This is a boolean flag
              processedValues[optionName] = true;
            }
          }
        } else if (token.kind === "positional" && token.value) {
          processedPositionals.push(token.value);
        }
      }

      // Update result with processed values and positionals
      return {
        ...result,
        values: processedValues,
        positionals: processedPositionals,
      };
    }

    return result;
  }

  /**
   * Merges position information from raw tokens with semantic information
   * from util.parseArgs to produce final tokens with correct types.
   *
   * @param rawTokens - Array of raw tokens with position information (processed values)
   * @param parseResult - Result from parseArgsIntegration with semantic information
   * @returns Array of classified tokens with type, offset, length, value, and option_name
   */
  private mergeUtilParseResult(
    rawTokens: RawToken[],
    parseResult: ReturnType<typeof parseArgs>
  ): Token[] {
    const result: Token[] = [];
    let positionalIndex = 0;

    // Create maps for quick lookup
    const optionValueMap: { [key: string]: string } = {};
    const optionNameMap: { [key: string]: string } = {}; // Map option value to option name
    for (const [key, value] of Object.entries(parseResult.values)) {
      if (typeof value === "string") {
        optionValueMap[key] = value;
        optionNameMap[value] = key; // Track which option this value belongs to
      }
    }

    // Track which raw tokens have been used
    const usedIndices = new Set<number>();

    // First, process positionals
    for (const positional of parseResult.positionals) {
      const rawTokenIndex = rawTokens.findIndex(
        (rt, idx) => !usedIndices.has(idx) && rt.value === positional
      );

      if (rawTokenIndex !== -1) {
        usedIndices.add(rawTokenIndex);
        const rawToken = rawTokens[rawTokenIndex];

        // Classify: first positional is command, rest are arguments
        const tokenType: TokenType =
          positionalIndex === 0 ? "command" : "argument";

        result.push({
          type: tokenType,
          offset: rawToken.offset,
          length: rawToken.length,
          value: rawToken.value,
        });

        positionalIndex++;
      }
    }

    // Then, process options and their values
    for (const [optionName, optionValue] of Object.entries(
      parseResult.values
    )) {
      // Try to find the option token (could be --option or -o format)
      let optionTokenIndex = rawTokens.findIndex(
        (rt, idx) =>
          !usedIndices.has(idx) &&
          (rt.value === `--${optionName}` || rt.value === `-${optionName}`)
      );

      if (optionTokenIndex === -1) {
        // Try alternative formats
        optionTokenIndex = rawTokens.findIndex(
          (rt, idx) =>
            !usedIndices.has(idx) &&
            this.extractOptionName(rt.value) === optionName
        );
      }

      if (optionTokenIndex !== -1) {
        usedIndices.add(optionTokenIndex);
        const optionToken = rawTokens[optionTokenIndex];

        result.push({
          type: "option",
          offset: optionToken.offset,
          length: optionToken.length,
          value: optionToken.value,
          option_name: optionName,
        });

        // If this option has a string value, find and classify the value token
        if (typeof optionValue === "string") {
          const valueTokenIndex = rawTokens.findIndex(
            (rt, idx) => !usedIndices.has(idx) && rt.value === optionValue
          );

          if (valueTokenIndex !== -1) {
            usedIndices.add(valueTokenIndex);
            const valueToken = rawTokens[valueTokenIndex];

            result.push({
              type: "option_argument",
              offset: valueToken.offset,
              length: valueToken.length,
              value: valueToken.value,
              option_name: optionName,
            });
          }
        }
        // If optionValue is true, it's a boolean flag (no option_argument)
      }
    }

    return result;
  }

  /**
   * Extracts the option name from an option token.
   * Supports both long (--option) and short (-o) option formats.
   * Returns null if the input is not an option.
   *
   * @param optionValue - The option string (e.g., "--terminal", "-t")
   * @returns The extracted option name without dashes, or null if not an option
   */
  private extractOptionName(optionValue: string): string | null {
    if (!optionValue || optionValue.length === 0) {
      return null;
    }

    // Long option format: --option
    if (optionValue.startsWith("--")) {
      const name = optionValue.substring(2);
      // Return null if it's just "--" with no name
      if (name.length === 0) {
        return null;
      }
      return name;
    }

    // Short option format: -o
    if (optionValue.startsWith("-") && optionValue.length > 1) {
      const name = optionValue.substring(1);
      // Return null if it's just "-" with no name
      if (name.length === 0) {
        return null;
      }
      return name;
    }

    // Not an option (no leading dash)
    return null;
  }

  /**
   * Processes quotes in a raw token, stripping them from the value
   * while preserving the original offset and length information.
   * Supports both single and double quotes.
   *
   * @param token - The raw token to process
   * @returns A processed token with quotes stripped and original position preserved
   */
  private processQuotes(token: RawToken): ProcessedToken {
    // If token has no quotes, return as-is with originalLength set to length
    if (!token.hasQuotes || !token.quoteType) {
      return {
        value: token.value,
        offset: token.offset,
        length: token.length,
        originalLength: token.length,
      };
    }

    const quoteChar = token.quoteType;
    let strippedValue = token.value;
    let newLength = token.length;

    // Convert enum to character string for comparison
    const quoteCharStr =
      quoteChar === QuoteType.SingleQuote
        ? QuoteType.SingleQuote
        : QuoteType.DoubleQuote;

    // Check if value starts with the quote character
    if (strippedValue.startsWith(quoteCharStr)) {
      strippedValue = strippedValue.substring(1);
      newLength -= 1;
    }

    // Check if value ends with the quote character (and has at least one character)
    if (strippedValue.endsWith(quoteCharStr) && strippedValue.length > 0) {
      strippedValue = strippedValue.substring(0, strippedValue.length - 1);
      newLength -= 1;
    }

    return {
      value: strippedValue,
      offset: token.offset,
      length: newLength,
      originalLength: token.length,
    };
  }

  /**
   * Strips comments from input string.
   * Comments start with # and cause the rest of the input to be ignored,
   * but only when the # is outside of quoted strings.
   * Supports both single and double quotes.
   *
   * @param input - The input string to process
   * @returns The input string with comments removed
   */
  private stripComments(input: string): string {
    if (input.length === 0) {
      return input;
    }

    let inDoubleQuotes = false;
    let inSingleQuotes = false;
    let result = "";

    for (let i = 0; i < input.length; i++) {
      const char = input[i];

      // Handle quote toggling (only if not escaped, but we're not handling escapes per requirements)
      if (char === QuoteType.DoubleQuote && !inSingleQuotes) {
        inDoubleQuotes = !inDoubleQuotes;
        result += char;
        continue;
      }

      if (char === QuoteType.SingleQuote && !inDoubleQuotes) {
        inSingleQuotes = !inSingleQuotes;
        result += char;
        continue;
      }

      // If we encounter # outside of quotes, truncate here
      if (char === "#" && !inDoubleQuotes && !inSingleQuotes) {
        // Return everything up to (but not including) the #
        return result;
      }

      // Otherwise, append the character
      result += char;
    }

    return result;
  }
}
