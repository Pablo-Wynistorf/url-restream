const sendButton = document.getElementById('sendButton');
const urlInput = document.getElementById('url');
const inputContainer = document.getElementById('inputContainer');
const title2 = document.getElementById('title-2');
const errorBox = document.createElement('div');
const successBox = document.createElement('div');
const newLink = document.createElement('button');
const loadingGif = document.createElement('img');

errorBox.className = 'error-box';
successBox.className = 'success-box';
newLink.className = 'new-link-box';
newLink.textContent = 'Shorten another link';
newLink.style.display = 'none';
loadingGif.src = 'loading.gif';
loadingGif.alt = 'Loading...';
loadingGif.style.width = '18px';
loadingGif.style.height = '18px';

let isCopyMode = false;

sendButton.addEventListener('click', async () => {
    if (isCopyMode === false) {
        try {
            sendButton.disabled = true;
            sendButton.innerHTML = '';
            sendButton.appendChild(loadingGif);
            const originalUrl = urlInput.value;
            const response = await fetch('/api/link', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ link: originalUrl }),
            });
            sendButton.disabled = true;

            if (response.ok) {
                isCopyMode = true;
                const data = await response.json();
                urlInput.value = data.shortenedLink;
                urlInput.readOnly = true;
                title2.innerHTML = 'Your shortened URL';
                sendButton.innerHTML = 'Copy';
                sendButton.id = 'copyButton';
                document.body.appendChild(newLink);
                inputContainer.appendChild(sendButton);
                newLink.style.display = 'block';
            } else if (response.status === 400) {
                sendButton.disabled = true;
                displayError('Error: Enter a valid URL');
            } else {
                displayError('Internal Server Error');
            }
        } catch (error) {
            console.error('Error during fetch:', error);
        } finally {
            sendButton.disabled = false;
            sendButton.removeChild(loadingGif);
            sendButton.innerHTML = 'Get short link';
        }
    } else {
        urlInput.select();
        document.execCommand('copy');
        sendButton.style = 'background-color: #248046; background-color:hover: #23a559;';
        displaySuccess('Success: Link copied!');
    }
});

newLink.addEventListener('click', () => {
    window.location.reload();
});

function displayError(errorMessage) {
    errorBox.textContent = errorMessage;
    document.body.appendChild(errorBox);
    setTimeout(() => {
        errorBox.remove();
        sendButton.disabled = false;
    }, 2500);
}

function displaySuccess(successMessage) {
    successBox.textContent = successMessage;
    document.body.appendChild(successBox);
    setTimeout(() => {
        successBox.remove();
        sendButton.disabled = false;
    }, 2500);
}
