type Handler<E> = (event: E) => void

/** アプリ内でイベントを同期的に配送する。 */
export class EventBus<E extends { type: string }> {
  private readonly handlers = new Map<E['type'], Handler<E>[]>()

  subscribe<T extends E['type']>(type: T, handler: Handler<Extract<E, { type: T }>>): () => void {
    const list = this.handlers.get(type) ?? []
    list.push(handler as Handler<E>)
    this.handlers.set(type, list)
    return () => {
      this.handlers.set(
        type,
        (this.handlers.get(type) ?? []).filter((h) => h !== handler),
      )
    }
  }

  publish(event: E): void {
    for (const handler of this.handlers.get(event.type as E['type']) ?? []) handler(event)
  }
}
