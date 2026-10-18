export type TransportState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export interface MessageTransport {
  send(message: any): void;
  onMessage(handler: (message: any) => void): () => void;
  readonly ready: Promise<void>;
  readonly state: TransportState;
  onStateChange(handler: (state: TransportState) => void): () => void;
  dispose(): void;
  deliver(message: any): void;
}
