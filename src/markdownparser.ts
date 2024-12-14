import * as vscode from "vscode";
import { Annotation, AnnotationParser } from "./annotationparser";
import { marked } from "marked";
import { FormItem, FormParser } from "./formparser";

const SUPPORTED_LANGUAGES = ["bash"];

type CodeBlockAnnotation = Annotation & {
  startPos: vscode.Position;
  endPos: vscode.Position;
  range: vscode.Range;
};

interface CodeBlock {
  startPos: vscode.Position;
  endPos: vscode.Position;
  range: vscode.Range;
  content: string;
  annotation: CodeBlockAnnotation;
  form: FormItem[];
}

export class MarkdownParser {
  private annotationParser: AnnotationParser;
  private formParser: FormParser;

  constructor() {
    this.annotationParser = new AnnotationParser();
    this.formParser = new FormParser();
  }

  findFencedCodeBlock(document: vscode.TextDocument): CodeBlock[] {
    const text = document.getText();
    const tokens = marked.lexer(text);
    const matched: CodeBlock[] = [];

    let offset = 0;

    tokens.forEach((token) => {
      if (token.type === "code") {
        const startPos = document.positionAt(offset);
        const endPos = document.positionAt(offset + token.raw.length);
        const range = new vscode.Range(startPos, endPos);
        const content = token.text;
        const rawAnnotation: string = token.lang || "";
        const annotation = this.annotationParser.parse(rawAnnotation);

        const annotationStartPos = document.positionAt(offset + "```".length);
        const annotationEndPos = document.positionAt(
          offset + "```".length + rawAnnotation.length
        );
        const annotationRange = new vscode.Range(
          annotationStartPos,
          annotationEndPos
        );

        const form = this.formParser.parse(content);

        matched.push({
          startPos,
          endPos,
          range,
          content,
          annotation: {
            ...annotation,
            startPos: annotationStartPos,
            endPos: annotationEndPos,
            range: annotationRange,
          },
          form,
        });
      }
      offset += token.raw.length;
    });

    return matched;
  }

  findActionableFencedCodeBlock(document: vscode.TextDocument): CodeBlock[] {
    return this.findFencedCodeBlock(document).filter(
      (item) =>
        item.annotation.action != null &&
        SUPPORTED_LANGUAGES.includes(item.annotation.type)
    );
  }

  findAskConfirmFencedCodeBlock(document: vscode.TextDocument): CodeBlock[] {
    return this.findActionableFencedCodeBlock(document).filter(
      (item) => item.annotation.action?.params.askConfirm === true
    );
  }
}
