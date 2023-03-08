import { DecayingReference } from "./DecayingReference.js";

export class Cache<T> {
  private readonly map = new Map<string, DecayingReference<T>>();

  constructor(private readonly timeout: number, private readonly maxSize?: number) {}

  get(key: string): T | undefined {
    const entry = this.map.get(key);
    if (!entry) return;
    return entry.getReference();
  }

  set(key: string, reference: T) {
    const previousEntry = this.map.get(key);
    if (previousEntry) previousEntry.destroy();
    else if (this.maxSize) cutMap(this.map, this.maxSize - 1);
    this.map.set(key, new DecayingReference(reference, () => this.map.delete(key), this.timeout));
    return reference;
  }

  has(key: string) {
    return this.map.has(key);
  }
}

function cutMap(map: Map<any, any>, size: number) {
  const iterator = map.keys();
  while (map.size > size) map.delete(iterator.next());
}
