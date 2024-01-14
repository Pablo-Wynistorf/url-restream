const sendButton = document.getElementById('sendButton');
const urlInput = document.getElementById('url');
const inputContainer = document.getElementById('inputContainer');
const title2 = document.getElementById('title-2');
const errorBox = document.createElement('div');
const successBox = document.createElement('div');
const newLink = document.createElement('button');
errorBox.className = 'error-box';
successBox.className = 'success-box';
newLink.className = 'new-link-box';
newLink.textContent = 'Shorten another link';
newLink.style.display = 'none';
let isCopyMode = false;

sendButton.addEventListener('click', async () => {
    if (isCopyMode === false) {
        try {
            const originalUrl = urlInput.value;
            const response = await fetch('/api/link', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ link: originalUrl }),
            });

            if (response.ok) {
                isCopyMode = true;
                const data = await response.json();
                urlInput.value = data.shortenedLink;
                urlInput.readOnly = true;
                title2.innerHTML = 'Your shortened URL';
                sendButton.textContent = 'Copy';
                sendButton.id = 'copyButton';
                inputContainer.appendChild(sendButton);
                newLink.style.display = 'block';
            } else {
                sendButton.disabled = true;
                displayError('Error: Enter a valid URL');
            }
        } catch (error) {
            console.error('Error during fetch:', error);
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
    document.body.appendChild(newLink);
    setTimeout(() => {
        successBox.remove();
        sendButton.disabled = false;
    }, 2500);
}
