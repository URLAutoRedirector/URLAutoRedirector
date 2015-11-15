var options = {
    "is_new_tab": false,
    "rules": []
};

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
    if (options["is_new_tab"] == false) {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            var updatedTabId = tabs[0].id;
            chrome.tabs.update(updatedTabId, {url: newUrl}, function(tab) {
                //chrome.pageAction.show(updatedTabId);
            });
        });
    }
    else{
        chrome.tabs.create({url: newUrl}, function(tab){
            //chrome.pageAction.show(updatedTabId);
        });
    }
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