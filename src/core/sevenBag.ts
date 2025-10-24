import type { Mino } from './types';

const ALL_MINOS: Mino[] = ['I', 'O', 'T', 'L', 'J', 'S', 'Z'];

function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class SevenBag {
  private bag: Mino[] = [];

  private refill() {
    this.bag = shuffle([...ALL_MINOS]);
  }

  next(): Mino {
    if (this.bag.length === 0) this.refill();
    // 先頭を取り出す。袋を均等に消費
    return this.bag.shift()!;
  }
}
