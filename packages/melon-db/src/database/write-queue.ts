/**
 * Serializes write transactions so only one writer runs at a time.
 */
export class WriteQueue {
  private tail: Promise<void> = Promise.resolve();
  private activeWrites = 0;

  get isWriting(): boolean {
    return this.activeWrites > 0;
  }

  run<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.tail.then(() => {
      this.activeWrites += 1;
      return fn().finally(() => {
        this.activeWrites -= 1;
      });
    });
    this.tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}
