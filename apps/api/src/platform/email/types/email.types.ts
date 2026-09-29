export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

/** A way of delivering email. Implementations must never log message bodies. */
export interface EmailTransport {
  send(message: EmailMessage): Promise<void>;
}
