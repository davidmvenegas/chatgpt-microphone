// ----------------- SETUP ----------------- //


// state variables
let recognition = null;
let isMainActive = false;
let isMainRunning = false;
let isRecognitionActive = false;
let isUnsupportedBrowser = false;
let toggleRecognitionFunction = null;

// add event listeners
window.addEventListener('resize', checkScreenSize);
window.addEventListener('keydown', handleHotkey);

// ----------------- MAIN FUNCTION ----------------- //


async function main() {
    isMainRunning = true;

    // select chatbox element
    const chatboxElement = document.querySelector('textarea[tabindex="0"]');
    if (!chatboxElement) return;

    // select parent element and send button
    const chatboxParentElement = chatboxElement.parentNode.parentNode;
    const sendButton = document.querySelector('[data-testid="send-button"]');

    // remove overflow hidden from parent element
    chatboxParentElement.style.overflow = 'visible';


    // ----------------- CREATE BUTTON ----------------- //


    // create necessary elements
    const microphoneButton = document.createElement('button');
    const iconContainer = document.createElement('div');
    const microphoneSVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const microphonePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const microphoneAnimation = document.createElement('style');

    // build microphone button
    microphoneButton.setAttribute('class', 'GPT-microphone-button absolute bg-[#f4f4f4] dark:bg-token-main-surface-secondary hover:opacity-70 transition-colors rounded-full focus:ring-0 focus:ring-offset-0 shadow-[0_2px_6px_rgba(0,0,0,.05)]');
    microphoneButton.setAttribute('style', 'right: -66.5px; bottom: 0; height: 56px; width: 56px; display: flex; align-items: center; justify-content: center; margin-bottom: -1px;');

    // build icon container
    iconContainer.setAttribute('class', 'GPT-microphone-icon');
    iconContainer.setAttribute('style', 'position: relative; width: 22px; height: 22px;');

    // build svg element
    microphoneSVG.setAttribute('class', 'GPT-microphone-svg');
    microphoneSVG.setAttribute('width', '22');
    microphoneSVG.setAttribute('height', '22');
    microphoneSVG.setAttribute('viewBox', '0 0 484.5 484.5');
    microphoneSVG.setAttribute('xml:space', 'preserve');

    // build path element
    microphonePath.setAttribute('class', 'GPT-microphone-path');
    microphonePath.setAttribute('fill', '#8e8ea0');
    microphonePath.setAttribute('d', 'M242.25,306c43.35,0,76.5-33.15,76.5-76.5v-153c0-43.35-33.15-76.5-76.5-76.5c-43.35,0-76.5,33.15-76.5,76.5v153C165.75,272.85,198.9,306,242.25,306z M377.4,229.5c0,76.5-63.75,130.05-135.15,130.05c-71.4,0-135.15-53.55-135.15-130.05H63.75c0,86.7,68.85,158.1,153,170.85v84.15h51v-84.15c84.15-12.75,153-84.149,153-170.85H377.4L377.4,229.5z');

    // build animation
    microphoneAnimation.setAttribute('class', 'GPT-microphone-animation');
    microphoneAnimation.innerHTML = `
        .GPT-microphone-active::before {
            content: "";
            display: block;
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background-color: #f25c54;
            opacity: 0;
            animation: wave 1.65s infinite;
        }
        @keyframes wave {
            0% {
                transform: scale(.5);
                opacity: 0;
            }
            30% {
                opacity: .5;
            }
            100% {
                transform: scale(2);
                opacity: 0;
            }
        }
    `;

    // append everything to DOM
    microphoneSVG.appendChild(microphonePath);
    iconContainer.appendChild(microphoneSVG);
    microphoneButton.appendChild(iconContainer);
    chatboxParentElement.appendChild(microphoneButton);
    document.head.appendChild(microphoneAnimation);


    // ----------------- SPEECH RECOGNITION ----------------- //


    // check if browser supports Speech Recognition API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition && !isUnsupportedBrowser) {
        removeMain();
        isUnsupportedBrowser = true;
        setTimeout(() => alert('This browser cannot use ChatGPT Microphone because the Speech Recognition API is not supported :( \n\nPlease switch to Google Chrome to use the extension.'), 100);
        return;
    }

    // create an instance of Speech Recognition API
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    // restart speech recognition if it times out
    recognition.onend = () => {
        if (isRecognitionActive) {
            setTimeout(() => recognition.start(), 100);
        }
    };

    // append transcript to chatbox
    recognition.addEventListener('result', async (event) => {
        chatboxElement.focus();
        const lastIndex = event.results.length - 1;
        const previousText = chatboxElement.value.slice(0, chatboxElement.selectionStart);
        let transcript = event.results[lastIndex][0].transcript.trim();
        // check for clear keyword
        const clearMessageKeyword = await fetchFromStorage('clearMessageKeyword') || null;
        if (clearMessageKeyword && transcript.toLowerCase().includes(clearMessageKeyword.toLowerCase())) {
            chatboxElement.value = '';
            transcript = transcript.replace(new RegExp(clearMessageKeyword, 'gi'), '');
        }
        // check for submit keyword
        const submitMessageKeyword = await fetchFromStorage('submitMessageKeyword') || null;
        if (submitMessageKeyword && transcript.toLowerCase().includes(submitMessageKeyword.toLowerCase())) {
            sendButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            transcript = transcript.replace(new RegExp(submitMessageKeyword, 'gi'), '');
        }
        const processedTranscript = await processTranscript(previousText, transcript);
        // if speech recognition is final, insert transcript at cursor position
        if (event.results[lastIndex].isFinal) {
            // get cursor position and selection if any
            const selectionStart = chatboxElement.selectionStart;
            const selectionEnd = chatboxElement.selectionEnd;
            // insert transcript at cursor position
            const value = chatboxElement.value;
            chatboxElement.value = value.slice(0, selectionStart) + processedTranscript + value.slice(selectionEnd);
            // move cursor to end of inserted text
            chatboxElement.selectionStart = selectionStart + processedTranscript.length;
            chatboxElement.selectionEnd = chatboxElement.selectionStart;
            // manually trigger input event
            const inputEvent = new Event('input', { bubbles: true });
            chatboxElement.dispatchEvent(inputEvent);
        }
    });

    // manually turn off speech recognition when submit button 
    // is clicked. (don't call turnOff() because it will trigger
    // the send button again, causing an infinite loop)
    sendButton.addEventListener('click', async () => {
        if (await fetchFromStorage('micAlwaysListening')) return;
        isRecognitionActive && playAudioTone('OFF');
        recognition.stop();
        microphonePath.setAttribute('fill', '#8e8ea0');
        iconContainer.classList.remove('GPT-microphone-active');
        isRecognitionActive = false;
    });

    // turn off speech recognition on enter (but not shift + enter)
    chatboxElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            turnOff();
        }
    });

    // toggle speech recognition on click
    microphoneButton.addEventListener('click', (e) => {
        e.preventDefault();
        toggleRecognition();
    });

    // turn on/off speech recognition when micAlwaysListening is toggled
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.micAlwaysListening) {
            if (changes.micAlwaysListening.newValue) {
                turnOn();
            } else {
                turnOff();
            }
        }
    });

    // turn on speech recognition if micAlwaysListening is enabled on initial load
    if (await fetchFromStorage('micAlwaysListening')) {
        turnOn();
    }


    // ----------------- HELPER FUNCTIONS ----------------- //


    // toggle speech recognition
    async function toggleRecognition() {
        const hasMicrophoneAccess = await checkMicrophoneAccess();
        // stop if user has not granted microphone access
        if (!hasMicrophoneAccess) {
            alert("Please enable microphone access to use ChatGPT Microphone.");
            return;
        }
        if (isRecognitionActive) {
            turnOff();
        } else {
            // check if recognition has already started
            if (recognition && recognition.state !== 'active') {
                turnOn();
            }
        }
        chatboxElement.focus();
    }

    // turn microphone on
    function turnOn() {
        playAudioTone('ON');
        recognition.start();
        microphonePath.setAttribute('fill', '#f25c54');
        iconContainer.classList.add('GPT-microphone-active');
        isRecognitionActive = true;
    }

    // turn microphone off
    async function turnOff() {
        if (await fetchFromStorage('micAlwaysListening')) return; // do not turn off if always listening
        isRecognitionActive && playAudioTone('OFF');
        recognition.stop();
        microphonePath.setAttribute('fill', '#8e8ea0');
        iconContainer.classList.remove('GPT-microphone-active');
        isRecognitionActive = false;
        // send message if user has enabled option
        if (await fetchFromStorage('sendMessageOnMicOff')) {
            sendButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
    }

    // process voice transcript
    async function processTranscript(previousText, text) {
        const punctuationMap = {
            'colon': ':',
            'comma': ',',
            'period': '.',
            'ellipsis': '...',
            'ellipses': '...',
            'new line': '\n',
            'next line': '\n',
            'semicolon': ';',
            'full stop': '.',
            'question mark': '?',
            'new paragraph': '\n\n',
            'next paragraph': '\n\n',
            'exclamation mark': '!',
            'exclamation point': '!',
        };
        // capitalize first word if chatbox is empty or last character is ".", "!", "?", or newline
        if (previousText.length === 0 || /[.!?]$/.test(previousText.trim()) || previousText.slice(-1) === '\n') {
            text = text.charAt(0).toUpperCase() + text.slice(1);
        }
        // add a space to start if chatbox is not empty, last character is not a newline, and last character is not a space
        if (previousText.length > 0 && previousText.slice(-1) !== '\n' && previousText.slice(-1) !== ' ') {
            text = ' ' + text;
        }
        // replace any punctuation words with actual punctuation
        const regexPattern = new RegExp(`\\b(${Object.keys(punctuationMap).join('|')})\\b`, 'gi');
        let newText = text.replace(regexPattern, (match, p1) => {
            const punctuation = punctuationMap[p1.toLowerCase()];
            return punctuation ? punctuation : match;
        });
        // capitalize words following ".", "!", "?"
        newText = newText.replace(/([.!?])\s*(\w)/g, (_, p1, p2) => {
            return p1 + ' ' + p2.toUpperCase();
        });
        // remove spaces before punctuation
        newText = newText.replace(/\s+([,.!?:])/g, '$1');
        // replace any shortcut with its corresponding snippet
        const snippetsData = await fetchFromStorage('snippetsData') || [];
        for (const snippet of snippetsData) {
            const regexPattern = new RegExp(`\\b${snippet.shortcut}\\b`, 'gi');
            newText = newText.replace(regexPattern, snippet.snippet);
        }
        return newText;
    }

    // play audio tone
    async function playAudioTone(toneType) {
        if (!await fetchFromStorage('onOffAudioFeedback')) return;
        const userVolume = await fetchFromStorage('onOffAudioVolume') || 0;
        const audioContext = new AudioContext();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        // set on and off tone properties
        const isTurningOn = toneType === 'ON';
        const frequency = isTurningOn ? 440 : 340;
        const duration = isTurningOn ? 0.5 : 0.4;
        const volume = (isTurningOn ? 0.2 : 0.16) * userVolume / 100;
        // set oscillator and gain node properties
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
        gainNode.gain.setTargetAtTime(0.0001, audioContext.currentTime + duration / 2.5, duration / 12);
        // play tone
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    }

    // assign toggleRecognition function to global scope
    toggleRecognitionFunction = toggleRecognition;
    isMainRunning = false;
}


// ----------------- SIDE EFFECTS ----------------- //


// debounce function
function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// check screen size
function checkScreenSize() {
    if (window.innerWidth >= 925 && !isMainActive) {
        main();
        isMainActive = true;
    }
    if (window.innerWidth < 925) {
        removeMain();
        isMainActive = false;
    }
}

// check microphone access
async function checkMicrophoneAccess() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // if user grants access, stop stream to release microphone
        stream.getTracks().forEach((track) => track.stop());
        return true;
    } catch (error) {
        return false;
    }
}

// listen for hotkey
function handleHotkey(e) {
    const isMac = navigator.userAgent.includes("Mac");
    const activationKey = isMac ? e.metaKey : e.ctrlKey;
    // if ctrl/cmd + m is pressed, toggle speech recognition
    if (activationKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        toggleRecognitionFunction();
    }
}

// fetch data from storage
async function fetchFromStorage(key) {
    return new Promise((resolve) => {
        chrome.storage.sync.get(key, (result) => {
            return resolve(result[key]);
        });
    });
}

// initialize observer to reload button if it is removed
function initObserver() {
    const observer = new MutationObserver(
        debounce((mutations) => {
            for (const mutation of mutations) {
                if (
                    mutation.type === 'childList' &&
                    mutation.addedNodes.length > 0 &&
                    !document.querySelector('.GPT-microphone-button') &&
                    !isUnsupportedBrowser &&
                    !isMainRunning &&
                    isMainActive
                ) {
                    removeMain();
                    setTimeout(() => { main() }, 100);
                }
            }
        }, 10));
    observer.observe(document.body, { childList: true, subtree: true });
}

// remove main function
function removeMain() {
    if (recognition) {
        recognition.onend = null;
        recognition.abort();
    }
    isRecognitionActive = false;
    toggleRecognitionFunction = null;
    const microphoneActive = document.querySelector('.GPT-microphone-active');
    const microphonePath = document.querySelector('.GPT-microphone-path');
    const microphoneSVG = document.querySelector('.GPT-microphone-svg');
    const iconContainer = document.querySelector('.GPT-microphone-icon');
    const microphoneButton = document.querySelector('.GPT-microphone-button');
    const microphoneAnimation = document.querySelector('.GPT-microphone-animation');
    if (microphoneActive) microphoneActive.remove();
    if (microphonePath) microphonePath.remove();
    if (microphoneSVG) microphoneSVG.remove();
    if (iconContainer) iconContainer.remove();
    if (microphoneButton) microphoneButton.remove();
    if (microphoneAnimation) microphoneAnimation.remove();
}

window.addEventListener('load', () => {
    // Ensure the chat box element is loaded before running main
    const chatboxElement = document.querySelector('textarea[tabindex="0"]');
    if (chatboxElement) {
        checkScreenSize();
        initObserver();
    } else {
        // Retry if the chat box element isn't found yet
        const retryInterval = setInterval(() => {
            const chatboxElement = document.querySelector('textarea[tabindex="0"]');
            if (chatboxElement) {
                clearInterval(retryInterval);
                checkScreenSize();
                initObserver();

                // clear once found
                clearInterval(retryInterval);
            }
            console.log('Retrying...');
        }, 100);

        // Stop retrying after 10 seconds
        setTimeout(() => clearInterval(retryInterval), 10000);
    }
});
