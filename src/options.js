// UrlAutoRedirector
// Copyright (c) David Zhang, 2016
// Idea inspired by Albert Li.

// default options
var defaultOptions = {
  "options": {
    "isNewTab": false,
    "rules": [
      {
        "name": "京东中间页跳过",
        "src": "^http://re.jd.com/cps/item/([0-9]*).html",
        "dst": "http://item.jd.com/$1.html",
        "isRegex": true
      },
      {
        "name": "点评无线转PC",
        "src": "^http://m.dianping.com/appshare/shop/([0-9]*)$",
        "dst": "http://www.dianping.com/shop/$1",
        "isRegex": true
      },
      {
        "name": "微博无线转PC",
        "src": "^http://m.weibo.cn/(.*)$",
        "dst": "http://weibo.com/$1",
        "isRegex": true
      },
      {
        "name": "BaiduToGoogle",
        "src": "https://www.baidu.com/",
        "dst": "https://www.google.com/",
        "isRegex": false
      }
    ]
  }
};

var isNewTab;
var rules;

$(document).ready(function(){
  $(".tabOption").change(function(){
    var tabOption = $("input[name='tabOption']:checked").val();
    if (tabOption == 'newTab') {
      isNewTab = true;
      setOptions();
    }
    if (tabOption == 'curTab') {
      isNewTab = false;
      setOptions();
    }
  });

  $("#new-rule").click(function(){
    $("#rule-list").append(newRuleItem("", "", "", false));
  });

  $("#save-rule").click(function(){
    var numOfRules = $(".rule-item").length;
    rules = [];
    for (var i=0; i<numOfRules; i++) {
      var name = $(".name:eq("+i+")").val();
      var src = $(".src:eq("+i+")").val();
      var dst = $(".dst:eq("+i+")").val();
      var isRegex = $(".is-regex:eq("+i+")").prop("checked");
      var isDelete = $(".is-delete:eq("+i+")").prop("checked");
      if (!isDelete) {
        rules.push({"name": name, "src":src, "dst": dst, "isRegex": isRegex});
      }
    }
    setOptions();
    alert("Saved successfully");
    $(".rule-item").remove();
    getOptions(showOptions);
  });

  $("#discard-rule").click(function(){
    $(".rule-item").remove();
    getOptions(showOptions);
  });

  $("#reset-rule").click(function(){
    $(".rule-item").remove();
    rules = defaultOptions.options.rules;
    setOptions();
    getOptions(showOptions);
  });

  $("#rule-list").sortable({
    revert: true,
    cursor: 'move'
  });

  $("ul,li").disableSelection();
});

function setOptions() {
  var newOptions = {
    "options": {
      "isNewTab": isNewTab,
      "rules": rules
    }
  }
  chrome.storage.local.set(newOptions);
}

function getOptions(callback) {
  chrome.storage.local.get("options", function(data){
    isNewTab = data.options.isNewTab;
    rules = data.options.rules;
    callback();
  });
}

function showOptions() {
  if (isNewTab) {
    $("input[type='radio'][name='tabOption'][value='newTab']").attr("checked", "checked");
  }
  else {
    $("input[type='radio'][name='tabOption'][value='curTab']").attr("checked", "checked");
  }
  for (var i=0; i<rules.length; i++) {
    $("#rule-list").append(newRuleItem(rules[i].name, rules[i].src, rules[i].dst, rules[i].isRegex));
  }
}

function newRuleItem(name, src, dst, isRegex) {
  var ruleItemHTML = "<li class=\"ui-state-default rule-item\">" +
                     "<input type=\"text\" class=\"name\" value=" + name + ">" +
                     "<input type=\"text\" class=\"src\" value=" + src + ">" +
                     "<input type=\"text\" class=\"dst\" value=" + dst + ">" +
                     "<input type=\"checkbox\" class=\"is-regex\"" + (isRegex == true ? "checked" : "") + ">" +
                     "<input type=\"checkbox\" class=\"is-delete\">" +
                     "<i class=\"fa fa-bars drag-item\"></i>" +
                     "</li>";
  return ruleItemHTML;
}

document.addEventListener("DOMContentLoaded", getOptions(showOptions));

// share to twitter
!function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0],p=/^http:/.test(d.location)?'http':'https';if(!d.getElementById(id)){js=d.createElement(s);js.id=id;js.src=p+'://platform.twitter.com/widgets.js';fjs.parentNode.insertBefore(js,fjs);}}(document, 'script', 'twitter-wjs');
