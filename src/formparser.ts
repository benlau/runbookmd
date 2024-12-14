export interface FormItem {
  name: string;
  options?: string[];
}

export class FormParser {
  parse(text: string): FormItem[] {
    const lines = text.split("\n");

    const items: FormItem[] = [];
    const paramRegex = /^\s*#\s*@param\s+(\w+)(?:\s+(\[.*\]))?/;

    for (const line of lines) {
      const match = line.match(paramRegex);
      if (match) {
        const [, name, optionsStr] = match;
        const item: FormItem = { name };

        if (optionsStr) {
          try {
            item.options = JSON.parse(optionsStr);
          } catch (e) {
            // Ignore invalid JSON
          }
        }

        items.push(item);
      }
    }

    return items;
  }
}
