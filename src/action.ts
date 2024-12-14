const DEFAULT_TERMINAL = "Runbook.md";

export enum ActionType {
  Send,
  Run,
}

export interface ActionParams {
  terminal?: string;
  askConfirm?: boolean;
  cwd?: string;
}

export interface Action {
  type: ActionType;
  params: ActionParams;
}

export class ActionAccessor {
  data: Action;
  constructor(action: Action) {
    this.data = action;
  }

  getTerminal(): string {
    return this.data.params.terminal ?? DEFAULT_TERMINAL;
  }
}

export function accessAction(action: Action): ActionAccessor {
  return new ActionAccessor(action);
}
