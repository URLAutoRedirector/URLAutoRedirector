// UrlAutoRedirector
// Copyright (c) David Zhang, 2016
// Idea inspired by Albert Li.

var defaultOptions = {
    "options": {
        "isNewTab": true,
        "rules": []
    }
};

var isNewTab;
var rules;

function getNewUrl(url) {
    if (url.search(/^http:\/\/re.jd.com\/cps\/item\/([0-9]*).html/) != -1) {
        newUrl = url.replace(/^http:\/\/re.jd.com\/cps\/item\/([0-9]*).html/, "http://item.jd.com/$1.html");
        console.log(newUrl);
    }
    else if (url.search(/^http:\/\/m.dianping.com\/appshare\/shop\/([0-9]*)$/) != -1) {
        newUrl = url.replace(/^http:\/\/m.dianping.com\/appshare\/shop\/([0-9]*)$/, "http://www.dianping.com/shop/$1");
        console.log(newUrl);
    }
    else{
        return false;
    }

    return newUrl;
}

function redirect(newUrl) {
    getOptions();
    if (isNewTab == false) {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            var updatedTabId = tabs[0].id;
            chrome.tabs.update(updatedTabId, {url: newUrl}, function(tab) {});
        });
    }
    else{
        chrome.tabs.create({url: newUrl}, function(tab){});
    }
}

function getOptions()
{
    chrome.storage.local.get("options", function(data){
        isNewTab = data.options.isNewTab;
        rules = data.options.rules;
    });
}

chrome.tabs.onUpdated.addListener(function(tabId, change, tab) {
    if (change.status == "loading") {
        console.log(change.url);
        newUrl = getNewUrl(change.url);
        if (newUrl) {
            redirect(newUrl)
        }
    }
});

chrome.runtime.onInstalled.addListener(function(){
    chrome.storage.local.set(defaultOptions);
});