document.getElementById('closeSnippets').addEventListener('click', () => {
    window.close();
});

// state variables
let isEditing = false;

// select elements
const tableContainer = document.getElementById('snippetsTable');
const addNewButton = document.getElementById('addNewSnippet');
const editButton = document.getElementById('editSnippets');
const saveButton = document.getElementById('saveSnippets');
const deleteIcons = document.getElementsByClassName('delete-icon');

// create new row
function createNewRow() {
    const newRow = document.createElement('div');
    newRow.classList.add('row');
    newRow.innerHTML = `
        <div class="cell"><div class="SS_shortcut auto-grow" contenteditable="true" data-paste></div></div>
        <div class="cell"><div class="SS_snippet auto-grow" contenteditable="true" data-paste></div></div>
        <img src="../assets/delete.svg" class="delete-icon" />
    `;
    tableContainer.appendChild(newRow);
    newRow.querySelector('.SS_shortcut').addEventListener('paste', handlePaste);
    newRow.querySelector('.SS_snippet').addEventListener('paste', handlePaste);
}

// clean pasted text
function handlePaste(e) {
    e.preventDefault();
    console.log('pasted')
    const plainText = e.clipboardData.getData('text/plain');
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const textNode = document.createTextNode(plainText);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
}

// toggle edit icons
function toggleEditIcons() {
    if (isEditing) {
        hideEditIcons();
        isEditing = false;
    } else {
        showEditIcons();
        isEditing = true;
    }
}

// show edit icons
function showEditIcons() {
    editButton.innerText = 'Done';
    for (let i = 0; i < deleteIcons.length; i++) {
        deleteIcons[i].style.display = 'inherit';
    }
    isEditing = true;
}

// hide edit icons
function hideEditIcons() {
    editButton.innerText = 'Edit';
    for (let i = 0; i < deleteIcons.length; i++) {
        deleteIcons[i].style.display = 'none';
    }
    isEditing = false;
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

// load data
function loadData() {
    chrome.storage.sync.get('data', ({ data }) => {
        data.forEach(item => {
            createNewRow();
            const shortcuts = document.getElementsByClassName('SS_shortcut');
            const snippets = document.getElementsByClassName('SS_snippet');
            shortcuts[shortcuts.length - 1].innerText = item.shortcut;
            snippets[snippets.length - 1].innerText = item.snippet;
        });
    });
}

// event listeners
addNewButton.addEventListener('click', createNewRow);
saveButton.addEventListener('click', saveData);
editButton.addEventListener('click', toggleEditIcons);


loadData();