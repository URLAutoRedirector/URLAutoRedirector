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
        "isRegex": true
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
        "src": "^http://item.m.jd.com/product/(.*).html",
        "dst": "http://item.jd.com/$1.html",
        "isEnabled": true,
        "isRegex": true
      },
      {
        "src": "^(https|http)://mitem.jd.hk/ware/view.action\\?wareId=(\\d+)(&.*)",
        "dst": "https://item.jd.hk/$2.html",
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

function matchUrl(url) {
  if (rules == undefined || url == undefined) {
    return false;
  }
  for (var i = 0; i < rules.length; i++) {
    var isEnabled = rules[i].isEnabled;
    var isRegex = rules[i].isRegex;
    var src = rules[i].src;
    var dst = rules[i].dst;

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

chrome.webRequest.onBeforeRequest.addListener(
  function(request) {
    newUrl = matchUrl(request.url);
    if (newUrl) {
      console.log("Match:" + request.url);
      if (isNewTab == false) {
        chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
          chrome.tabs.update(tabs[0].id, {url: newUrl});
        });
      }
      else {
        chrome.tabs.create({url: newUrl});
      }
    }
  },
  {
    urls: ["<all_urls>"]
  },
  ["blocking"]
);

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
