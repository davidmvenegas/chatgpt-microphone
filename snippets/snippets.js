document.getElementById('closeSnippets').addEventListener('click', () => {
    window.close();
});

// state variables
let isEditing = false;
let deletedRowsQueue = [];

// select elements
const tableContainer = document.getElementById('snippetsTable');
const cancelNewButton = document.getElementById('cancelNewSnippet');
const saveNewButton = document.getElementById('saveNewSnippet');
const addNewButton = document.getElementById('addNewSnippet');
const editButton = document.getElementById('editSnippets');
const saveButton = document.getElementById('saveSnippets');
const deleteIcons = document.getElementsByClassName('delete-icon');

// create new row
function createNewRow(fromExistingData) {
    const newRow = document.createElement('div');
    newRow.classList.add('snippet-row');
    newRow.innerHTML = `
        <div class="cell"><div class="SS_shortcut auto-grow" contenteditable="true" data-paste></div></div>
        <div class="cell"><div class="SS_snippet auto-grow" contenteditable="true" data-paste></div></div>
        <img src="../assets/delete.svg" class="delete-icon" />
    `;
    tableContainer.appendChild(newRow);
    // add paste and delete event listeners
    newRow.querySelector('.SS_shortcut').addEventListener('paste', handlePaste);
    newRow.querySelector('.SS_snippet').addEventListener('paste', handlePaste);
    newRow.querySelector('.delete-icon').addEventListener('click', handleDeleteClick);
    console.log('fromExistingData', fromExistingData)
    if (!fromExistingData) {
        console.log('new row that is not from existing data')
        editButton.style.display = 'none';
        saveButton.style.display = 'none';
        cancelNewButton.style.display = 'inherit';
        saveNewButton.style.display = 'inherit';
        newRow.querySelector('.SS_shortcut').focus();
    }
}

// clean pasted text
function handlePaste(e) {
    e.preventDefault();
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

// toggle editing
function toggleEditing() {
    if (isEditing) {
        endEditing(false);
    } else {
        startEditing();
    }
}

// start editing
function startEditing() {
    editButton.innerText = 'Cancel';
    addNewButton.style.display = 'none';
    for (let i = 0; i < deleteIcons.length; i++) {
        deleteIcons[i].style.display = 'inherit';
    }
    isEditing = true;
}

// handle delete click
function handleDeleteClick(event) {
    const rowToDelete = event.target.parentNode;
    const rowIndex = Array.from(tableContainer.children).indexOf(rowToDelete);
    const shortcutValue = rowToDelete.querySelector('.SS_shortcut').innerText;
    const isDeleted = deletedRowsQueue.some(row => row.shortcut === shortcutValue);
    const shortcutCell = rowToDelete.children[0];
    const snippetCell = rowToDelete.children[1];
    if (isDeleted) {
        shortcutCell.classList.remove('deleted-cell');
        snippetCell.classList.remove('deleted-cell');
        deletedRowsQueue = deletedRowsQueue.filter(row => row.shortcut !== shortcutValue);
    } else {
        shortcutCell.classList.add('deleted-cell');
        snippetCell.classList.add('deleted-cell');
        deletedRowsQueue.push({ element: rowToDelete, rowIndex: rowIndex, shortcut: shortcutValue });
    }
    console.log(deletedRowsQueue);
}

// end editing
function endEditing(saveChanges) {
    editButton.innerText = 'Edit';
    addNewButton.style.display = 'inherit';
    for (let i = 0; i < deleteIcons.length; i++) {
        deleteIcons[i].style.display = 'none';
    }
    // if saveChanges, delete rows marked for deletion
    if (saveChanges) {
        deletedRowsQueue.forEach(row => row.element.remove());
    } else {
        // else, return rows to normal
        deletedRowsQueue.forEach(row => {
            row.element.children[0].classList.remove('deleted-cell');
            row.element.children[1].classList.remove('deleted-cell');
        });
        deletedRowsQueue = [];
    }
    isEditing = false;
}

// save data
function saveData() {
    if (isEditing) endEditing(true);
    const shortcuts = document.getElementsByClassName('SS_shortcut');
    const snippets = document.getElementsByClassName('SS_snippet');
    const snippetsData = [];
    for (let i = 0; i < shortcuts.length; i++) {
        const shortcutValue = shortcuts[i].innerText;
        // only include rows that are not marked for deletion
        if (!deletedRowsQueue.some(row => row.shortcut === shortcutValue)) {
            snippetsData.push({
                shortcut: shortcutValue,
                snippet: snippets[i].innerText
            });
        }
    }
    deletedRowsQueue = [];
    chrome.storage.sync.set({ snippetsData: snippetsData }, () => {
        console.log('Data saved');
        // if no data, create a starting row
        console.log('Data: ', snippetsData)
        if (snippetsData.length === 0) {
            createNewRow(false);
        }
    });
}

// load data
function loadData() {
    chrome.storage.sync.get('snippetsData', ({ snippetsData }) => {
        // if no data, create a starting row
        if (!snippetsData || snippetsData.length === 0) {
            createNewRow(false);
        } else {
            // else, create rows for each item in snippetsData
            snippetsData.forEach(item => {
                createNewRow(true);
                const shortcuts = document.getElementsByClassName('SS_shortcut');
                const snippets = document.getElementsByClassName('SS_snippet');
                shortcuts[shortcuts.length - 1].innerText = item.shortcut;
                snippets[snippets.length - 1].innerText = item.snippet;
            });
        }
    });
}

// event listeners
saveButton.addEventListener('click', () => saveData());
editButton.addEventListener('click', () => toggleEditing());
addNewButton.addEventListener('click', () => createNewRow(false));


loadData();