// UrlAutoRedirector
// Copyright (c) David Zhang, 2016
// Idea inspired by Albert Li.

// default options
var defaultOptions = {
    "options": {
        "isNewTab": true,
        "rules": [
            {
                "name": "京东中间页",
                "src": "^http:\/\/re.jd.com\/cps\/item\/([0-9]*).html",
                "dst": "http://item.jd.com/$1.html",
                "isRegex": true
            },
            {
                "name": "点评无线端",
                "src": "^http://m.dianping.com/appshare/shop/([0-9]*)$",
                "dst": "http://www.dianping.com/shop/$1",
                "isRegex": true
            },
            {
                "name": "BaiduToGoogle :)",
                "src": "https://www.baidu.com/",
                "dst": "https://www.google.com/",
                "isRegex": false
            }
        ]
    }
};

var isNewTab;
var rules;

function matchUrl(url) {
    for (var i=0; i<rules.length; i++) {
        var isRegex = rules[i].isRegex;
        var src = rules[i].src;
        var dst = rules[i].dst;

        if (isRegex) {
            var re = new RegExp(src);
            if (url.search(re) != -1) {
                newUrl = url.replace(re, dst);
                return newUrl;
            }
        }
        else {
            if (url == src) {
                return dst;
            }
        }
    }
    
    return false;
}

function redirect(newUrl) {
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

function getOptions(callback)
{
    chrome.storage.local.get("options", function(data){
        isNewTab = data.options.isNewTab;
        rules = data.options.rules;
        callback();
    });
}

chrome.tabs.onUpdated.addListener(function(tabId, change, tab) {
    if (change.status == "loading") {
        console.log("Captured Url: " + change.url);
        getOptions(function(){
            newUrl = matchUrl(change.url);
            console.log("New Url: " + newUrl);
            if (newUrl) {
                redirect(newUrl)
            }
        });
    }
});

chrome.runtime.onInstalled.addListener(function(){
    chrome.storage.local.set(defaultOptions);
});
