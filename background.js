// open snippets page on install
self.addEventListener('install', () => {
    chrome.tabs.create({ url: 'snippets/snippets.html' });
});
