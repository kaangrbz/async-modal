/**
 * Async Modal System
 * Promise-based modal system that returns user selection
 * @module async-modal
 */

import './async-modal.css';
import { getLocale } from '../locales';
import type { AsyncModalOptions, ShowOptions, ModalResult, ModalConfig } from './types';
import type { LocaleData } from '../locales';

declare global {
  interface Window {
    asyncModal?: AsyncModal;
  }
}

/**
 * AsyncModal class for creating and managing async modals
 * @class AsyncModal
 */
class AsyncModal {
    currentModal: HTMLElement | null = null;
    currentTimeout: ReturnType<typeof setTimeout> | null = null;
    currentInterval: ReturnType<typeof setInterval> | null = null;
    remainingSeconds = 0;
    currentResolve: ((action: ModalResult) => void) | null = null;
    soundPath: string | null = null;
    currentLanguage!: string;
    locales!: Record<string, LocaleData>;
    theme!: string;
    defaultTimeout: number | null = null;

    /**
     * Creates an instance of AsyncModal
     * @constructor
     */
    constructor(options: AsyncModalOptions = {}) {
        this.currentModal = null;
        this.currentTimeout = null;
        this.currentInterval = null;
        this.remainingSeconds = 0;
        this.currentResolve = null;
        this.soundPath = null; // Configurable sound file path
        this.currentLanguage = options.language || 'en';
        this.locales = {}; // Loaded locale data (from build-time getLocale)
        // Theme: 'dark' | 'light' | 'auto' (default: 'light')
        this.theme = options.theme || 'light';
        // Global default timeout (null means no timeout)
        const t = options.timeout;
        this.defaultTimeout = t !== undefined ? (t != null && t > 0 ? t : null) : null;

        this.locales['en'] = getLocale('en');
        this.locales[this.currentLanguage] = getLocale(this.currentLanguage);

        // Inject CSS automatically if in browser environment
        if (typeof document !== 'undefined') {
            this._injectCSS();
        }
    }

    /**
     * Detects if dark theme should be used based on system preference
     * @returns {boolean} - True if dark theme should be used
     * @private
     */
    _detectDarkTheme() {
        if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') {
            return false;
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    /**
     * Resolves theme value to actual theme ('dark' or 'light')
     * If theme is 'auto', detects system preference
     * @param {string} theme - Theme value ('dark', 'light', or 'auto')
     * @returns {string} - Resolved theme ('dark' or 'light')
     * @private
     */
    _resolveTheme(theme: string): 'dark' | 'light' {
        if (theme === 'auto') {
            return this._detectDarkTheme() ? 'dark' : 'light';
        }
        return (theme as 'dark' | 'light') || 'light';
    }

    /**
     * Sets the global theme preference
     * @param {string} theme - Theme value: 'dark', 'light', or 'auto'
     */
    setTheme(theme: 'dark' | 'light' | 'auto') {
        if (theme !== 'dark' && theme !== 'light' && theme !== 'auto') {
            throw new Error("Theme must be 'dark', 'light', or 'auto'");
        }
        this.theme = theme;
    }

    /**
     * Gets the current global theme preference
     * @returns {string} - Current theme: 'dark', 'light', or 'auto'
     */
    getTheme(): 'dark' | 'light' | 'auto' {
        return this.theme as 'dark' | 'light' | 'auto';
    }

    /**
     * Sets the global default timeout for all modals
     * @param {number} seconds - Timeout duration in seconds (0 or null to disable)
     */
    setTimeout(seconds: number) {
        this.defaultTimeout = seconds > 0 ? seconds : null;
    }

    /**
     * Configure sound file path
     * @param {string} path - Path to the sound file
     */
    setSoundPath(path: string) {
        this.soundPath = path;
    }

    /**
     * Loads locale data for a specific language (from built-in locales, no fetch).
     * @param {string} lang - Language code (e.g., 'en', 'tr', 'es')
     * @returns {Promise<Object>} - Locale data
     * @private
     */
    loadLocale(lang: string): Promise<LocaleData> {
        this.locales[lang] = getLocale(lang);
        return Promise.resolve(this.locales[lang] || this.locales['en']);
    }

    /**
     * Sets the current language and loads locale data
     * @param {string} lang - Language code (e.g., 'en', 'tr', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'zh', 'ko', 'ar', 'hi')
     * @returns {Promise<void>}
     */
    async setLanguage(lang: string): Promise<void> {
        this.currentLanguage = lang;
        await this.loadLocale(lang);
    }

    /**
     * Gets a localized string
     * @param {string} key - Key path (e.g., 'buttons.continue', 'titles.confirmation')
     * @param {string} [lang] - Language code (optional, uses current language if not provided)
     * @returns {string} - Localized string
     * @private
     */
    t(key: string, lang: string | null = null): string {
        const locale = this.locales[lang || this.currentLanguage] || this.locales['en'] || {};
        const keys = key.split('.');
        let value: unknown = locale;

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = (value as Record<string, unknown>)[k];
            } else {
                const enLocale = this.locales['en'] || {};
                let enValue: unknown = enLocale;
                for (const enK of keys) {
                    if (enValue && typeof enValue === 'object' && enK in enValue) {
                        enValue = (enValue as Record<string, unknown>)[enK];
                    } else {
                        return key;
                    }
                }
                return typeof enValue === 'string' ? enValue : key;
            }
        }

        return typeof value === 'string' ? value : key;
    }

    /**
     * Shows an async modal and waits for user selection
     * @param {Object} options - Modal options
     * @param {string} [options.title='Confirmation Required'] - Modal title
     * @param {string} [options.message='Are you sure you want to proceed?'] - Modal message
     * @param {boolean} [options.showCancel=true] - Show cancel button
     * @param {boolean} [options.showContinue=true] - Show continue button
     * @param {boolean} [options.showSettings=false] - Show settings button
     * @param {boolean} [options.showHelp=false] - Show help button
     * @param {boolean} [options.showDanger=false] - Show danger button
     * @param {boolean} [options.disabled=false] - Disable all buttons initially
     * @param {boolean} [options.requireConfirmation=true] - Require confirmation checkbox
     * @param {string} [options.confirmationText='I confirm that I accept responsibility for this action'] - Confirmation text
     * @param {string} [options.icon='question'] - Icon type (warning, danger, info, success, question)
     * @param {string} [options.confirmButtonText='Continue'] - Confirm button text
     * @param {string} [options.cancelButtonText='Cancel'] - Cancel button text
     * @param {boolean} [options.playSound=false] - Play notification sound (default: false)
     * @param {number} [options.timeout] - Timeout duration in seconds (0 or undefined to disable, overrides global timeout)
     * @param {boolean} [options.autoDismissTimeout] - @deprecated Use `timeout` instead. Will be removed in a future version.
     * @param {number} [options.autoDismissTimeoutSeconds] - @deprecated Use `timeout` instead. Will be removed in a future version.
     * @param {string} [options.soundPath] - Custom sound file path (overrides default)
     * @param {string} [options.language] - Language code (overrides global language for this modal - highest priority)
     * @param {string} [options.theme] - Theme for this modal: 'dark', 'light', or 'auto' (overrides global theme setting)
     * @param {boolean} [options.darkTheme] - @deprecated Use `theme: 'dark' | 'light'` instead. Will be removed in a future version.
     * @returns {Promise<string>} - User's selection ('continue', 'cancel', 'settings', 'help', 'danger')
     */
    async show(options: ShowOptions = {}): Promise<ModalResult> {
        // Language priority: 1. options.language (function parameter - highest priority)
        //                    2. this.currentLanguage (set via setLanguage() or constructor)
        //                    3. 'en' (default fallback)
        const modalLanguage = options.language || this.currentLanguage;
        
        // Load language if specified and different from current (but don't change global language)
        if (options.language && options.language !== this.currentLanguage) {
            // Load the locale for this modal, but don't change global currentLanguage
            await this.loadLocale(options.language);
        }
        
        return new Promise<ModalResult>((resolve) => {
            // Store resolve function
            this.currentResolve = resolve;
            
            // Resolve theme: priority: options.theme > options.darkTheme (deprecated) > this.theme > 'light'
            let themeSetting = options.theme;
            if (!themeSetting && options.darkTheme !== undefined) {
                // Backward compatibility: convert boolean darkTheme to theme
                themeSetting = options.darkTheme ? 'dark' : 'light';
            }
            if (!themeSetting) {
                themeSetting = this.theme as 'dark' | 'light' | 'auto';
            }
            const modalTheme = this._resolveTheme(themeSetting ?? 'light');
            
            // Resolve timeout: priority: options.timeout > options.autoDismissTimeout (deprecated) > this.defaultTimeout
            let timeout = options.timeout !== undefined ? options.timeout : null;
            if (timeout === null && options.autoDismissTimeout) {
                // Backward compatibility: use deprecated parameters
                timeout = options.autoDismissTimeoutSeconds || 15;
            }
            if (timeout === null) {
                timeout = this.defaultTimeout;
            }
            const autoDismissTimeout = timeout !== null && timeout > 0;
            const autoDismissTimeoutSeconds = timeout || 15;
            
            // Default options with localization
            // Use modalLanguage for translations (respects function parameter priority)
            const config: ModalConfig = {
                title: options.title || this.t('defaults.title', modalLanguage),
                message: options.message || this.t('defaults.message', modalLanguage),
                showCancel: options.showCancel !== undefined ? options.showCancel : true,
                showContinue: options.showContinue !== undefined ? options.showContinue : true,
                showSettings: options.showSettings !== undefined ? options.showSettings : false,
                showHelp: options.showHelp !== undefined ? options.showHelp : false,
                showDanger: options.showDanger !== undefined ? options.showDanger : false,
                disabled: options.disabled !== undefined ? options.disabled : false,
                requireConfirmation: options.requireConfirmation !== undefined ? options.requireConfirmation : true,
                confirmationText: options.confirmationText || this.t('defaults.confirmationText', modalLanguage),
                icon: options.icon || 'question',
                confirmButtonText: options.confirmButtonText || this.t('buttons.continue', modalLanguage),
                cancelButtonText: options.cancelButtonText || this.t('buttons.cancel', modalLanguage),
                playSound: options.playSound !== undefined ? options.playSound : false,
                autoDismissTimeout: autoDismissTimeout,
                autoDismissTimeoutSeconds: autoDismissTimeoutSeconds,
                soundPath: options.soundPath || this.soundPath,
                language: modalLanguage,
                ...options,
                // Override theme with resolved theme (after spread to ensure it's not overridden)
                theme: modalTheme
            };

            // Validate document is available
            if (typeof document === 'undefined') {
                throw new Error('AsyncModal requires a DOM environment');
            }

            // Create modal HTML
            const modalHtml = this.createModalHtml(config);
            
            // Add modal to DOM
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Store modal reference
            this.currentModal = document.querySelector('.async-modal-overlay');
            
            if (!this.currentModal) {
                throw new Error('Failed to create modal element');
            }

            // Play notification sound
            if (config.playSound) {
                this.playSound(config.soundPath);
            }
            
            // If confirmation is required, disable buttons initially and setup checkbox listener
            if (config.requireConfirmation) {
                this.disableActionButtons();
                // Setup checkbox event listener after DOM is ready
                setTimeout(() => {
                    this.setupConfirmationCheckbox();
                }, 100);
            }
            
            // If disabled is true, disable all buttons
            if (config.disabled) {
                this.disableAllButtons();
            }
            
            // Start auto dismiss timeout if enabled
            if (config.autoDismissTimeout) {
                this.remainingSeconds = config.autoDismissTimeoutSeconds;
                // Start timeout after DOM is ready
                setTimeout(() => {
                    this.startAutoDismissTimeout(config.autoDismissTimeoutSeconds, config.cancelButtonText);
                }, 100);
            }
        });
    }

    /**
     * Creates modal HTML
     * @param {Object} config - Modal configuration
     * @returns {string} - Modal HTML
     * @private
     */
    createModalHtml(config: ModalConfig): string {
        let buttonsHtml = '';

        // Cancel button
        if (config.showCancel) {
            buttonsHtml += `
                <button class="async-modal-btn async-modal-btn-cancel" data-action="cancel" aria-label="${config.cancelButtonText}">
                    ${this.getButtonIconSVG('times')} ${this.escapeHtml(config.cancelButtonText)}
                </button>
            `;
        }

        // Continue button
        if (config.showContinue) {
            buttonsHtml += `
                <button class="async-modal-btn async-modal-btn-continue" data-action="continue" id="continueBtn" ${config.requireConfirmation ? 'disabled' : ''} aria-label="${config.confirmButtonText}">
                    ${this.getButtonIconSVG('check')} <span id="continueText">${this.escapeHtml(config.confirmButtonText)}</span>
                </button>
            `;
        }

        // Settings button
        if (config.showSettings) {
            const settingsText = this.t('buttons.settings', config.language);
            buttonsHtml += `
                <button class="async-modal-btn async-modal-btn-settings" data-action="settings" aria-label="${this.escapeHtml(settingsText)}">
                    ${this.getButtonIconSVG('cog')} ${this.escapeHtml(settingsText)}
                </button>
            `;
        }

        // Help button
        if (config.showHelp) {
            const helpText = this.t('buttons.help', config.language);
            buttonsHtml += `
                <button class="async-modal-btn async-modal-btn-help" data-action="help" aria-label="${this.escapeHtml(helpText)}">
                    ${this.getButtonIconSVG('question-circle')} ${this.escapeHtml(helpText)}
                </button>
            `;
        }

        // Danger button
        if (config.showDanger) {
            buttonsHtml += `
                <button class="async-modal-btn async-modal-btn-danger" data-action="danger" aria-label="${config.confirmButtonText}">
                    ${this.getButtonIconSVG('exclamation-triangle')} ${this.escapeHtml(config.confirmButtonText)}
                </button>
            `;
        }

        // Determine theme class from resolved theme
        // Light theme için 'light-theme' class'ı eklenmeli ki @media (prefers-color-scheme: dark) kuralı devreye girmesin
        let themeClass = '';
        if (config.theme === 'dark') {
            themeClass = 'dark-theme';
        } else if (config.theme === 'light') {
            themeClass = 'light-theme';
        }
        // 'auto' durumunda themeClass boş kalır, sistem temasına göre davranır
        
        return `
            <div class="async-modal-overlay ${themeClass}" role="dialog" aria-modal="true" aria-labelledby="async-modal-title">
                <div class="async-modal ${themeClass}">
                    <div class="async-modal-header">
                        <h3 class="async-modal-title" id="async-modal-title">
                            <div class="async-modal-icon async-modal-icon-${this.escapeHtml(config.icon)}" aria-hidden="true">
                                ${this.getIconHtml(config.icon)}
                            </div>
                            ${this.escapeHtml(config.title)}
                        </h3>
                    </div>
                    <div class="async-modal-body">
                        <div class="async-modal-message">${this.escapeHtml(config.message)}</div>
                        ${config.requireConfirmation ? `
                            <div class="async-modal-confirmation">
                                <label class="async-modal-checkbox-label">
                                    <input type="checkbox" id="confirmationCheckbox" class="async-modal-checkbox" aria-label="Confirmation checkbox">
                                    <span class="async-modal-checkbox-text">${this.escapeHtml(config.confirmationText)}</span>
                                </label>
                            </div>
                        ` : ''}
                        <div class="async-modal-buttons">
                            ${buttonsHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Escapes HTML to prevent XSS attacks
     * @param {string} text - Text to escape
     * @returns {string} - Escaped text
     * @private
     */
    escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Returns SVG icon for buttons
     * @param {string} iconName - Icon name (times, check, cog, question-circle, exclamation-triangle)
     * @returns {string} - SVG icon HTML
     * @private
     */
    getButtonIconSVG(iconName: string): string {
        const icons = {
            'times': '<svg width="14" height="14" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true"><path d="M324.5 411.1c6.2 6.2 16.4 6.2 22.6 0s6.2-16.4 0-22.6L214.6 256 347.1 123.5c6.2-6.2 6.2-16.4 0-22.6s-16.4-6.2-22.6 0L192 233.4 59.5 100.9c-6.2-6.2-16.4-6.2-22.6 0s-6.2 16.4 0 22.6L169.4 256 36.9 388.5c-6.2 6.2-6.2 16.4 0 22.6s16.4 6.2 22.6 0L192 278.6 324.5 411.1z"/></svg>',
            'check': '<svg width="14" height="14" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true"><path d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"/></svg>',
            'cog': '<svg width="14" height="14" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M495.9 166.6c3.2 8.7 .5 18.4-6.4 24.6l-43.3 39.4c1.1 8.3 1.7 16.8 1.7 25.4s-.6 17.1-1.7 25.4l43.3 39.4c6.9 6.2 9.6 15.9 6.4 24.6c-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2c-5.9 7.2-15.7 9.6-24.5 6.8l-55.7-17.7c-13.4 10.3-28.2 18.9-44 25.4l-12.5 57.1c-2 9.1-9 16.3-18.2 17.8c-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-12.5-57.1c-15.8-6.5-30.6-15.1-44-25.4L83.1 425.9c-8.8 2.8-18.6 .3-24.5-6.8c-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3c-3.2-8.7-.5-18.4 6.4-24.6l43.3-39.4C64.6 273.1 64 264.6 64 256s.6-17.1 1.7-25.4L22.4 191.2c-6.9-6.2-9.6-15.9-6.4-24.6c4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2c5.9-7.2 15.7-9.6 24.5-6.8l55.7 17.7c13.4-10.3 28.2-18.9 44-25.4l12.5-57.1c2-9.1 9-16.3 18.2-17.8C227.3 1.2 241.5 0 256 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l12.5 57.1c15.8 6.5 30.6 15.1 44 25.4l55.7-17.7c8.8-2.8 18.6-.3 24.5 6.8c8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM256 336a80 80 0 1 0 0-160 80 80 0 1 0 0 160z"/></svg>',
            'question-circle': '<svg width="14" height="14" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM169.8 165.3c7.9-22.3 29.1-37.3 52.8-37.3h58.3c34.9 0 63.1 28.3 63.1 63.1c0 22.6-12.1 43.5-31.7 54.8L280 264.4c-.2 13-10 23.6-23 23.6c-12.6 0-23-10.2-23-23.2l0-11.2c0-15.3 8.7-29.2 22.4-35.9l47.2-25.4c5.1-2.7 8.1-8.1 8.1-13.9c0-8.4-6.8-15.1-15.1-15.1H222.6c-3.4 0-6.4 2.1-7.5 5.3l-.4 1.2c-4.4 12.5-18.2 19-30.6 14.6s-19-18.2-14.6-30.6l.4-1.2zM224 352a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z"/></svg>',
            'exclamation-triangle': '<svg width="14" height="14" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M256 32c14.2 0 27.3 7.5 34.5 19.8l216 368c7.3 12.4 7.3 27.7 .2 40.1S486.3 480 472 480H40c-14.3 0-27.6-7.7-34.7-20.1s-7-27.8 .2-40.1l216-368C228.7 39.5 241.8 32 256 32zm0 128c-13.3 0-24 10.7-24 24V296c0 13.3 10.7 24 24 24s24-10.7 24-24V184c0-13.3-10.7-24-24-24zm32 224a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z"/></svg>'
        };
        return (icons as Record<string, string>)[iconName] || icons['question-circle'];
    }

    /**
     * Returns icon HTML (SVG format)
     * @param {string} iconType - Icon type
     * @returns {string} - Icon HTML
     * @private
     */
    getIconHtml(iconType: string): string {
        const icons = {
            warning: '<svg width="20" height="20" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M256 32c14.2 0 27.3 7.5 34.5 19.8l216 368c7.3 12.4 7.3 27.7 .2 40.1S486.3 480 472 480H40c-14.3 0-27.6-7.7-34.7-20.1s-7-27.8 .2-40.1l216-368C228.7 39.5 241.8 32 256 32zm0 128c-13.3 0-24 10.7-24 24V296c0 13.3 10.7 24 24 24s24-10.7 24-24V184c0-13.3-10.7-24-24-24zm32 224a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z"/></svg>',
            danger: '<svg width="20" height="20" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM175 175c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z"/></svg>',
            info: '<svg width="20" height="20" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 336h24V272H216c-13.3 0-24-10.7-24-24s10.7-24 24-24h48c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24H216c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-208a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"/></svg>',
            success: '<svg width="20" height="20" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"/></svg>',
            question: '<svg width="20" height="20" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM169.8 165.3c7.9-22.3 29.1-37.3 52.8-37.3h58.3c34.9 0 63.1 28.3 63.1 63.1c0 22.6-12.1 43.5-31.7 54.8L280 264.4c-.2 13-10 23.6-23 23.6c-12.6 0-23-10.2-23-23.2l0-11.2c0-15.3 8.7-29.2 22.4-35.9l47.2-25.4c5.1-2.7 8.1-8.1 8.1-13.9c0-8.4-6.8-15.1-15.1-15.1H222.6c-3.4 0-6.4 2.1-7.5 5.3l-.4 1.2c-4.4 12.5-18.2 19-30.6 14.6s-19-18.2-14.6-30.6l.4-1.2zM224 352a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z"/></svg>'
        };
        return (icons as Record<string, string>)[iconType] || icons.question;
    }

    /**
     * Sets up confirmation checkbox event listener
     * @private
     */
    setupConfirmationCheckbox() {
        const checkbox = document.getElementById('confirmationCheckbox');
        if (!checkbox) return;
        
        checkbox.addEventListener('change', (e: Event) => {
            const el = e.target as HTMLInputElement;
            this.toggleActionButtons(!!el?.checked);
        });
    }

    /**
     * Disables all buttons
     * @private
     */
    disableAllButtons() {
        const buttons = document.querySelectorAll<HTMLButtonElement>('.async-modal-btn');
        buttons.forEach((button) => {
            button.disabled = true;
            button.style.opacity = '0.6';
            button.style.cursor = 'not-allowed';
            button.style.pointerEvents = 'none';
        });
    }

    /**
     * Enables all buttons
     * @private
     */
    enableAllButtons() {
        const buttons = document.querySelectorAll<HTMLButtonElement>('.async-modal-btn');
        buttons.forEach((button) => {
            button.disabled = false;
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            button.style.pointerEvents = 'auto';
        });
    }

    /**
     * Disables only the Continue button, other buttons remain active
     * @private
     */
    disableActionButtons() {
        const continueButton = document.querySelector<HTMLButtonElement>('.async-modal-btn-continue');
        if (continueButton) {
            continueButton.disabled = true;
            continueButton.style.opacity = '0.6';
            continueButton.style.cursor = 'not-allowed';
            continueButton.style.pointerEvents = 'none';
        }
        
        const otherButtons = document.querySelectorAll<HTMLButtonElement>('.async-modal-btn-settings, .async-modal-btn-help, .async-modal-btn-danger');
        otherButtons.forEach((button) => {
            button.disabled = false;
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            button.style.pointerEvents = 'auto';
        });
    }

    toggleActionButtons(enabled: boolean): void {
        const continueButton = document.querySelector<HTMLButtonElement>('.async-modal-btn-continue');
        if (continueButton) {
            continueButton.disabled = !enabled;
            continueButton.style.opacity = enabled ? '1' : '0.6';
            continueButton.style.cursor = enabled ? 'pointer' : 'not-allowed';
            continueButton.style.pointerEvents = enabled ? 'auto' : 'none';
        }
        
        const otherButtons = document.querySelectorAll<HTMLButtonElement>('.async-modal-btn-settings, .async-modal-btn-help, .async-modal-btn-danger');
        otherButtons.forEach((button) => {
            button.disabled = false;
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            button.style.pointerEvents = 'auto';
        });
    }

    /**
     * Starts auto dismiss timeout
     * @param {number} timeoutSeconds - Timeout duration in seconds
     * @param {string} cancelButtonText - Cancel button text
     * @private
     */
    startAutoDismissTimeout(timeoutSeconds: number, cancelButtonText: string): void {
        // Clear previous timeout and interval
        this.clearAutoDismissTimeout();
        
        const cancelButton = document.querySelector<HTMLElement>('.async-modal-btn-cancel');
        if (cancelButton) {
            cancelButton.setAttribute('data-original-text', cancelButtonText);
            this.updateCancelButtonText(cancelButton, cancelButtonText, this.remainingSeconds);
        }
        
        // Update countdown every second
        this.currentInterval = setInterval(() => {
            this.remainingSeconds--;
            
            if (this.remainingSeconds > 0) {
                const cancelButton = document.querySelector<HTMLElement>('.async-modal-btn-cancel');
                if (cancelButton) {
                    const originalText = cancelButton.getAttribute('data-original-text') || cancelButtonText;
                    this.updateCancelButtonText(cancelButton, originalText, this.remainingSeconds);
                }
            } else {
                // Time expired, close modal
                this.clearAutoDismissTimeout();
                this.close('cancel');
            }
        }, 1000);
        
        // Start timeout
        this.currentTimeout = setTimeout(() => {
            this.clearAutoDismissTimeout();
            this.close('cancel');
        }, timeoutSeconds * 1000);
    }
    
    /**
     * Updates cancel button text
     * @param {HTMLElement} button - Cancel button element
     * @param {string} originalText - Original button text
     * @param {number} seconds - Remaining seconds
     * @private
     */
    updateCancelButtonText(button: HTMLElement, originalText: string, seconds: number): void {
        const icon = button.querySelector('svg');
        const iconHtml = icon ? icon.outerHTML : this.getButtonIconSVG('times');
        const secondsText = this.t('timeout.seconds');
        button.innerHTML = `${iconHtml} ${this.escapeHtml(originalText)} (${seconds} ${secondsText})`;
    }
    
    /**
     * Clears auto dismiss timeout and interval
     * @private
     */
    clearAutoDismissTimeout() {
        if (this.currentTimeout) {
            clearTimeout(this.currentTimeout);
            this.currentTimeout = null;
        }
        if (this.currentInterval) {
            clearInterval(this.currentInterval);
            this.currentInterval = null;
        }
    }

    /**
     * Plays notification sound
     * @param {string} [customPath] - Custom sound file path
     * @private
     */
    playSound(customPath: string | null = null): void {
        try {
            // Use custom path, instance path, or default path
            let soundPath = customPath || this.soundPath;
            
            // If no custom path, try to resolve from package location
            if (!soundPath) {
                // Try relative path first (works in most cases)
                soundPath = './sound/notification_tone.wav';
                
                // If running from npm package, try node_modules path
                // This will be resolved by the browser relative to the HTML file location
                // Users can also copy the sound file to their public directory or set custom path
            }
            
            const audio = new Audio(soundPath);
            audio.volume = 0.8;
            const playPromise = audio.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(() => {
                    // Silently continue if sound cannot be played
                    // In production, errors are handled gracefully
                });
            }
        } catch (error) {
            // Silently continue if sound cannot be created
            // In production, errors are handled gracefully
        }
    }

    /**
     * Closes modal and returns result
     * @param {string} action - User's selection
     */
    close(action: ModalResult): void {
        // Clear timeout and interval
        this.clearAutoDismissTimeout();
        
        if (this.currentModal) {
            this.currentModal.remove();
            this.currentModal = null;
        }
        
        // Resolve promise
        if (this.currentResolve) {
            this.currentResolve(action);
            this.currentResolve = null;
        }
    }

    /**
     * Injects CSS automatically if not already loaded
     * @private
     */
    _injectCSS() {
        // Check if CSS is already loaded
        if (document.querySelector('link[data-async-modal-css]')) {
            return;
        }
        
        // Get CSS path
        const cssPath = this._getCSSPath();
        
        // Create and inject link tag
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = cssPath;
        link.setAttribute('data-async-modal-css', 'true');
        document.head.appendChild(link);
    }

    /**
     * Determines the CSS file path intelligently
     * @returns {string} - CSS file path
     * @private
     */
    _getCSSPath(): string {
        // 1. Try to find from script tag
        if (typeof document !== 'undefined') {
            const scripts = document.getElementsByTagName('script');
            for (let script of scripts) {
                if (script.src && (script.src.includes('async-modal.js') || script.src.includes('async-modal.ts') || script.src.includes('async-modal'))) {
                    const basePath = script.src.substring(0, script.src.lastIndexOf('/'));
                    // Try async-modal.css in the same directory
                    return `${basePath}/async-modal.css`;
                }
            }
        }
        
        // 2. Try NPM package paths
        const possiblePaths = [
            './node_modules/async-modal/src/async-modal.css',
            '../node_modules/async-modal/src/async-modal.css',
            '../../node_modules/async-modal/src/async-modal.css',
            'node_modules/async-modal/src/async-modal.css'
        ];
        
        // 3. CDN fallback (as last resort)
        return 'https://cdn.jsdelivr.net/npm/async-modal@latest/src/async-modal.css';
    }

    /**
     * Shows modal for working time violation
     * @param {Object} [options={}] - Additional options
     * @param {string} [options.language] - Language code (overrides global language for this modal)
     * @returns {Promise<string>} - User's selection
     */
    async showWorkingTimeViolation(options: ShowOptions = {}): Promise<ModalResult> {
        const lang = options.language || this.currentLanguage;
        return this.show({
            title: options.title || this.t('titles.workingTimeViolation', lang),
            message: options.message || this.t('messages.workingTimeViolation', lang),
            showCancel: options.showCancel !== undefined ? options.showCancel : true,
            showContinue: options.showContinue !== undefined ? options.showContinue : true,
            showSettings: options.showSettings !== undefined ? options.showSettings : true,
            showHelp: options.showHelp !== undefined ? options.showHelp : true,
            icon: options.icon || 'warning',
            ...options
        });
    }

    /**
     * Shows modal for dangerous action
     * @param {string|Object} [messageOrOptions] - Custom message (string) or options object
     * @param {string} [messageOrOptions.message] - Custom message (uses localized default if not provided)
     * @param {string} [messageOrOptions.language] - Language code (overrides global language for this modal)
     * @returns {Promise<string>} - User's selection
     */
    async showDangerousAction(messageOrOptions?: string | ShowOptions): Promise<ModalResult> {
        // Support both string message and options object
        const options = typeof messageOrOptions === 'string' 
            ? { message: messageOrOptions } 
            : (messageOrOptions || {});
        const lang = options.language || this.currentLanguage;
        
        return this.show({
            title: this.t('titles.dangerous', lang),
            message: options.message || this.t('messages.deleteConfirm', lang),
            showCancel: true,
            showDanger: true,
            showHelp: true,
            icon: 'danger',
            language: lang,
            ...options
        });
    }

    /**
     * Shows confirmation modal
     * @param {string|Object} [messageOrOptions] - Confirmation message (string) or options object
     * @param {string} [messageOrOptions.message] - Confirmation message (uses localized default if not provided)
     * @param {string} [messageOrOptions.language] - Language code (overrides global language for this modal)
     * @returns {Promise<string>} - User's selection
     */
    async showConfirmation(messageOrOptions?: string | ShowOptions): Promise<ModalResult> {
        // Support both string message and options object
        const options = typeof messageOrOptions === 'string' 
            ? { message: messageOrOptions } 
            : (messageOrOptions || {});
        const lang = options.language || this.currentLanguage;
        
        return this.show({
            title: this.t('titles.confirmation', lang),
            message: options.message || this.t('defaults.message', lang),
            showCancel: true,
            showContinue: true,
            icon: 'question',
            language: lang,
            ...options
        });
    }

    /**
     * Shows modal requiring responsibility confirmation
     * @param {string} [message] - Modal message (uses localized default if not provided)
     * @param {string} [confirmationText] - Confirmation text (uses localized default if not provided)
     * @param {Object} [options={}] - Additional options
     * @param {string} [options.language] - Language code (overrides global language for this modal)
     * @returns {Promise<string>} - User's selection
     */
    async showConfirmationWithResponsibility(message?: string, confirmationText?: string, options: ShowOptions = {}): Promise<ModalResult> {
        const lang = options.language || this.currentLanguage;
        return this.show({
            title: this.t('titles.responsibility', lang),
            message: message || this.t('messages.criticalAction', lang),
            showCancel: true,
            showContinue: true,
            requireConfirmation: true,
            confirmationText: confirmationText || this.t('defaults.confirmationText', lang),
            icon: 'warning',
            language: lang,
            ...options
        });
    }
}

// Create global instance (only in browser environment)
if (typeof window !== 'undefined') {
    window.asyncModal = new AsyncModal();
}

// Setup modal button event listeners (only in browser environment)
if (typeof document !== 'undefined') {
    document.addEventListener('click', (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const button = target?.closest?.('.async-modal-btn') as HTMLElement | null;
        if (button) {
            const action = button.getAttribute('data-action') as ModalResult | null;
            if (!action) return;

            // Clear timeout and interval (user clicked button)
            if (window.asyncModal && window.asyncModal.currentModal) {
                window.asyncModal.clearAutoDismissTimeout();

                // Restore cancel button original text
                const cancelButton = document.querySelector('.async-modal-btn-cancel');
                if (cancelButton && cancelButton.hasAttribute('data-original-text')) {
                    const originalText = cancelButton.getAttribute('data-original-text');
                    const icon = cancelButton.querySelector('svg');
                    const iconHtml = icon ? icon.outerHTML : window.asyncModal!.getButtonIconSVG('times');
                    cancelButton.innerHTML = `${iconHtml} ${originalText}`;
                    cancelButton.removeAttribute('data-original-text');
                }

                // Close modal and return result
                window.asyncModal.close(action);
            }
        }
    });
}

export default AsyncModal;
export { AsyncModal };
export type { ModalResult, AsyncModalOptions, ShowOptions } from './types';

