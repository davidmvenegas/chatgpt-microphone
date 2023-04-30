document.getElementById('closeSnippets').addEventListener('click', () => {
    window.close();
});

const tableContainer = document.getElementById('snippetsTable');
const addNewButton = document.getElementById('addNewSnippet');
const editButton = document.getElementById('editSnippets');
const saveButton = document.getElementById('saveSnippets');

// clean pasted text
document.querySelectorAll('[data-paste]').forEach(element => {
    element.addEventListener('paste', (e) => {
        e.preventDefault();
        const plainText = (e.clipboardData || window.Clipboard).getData('text/plain');
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(plainText);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
    });
});

// create new row
function createNewRow() {
    const newRow = document.createElement('div');
    newRow.classList.add('row');
    newRow.innerHTML = `
        <div class="cell"><div class="SS_shortcut auto-grow" contenteditable="true" data-paste></div></div>
        <div class="cell"><div class="SS_snippet auto-grow" contenteditable="true" data-paste></div></div>
    `;
    tableContainer.appendChild(newRow);
}

// load data
function loadData() {
    chrome.storage.sync.get('data', ({ data }) => {
        console.log('Data loaded', data);
        data.forEach(item => {
            createNewRow();
            const shortcuts = document.getElementsByClassName('SS_shortcut');
            const snippets = document.getElementsByClassName('SS_snippet');
            shortcuts[shortcuts.length - 1].innerText = item.shortcut;
            snippets[snippets.length - 1].innerText = item.snippet;
        });
    });
}

// save data
function saveData() {
    const shortcuts = document.getElementsByClassName('SS_shortcut');
    const snippets = document.getElementsByClassName('SS_snippet');
    const data = [];
    for (let i = 0; i < shortcuts.length; i++) {
        data.push({
            shortcut: shortcuts[i].innerText,
            snippet: snippets[i].innerText
        });
    }
    chrome.storage.sync.set({ data }, () => {
        console.log('Data saved');
    });
}

// event listeners
addNewButton.addEventListener('click', createNewRow);
saveButton.addEventListener('click', saveData);

loadData();