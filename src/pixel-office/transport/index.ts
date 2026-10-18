import type { MessageTransport, TransportState } from './types.js';

class BrowserLocalTransport implements MessageTransport {
  private messageHandlers = new Set<(message: any) => void>();
  private stateHandlers = new Set<(state: TransportState) => void>();
  public state: TransportState = 'connected';
  public ready = Promise.resolve();

  send(message: any): void {
    if (!message || typeof message !== 'object') return;
    try {
      if (message.type === 'saveAgentSeats' && message.seats) {
        localStorage.setItem('lh_pixel_agent_seats', JSON.stringify(message.seats));
      } else if (message.type === 'saveLayout' && message.layout) {
        localStorage.setItem('lh_pixel_office_layout', JSON.stringify(message.layout));
      }
    } catch (e) {
      console.warn('BrowserLocalTransport storage error:', e);
    }
  }

  onMessage(handler: (message: any) => void): () => void {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  onStateChange(handler: (state: TransportState) => void): () => void {
    this.stateHandlers.add(handler);
    handler(this.state);
    return () => {
      this.stateHandlers.delete(handler);
    };
  }

  deliver(message: any): void {
    for (const handler of this.messageHandlers) {
      try {
        handler(message);
      } catch (err) {
        console.error('Error in transport message handler:', err);
      }
    }
  }

  dispose(): void {
    this.messageHandlers.clear();
    this.stateHandlers.clear();
  }
}

export const transport: MessageTransport = new BrowserLocalTransport();
export type { MessageTransport, TransportState } from './types.js';
