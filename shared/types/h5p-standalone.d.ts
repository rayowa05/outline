declare module "h5p-standalone" {
  export interface H5POptions {
    id?: string;
    h5pJsonPath: string;
    contentJsonPath?: string;
    librariesPath?: string;
    frameJs: string;
    frameCss: string;
    embedType?: "div" | "iframe";
    frame?: boolean;
    fullScreen?: boolean;
    reportingIsEnabled?: boolean;
    title?: string;
    [key: string]: unknown;
  }

  export class H5P {
    public constructor(element: HTMLElement, options: H5POptions);
  }

  const H5PStandalone: {
    H5P: typeof H5P;
  };

  export default H5PStandalone;
}

interface Window {
  H5P?: {
    externalDispatcher?: {
      on?: (eventName: string, handler: (event: unknown) => void) => void;
      off?: (eventName: string, handler: (event: unknown) => void) => void;
    };
  };
}
