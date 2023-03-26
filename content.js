// content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'init') {
      initialize();
    }
  });
  
  function initialize() {
      
    const injection = `
    <style>
        #voice-extension {
        position: fixed;
        top: 10px;
        right: 10px;
        background-color: white;
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 5px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 5px;
        }
    </style>
    <div id="voice-extension">
        <button id="start">Start</button>
        <button id="pause" disabled>Pause</button>
        <button id="resume" disabled>Resume</button>
        <button id="stop" disabled>Stop</button>
        <div id="status">Ready</div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', injection);
  
    const startButton = document.getElementById('start');
    const pauseButton = document.getElementById('pause');
    const resumeButton = document.getElementById('resume');
    const stopButton = document.getElementById('stop');
    const status = document.getElementById('status');
  
    startButton.addEventListener('click', () => {
      startButton.disabled = true;
      pauseButton.disabled = false;
      stopButton.disabled = false;
      startRecording();
    });
  
    pauseButton.addEventListener('click', () => {
      pauseButton.disabled = true;
      resumeButton.disabled = false;
      pauseRecording();
    });
  
    resumeButton.addEventListener('click', () => {
      pauseButton.disabled = false;
      resumeButton.disabled = true;
      resumeRecording();
    });
  
    stopButton.addEventListener('click', () => {
      startButton.disabled = false;
      pauseButton.disabled = true;
      resumeButton.disabled = true;
      stopButton.disabled = true;
      stopRecording();
    });
  }
  
  let recognizer;
  async function startRecording() {
    setStatus('Recording...');
  
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recognizer = new webkitSpeechRecognition();
      recognizer.continuous = true;
      recognizer.lang = 'en-US';
  
      recognizer.onresult = async (event) => {
        const inputText = event.results[event.results.length - 1][0].transcript;
        const chatInput = document.querySelector('.m-0.w-full.resize-none.border-0.bg-transparent.p-0.pr-7.focus\\:ring-0.focus-visible\\:ring-0.dark\\:bg-transparent.pl-2.md\\:pl-0');
        chatInput.value += ' ' + augmentPrompt(inputText);
  
        const sendButton = document.querySelector('.absolute p-1 rounded-md');
        sendButton.click();
  
        await waitForResponse();
        const responseElements = document.querySelector('.markdown.prose.w-full.break-words.dark\\:prose-invert.light').textContent;
        const latestResponse = responseElements[responseElements.length - 1];
        const responseText = latestResponse.textContent;
        playResponse(responseText);
      };
  
      recognizer.onerror = (event) => {
        console.error(`Error: ${event.error}`);
        setStatus('Error: ' + event.error);
      };
  
      recognizer.start();
    } catch (err) {
      console.error(err);
      setStatus('Error: ' + err.message);
    }
  }
  
  function pauseRecording() {
    setStatus('Paused');
    recognizer.stop();
  }
  
  function resumeRecording() {
    setStatus('Recording...');
    recognizer.start();
  }
  
  function stopRecording() {
    setStatus('Ready');
    recognizer.stop();
  }
  
  function setStatus(text) {
    const status = document.getElementById('status');
    status.textContent = text;
  }
  
  function augmentPrompt(text) {
    return text + ' {short-answer} {question}';
  }
  
async function waitForResponse() {
    return new Promise((resolve) => {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            observer.disconnect();
            resolve();
          }
        });
      });
      const responseContainers = document.querySelectorAll('.text-base');
      const responseContainer = responseContainers[responseContainers.length - 1];
      observer.observe(responseContainer, { childList: true });
    });
  }
  
  function playResponse(text) {
    setStatus('Playing response...');
    const maxLength = 200; // Maximum response length
    const codeBlockRegex = /```[\s\S]*?```/g; // Regular expression to match code blocks
  
    let shortText = text.replace(codeBlockRegex, ''); // Remove code blocks
    if (shortText.length > maxLength) {
      shortText = shortText.substring(0, maxLength) + '...'; // Truncate response
    }
  
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(shortText);
    synth.speak(utterance);
  
    utterance.onend = () => {
      setStatus('Ready');
    };
  }

  // Update the startRecording function
  async function startRecording() {
    setStatus('Recording...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recognizer = new webkitSpeechRecognition();
      recognizer.continuous = true;
      recognizer.interimResults = true; // Add this line
      recognizer.lang = 'en-US';

      recognizer.onresult = async (event) => {
        const isFinal = event.results[event.results.length - 1].isFinal;
        const inputText = event.results[event.results.length - 1][0].transcript;
        const chatInput = document.querySelector('.m-0.w-full.resize-none.border-0.bg-transparent.p-0.pr-7.focus\\:ring-0.focus-visible\\:ring-0.dark\\:bg-transparent.pl-2.md\\:pl-0');
        chatInput.value = augmentPrompt(inputText);

        // Add this block
        if (isFinal) {
          stopRecording();
          const sendButton = document.querySelector('.h-4.w-4.mr-1');
          sendButton.click();

          await waitForResponse();
          const responseElement = document.querySelector('.markdown.prose.w-full.break-words.dark\\:prose-invert.light');
          const responseText = responseElement.textContent;
          playResponse(responseText);
        }
      };

      recognizer.onerror = (event) => {
        console.error(`Error: ${event.error}`);
        setStatus('Error: ' + event.error);
      };

      recognizer.start();
    } catch (err) {
      console.error(err);
      setStatus('Error: ' + err.message);
    }
  }
  
  