export class HashTable<K extends { toString(): string }, V> {
  public data: Array<Array<[K, V[]]>>
  private size: number

  constructor(length: number) {
    this.data = new Array(length)
    this.size = 0
  }

  hash(key: K): number {
    const keyString = key.toString()

    let hash = 0
    for (let i = 0; i < keyString.length; i++) {
      hash += keyString.charCodeAt(i)
    }
    return hash % this.data.length
  }

  set(key: K, value: V): void {
    const hash = this.hash(key)

    if (!this.data[hash]) {
      this.data[hash] = []
      this.data[hash].push([key, [value]])
    } else {
      for (let i = 0; i < this.data[hash].length; i++) {
        if (JSON.stringify(this.data[hash][i][0]) === JSON.stringify(key)) {
          this.data[hash][i][1].push(value)
          return
        }
      }
      this.data[hash].push([key, [value]])
    }

    this.size++
  }
}
