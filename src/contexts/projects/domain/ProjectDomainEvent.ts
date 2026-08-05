export type ProjectDomainEvent = {
  name: 'PhotoProjectWasCreated' | 'PhotoProjectWasChanged';
  projectId: string;
  occurredAt: number;
};
