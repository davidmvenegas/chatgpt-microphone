document.getElementById('closeSnippets').addEventListener('click', () => {
    window.close();
});


// state variables
let isEditing = false;
let deletedRowsQueue = [];
const changedCells = new Set();


// select elements
const tableContainer = document.getElementById('snippetsTable');
const addNewButton = document.getElementById('addNewSnippet');
const editButton = document.getElementById('editSnippets');
const saveButton = document.getElementById('saveSnippets');
const deleteIcons = document.getElementsByClassName('delete-icon');


// create new row
function createNewRow() {
    const newRow = document.createElement('div');
    newRow.classList.add('snippet-row');
    newRow.innerHTML = `
        <div class="cell"><div class="SS_shortcut auto-grow" contenteditable="true" data-paste></div></div>
        <div class="cell"><div class="SS_snippet auto-grow" contenteditable="true" data-paste></div></div>
        <img src="../assets/delete.svg" class="delete-icon" />
    `;
    tableContainer.appendChild(newRow);
    // select elements
    const shortcutCell = newRow.querySelector('.SS_shortcut');
    const snippetCell = newRow.querySelector('.SS_snippet');
    const deleteIcon = newRow.querySelector('.delete-icon');
    // add paste/change/delete event listeners
    shortcutCell.addEventListener('paste', cleanPastedText);
    shortcutCell.addEventListener('input', handleTextChange);
    snippetCell.addEventListener('paste', cleanPastedText);
    snippetCell.addEventListener('input', handleTextChange);
    deleteIcon.addEventListener('click', handleDeleteClick);
    // add original text attribute
    shortcutCell.setAttribute('data-original-text', shortcutCell.innerText);
    snippetCell.setAttribute('data-original-text', snippetCell.innerText);
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


// save new row -> TODO: use this in modal
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
            saveButton.disabled = true;
        });
    });
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


// end editing
function endEditing(saveChanges) {
    editButton.innerText = 'Edit';
    saveButton.innerText = 'Save';
    addNewButton.style.display = 'inherit';
    for (let i = 0; i < deleteIcons.length; i++) {
        deleteIcons[i].style.display = 'none';
    }
    if (saveChanges) {
        // if saving changes, delete rows in queue
        deletedRowsQueue.forEach(row => row.element.remove());
    } else {
        // else, return rows in queue to normal
        deletedRowsQueue.forEach(row => {
            row.element.children[0].classList.remove('deleted-cell');
            row.element.children[1].classList.remove('deleted-cell');
        });
        deletedRowsQueue = [];
    }
    saveButton.disabled = true;
    isEditing = false;
}


// handle text change
function handleTextChange(e) {
    const cell = e.target;
    const cellIndex = Array.from(cell.parentNode.parentNode.children).indexOf(cell.parentNode);
    const originalText = cell.getAttribute('data-original-text');
    const currentText = cell.innerText;
    if (originalText !== currentText) {
        cell.parentNode.classList.add('changed-cell');
        changedCells.add(cellIndex);
    } else {
        cell.parentNode.classList.remove('changed-cell');
        changedCells.delete(cellIndex);
    }
    saveButton.disabled = changedCells.size === 0;
}


// handle delete click
function handleDeleteClick(e) {
    const rowToDelete = e.target.parentNode;
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
        deletedRowsQueue.push({ element: rowToDelete, shortcut: shortcutValue });
    }
    saveButton.disabled = deletedRowsQueue.length === 0;
}


// save data
function saveData() {
    if (isEditing) endEditing(true);
    const shortcuts = document.getElementsByClassName('SS_shortcut');
    const snippets = document.getElementsByClassName('SS_snippet');
    const snippetsData = [];
    for (let i = 0; i < shortcuts.length; i++) {
        const shortcutValue = shortcuts[i].innerText;
        // only save rows NOT marked for deletion
        if (!deletedRowsQueue.some(row => row.shortcut === shortcutValue)) {
            snippetsData.push({
                shortcut: shortcutValue,
                snippet: snippets[i].innerText
            });
        }
    }
    chrome.storage.sync.set({ snippetsData: snippetsData }, () => {
        saveButton.disabled = true;
        editButton.disabled = snippetsData.length === 0;
    });
    // update data-original-text for each cell
    for (let i = 0; i < shortcuts.length; i++) {
        const shortcutValue = shortcuts[i].innerText;
        // only include rows that are not marked for deletion
        if (!deletedRowsQueue.some(row => row.shortcut === shortcutValue)) {
            shortcuts[i].setAttribute('data-original-text', shortcutValue);
            snippets[i].setAttribute('data-original-text', snippets[i].innerText);
        }
    }
    deletedRowsQueue = [];
}


// load data
function loadData() {
    chrome.storage.sync.get('snippetsData', ({ snippetsData }) => {
        // if no data, disable edit button
        if (!snippetsData || snippetsData.length === 0) {
            editButton.disabled = true;
        } else {
            // else, enable edit button and add data to table
            editButton.disabled = false;
            snippetsData.forEach(item => {
                createNewRow();
                const shortcuts = document.getElementsByClassName('SS_shortcut');
                const snippets = document.getElementsByClassName('SS_snippet');
                shortcuts[shortcuts.length - 1].setAttribute('data-original-text', item.shortcut);
                snippets[snippets.length - 1].setAttribute('data-original-text', item.snippet);
                shortcuts[shortcuts.length - 1].innerText = item.shortcut;
                snippets[snippets.length - 1].innerText = item.snippet;
            });
        }
    });
}


// event listeners
saveButton.addEventListener('click', () => saveData());
editButton.addEventListener('click', () => isEditing ? endEditing(false) : startEditing());
// addNewButton.addEventListener('click', () => openModal()); // TODO: build modal


loadData();