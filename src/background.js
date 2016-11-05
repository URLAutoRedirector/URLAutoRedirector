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
        "src": "^https://m.douban.com/note/(.*)/",
        "dst": "https://www.douban.com/note/$1/",
        "isEnabled": true,
        "isRegex": true
      },
      {
        "src": "^https://h5.ele.me/shop/#id=(\\d+)",
        "dst": "https://www.ele.me/shop/$1",
        "isEnabled": true,
        "isRegex": true
      },
      {
        "src": "^https://mdianying.baidu.com/movie/detail\\?movieId=(\\d+)",
        "dst": "https://www.nuomi.com/film/$1",
        "isEnabled": true,
        "isRegex": true
      },
      {
        "src": "^http://www.bilibili.com/mobile/video/(av\\d+).html",
        "dst": "http://www.bilibili.com/video/$1/",
        "isEnabled": true,
        "isRegex": true
      },
      {
        "src": "^http://m.acfun.tv/v/\\?ac=(\\d+)",
        "dst": "http://www.acfun.tv/v/ac$1",
        "isEnabled": true,
        "isRegex": true
      },
      {
        "src": "^http://h5.m.taobao.com/awp/core/detail.htm\\?id=(\\d+)",
        "dst": "https://item.taobao.com/item.htm?id=$1",
        "isEnabled": true,
        "isRegex": true
      },
      {
        "src": "^http://m.qidian.com/book/showbook.aspx\\?bookid=(\\d+)",
        "dst": "http://book.qidian.com/info/$1",
        "isEnabled": true,
        "isRegex": true
      },
      {
        "src": "^http://m.yinyuetai.com/video/(.*)",
        "dst": "http://v.yinyuetai.com/video/$1",
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

function notify()
{
  chrome.notifications.create({
    "type": "basic",
    "iconUrl": chrome.extension.getURL("images/icon-48.png"),
    "title": chrome.i18n.getMessage("ext_name"),
    "message": chrome.i18n.getMessage("prompt_msg")
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
      // send Chrome notification
      notify();
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
