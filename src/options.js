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
        "isEnabled": true,
        "isRegex": true
      },
      {
        "name": "点评无线转PC",
        "src": "^http://m.dianping.com/appshare/shop/([0-9]*)$",
        "dst": "http://www.dianping.com/shop/$1",
        "isEnabled": true,
        "isRegex": true
      },
      {
        "name": "微博无线转PC",
        "src": "^http://m.weibo.cn/(.*)$",
        "dst": "http://weibo.com/$1",
        "isEnabled": true,
        "isRegex": true
      },
      {
        "name": "BaiduToGoogle",
        "src": "https://www.baidu.com/",
        "dst": "https://www.google.com/",
        "isEnabled": true,
        "isRegex": false
      }
    ]
  }
};

var isNewTab;
var rules;

$(document).ready(function(){
  // tab option
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
  // new rule button
  $("#new-rule").click(function(){
    $("#rule-list").append(newRuleItem("", "", "", false, true, true));
  });
  // save rule button
  $("#save-rule").click(function(){
    gatherRulesOnForm();
    setOptions();
    alert("Saved successfully");
    $(".rule-item").remove();
    getOptions(showOptions);
  });
  // discard rule button
  $("#discard-rule").click(function(){
    $(".rule-item").remove();
    getOptions(showOptions);
  });
  // reset rule button
  $("#reset-rule").click(function(){
    $(".rule-item").remove();
    rules = defaultOptions.options.rules;
    setOptions();
    getOptions(showOptions);
  });
  // import rule button
  $("#import-rule").click(function(){
    var importedFile = $("#upload-rule").prop("files");
    if (importedFile.length == 0) {
      alert("Error: Please choose a file.");
      return;
    }
    else {
      var reader = new FileReader();
      reader.readAsText(importedFile[0], "UTF-8");
      reader.onload = function(evt) {
        var rulesString = evt.target.result;
        var rulesJSON = JSON.parse(rulesString);
        var numOfRules = rulesJSON.length;
        if (numOfRules == 0) {
          alert("Error: No rules in files.");
          return;
        }
        for (var i = 0; i < numOfRules; i++ ) {
          var name = rulesJSON[i].name;
          var src = rulesJSON[i].src;
          var dst = rulesJSON[i].dst;
          var isRegex = rulesJSON[i].isRegex;
          var isDeleted = false;
          var isEnabled = rulesJSON[i].isEnabled;

          rules.push({"name": name, "src":src, "dst": dst, "isEnabled": isEnabled, "isRegex": isRegex});
        }
        setOptions();
        $(".rule-item").remove();
        getOptions(showOptions);
        alert("Import successfully.");
      }
    }
  });
  // export rule button
  $("#export-rule").click(function(){
    var rulesString = JSON.stringify(rules);
    var blob = new Blob([rulesString]);

    var aLink = document.createElement('a');
    var evt = document.createEvent("HTMLEvents");
    evt.initEvent("click", false, false);
    aLink.download = "redirecting-rules.json";
    aLink.href = URL.createObjectURL(blob);
    aLink.dispatchEvent(evt);
  });
  // rule list drag & sort
  $("#rule-list").sortable({
    revert: true,
    cursor: "move"
  });
  $("ul,li").disableSelection();
});

$(document).on("click", ".is-regex", function(){
  if ($(this).data("is-regex") == true) {
    $(this).data("is-regex", false);
    $(this).attr("class", "fa fa-square-o fa-lg is-regex");
  }
  else if ($(this).data("is-regex") == false) {
    $(this).data("is-regex", true);
    $(this).attr("class", "fa fa-check-square-o fa-lg is-regex");
  }
});

$(document).on("click", ".is-enabled", function(){
  if ($(this).data("is-enabled") == true) {
    $(this).data("is-enabled", false);
    $(this).attr("class", "fa fa-toggle-off fa-lg is-enabled");
  }
  else if ($(this).data("is-enabled") == false) {
    $(this).data("is-enabled", true);
    $(this).attr("class", "fa fa-toggle-on fa-lg is-enabled");
  }
});

$(document).on("click", ".is-deleted", function(){
  var r = confirm("Are you sure to delete");
  if (r == true) {
    $(this).data("is-deleted", true);
    gatherRulesOnForm();
    setOptions();
    $(".rule-item").remove();
    getOptions(showOptions);
  }
});

function gatherRulesOnForm() {
  var numOfRules = $(".rule-item").length;
  rules = [];
  for (var i = 0; i < numOfRules; i++ ) {
    var name = $(".name:eq("+i+")").val();
    var src = $(".src:eq("+i+")").val();
    var dst = $(".dst:eq("+i+")").val();
    var isRegex = $(".is-regex:eq("+i+")").data("is-regex");
    var isDeleted = $(".is-deleted:eq("+i+")").data("is-deleted");
    var isEnabled = $(".is-enabled:eq("+i+")").data("is-enabled");
    if (!isDeleted) {
      rules.push({"name": name, "src":src, "dst": dst, "isEnabled": isEnabled, "isRegex": isRegex});
    }
  }
}

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
    $("#rule-list").append(newRuleItem(rules[i].name, rules[i].src, rules[i].dst, rules[i].isRegex, rules[i].isEnabled, false));
  }
}

function newRuleItem(name, src, dst, isRegex, isEnabled, isNew) {
  var ruleItemHTML = "<li class=\"ui-state-default rule-item\">" +
                     "<i title=\"Drag item to reorder\" class=\"fa fa-bars drag-item\"></i>" +
                     "<input type=\"text\" class=\"name\" value=" + name + ">" +
                     "<input type=\"text\" class=\"src\" value=" + src + ">" +
                     "<input type=\"text\" class=\"dst\" value=" + dst + ">" +
                     "<i title=\"Enable RegExp\" data-is-regex=\"" + isRegex + "\" class=\"fa " + (isRegex ? "fa-check-square-o" : "fa-square-o") +" fa-lg is-regex\"></i>" +
                     "<i title=\"Enable/Disable\" data-is-enabled=\"" + isEnabled + "\" class=\"fa " + (isEnabled ? "fa-toggle-on" : "fa-toggle-off") + " fa-lg is-enabled\"></i>" +
                     "<i title=\"Delete rule\" data-is-deleted=\"false\" class=\"fa fa-ban fa-lg is-deleted\"></i>" +
                     "</li>";
  return ruleItemHTML;
}

document.addEventListener("DOMContentLoaded", getOptions(showOptions));

// share to twitter
!function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0],p=/^http:/.test(d.location)?'http':'https';if(!d.getElementById(id)){js=d.createElement(s);js.id=id;js.src=p+'://platform.twitter.com/widgets.js';fjs.parentNode.insertBefore(js,fjs);}}(document, 'script', 'twitter-wjs');
