import type { EditOperation } from '../../domain/EditOperation';

export type EditingContext = {
  projectName: string;
  intent: string;
  currentAdjustments: Record<string, number>;
};

export type EditProposal = {
  explanation: string;
  operations: EditOperation[];
};

export interface EditingAdvisor {
  propose(context: EditingContext): Promise<EditProposal>;
}
