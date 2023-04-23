// add a transition to the slider after the initial load
window.addEventListener('DOMContentLoaded', () => {
    const slider = document.querySelectorAll('.slider');
    setTimeout(() => {
        slider.forEach((element) => element.classList.add('smooth-transition'));
    }, 100);
});

// Load settings from storage
function loadSettings() {
    chrome.storage.sync.get(['sendMessageOnMicOff', 'addSpaceAfterSpeech'], (result) => {
        document.getElementById('micOffSendsMessage').checked = result.sendMessageOnMicOff;
        document.getElementById('addSpaceAfterSpeech').checked = result.addSpaceAfterSpeech;
    });
}

// Save settings to storage
function saveSettings() {
    const sendMessageOnMicOffValue = document.getElementById('micOffSendsMessage').checked;
    const addSpaceAfterSpeechValue = document.getElementById('addSpaceAfterSpeech').checked;
    chrome.storage.sync.set({
        sendMessageOnMicOff: sendMessageOnMicOffValue,
        addSpaceAfterSpeech: addSpaceAfterSpeechValue
    });
}

// Add event listener for the toggle switch
document.getElementById('micOffSendsMessage').addEventListener('change', saveSettings);
document.getElementById('addSpaceAfterSpeech').addEventListener('change', saveSettings);

// Load settings on page load
document.addEventListener('DOMContentLoaded', loadSettings);