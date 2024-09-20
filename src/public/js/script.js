const sendButton = document.getElementById('sendButton');
const urlInput = document.getElementById('url');
const inputContainer = document.getElementById('inputContainer');
const title2 = document.getElementById('title-2');
const errorBox = document.createElement('div');
const successBox = document.createElement('div');
const newLink = document.createElement('button');
const loadingGif = document.createElement('img');
const customUrlId = document.getElementById('customUrlId')
const customUrlCheckbox = document.getElementById('customUrlCheckbox');
const customUrl = document.getElementById('customUrl');
const customUrlBox = document.getElementById('customUrlBox');
const customUrlCheckboxContainer = document.getElementById('customUrlCheckboxContainer')

errorBox.className = 'error-box';
successBox.className = 'success-box';
newLink.className = 'new-link-box';
newLink.textContent = 'Shorten another link';
newLink.style.display = 'none';
newLink.addEventListener('click', () => { location.reload(); });
loadingGif.src = 'assets/spinner.svg';
loadingGif.alt = 'Loading...';
loadingGif.style.width = '18px';
loadingGif.style.height = '18px';

let isCopyMode = false;
let otuValue = false;


sendButton.addEventListener('click', async () => {
    if (isCopyMode === false) {
        try {
            sendButton.disabled = true;
            sendButton.innerHTML = '';
            sendButton.appendChild(loadingGif);
            const originalUrl = urlInput.value;
            otuValue = customUrlCheckbox.checked;

            const response = await fetch('/api/link', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ link: originalUrl, customUrlId: customUrlId.value, otu: otuValue }),
            });
            sendButton.disabled = true;

            if (response.ok) {
                isCopyMode = true;
                const data = await response.json();
                urlInput.value = data.shortenedLink;
                urlInput.readOnly = true;
                title2.innerHTML = 'Your restreamed URL';
                sendButton.innerHTML = 'Copy';
                const customUrl = document.getElementById('customUrl');
                const customUrlBox = document.getElementById('customUrlBox');
                customUrlCheckboxContainer.remove();
                if (customUrl) {
                    customUrl.remove();
                    customUrlBox.remove();
                }

                document.body.appendChild(newLink);
                inputContainer.appendChild(sendButton);
                newLink.style.display = 'block';
            } else if (response.status === 400) {
                sendButton.disabled = true;
                displayError('Error: Enter a valid URL');
                sendButton.innerHTML = 'Generate URL';
            } else if (response.status === 401) {
                sendButton.disabled = true;
                displayError('Error: Invalid custom url');
                sendButton.innerHTML = 'Generate URL';
            } else if (response.status === 402) {
                sendButton.disabled = true;
                displayError('Error: Custom url already in use');
                customUrlId.value = "";
                customUrlBox.querySelector("input[readonly]").value = document.location.host + "/";
                sendButton.innerHTML = 'Generate URL';
            } else {
                sendButton.innerHTML = 'Generate URL';
                displayError('Internal Server Error');
            }
        } catch (error) {
            console.error('Error during fetch:', error);
        } finally {
            sendButton.disabled = false;
        }
    } else {
        urlInput.select();
        document.execCommand('copy');
        sendButton.style = 'background-color: #248046; background-color:hover: #23a559;';
        displaySuccess('Success: Link copied!');
    }
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


document.addEventListener("DOMContentLoaded", function () {
    const customUrl = document.getElementById("customUrl");
    const customUrlBox = document.getElementById("customUrlBox");

    customUrl.addEventListener("click", function () {
        if (customUrlBox.style.display === "none" || customUrlBox.style.display === "") {
            customUrlBox.style.display = "flex";
            customUrl.innerHTML = "⚙️ Use random url";
        } else {
            customUrlBox.style.display = "none";
            customUrl.innerHTML = "⚙️ Set custom url";
        }
        customUrlBox.querySelector("input[readonly]").value = document.location.host + "/" + customUrlId.value;
    });

    customUrlId.addEventListener('input', function () {
        customUrlBox.querySelector("input[readonly]").value = document.location.host + "/" + customUrlId.value;
    });
});


customUrlCheckbox.addEventListener('change', function () {
    if (customUrlCheckbox.checked) {
        customUrl.style.display = 'none';
        customUrlBox.style.display = 'none'
    } else {
        customUrl.style.display = 'block';
    }
});


customUrlCheckboxContainer.addEventListener('click', function (event) {
    if (event.target !== customUrlCheckbox) {
        customUrlCheckbox.checked = !customUrlCheckbox.checked;
    }

    if (customUrlCheckbox.checked) {
        customUrl.style.display = 'none';
        customUrlBox.style.display = 'none';
    } else {
        customUrl.style.display = 'block';
    }
});

document.addEventListener("DOMContentLoaded", function () {
    if (customUrlCheckbox.checked) {
        customUrl.style.display = 'none';
    } else {
        customUrl.style.display = 'block';
    }
});
