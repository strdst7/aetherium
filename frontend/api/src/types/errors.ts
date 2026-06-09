export class AetheriumError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'AetheriumError';
  }
}
