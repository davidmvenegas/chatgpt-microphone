document.getElementById('closeSnippets').addEventListener('click', () => {
    window.close();
});

// state variables
let isEditing = false;
let isAddingNew = false;
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
    // add paste, input, and delete event listeners
    const shortcutCell = newRow.querySelector('.SS_shortcut');
    const snippetCell = newRow.querySelector('.SS_snippet');
    snippetCell.addEventListener('paste', cleanPastedText);
    shortcutCell.addEventListener('paste', cleanPastedText);
    snippetCell.addEventListener('input', handleCellInput);
    shortcutCell.addEventListener('input', handleCellInput);
    newRow.querySelector('.delete-icon').addEventListener('click', handleDeleteClick);
    if (!fromExistingData) {
        editButton.style.display = 'none';
        saveButton.style.display = 'none';
        addNewButton.style.display = 'none';
        cancelNewButton.style.display = 'inline-block';
        saveNewButton.style.display = 'inline-block';
        newRow.querySelector('.SS_shortcut').focus();
        isAddingNew = true;
    }
}

// cancel new row
function cancelNewRow() {
    tableContainer.removeChild(tableContainer.lastChild);
    editButton.style.display = 'inline-block';
    saveButton.style.display = 'inline-block';
    addNewButton.style.display = 'inline-block';
    cancelNewButton.style.display = 'none';
    saveNewButton.style.display = 'none';
    isAddingNew = false;
}

// clean pasted text
function cleanPastedText(e) {
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

// save new row
function saveNewRow() {
    const newShortcut = tableContainer.lastChild.querySelector('.SS_shortcut').innerText;
    const newSnippet = tableContainer.lastChild.querySelector('.SS_snippet').innerText;
    chrome.storage.sync.get('snippetsData', data => {
        const snippetsData = data.snippetsData;
        snippetsData.push({
            shortcut: newShortcut,
            snippet: newSnippet
        });
        chrome.storage.sync.set({ snippetsData: snippetsData }, () => {
            editButton.style.display = 'inline-block';
            saveButton.style.display = 'inline-block';
            addNewButton.style.display = 'inline-block';
            cancelNewButton.style.display = 'none';
            saveNewButton.style.display = 'none';
            editButton.disabled = false;
            saveButton.disabled = false;
            isAddingNew = false;
        });
    });
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
    saveButton.innerText = 'Confirm';
    addNewButton.style.display = 'none';
    for (let i = 0; i < deleteIcons.length; i++) {
        deleteIcons[i].style.display = 'inherit';
    }
    isEditing = true;
}

// handle cell input
function handleCellInput(e) {
    const cell = e.target.parentNode;
    if (cell.innerText === '') {
        cell.classList.add('empty-cell');
    } else {
        cell.classList.remove('empty-cell');
    }
}

// handle delete click
function handleDeleteClick(e) {
    const rowToDelete = e.target.parentNode;
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
}

// end editing
function endEditing(saveChanges) {
    editButton.innerText = 'Edit';
    saveButton.innerText = 'Save';
    addNewButton.style.display = 'inherit';
    for (let i = 0; i < deleteIcons.length; i++) {
        deleteIcons[i].style.display = 'none';
    }
    // if saving changes, delete rows marked for deletion
    if (saveChanges) {
        deletedRowsQueue.forEach(row => row.element.remove());
    } else {
        // else, return deleted rows to normal state
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
        // if no data, create a starting row
        if (snippetsData.length === 0) {
            editButton.disabled = true;
            saveButton.disabled = true;
            createNewRow(false);
        }
    });
}

// load data
function loadData() {
    chrome.storage.sync.get('snippetsData', ({ snippetsData }) => {
        // if no data, disable edit/save buttons and create a starting row
        if (!snippetsData || snippetsData.length === 0) {
            editButton.disabled = true;
            saveButton.disabled = true;
            createNewRow(false);
        } else {
            // else, enable edit/save buttons and create rows for each item
            editButton.disabled = false;
            saveButton.disabled = false;
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
saveNewButton.addEventListener('click', () => saveNewRow());
cancelNewButton.addEventListener('click', () => cancelNewRow());


loadData();