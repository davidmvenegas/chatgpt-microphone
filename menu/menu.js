// add transition styles after initial load
window.addEventListener('DOMContentLoaded', () => {
    const slider = document.querySelectorAll('.slider');
    const onOffAudioVolume = document.getElementById('onOffAudioVolume');
    setTimeout(() => {
        slider.forEach((element) => element.classList.add('smooth-transition'));
        onOffAudioVolume.addEventListener('input', () => updateSliderBackground(onOffAudioVolume));
    }, 100);
});

// update slider background
function updateSliderBackground(slider) {
    const value = (slider.value - slider.min) / (slider.max - slider.min) * 100;
    slider.style.backgroundImage = `linear-gradient(to right, #27a532 ${value}%, #ddd ${value}%)`;
}

// load settings from storage
function loadSettings() {
    chrome.storage.sync.get(['sendMessageOnMicOff', 'onOffAudioFeedback', 'onOffAudioVolume'], (result) => {
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
    const sendMessageOnMicOffValue = document.getElementById('micOffSendsMessage').checked;
    const onOffAudioFeedbackValue = document.getElementById('onOffAudioFeedback').checked;
    let onOffAudioVolumeValue = document.getElementById('onOffAudioVolume').value;
    if (!onOffAudioFeedbackValue) {
        onOffAudioVolumeValue = 50;
        document.getElementById('onOffAudioVolume').value = onOffAudioVolumeValue;
        updateSliderBackground(document.getElementById('onOffAudioVolume'));
    }
    chrome.storage.sync.set({
        sendMessageOnMicOff: sendMessageOnMicOffValue,
        onOffAudioFeedback: onOffAudioFeedbackValue,
        onOffAudioVolume: onOffAudioVolumeValue
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