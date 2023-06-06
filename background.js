chrome.runtime.onInstalled.addListener((details) => {
    // open snippets page on install
    if (details.reason === 'install') {
        chrome.tabs.create({ url: 'snippets/snippets.html' });
    } else if (details.reason === 'update') {
        // nothing here for now
    }
});
