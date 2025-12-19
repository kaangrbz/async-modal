/**
 * Async Modal System
 * Promise-based modal system that returns user selection
 * @module async-modal
 */

/**
 * AsyncModal class for creating and managing async modals
 * @class AsyncModal
 */
class AsyncModal {
    /**
     * Creates an instance of AsyncModal
     * @constructor
     */
    constructor(options = {}) {
        this.currentModal = null;
        this.currentTimeout = null;
        this.currentInterval = null;
        this.remainingSeconds = 0;
        this.currentResolve = null;
        this.soundPath = null; // Configurable sound file path
        this.currentLanguage = options.language || 'en';
        this.locales = {}; // Loaded locale data
        this.darkTheme = options.darkTheme !== undefined ? options.darkTheme : this._detectDarkTheme();
        
        // Determine locale path dynamically
        if (options.localePath) {
            this.localePath = options.localePath;
        } else {
            // Try to detect the correct path based on script location
            if (typeof document !== 'undefined') {
                const scripts = document.getElementsByTagName('script');
                let scriptPath = './locales'; // Default fallback
                
                // Find the asyncModal.js script
                for (let i = 0; i < scripts.length; i++) {
                    const src = scripts[i].src;
                    if (src && src.includes('asyncModal.js')) {
                        // Extract directory path
                        const scriptDir = src.substring(0, src.lastIndexOf('/'));
                        scriptPath = scriptDir + '/locales';
                        break;
                    }
                }
                
                // If script is in src/, locales should be at ../locales
                // If script is in examples/, locales should be at ../locales
                // Try common paths
                this.localePath = scriptPath;
            } else {
                this.localePath = './locales';
            }
        }
        
        // Initialize with default English locale
        this._initDefaultLocale();
        // Load locale asynchronously if not English
        if (this.currentLanguage !== 'en') {
            this.loadLocale(this.currentLanguage).catch(() => {
                // Silently fall back to English if loading fails
            });
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
     * Initializes default English locale synchronously
     * @private
     */
    _initDefaultLocale() {
        this.locales['en'] = {
            defaults: {
                title: "Confirmation Required",
                message: "Are you sure you want to proceed?",
                confirmationText: "I confirm that I accept responsibility for this action"
            },
            buttons: {
                continue: "Continue",
                cancel: "Cancel",
                settings: "Go to Settings",
                help: "Help",
                yes: "Yes",
                no: "No",
                ok: "OK",
                close: "Close"
            },
            titles: {
                confirmation: "Confirmation Required",
                dangerous: "Dangerous Action",
                warning: "Warning",
                info: "Information",
                success: "Success",
                error: "Error",
                workingTimeViolation: "Outside Working Hours",
                responsibility: "Responsibility Confirmation Required"
            },
            messages: {
                workingTimeViolation: "You are currently outside working hours. Are you sure you want to proceed?",
                deleteConfirm: "This will permanently delete this item. This action cannot be undone.",
                saveConfirm: "Do you want to save your changes?",
                unsavedChanges: "You have unsaved changes. Do you want to save them before leaving?",
                sessionExpiring: "Your session will expire soon.",
                criticalAction: "This is a critical action that requires confirmation."
            },
            timeout: {
                seconds: "sec",
                expired: "Time expired"
            }
        };
    }

    /**
     * Configure sound file path
     * @param {string} path - Path to the sound file
     */
    setSoundPath(path) {
        this.soundPath = path;
    }

    /**
     * Loads locale data for a specific language
     * @param {string} lang - Language code (e.g., 'en', 'tr', 'es')
     * @returns {Promise<Object>} - Locale data
     * @private
     */
    async loadLocale(lang) {
        try {
            // Try to load locale file
            if (typeof fetch !== 'undefined') {
                // Try multiple possible paths
                const possiblePaths = [
                    `${this.localePath}/${lang}.json`,
                    `../locales/${lang}.json`,
                    `./locales/${lang}.json`,
                    `locales/${lang}.json`
                ];
                
                for (const path of possiblePaths) {
                    try {
                        const response = await fetch(path);
                        if (response.ok) {
                            this.locales[lang] = await response.json();
                            // Update localePath to the working path
                            this.localePath = path.substring(0, path.lastIndexOf('/'));
                            return this.locales[lang];
                        }
                    } catch (e) {
                        // Try next path
                        continue;
                    }
                }
            }
        } catch (error) {
            // Silently fall back to English if locale loading fails
        }
        
        // Ensure English locale is initialized
        if (!this.locales['en']) {
            this._initDefaultLocale();
        }
        
        return this.locales[lang] || this.locales['en'];
    }

    /**
     * Sets the current language and loads locale data
     * @param {string} lang - Language code (e.g., 'en', 'tr', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'zh', 'ko', 'ar', 'hi')
     * @returns {Promise<void>}
     */
    async setLanguage(lang) {
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
    t(key, lang = null) {
        const locale = this.locales[lang || this.currentLanguage] || this.locales['en'] || {};
        const keys = key.split('.');
        let value = locale;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                // Fallback to English
                const enLocale = this.locales['en'] || {};
                let enValue = enLocale;
                for (const enK of keys) {
                    if (enValue && typeof enValue === 'object' && enK in enValue) {
                        enValue = enValue[enK];
                    } else {
                        return key; // Return key if not found
                    }
                }
                return enValue || key;
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
     * @param {boolean} [options.autoDismissTimeout=false] - Enable auto dismiss/cancel timeout (default: false)
     * @param {number} [options.autoDismissTimeoutSeconds=15] - Timeout duration in seconds (default: 15)
     * @param {string} [options.soundPath] - Custom sound file path (overrides default)
     * @param {string} [options.language] - Language code (overrides global language for this modal - highest priority)
     * @param {boolean} [options.darkTheme] - Use dark theme for this modal (overrides global dark theme setting)
     * @returns {Promise<string>} - User's selection ('continue', 'cancel', 'settings', 'help', 'danger')
     */
    async show(options = {}) {
        // Language priority: 1. options.language (function parameter - highest priority)
        //                    2. this.currentLanguage (set via setLanguage() or constructor)
        //                    3. 'en' (default fallback)
        const modalLanguage = options.language || this.currentLanguage;
        
        // Load language if specified and different from current (but don't change global language)
        if (options.language && options.language !== this.currentLanguage) {
            // Load the locale for this modal, but don't change global currentLanguage
            await this.loadLocale(options.language);
        }
        
        return new Promise((resolve) => {
            // Store resolve function
            this.currentResolve = resolve;
            
            // Default options with localization
            // Use modalLanguage for translations (respects function parameter priority)
            const config = {
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
                autoDismissTimeout: options.autoDismissTimeout !== undefined ? options.autoDismissTimeout : false,
                autoDismissTimeoutSeconds: options.autoDismissTimeoutSeconds || 15,
                soundPath: options.soundPath || this.soundPath,
                language: modalLanguage,
                darkTheme: options.darkTheme !== undefined ? options.darkTheme : this.darkTheme,
                ...options
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
    createModalHtml(config) {
        let buttonsHtml = '';

        // Cancel button
        if (config.showCancel) {
            buttonsHtml += `
                <button class="async-modal-btn async-modal-btn-cancel" data-action="cancel" aria-label="${config.cancelButtonText}">
                    <i class="fas fa-times" aria-hidden="true"></i> ${this.escapeHtml(config.cancelButtonText)}
                </button>
            `;
        }

        // Continue button
        if (config.showContinue) {
            buttonsHtml += `
                <button class="async-modal-btn async-modal-btn-continue" data-action="continue" id="continueBtn" ${config.requireConfirmation ? 'disabled' : ''} aria-label="${config.confirmButtonText}">
                    <i class="fas fa-check" aria-hidden="true"></i> <span id="continueText">${this.escapeHtml(config.confirmButtonText)}</span>
                </button>
            `;
        }

        // Settings button
        if (config.showSettings) {
            const settingsText = this.t('buttons.settings', config.language);
            buttonsHtml += `
                <button class="async-modal-btn async-modal-btn-settings" data-action="settings" aria-label="${this.escapeHtml(settingsText)}">
                    <i class="fas fa-cog" aria-hidden="true"></i> ${this.escapeHtml(settingsText)}
                </button>
            `;
        }

        // Help button
        if (config.showHelp) {
            const helpText = this.t('buttons.help', config.language);
            buttonsHtml += `
                <button class="async-modal-btn async-modal-btn-help" data-action="help" aria-label="${this.escapeHtml(helpText)}">
                    <i class="fas fa-question-circle" aria-hidden="true"></i> ${this.escapeHtml(helpText)}
                </button>
            `;
        }

        // Danger button
        if (config.showDanger) {
            buttonsHtml += `
                <button class="async-modal-btn async-modal-btn-danger" data-action="danger" aria-label="${config.confirmButtonText}">
                    <i class="fas fa-exclamation-triangle" aria-hidden="true"></i> ${this.escapeHtml(config.confirmButtonText)}
                </button>
            `;
        }

        // Determine theme class
        const themeClass = config.darkTheme !== undefined 
            ? (config.darkTheme ? 'dark-theme' : 'light-theme')
            : (this.darkTheme ? 'dark-theme' : '');
        
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
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Returns icon HTML
     * @param {string} iconType - Icon type
     * @returns {string} - Icon HTML
     * @private
     */
    getIconHtml(iconType) {
        const icons = {
            warning: '<i class="fas fa-exclamation-triangle"></i>',
            danger: '<i class="fas fa-times-circle"></i>',
            info: '<i class="fas fa-info-circle"></i>',
            success: '<i class="fas fa-check-circle"></i>',
            question: '<i class="fas fa-question-circle"></i>'
        };
        return icons[iconType] || icons.question;
    }

    /**
     * Sets up confirmation checkbox event listener
     * @private
     */
    setupConfirmationCheckbox() {
        const checkbox = document.getElementById('confirmationCheckbox');
        if (!checkbox) return;
        
        checkbox.addEventListener('change', (e) => {
            this.toggleActionButtons(e.target.checked);
        });
    }

    /**
     * Disables all buttons
     * @private
     */
    disableAllButtons() {
        const buttons = document.querySelectorAll('.async-modal-btn');
        buttons.forEach(button => {
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
        const buttons = document.querySelectorAll('.async-modal-btn');
        buttons.forEach(button => {
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
        // Disable only the Continue button
        const continueButton = document.querySelector('.async-modal-btn-continue');
        if (continueButton) {
            continueButton.disabled = true;
            continueButton.style.opacity = '0.6';
            continueButton.style.cursor = 'not-allowed';
            continueButton.style.pointerEvents = 'none';
        }
        
        // Keep other buttons (Settings, Help, Danger) active
        const otherButtons = document.querySelectorAll('.async-modal-btn-settings, .async-modal-btn-help, .async-modal-btn-danger');
        otherButtons.forEach(button => {
            button.disabled = false;
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            button.style.pointerEvents = 'auto';
        });
    }

    /**
     * Toggles Continue button enabled/disabled state, other buttons remain active by default
     * @param {boolean} enabled - Enable Continue button
     * @private
     */
    toggleActionButtons(enabled) {
        // Control only the Continue button
        const continueButton = document.querySelector('.async-modal-btn-continue');
        if (continueButton) {
            continueButton.disabled = !enabled;
            continueButton.style.opacity = enabled ? '1' : '0.6';
            continueButton.style.cursor = enabled ? 'pointer' : 'not-allowed';
            continueButton.style.pointerEvents = enabled ? 'auto' : 'none';
        }
        
        // Keep other buttons (Settings, Help, Danger) active by default
        const otherButtons = document.querySelectorAll('.async-modal-btn-settings, .async-modal-btn-help, .async-modal-btn-danger');
        otherButtons.forEach(button => {
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
    startAutoDismissTimeout(timeoutSeconds, cancelButtonText) {
        // Clear previous timeout and interval
        this.clearAutoDismissTimeout();
        
        // Find cancel button and update initial text
        const cancelButton = document.querySelector('.async-modal-btn-cancel');
        if (cancelButton) {
            cancelButton.setAttribute('data-original-text', cancelButtonText);
            this.updateCancelButtonText(cancelButton, cancelButtonText, this.remainingSeconds);
        }
        
        // Update countdown every second
        this.currentInterval = setInterval(() => {
            this.remainingSeconds--;
            
            if (this.remainingSeconds > 0) {
                // Update cancel button text
                const cancelButton = document.querySelector('.async-modal-btn-cancel');
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
    updateCancelButtonText(button, originalText, seconds) {
        const icon = button.querySelector('i');
        const iconHtml = icon ? icon.outerHTML : '';
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
    playSound(customPath = null) {
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
    close(action) {
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
     * Shows modal for working time violation
     * @param {Object} [options={}] - Additional options
     * @param {string} [options.language] - Language code (overrides global language for this modal)
     * @returns {Promise<string>} - User's selection
     */
    async showWorkingTimeViolation(options = {}) {
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
    async showDangerousAction(messageOrOptions) {
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
    async showConfirmation(messageOrOptions) {
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
    async showConfirmationWithResponsibility(message, confirmationText, options = {}) {
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
    document.addEventListener('click', (e) => {
        if (e.target.closest('.async-modal-btn')) {
            const button = e.target.closest('.async-modal-btn');
            const action = button.getAttribute('data-action');
            
            // Clear timeout and interval (user clicked button)
            if (window.asyncModal && window.asyncModal.currentModal) {
                window.asyncModal.clearAutoDismissTimeout();
                
                // Restore cancel button original text
                const cancelButton = document.querySelector('.async-modal-btn-cancel');
                if (cancelButton && cancelButton.hasAttribute('data-original-text')) {
                    const originalText = cancelButton.getAttribute('data-original-text');
                    const icon = cancelButton.querySelector('i');
                    const iconHtml = icon ? icon.outerHTML : '';
                    cancelButton.innerHTML = `${iconHtml} ${originalText}`;
                    cancelButton.removeAttribute('data-original-text');
                }
                
                // Close modal and return result
                window.asyncModal.close(action);
            }
        }
    });
}

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AsyncModal;
    module.exports.default = AsyncModal;
    module.exports.AsyncModal = AsyncModal;
}

// ES module export support
// Note: Direct ES module exports cause syntax errors in regular browser script tags
// For ES module support, use bundlers (webpack, rollup, vite, etc.) or <script type="module">
// Bundlers will automatically convert CommonJS exports to ES modules
// 
// For direct ES module usage, create a separate .mjs file or use a bundler
// 
// This file supports:
// 1. Browser: window.asyncModal (global instance)
// 2. CommonJS: require('async-modal')
// 3. ES modules: Use bundlers or import from a bundled version

