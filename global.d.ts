// Global typing for the Electron preload API exposed as window.desktop
export {};

declare global {
  interface Window {
    desktop?: {
      platform: string;
      version: string;
      getAlwaysOnTop: () => Promise<boolean>;
      setAlwaysOnTop: (enabled: boolean) => Promise<boolean>;
      toggleAlwaysOnTop: () => Promise<boolean>;
    };
  }
}



