declare interface Window {
  electron: {
    on: (topic: string, callback: (data: any) => void) => void;
    send: (topic: string, data: any) => void;
    argv: string[];
  };
}
