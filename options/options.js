// add a transition to the slider after the initial load
window.addEventListener('DOMContentLoaded', () => {
    const slider = document.querySelector('.slider');
    setTimeout(() => {
        slider.classList.add('smooth-transition');
    }, 100);
});

// Load settings from storage
function loadSettings() {
    chrome.storage.sync.get(['sendMessageOnMicOff'], (result) => {
        document.getElementById('sendMessageOnMicOffToggle').checked = result.sendMessageOnMicOff;
    });
}

// Save settings to storage
function saveSettings() {
    const sendMessageOnMicOffValue = document.getElementById('sendMessageOnMicOffToggle').checked;
    chrome.storage.sync.set({ sendMessageOnMicOff: sendMessageOnMicOffValue }, () => {
        console.log('Options saved.');
    });
}

// Add event listener for the toggle switch
document.getElementById('sendMessageOnMicOffToggle').addEventListener('change', saveSettings);

// Load settings on page load
document.addEventListener('DOMContentLoaded', loadSettings);