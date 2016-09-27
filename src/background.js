// UrlAutoRedirector
// Copyright (c) David Zhang, 2016
// Idea inspired by Albert Li.

// default options
var defaultOptions = {
  "options": {
    "isNewTab": false,
    "rules": [
      {
        "src": "^http://re.jd.com/cps/item/([0-9]*).html",
        "dst": "http://item.jd.com/$1.html",
        "isEnabled": true,
        "isRegex": true
      },
      {
        "src": "^http://m.dianping.com/appshare/shop/([0-9]*)$",
        "dst": "http://www.dianping.com/shop/$1",
        "isEnabled": true,
        "isRegex": true
      },
      {
        "src": "^http://m.weibo.cn/([0-9]+)$",
        "dst": "http://weibo.com/$1",
        "isEnabled": true,
        "isRegex": true
      },
      {
        "src": "^http://xw.qq.com/sports/(\\d{8})(\\d{6})/(.*)$",
        "dst": "http://sports.qq.com/a/$1/$2.htm",
        "isEnabled": true,
        "isRegex": true,
      },
      {
        "src": "^http://m.autohome.com.cn/shuoke/(.*).html",
        "dst": "http://shuoke.autohome.com.cn/article/$1.html",
        "isEnabled": true,
        "isRegex": true
      },
      {
        "src": "^http://m.ziroom.com/BJ/room/(.*).html",
        "dst": "http://www.ziroom.com/z/vr/$1.html",
        "isEnabled": true,
        "isRegex": true
      },
      {
        "src": "^http://m.csdn.net/article/(.*)$",
        "dst": "http://www.csdn.net/article/$1",
        "isEnabled": true,
        "isRegex": true
      },
      {
        "src": "^http://m.afwing.com/(.*)$",
        "dst": "http://www.afwing.com/$1",
        "isEnabled": true,
        "isRegex": true
      },
      {
        "src": "https://www.baidu.com/",
        "dst": "https://www.google.com/",
        "isEnabled": false,
        "isRegex": false
      }
    ]
  }
};

var isNewTab;
var rules;
var lastTabId = 0;

function matchUrl(url) {
  if (rules == undefined || url == undefined) {
    return false;
  }
  for (var i=0; i<rules.length; i++) {
    var isEnabled = rules[i].isEnabled;
    var isRegex = rules[i].isRegex;
    var src = rules[i].src;
    var dst = rules[i].dst;
    console.log(src);
    console.log(dst);

    if (isEnabled) {
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
  }

  return false;
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
    newUrl = matchUrl(change.url);
    if (newUrl) {
      if (isNewTab == false) {
        lastTabId = tabId;
        chrome.tabs.update({url: newUrl});
      }
      else {
        chrome.tabs.create({url: newUrl}, function(tab){
          chrome.tabs.insertCSS(tab.id, {file: "prompt.css"});
          chrome.tabs.executeScript(tab.id, {file: "lib/jquery-1.12.2.min.js"});
          chrome.tabs.executeScript(tab.id, {file: "prompt.js"});
        });
      }
    }
  }
  if (change.status == "complete" && tabId == lastTabId) {
    chrome.tabs.insertCSS(tab.id, {file: "prompt.css"});
    chrome.tabs.executeScript(tab.id, {file: "lib/jquery-1.12.2.min.js"});
    chrome.tabs.executeScript(tab.id, {file: "prompt.js"});
    lastTabId = 0;
  }
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
  if (request.type == "syncOptions") {
    isNewTab = request["options"]["options"]["isNewTab"];
    rules = request["options"]["options"]["rules"];
  }
  if (request.type == "resetRules") {
    var newOptions = {
      "options": {
        "isNewTab": isNewTab,
        "rules": defaultOptions["options"]["rules"]
      }
    }
    rules = defaultOptions["options"]["rules"];
    chrome.storage.local.set(newOptions);
    var msg = {
      type: "reloadOptions"
    };
    chrome.runtime.sendMessage(msg, function(response){
      console.log("Send msg[reloadOptions]");
    });
  }
});

getOptions(function(){
  console.log("getOption Done");
});

chrome.runtime.onInstalled.addListener(function(){
  chrome.storage.local.set(defaultOptions);
});
