// ----------------- SETUP ----------------- //


// state variables
let recognition = null;
let isMainActive = false;
let isMainRunning = false;
let isRecognitionActive = false;
let isUnsupportedBrowser = false;
let toggleRecognitionFunction = null;

let mediaRecorder;
let audioChunks = [];

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
    const chatboxParentElement = chatboxElement.parentNode;
    const sendButton = chatboxParentElement.querySelector('button:nth-child(2)');

    // fetch snippets data and keywords from storage
    const snippetsData = await fetchFromStorage('snippetsData') || [];
    const clearMessageKeyword = await fetchFromStorage('clearMessageKeyword') || null;
    const submitMessageKeyword = await fetchFromStorage('submitMessageKeyword') || null;


    // ----------------- CREATE BUTTON ----------------- //


    // create necessary elements
    const microphoneButton = document.createElement('button');
    const iconContainer = document.createElement('div');
    const microphoneSVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const microphonePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const microphoneAnimation = document.createElement('style');

    // build microphone button
    microphoneButton.setAttribute('class', 'GPT-microphone-button absolute border-black/10 bg-white dark:border-gray-900/50 dark:text-white dark:bg-gray-700 rounded-xl shadow-xs dark:shadow-xs shadow-[0_0_10px_rgba(0,0,0,0.10)] dark:shadow-[0_0_15px_rgba(0,0,0,0.10)] hover:bg-gray-100 dark:hover:bg-gray-900');
    microphoneButton.setAttribute('style', 'right: -68px; bottom: 0; height: 58px; width: 58px; display: flex; align-items: center; justify-content: center; border-width: 1px; margin-bottom: -1px;');

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
    recognition.addEventListener('result', (event) => {
        chatboxElement.focus();
        const lastIndex = event.results.length - 1;
        const previousText = chatboxElement.value.slice(0, chatboxElement.selectionStart);
        let transcript = event.results[lastIndex][0].transcript.trim();
        // check for clear keyword
        if (clearMessageKeyword && transcript.toLowerCase().includes(clearMessageKeyword.toLowerCase())) {
            chatboxElement.value = '';
            transcript = transcript.replace(new RegExp(clearMessageKeyword, 'gi'), '');
        }
        // check for submit keyword
        if (submitMessageKeyword && transcript.toLowerCase().includes(submitMessageKeyword.toLowerCase())) {
            sendButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            transcript = transcript.replace(new RegExp(submitMessageKeyword, 'gi'), '');
        }
        const processedTranscript = processTranscript(previousText, transcript);
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

    // turn off speech recognition when submit button is clicked
    sendButton.addEventListener('click', () => {
        turnOff();
    });

    // // turn off speech recognition on enter (but not shift + enter)
    // chatboxElement.addEventListener('keydown', (e) => {
    //     if (e.key === 'Enter' && !e.shiftKey) {
    //         turnOff();
    //     }
    // });

    // toggle speech recognition on click
    microphoneButton.addEventListener('click', (e) => {
        e.preventDefault();
        toggleRecognition();
    });


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
        //recognition.start();
        startRecording();
        microphonePath.setAttribute('fill', '#f25c54');
        iconContainer.classList.add('GPT-microphone-active');
        isRecognitionActive = true;
    }

    // turn microphone off
    async function turnOff() {
        isRecognitionActive && playAudioTone('OFF');
        //recognition.stop();
        stopRecording();
        microphonePath.setAttribute('fill', '#8e8ea0');
        iconContainer.classList.remove('GPT-microphone-active');
        isRecognitionActive = false;
        // send message if user has enabled option
        if (await fetchFromStorage('sendMessageOnMicOff')) {
            sendButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
    }

    initMediaRecorder();

    // 开始录音的函数
    function startRecording() {
        if (!mediaRecorder) {
            console.error('MediaRecorder未初始化');
            return;
        }
        audioChunks = [];
        mediaRecorder.start();
    }

    // 停止录音的函数
    function stopRecording() {
        if (!mediaRecorder) {
            console.error('MediaRecorder未初始化');
            return;
        }
        mediaRecorder.stop();
    }
    // process voice transcript
    function processTranscript(previousText, text) {
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
        const frequency = isTurningOn ? 440 : 300;
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
    if (window.innerWidth >= 1100 && !isMainActive) {
        main();
        isMainActive = true;
    }
    if (window.innerWidth < 1100) {
        removeMain();
        isMainActive = false;
    }
}

function initMediaRecorder() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);

            // 当有可用数据时，将其添加到音频块数组中
            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };

            // 当录音停止时，将音频块组合成一个Blob
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });

                const formData = new FormData();
                formData.append('file', audioBlob, 'recording.wav');
                formData.append('model', 'whisper-1'); // 根据API的模型要求
                const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer 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', // 用你的真实令牌替换
                    },
                    body: formData,
                });

                // 检查响应状态
                if (!response.ok) {
                    throw new Error(`API request failed with status ${response.status}`);
                }

                // 解析响应结果
                const result = await response.json();

                // 在此处处理转录结果，例如显示到UI
                console.log('Transcription result:', result);

                const chatboxElement = document.querySelector('textarea[tabindex="0"]');
                if (!chatboxElement) return;
                chatboxElement.focus();
                // get cursor position and selection if any
                const selectionStart = chatboxElement.selectionStart;
                const selectionEnd = chatboxElement.selectionEnd;
                // insert transcript at cursor position
                const value = chatboxElement.value;
                chatboxElement.value = value.slice(0, selectionStart) + result.text + value.slice(selectionEnd);
                // move cursor to end of inserted text
                chatboxElement.selectionStart = selectionStart + result.text.length;
                chatboxElement.selectionEnd = chatboxElement.selectionStart;
                // manually trigger input event
                const inputEvent = new Event('input', { bubbles: true });
                chatboxElement.dispatchEvent(inputEvent);

                // // 提供下载链接
                // const audioUrl = URL.createObjectURL(audioBlob);
                // const downloadLink = Object.assign(document.createElement('a'), {
                //     href: audioUrl,
                //     download: 'recording.wav',
                //     style: { display: 'none' }
                // });

                // // 临时将链接添加到文档以触发下载
                // document.body.appendChild(downloadLink);
                // downloadLink.click();

                // // 清理：从文档中移除链接并撤销URL
                // document.body.removeChild(downloadLink);
                // URL.revokeObjectURL(audioUrl);
            };
        })
        .catch(error => {
            console.error('麦克风访问权限错误:', error);
        });
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
                    main();
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


checkScreenSize();
initObserver();