export class UnlockAiMessage {
  public constructor(private readonly password: string) {
    if (password.length < 12) throw new Error('The master password must contain at least 12 characters.');
  }
  public getPassword(): string { return this.password; }
}
