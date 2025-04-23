
document.addEventListener("DOMContentLoaded", function () {
    const sendButton = document.getElementById('sendButton');
    const urlInput = document.getElementById('url');
    const inputContainer = document.getElementById('inputContainer');
    const customUrlId = document.getElementById('customUrlId');
    const customUrlCheckbox = document.getElementById('customUrlCheckbox');
    const customUrl = document.getElementById('customUrl');
    const customUrlBox = document.getElementById('customUrlBox');
    const alertBox = document.getElementById('alertBox');
    const successModal = document.getElementById('successModal');
    const shortenedLinkDisplay = document.getElementById('shortenedLinkDisplay');
    const closeModal = document.getElementById('closeModal');
    const copyButton = document.getElementById('copyModalLink');
    const restartButton = document.getElementById('restartButton');


    // Create and insert missing element for displaying the title
    let title2 = document.getElementById('title-2');
    if (!title2) {
        title2 = document.createElement('h2');
        title2.id = 'title-2';
        title2.className = 'text-lg font-semibold text-center';
        inputContainer.before(title2);
    }

    const newLink = document.createElement('button');
    newLink.className = 'w-full mt-4 text-indigo-600 hover:underline text-sm text-center font-medium';
    newLink.textContent = 'Shorten another link';
    newLink.style.display = 'none';
    newLink.addEventListener('click', () => location.reload());

    const loadingGif = document.createElement('img');
    loadingGif.src = 'assets/spinner.svg';
    loadingGif.alt = 'Loading...';
    loadingGif.className = 'inline w-5 h-5 animate-spin';

    let isCopyMode = false;

    sendButton.addEventListener('click', async () => {
        if (!isCopyMode) {
            const originalUrl = urlInput.value.trim();
            const otuValue = customUrlCheckbox.checked;

            if (!originalUrl || !originalUrl.startsWith('http')) {
                displayAlert('Please enter a valid URL starting with http or https.', 'error');
                return;
            }

            try {
                sendButton.disabled = true;
                sendButton.innerHTML = '';
                sendButton.appendChild(loadingGif);

                const response = await fetch('/api/link', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        link: originalUrl,
                        customUrlId: customUrlId.value.trim(),
                        otu: otuValue
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    shortenedLinkDisplay.value = data.shortenedLink;
                    successModal.classList.remove('hidden');
                } else {
                    handleError(response.status);
                }
            } catch (err) {
                console.error(err);
                displayAlert('Unexpected error occurred.', 'error');
            } finally {
                sendButton.disabled = false;
            }
        } else {
            urlInput.select();
            document.execCommand('copy');
            displayAlert('Link copied to clipboard!', 'success');
        }
    });

    function handleError(status) {
        sendButton.innerHTML = 'Generate URL';
        switch (status) {
            case 400:
                displayAlert('Enter a valid URL.', 'error');
                break;
            case 401:
                displayAlert('Invalid custom URL.', 'error');
                break;
            case 402:
                displayAlert('Custom URL already in use.', 'error');
                customUrlId.value = '';
                customUrlBox.querySelector("input[readonly]").value = document.location.host + '/';
                break;
            default:
                displayAlert('Internal server error.', 'error');
        }
    }

    function displayAlert(message, type) {
        alertBox.textContent = message;
        alertBox.className = `block p-3 rounded-md text-sm font-medium transition-all duration-300 ${type === 'success'
            ? 'bg-green-600 text-white'
            : 'bg-red-600 text-white'
            }`;

        setTimeout(() => {
            alertBox.classList.add('hidden');
            alertBox.textContent = '';
        }, 5000);
    }

    if (customUrl) {
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
    }

    if (customUrlId) {
        customUrlId.addEventListener('input', function () {
            customUrlBox.querySelector("input[readonly]").value = document.location.host + "/" + customUrlId.value;
        });
    }

    customUrlCheckbox.addEventListener('change', function () {
        if (customUrlCheckbox.checked) {
            customUrl.style.display = 'none';
            customUrlBox.style.display = 'none';
        } else {
            customUrl.style.display = 'block';
        }
    });

    copyButton.addEventListener('click', () => {
        shortenedLinkDisplay.select();
        document.execCommand('copy');
        displayAlert('Link copied to clipboard!', 'success');
    });

    restartButton.addEventListener('click', () => {
        location.reload();
    });

    closeModal.addEventListener('click', () => {
        successModal.classList.add('hidden');
        document.body.classList.remove('modal-open');
    });



    if (customUrlCheckbox.checked) {
        customUrl.style.display = 'none';
    } else {
        customUrl.style.display = 'block';
    }
});