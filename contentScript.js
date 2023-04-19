

// ----------------- HELPER FUNCTIONS ----------------- //


// reload when navigating to a new page
const navigationObserver = new MutationObserver((_, observer) => {
    if (window.location.href !== observer.lastUrl) {
        observer.lastUrl = window.location.href;
        setTimeout(() => main(), 1000);
    }
});

navigationObserver.observe(document.body, { childList: true, subtree: true });
navigationObserver.lastUrl = window.location.href;


// load sendMessageOnMicOff setting from storage
async function sendMessageOnMicOff() {
    return new Promise((resolve) => {
        chrome.storage.sync.get('sendMessageOnMicOff', (result) => {
            return resolve(result.sendMessageOnMicOff);
        });
    });
}


// ----------------- MAIN FUNCTION ----------------- //


async function main() {
    // select the chatbox element and its parent
    const chatboxElement = document.querySelector('textarea[tabindex="0"]');
    const chatboxParentElement = chatboxElement.parentNode;

    // add the microphone active styles to the page
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
        .microphone-active::before {
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
    document.head.appendChild(styleElement);


    // ----------------- CREATING THE MICROPHONE BUTTON ----------------- //


    if (chatboxParentElement) {
        // create the button element
        const microphoneButton = document.createElement('button');
        microphoneButton.setAttribute('class', 'microphone-button absolute border-black/10 bg-white dark:border-gray-900/50 dark:text-white dark:bg-gray-700 rounded-md shadow-[0_0_10px_rgba(0,0,0,0.10)] dark:shadow-[0_0_15px_rgba(0,0,0,0.10)] hover:bg-gray-100 dark:hover:bg-gray-900');
        microphoneButton.setAttribute('style', 'right: -60px; bottom: 0; height: 50px; width: 50px; display: flex; align-items: center; justify-content: center; border-width: 1px; margin-bottom: -1px;');

        // create the icon container
        const iconContainer = document.createElement('div');
        iconContainer.setAttribute('style', 'position: relative; width: 21px; height: 21px;');

        // create the svg element
        const microphoneSVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        microphoneSVG.setAttribute('width', '21');
        microphoneSVG.setAttribute('height', '21');
        microphoneSVG.setAttribute('viewBox', '0 0 484.5 484.5');
        microphoneSVG.setAttribute('xml:space', 'preserve');

        // create the path element
        const microphonePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        microphonePath.setAttribute('fill', '#8e8ea0');
        microphonePath.setAttribute('d', 'M242.25,306c43.35,0,76.5-33.15,76.5-76.5v-153c0-43.35-33.15-76.5-76.5-76.5c-43.35,0-76.5,33.15-76.5,76.5v153C165.75,272.85,198.9,306,242.25,306z M377.4,229.5c0,76.5-63.75,130.05-135.15,130.05c-71.4,0-135.15-53.55-135.15-130.05H63.75c0,86.7,68.85,158.1,153,170.85v84.15h51v-84.15c84.15-12.75,153-84.149,153-170.85H377.4L377.4,229.5z');

        // append everything to the DOM
        microphoneSVG.appendChild(microphonePath);
        iconContainer.appendChild(microphoneSVG);
        microphoneButton.appendChild(iconContainer);
        chatboxParentElement.appendChild(microphoneButton);

        // select the send button
        const sendButton = chatboxParentElement.querySelector('button:nth-child(2)');


        // ----------------- INITIALIZING SPEECH RECOGNITION ----------------- //


        // check if the browser supports the Speech Recognition API
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('Speech Recognition API is not supported in this browser.');
            return;
        }

        // create an instance of the Speech Recognition API
        const recognition = new SpeechRecognition();
        recognition.continuous = true; // continuously listen for speech
        recognition.interimResults = true; // provide interim results

        // speech recognition state
        let isRecognitionActive = false;


        // ----------------- ADDING EVENT LISTENERS ----------------- //


        // append the transcript to the chatbox
        recognition.addEventListener('result', (event) => {
            const lastIndex = event.results.length - 1;
            const transcript = event.results[lastIndex][0].transcript;
            // if the speech recognition is final, append the transcript to the chatbox
            if (event.results[lastIndex].isFinal) {
                chatboxElement.value += transcript.trim() + ' ';
                // manually trigger the input event
                const inputEvent = new Event('input', { bubbles: true });
                chatboxElement.dispatchEvent(inputEvent);
            }
        });

        // add event listener to the microphone button
        microphoneButton.addEventListener('click', async (e) => {
            e.preventDefault();
            if (isRecognitionActive) {
                // stop speech recognition, set the microphone to inactive, and remove the animation
                recognition.stop();
                microphonePath.setAttribute('fill', '#8e8ea0');
                iconContainer.classList.remove('microphone-active');
                // send the message if the user has enabled the option
                if (await sendMessageOnMicOff()) {
                    sendButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                }
            } else {
                // start speech recognition, set the microphone to active, and add the animation
                recognition.start();
                microphonePath.setAttribute('fill', '#f25c54');
                iconContainer.classList.add('microphone-active');
            }
            chatboxElement.focus();
            isRecognitionActive = !isRecognitionActive;
        });
    }
}

main();
