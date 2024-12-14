export function dedent(text: TemplateStringsArray) {
  const lines = text.join("\n").split("\n");

  const indent = lines.reduce((indent, line) => {
    if (line.length === 0) {
      return indent;
    }
    const currentIndent = line.match(/^\s*/)?.[0] ?? "";
    return indent === undefined || currentIndent.length < indent.length
      ? currentIndent
      : indent;
  });

  return lines.map((line) => line.replace(indent, "")).join("\n");
}
