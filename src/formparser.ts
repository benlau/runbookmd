export enum FormItemType {
  String = "string",
  Password = "password",
  Select = "select",
}

export interface FormItem {
  name: string;
  type: FormItemType;
  options?: string[];
}

export class FormParser {
  // Example format
  // # @param name
  // # @param name [options]
  // # @param name password
  parse(text: string): FormItem[] {
    const lines = text.split("\n");

    const items: FormItem[] = [];
    const paramRegex = /^\s*#\s*@param\s+(\w+)(?:\s+(\[.*\]|\bpassword\b))?/;

    for (const line of lines) {
      const match = line.match(paramRegex);
      if (match) {
        const [, name, typeOrOptions] = match;
        const item: FormItem = { name, type: FormItemType.String };

        if (typeOrOptions) {
          if (typeOrOptions === FormItemType.Password) {
            item.type = FormItemType.Password;
          } else {
            try {
              item.options = JSON.parse(typeOrOptions);
              item.type = FormItemType.Select;
            } catch (e) {
              // Ignore invalid JSON
            }
          }
        }

        items.push(item);
      }
    }

    return items;
  }
}
