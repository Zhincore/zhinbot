export class Schedule {
  private timeout?: NodeJS.Timeout;
  private interval?: NodeJS.Timeout;
  private destroyed = false;

  constructor(
    public executor: () => unknown | Promise<unknown>,
    readonly start: Date | number,
    readonly repeat?: number,
  ) {
    this.timeout = setTimeout(async () => {
      this.timeout = undefined;
      if (this.destroyed) return;

      if (repeat) this.interval = setInterval(executor, repeat);

      await executor();
    }, +start - Date.now());
  }

  destroy() {
    this.destroyed = true;
    if (this.timeout) clearTimeout(this.timeout);
    if (this.interval) clearInterval(this.interval);
  }
}
