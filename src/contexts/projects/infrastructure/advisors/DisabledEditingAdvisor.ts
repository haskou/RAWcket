import type {
  EditingAdvisor,
  EditingContext,
  EditProposal
} from '../../application/ports/EditingAdvisor';

export class EditingAdvisorDisabledError extends Error {
  public constructor() {
    super('AI is not configured. RAWcket remains fully usable without it.');
    this.name = 'EditingAdvisorDisabledError';
  }
}

export class DisabledEditingAdvisor implements EditingAdvisor {
  public propose(_context: EditingContext): Promise<EditProposal> {
    void _context;
    return Promise.reject(new EditingAdvisorDisabledError());
  }
}
