export {}

declare global {
  interface WebSerialPort {
    open(options: { baudRate: number }): Promise<void>
    close(): Promise<void>
  }

  interface Navigator {
    serial?: {
      getPorts(): Promise<WebSerialPort[]>
      requestPort(): Promise<WebSerialPort>
    }
  }
}

