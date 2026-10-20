type Task = { at: number; fn: () => void }

export class SimClock {
  now = 0
  private tasks: Task[] = []

  schedule(delay: number, fn: () => void) {
    this.tasks.push({ at: this.now + delay, fn })
  }

  clear() {
    this.tasks = []
  }

  advance(ms: number) {
    const target = this.now + ms
    while (this.tasks.length) {
      this.tasks.sort((a, b) => a.at - b.at)
      const next = this.tasks[0]!
      if (next.at > target) break
      this.tasks.shift()
      this.now = next.at
      next.fn()
    }
    this.now = target
  }
}
