// add transition styles after initial load
window.addEventListener('DOMContentLoaded', () => {
    const slider = document.querySelectorAll('.slider');
    const onOffAudioVolume = document.getElementById('onOffAudioVolume');
    setTimeout(() => {
        slider.forEach((element) => element.classList.add('smooth-transition'));
        onOffAudioVolume.addEventListener('input', () => updateSliderBackground(onOffAudioVolume));
    }, 100);
});

// add quotes to command input
document.querySelectorAll('.command-input').forEach((commandField) => {
    commandField.addEventListener("input", function () {
        let cursorPosition = this.selectionStart;
        let content = this.value.replace(/^"|"$/g, "");
        let newContent = content.length > 0 ? `"${content}"` : content;
        if (this.value.length < newContent.length) {
            cursorPosition++;
        } else if (this.value.length > newContent.length) {
            cursorPosition--;
        }
        this.value = newContent;
        this.setSelectionRange(cursorPosition, cursorPosition);
    });
});

// update slider background
function updateSliderBackground(slider) {
    const value = (slider.value - slider.min) / (slider.max - slider.min) * 100;
    slider.style.backgroundImage = `linear-gradient(to right, #6b7488 ${value}%, #ddd ${value}%)`;
}

// load settings from storage
function loadSettings() {
    chrome.storage.sync.get(['clearMessageKeyword', 'submitMessageKeyword', 'sendMessageOnMicOff', 'onOffAudioFeedback', 'onOffAudioVolume'], (result) => {
        document.getElementById('clearMessageKeyword').value = result.clearMessageKeyword ? `"${result.clearMessageKeyword}"` : '';
        document.getElementById('submitMessageKeyword').value = result.submitMessageKeyword ? `"${result.submitMessageKeyword}"` : '';
        document.getElementById('micOffSendsMessage').checked = result.sendMessageOnMicOff;
        document.getElementById('onOffAudioFeedback').checked = result.onOffAudioFeedback;
        document.getElementById('onOffAudioVolume').value = result.onOffAudioVolume;
        const volumeOption = document.getElementById('volume-option');
        if (!result.onOffAudioFeedback) {
            volumeOption.style.display = 'none';
        } else {
            updateSliderBackground(document.getElementById('onOffAudioVolume'));
        }
    });
}

// save settings to storage
function saveSettings() {
    const clearMessageKeyword = document.getElementById('clearMessageKeyword').value.replace(/^"|"$/g, "");
    const submitMessageKeyword = document.getElementById('submitMessageKeyword').value.replace(/^"|"$/g, "");
    const sendMessageOnMicOffValue = document.getElementById('micOffSendsMessage').checked;
    const onOffAudioFeedbackValue = document.getElementById('onOffAudioFeedback').checked;
    let onOffAudioVolumeValue = document.getElementById('onOffAudioVolume').value;
    if (!onOffAudioFeedbackValue) {
        onOffAudioVolumeValue = 50;
        document.getElementById('onOffAudioVolume').value = onOffAudioVolumeValue;
        updateSliderBackground(document.getElementById('onOffAudioVolume'));
    }
    chrome.storage.sync.set({
        clearMessageKeyword: clearMessageKeyword,
        submitMessageKeyword: submitMessageKeyword,
        sendMessageOnMicOff: sendMessageOnMicOffValue,
        onOffAudioFeedback: onOffAudioFeedbackValue,
        onOffAudioVolume: onOffAudioVolumeValue,
    });
    const volumeOption = document.getElementById('volume-option');
    if (!onOffAudioFeedbackValue) {
        volumeOption.style.display = 'none';
    } else {
        volumeOption.style.display = 'flex';
    }
}

// open snippets tab
document.getElementById('openSnippetsTab').addEventListener('click', () => {
    chrome.tabs.create({ url: 'snippets/snippets.html' });
});

// add event listeners
document.getElementById('clearMessageKeyword').addEventListener('input', saveSettings);
document.getElementById('submitMessageKeyword').addEventListener('input', saveSettings);
document.getElementById('micOffSendsMessage').addEventListener('change', saveSettings);
document.getElementById('onOffAudioFeedback').addEventListener('change', saveSettings);
document.getElementById('onOffAudioVolume').addEventListener('input', ((func, wait) => {
    let timeout;
    return (...args) => {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
})(saveSettings, 100));

// load settings on page load
document.addEventListener('DOMContentLoaded', loadSettings);