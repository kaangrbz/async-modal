/**
 * User's modal selection result.
 */
export type ModalResult = 'continue' | 'cancel' | 'settings' | 'help' | 'danger';

/**
 * Constructor options for AsyncModal.
 */
export interface AsyncModalOptions {
  language?: string;
  theme?: 'dark' | 'light' | 'auto';
  timeout?: number | null;
  soundPath?: string;
}

/**
 * Options for show() and related methods.
 */
export interface ShowOptions {
  title?: string;
  message?: string;
  showCancel?: boolean;
  showContinue?: boolean;
  showSettings?: boolean;
  showHelp?: boolean;
  showDanger?: boolean;
  disabled?: boolean;
  requireConfirmation?: boolean;
  confirmationText?: string;
  icon?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  playSound?: boolean;
  timeout?: number | null;
  /** @deprecated Use `timeout` instead. Will be removed in a future version. */
  autoDismissTimeout?: boolean;
  /** @deprecated Use `timeout` instead. Will be removed in a future version. */
  autoDismissTimeoutSeconds?: number;
  soundPath?: string | null;
  language?: string;
  theme?: 'dark' | 'light' | 'auto';
  /** @deprecated Use `theme: 'dark' | 'light'` instead. Will be removed in a future version. */
  darkTheme?: boolean;
}

/**
 * Internal resolved config passed to createModalHtml.
 */
export interface ModalConfig extends ShowOptions {
  title: string;
  message: string;
  showCancel: boolean;
  showContinue: boolean;
  showSettings: boolean;
  showHelp: boolean;
  showDanger: boolean;
  disabled: boolean;
  requireConfirmation: boolean;
  confirmationText: string;
  icon: string;
  confirmButtonText: string;
  cancelButtonText: string;
  playSound: boolean;
  autoDismissTimeout: boolean;
  autoDismissTimeoutSeconds: number;
  soundPath: string | null;
  language: string;
  theme: 'dark' | 'light';
}
