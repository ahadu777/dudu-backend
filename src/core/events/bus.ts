type Handler<T> = (event: T) => Promise<void> | void;

class EventBus {
  private topics = new Map<string, Set<Handler<any>>>();

  publish<T>(topic: string, event: T): void {
    const handlers = this.topics.get(topic);
    if (handlers) {
      handlers.forEach(handler => {
        Promise.resolve(handler(event)).catch(error => {
          console.error(`Error in event handler for topic ${topic}:`, error);
        });
      });
    }
  }

  subscribe<T>(topic: string, handler: Handler<T>): void {
    if (!this.topics.has(topic)) {
      this.topics.set(topic, new Set());
    }
    this.topics.get(topic)!.add(handler);
  }

  unsubscribe<T>(topic: string, handler: Handler<T>): void {
    const handlers = this.topics.get(topic);
    if (handlers) {
      handlers.delete(handler);
    }
  }
}

export const eventBus = new EventBus();
export const publish = eventBus.publish.bind(eventBus);
export const subscribe = eventBus.subscribe.bind(eventBus);