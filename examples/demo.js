// Set locale path for examples directory
if (window.asyncModal) {
    window.asyncModal.localePath = '../locales';
}

// Toggle code examples
function toggleCode(codeId) {
    const codeContent = document.getElementById(codeId);
    const button = event.target;
    
    if (codeContent.classList.contains('show')) {
        codeContent.classList.remove('show');
        button.textContent = 'Show Code';
    } else {
        codeContent.classList.add('show');
        button.textContent = 'Hide Code';
    }
}

const langNames = {
    en: 'English',
    tr: 'Türkçe',
    es: 'Español',
    fr: 'Français',
    de: 'Deutsch',
    it: 'Italiano',
    pt: 'Português',
    ru: 'Русский',
    ja: '日本語',
    zh: '中文',
    ko: '한국어',
    ar: 'العربية',
    hi: 'हिन्दी'
};

function setDefaultTheme(theme, button) {
    // Set theme only for modals, not for the page
    window.asyncModal.setTheme(theme);
    document.getElementById('currentTheme').textContent = theme;
    
    // Update active button - remove active from all theme buttons
    const settingsPanel = button.closest('.settings-panel');
    if (settingsPanel) {
        const themeGroup = settingsPanel.querySelectorAll('.settings-group')[0];
        if (themeGroup) {
            themeGroup.querySelectorAll('.settings-btn').forEach(btn => {
                btn.classList.remove('active');
            });
        }
    }
    button.classList.add('active');
}

async function setDefaultLanguage(lang, button) {
    await window.asyncModal.setLanguage(lang);
    document.getElementById('currentLanguage').textContent = lang;
    
    // Update active button - remove active from all language buttons
    const settingsPanel = button.closest('.settings-panel');
    if (settingsPanel) {
        const languageGroup = settingsPanel.querySelectorAll('.settings-group')[1];
        if (languageGroup) {
            languageGroup.querySelectorAll('.settings-btn').forEach(btn => {
                btn.classList.remove('active');
            });
        }
    }
    button.classList.add('active');
}

// Initialize current settings display
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('currentTheme').textContent = window.asyncModal.getTheme();
    document.getElementById('currentLanguage').textContent = window.asyncModal.currentLanguage;
    
    // Set active theme button
    const theme = window.asyncModal.getTheme();
    const settingsPanel = document.querySelector('.settings-panel');
    if (settingsPanel) {
        const themeGroup = settingsPanel.querySelectorAll('.settings-group')[0];
        if (themeGroup) {
            themeGroup.querySelectorAll('.settings-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            themeGroup.querySelectorAll('.settings-btn').forEach(btn => {
                if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(`'${theme}'`)) {
                    btn.classList.add('active');
                }
            });
        }
    }
    
    // Set active language button
    const lang = window.asyncModal.currentLanguage;
    if (settingsPanel) {
        const languageGroup = settingsPanel.querySelectorAll('.settings-group')[1];
        if (languageGroup) {
            languageGroup.querySelectorAll('.settings-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            languageGroup.querySelectorAll('.settings-btn').forEach(btn => {
                if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(`'${lang}'`)) {
                    btn.classList.add('active');
                }
            });
        }
    }
});

// BASIC EXAMPLES
async function showSimpleConfirmation() {
    const result = await window.asyncModal.show({
        title: 'Confirm Action',
        message: 'Are you sure you want to proceed?',
        showCancel: true,
        showContinue: true
    });
    document.getElementById('result1').textContent = `Result: ${result}`;
}

async function showCustomMessage() {
    const result = await window.asyncModal.show({
        title: 'Save Changes',
        message: 'You have unsaved changes. Do you want to save them before leaving?',
        showCancel: true,
        showContinue: true,
        icon: 'info'
    });
    document.getElementById('result2').textContent = `Result: ${result}`;
}

async function showWarning() {
    const result = await window.asyncModal.show({
        title: 'Warning',
        message: 'This action may have unintended consequences.',
        icon: 'warning'
    });
    document.getElementById('result3').textContent = `Warning Result: ${result}`;
}

async function showDanger() {
    const result = await window.asyncModal.show({
        title: 'Danger',
        message: 'This is a dangerous operation!',
        icon: 'danger'
    });
    document.getElementById('result3').textContent = `Danger Result: ${result}`;
}

async function showInfo() {
    const result = await window.asyncModal.show({
        title: 'Information',
        message: 'Here is some important information for you.',
        icon: 'info'
    });
    document.getElementById('result3').textContent = `Info Result: ${result}`;
}

async function showSuccess() {
    const result = await window.asyncModal.show({
        title: 'Success',
        message: 'Operation completed successfully!',
        icon: 'success'
    });
    document.getElementById('result3').textContent = `Success Result: ${result}`;
}

async function showConfirmationHelper() {
    const result = await window.asyncModal.showConfirmation(
        'Do you want to save your changes?'
    );
    document.getElementById('result4').textContent = `Confirmation Result: ${result}`;
}

async function showDangerousActionHelper() {
    const result = await window.asyncModal.showDangerousAction(
        'This will permanently delete all data. Are you absolutely sure?'
    );
    document.getElementById('result4').textContent = `Dangerous Action Result: ${result}`;
}

async function showCustomButtons() {
    const result = await window.asyncModal.show({
        title: 'Custom Buttons',
        message: 'This modal has custom button text.',
        showCancel: true,
        showContinue: true,
        confirmButtonText: 'Yes, Proceed',
        cancelButtonText: 'No, Cancel'
    });
    document.getElementById('result5').textContent = `Result: ${result}`;
}

// ADVANCED EXAMPLES
async function showWithCheckbox() {
    const result = await window.asyncModal.show({
        title: 'Delete Account',
        message: 'This will permanently delete your account. This action cannot be undone.',
        showCancel: true,
        showContinue: true,
        requireConfirmation: true,
        confirmationText: 'I understand this action is irreversible and I accept full responsibility',
        icon: 'danger'
    });
    document.getElementById('result6').textContent = `Result: ${result}`;
}

async function showWithTimeout() {
    const result = await window.asyncModal.show({
        title: 'Session Expiring',
        message: 'Your session will expire in 10 seconds. Click Cancel to extend your session.',
        showCancel: true,
        showContinue: false,
        timeout: 10,
        cancelButtonText: 'Extend Session'
    });
    document.getElementById('result7').textContent = `Result: ${result} (auto-closed if timeout expired)`;
}

async function showMultipleButtons() {
    const result = await window.asyncModal.show({
        title: 'Action Required',
        message: 'Please choose an action:',
        showCancel: true,
        showContinue: true,
        showSettings: true,
        showHelp: true,
        showDanger: true,
        icon: 'question'
    });
    
    let message = `Result: ${result}`;
    switch(result) {
        case 'continue':
            message += ' - User chose to continue';
            break;
        case 'settings':
            message += ' - User chose to go to settings';
            break;
        case 'help':
            message += ' - User chose to get help';
            break;
        case 'danger':
            message += ' - User chose the danger action';
            break;
        case 'cancel':
            message += ' - User cancelled';
            break;
    }
    document.getElementById('result8').textContent = message;
}

async function showResponsibility() {
    const result = await window.asyncModal.showConfirmationWithResponsibility(
        'This action may have serious consequences. Please confirm that you understand and accept responsibility.',
        'I confirm that I accept full responsibility for this action and its consequences'
    );
    document.getElementById('result9').textContent = `Result: ${result}`;
}

async function showWorkingTime() {
    const result = await window.asyncModal.showWorkingTimeViolation({
        message: 'You are currently outside working hours. Are you sure you want to proceed?'
    });
    document.getElementById('result10').textContent = `Result: ${result}`;
}

async function showDisabled() {
    const result = await window.asyncModal.show({
        title: 'Processing',
        message: 'Please wait while we process your request...',
        disabled: true,
        showCancel: true,
        showContinue: true
    });
    document.getElementById('result11').textContent = `Result: ${result} (buttons were disabled initially)`;
}

async function showCombined() {
    const result = await window.asyncModal.show({
        title: 'Critical Action',
        message: 'This is a critical action that requires confirmation and will auto-cancel in 15 seconds.',
        showCancel: true,
        showContinue: true,
        showHelp: true,
        requireConfirmation: true,
        confirmationText: 'I understand the risks and accept responsibility',
        timeout: 15,
        icon: 'warning'
    });
    document.getElementById('result12').textContent = `Result: ${result}`;
}

