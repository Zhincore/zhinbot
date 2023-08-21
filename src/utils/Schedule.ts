export class Schedule {
  private timeout?: NodeJS.Timeout;
  private interval?: NodeJS.Timeout;
  private destroyed = false;

  constructor(
    public trigger: () => unknown,
    readonly start: Date | number,
    readonly repeat?: number,
  ) {
    this.timeout = setTimeout(() => {
      this.timeout = undefined;
      if (this.destroyed) return;

      if (repeat) this.interval = setInterval(trigger, repeat).unref();

      trigger();
    }, +start - Date.now()).unref();
  }

  destroy() {
    this.destroyed = true;
    if (this.timeout) clearTimeout(this.timeout);
    if (this.interval) clearInterval(this.interval);
  }
}
