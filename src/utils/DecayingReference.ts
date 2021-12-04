export class DecayingReference<T> {
  private timeout?: NodeJS.Timeout;

  constructor(private readonly reference: T, private readonly deleteSelf: () => void, private readonly delay: number) {
    this.getReference();
  }

  destroy() {
    if (this.timeout) clearTimeout(this.timeout);
  }

  getReference() {
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = setTimeout(this.deleteSelf, this.delay).unref();
    return this.reference;
  }
}
