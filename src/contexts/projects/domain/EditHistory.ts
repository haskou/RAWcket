import type { EditOperation } from './EditOperation';

export type EditHistoryEntryPrimitives = {
  operation: EditOperation;
  inverse: EditOperation;
};

export type EditHistoryPrimitives = {
  limit: number;
  undo: EditHistoryEntryPrimitives[];
  redo: EditHistoryEntryPrimitives[];
};

export class EditHistory {
  public constructor(
    private readonly limit: number,
    private undoEntries: EditHistoryEntryPrimitives[] = [],
    private redoEntries: EditHistoryEntryPrimitives[] = []
  ) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000) {
      throw new Error('The history limit must be between 1 and 1000.');
    }
  }

  public static fromPrimitives(input: EditHistoryPrimitives): EditHistory {
    return new EditHistory(input.limit, structuredClone(input.undo), structuredClone(input.redo));
  }

  public record(operation: EditOperation, inverse: EditOperation): void {
    const previous = this.undoEntries.at(-1);
    const isContinuousGroup = operation.groupId !== null && previous?.operation.groupId === operation.groupId;
    if (isContinuousGroup) {
      this.undoEntries = [...this.undoEntries.slice(0, -1), { operation, inverse: previous.inverse }];
    } else {
      this.undoEntries = [...this.undoEntries, { operation, inverse }].slice(-this.limit);
    }
    this.redoEntries = [];
  }

  public takeUndo(): EditOperation | null {
    const entry = this.undoEntries.at(-1);
    if (entry === undefined) return null;
    this.undoEntries = this.undoEntries.slice(0, -1);
    this.redoEntries = [...this.redoEntries, entry];
    return structuredClone(entry.inverse);
  }

  public takeRedo(): EditOperation | null {
    const entry = this.redoEntries.at(-1);
    if (entry === undefined) return null;
    this.redoEntries = this.redoEntries.slice(0, -1);
    this.undoEntries = [...this.undoEntries, entry].slice(-this.limit);
    return structuredClone(entry.operation);
  }

  public canUndo(): boolean {
    return this.undoEntries.length > 0;
  }

  public canRedo(): boolean {
    return this.redoEntries.length > 0;
  }

  public toPrimitives(): EditHistoryPrimitives {
    return structuredClone({ limit: this.limit, undo: this.undoEntries, redo: this.redoEntries });
  }
}
