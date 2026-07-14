// URLAutoRedirector
// Copyright (c) David Zhang, 2022
// Idea inspired by Albert Li.

importScripts('default-options.js');

var isNewTab;
var isNotify;
var rules;
var lastTabId = 0;

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
          var newUrl = url.replace(re, dst);
          if (url != newUrl) {
            return newUrl;
          }
        }
      } else {
        if (url == src) {
          return dst;
        }
      }
    }
  }

  return false;
}

function getOptions(callback) {
  chrome.storage.sync.get('options', function (data) {
    if (data.options) {
      isNewTab = data.options.isNewTab;
      isNotify = data.options.isNotify;
      rules = data.options.rules;
    }
    callback();
  });
}

function notify() {
  if (!isNotify) {
    return;
  }

  chrome.notifications.create({
    type: 'progress',
    iconUrl: chrome.runtime.getURL('images/icon-48.png'),
    title: chrome.i18n.getMessage('ext_name'),
    message: chrome.i18n.getMessage('prompt_msg'),
    progress: 100,
  });
}

chrome.tabs.onUpdated.addListener(function (tabId, change, _tab) {
  if (change.status == 'loading') {
    var newUrl = matchUrl(change.url);
    if (newUrl) {
      console.log('[notice] matching with tabs event');
      console.log('[notice] matched: ' + change.url);
      console.log('[notice] redirecting to: ' + newUrl);
      if (isNewTab == false) {
        lastTabId = tabId;
        chrome.tabs.update(tabId, {url: newUrl});
      } else {
        chrome.tabs.create({url: newUrl}, function (_tab) {
          notify();
        });
      }
    }
  }
  if (change.status == 'complete' && tabId == lastTabId) {
    notify();
    lastTabId = 0;
  }
});

chrome.runtime.onMessage.addListener(function (
  request,
  _sender,
  _sendResponse,
) {
  console.log('[msg:recv] ' + request.type);
  if (request.type == 'syncOptions') {
    isNewTab = request['options']['options']['isNewTab'];
    isNotify = request['options']['options']['isNotify'];
    rules = request['options']['options']['rules'];
  }
  if (request.type == 'resetRules') {
    var newOptions = {
      options: {
        isNewTab: isNewTab,
        isNotify: isNotify,
        rules: defaultOptions['options']['rules'],
      },
    };
    rules = defaultOptions['options']['rules'];
    chrome.storage.sync.set(newOptions, function () {
      var msg = {
        type: 'reloadOptions',
      };
      chrome.runtime.sendMessage(msg, function (_response) {
        console.log('[msg:send] reloadOptions');
      });
    });
  }
});

getOptions(function () {
  console.log('[notice] getOption Done');
});

function hasValidOptions(options) {
  return options && Array.isArray(options.rules);
}

chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason != 'install' && details.reason != 'update') {
    return;
  }

  chrome.storage.sync.get('options', function (syncData) {
    if (hasValidOptions(syncData.options)) {
      console.log('[event:onInstalled] found sync options');
      return;
    }

    chrome.storage.local.get('options', function (localData) {
      if (hasValidOptions(localData.options)) {
        console.log('[event:onInstalled] found local options and migrating');
        chrome.storage.sync.set(localData, function () {
          if (!chrome.runtime.lastError) {
            chrome.storage.local.clear();
          }
        });
      } else {
        console.log('[event:onInstalled] set default options');
        chrome.storage.sync.set(defaultOptions);
      }
    });
  });
});
