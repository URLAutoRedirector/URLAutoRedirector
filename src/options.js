// URLAutoRedirector
// Copyright (c) David Zhang, 2018
// Idea inspired by Albert Li.

var isNewTab;
var isNotify;
var rules;

$(document).ready(function() {
  // i18n UI
  setInterface();
  // tab option
  $(".tabOption").change(function() {
    var tabOption = $("input[name='tabOption']:checked").val();
    if (tabOption == 'newTab') {
      isNewTab = true;
    }
    if (tabOption == 'curTab') {
      isNewTab = false;
    }

    isNotify = $("input[name='notifyOption']").prop("checked");

    setOptions();
  });
  // new rule button
  $("#new-rule").click(function() {
    $("#rule-list").append(newRuleItem("", "", false, true, true));
  });
  // reset rule button
  $("#reset-rule").click(function() {
    var confirmReset = chrome.i18n.getMessage("confirm_reset");
    var r = confirm(confirmReset);
    if (r == true) {
      $(".rule-item").remove();
      var msg = {
        type: "resetRules"
      };
      chrome.runtime.sendMessage(msg, function(response) {
        console.log("Send msg[resetRules]");
      });
    }
  });
  // import rule button
  $("#import-rule").click(function() {
    var importedFile = $("#upload-rule").prop("files");
    if (importedFile.length == 0) {
      alert(chrome.i18n.getMessage("import_error_no_file"));
      return;
    } else {
      var reader = new FileReader();
      reader.readAsText(importedFile[0], "UTF-8");
      reader.onload = function(evt) {
        var rulesString = evt.target.result;
        var rulesJSON = JSON.parse(rulesString);
        var numOfRules = rulesJSON.length;
        if (numOfRules == 0) {
          alert(chrome.i18n.getMessage("import_error_no_rule"));
          return;
        }
        for (var i = 0; i < numOfRules; i++ ) {
          var src = rulesJSON[i].src;
          var dst = rulesJSON[i].dst;
          var isRegex = rulesJSON[i].isRegex;
          var isDeleted = false;
          var isEnabled = rulesJSON[i].isEnabled;

          rules.push({"src":src, "dst": dst, "isEnabled": isEnabled, "isRegex": isRegex});
        }
        setOptions();
        $(".rule-item").remove();
        getOptions(showOptions);
        alert(chrome.i18n.getMessage("import_success"));
      }
    }
  });
  // export rule button
  $("#export-rule").click(function() {
    var rulesString = JSON.stringify(rules);
    var blob = new Blob([rulesString], { type: "application/json" });
    var newLink = document.createElement("a");
    newLink.download = "redirecting-rules.json";
    newLink.href = window.URL.createObjectURL(blob);
    newLink.click();
  });
  // rule list drag & sort
  $("#rule-list").sortable({
    animation: 150,
    handle: ".drag-item",
    onEnd: function(evt) {
      gatherRulesOnForm();
      setOptions();
    }
  });
});

$(document).on("click", ".is-regex", function() {
  if ($(this).data("is-regex") == true) {
    $(this).data("is-regex", false);
    $(this).attr("class", "icon icon-square-o is-regex");
  } else if ($(this).data("is-regex") == false) {
    $(this).data("is-regex", true);
    $(this).attr("class", "icon icon-check-square-o is-regex");
  }
  gatherRulesOnForm();
  setOptions();
});

$(document).on("click", ".is-enabled", function() {
  if ($(this).data("is-enabled") == true) {
    $(this).data("is-enabled", false);
    $(this).attr("class", "icon icon-toggle-off is-enabled");
  } else if ($(this).data("is-enabled") == false) {
    $(this).data("is-enabled", true);
    $(this).attr("class", "icon icon-toggle-on is-enabled");
  }
  gatherRulesOnForm();
  setOptions();
});

$(document).on("click", ".is-deleted", function(){
  var confirmDelete = chrome.i18n.getMessage("confirm_delete");
  var r = confirm(confirmDelete);
  if (r == true) {
    $(this).data("is-deleted", true);
    gatherRulesOnForm();
    setOptions();
    $(".rule-item").remove();
    getOptions(showOptions);
  }
});

$(document).on("change", ".rule-item>input[type='text']", function() {
  gatherRulesOnForm();
  setOptions();
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.type == "reloadOptions") {
    getOptions(showOptions);
  }
});

function gatherRulesOnForm() {
  var numOfRules = $(".rule-item").length;
  rules = [];
  for (var i = 0; i < numOfRules; i++ ) {
    var src = $(".src:eq("+i+")").val();
    var dst = $(".dst:eq("+i+")").val();
    var isRegex = $(".is-regex:eq("+i+")").data("is-regex");
    var isDeleted = $(".is-deleted:eq("+i+")").data("is-deleted");
    var isEnabled = $(".is-enabled:eq("+i+")").data("is-enabled");
    if (!isDeleted) {
      rules.push({"src":src, "dst": dst, "isEnabled": isEnabled, "isRegex": isRegex});
    }
  }
}

function setOptions() {
  var newOptions = {
    "options": {
      "isNewTab": isNewTab,
      "isNotify": isNotify,
      "rules": rules
    }
  }
  chrome.storage.local.set(newOptions);
  var msg = {
    type: "syncOptions",
    options: newOptions
  };
  chrome.runtime.sendMessage(msg, function(response){
    console.log("Send msg[syncOptions]");
  });
}

function getOptions(callback) {
  chrome.storage.local.get("options", function(data){
    isNewTab = data.options.isNewTab;
    isNotify = data.options.isNotify;
    rules = data.options.rules;
    callback();
  });
}

function showOptions() {
  if (isNewTab) {
    $("input[type='radio'][name='tabOption'][value='newTab']").prop("checked", "checked");
  } else {
    $("input[type='radio'][name='tabOption'][value='curTab']").attr("checked", "checked");
  }
  if (isNotify) {
    $("input[type='checkbox'][name='notifyOption']").prop("checked", true);
  } else {
    $("input[type='checkbox'][name='notifyOption']").prop("checked", false);
  }
  for (var i=0; i<rules.length; i++) {
    $("#rule-list").append(newRuleItem(rules[i].src, rules[i].dst, rules[i].isRegex, rules[i].isEnabled));
  }
}

function newRuleItem(src, dst, isRegex, isEnabled) {
  var title_enable = chrome.i18n.getMessage("title_enable");
  var title_delete = chrome.i18n.getMessage("title_delete");
  var ruleItemHTML = "<li class=\"rule-item\">" +
                     "<div title=\"Drag item to reorder\" class=\"icon icon-bars drag-item\"></div>" +
                     "<input type=\"text\" class=\"src\" value=" + src + ">" +
                     "<input type=\"text\" class=\"dst\" value=" + dst + ">" +
                     "<div data-is-regex=\"" + isRegex + "\" class=\"icon " + (isRegex ? "icon-check-square-o" : "icon-square-o") + " is-regex\"></div>" +
                     "<div title=\"" + title_enable + "\" data-is-enabled=\"" + isEnabled + "\" class=\"icon " + (isEnabled ? "icon-toggle-on" : "icon-toggle-off") + " is-enabled\"></div>" +
                     "<div title=\"" + title_delete + "\" data-is-deleted=\"false\" class=\"icon icon-ban is-deleted\"></div>" +
                     "</li>";
  return ruleItemHTML;
}

/*eslint max-statements: 0*/
function setInterface() {
  // general
  var ext_name = chrome.i18n.getMessage("ext_name");
  var title    = chrome.i18n.getMessage("options_page_title") + " - " + ext_name;
  // general options
  var general         = chrome.i18n.getMessage("options_general");
  var general_new_tab = chrome.i18n.getMessage("options_new_tab");
  var general_cur_tab = chrome.i18n.getMessage("options_cur_tab");
  var general_notify  = chrome.i18n.getMessage("options_notify");
  // rules
  var rules       = chrome.i18n.getMessage("options_rules");
  var rule_src    = chrome.i18n.getMessage("rule_src");
  var rule_dst    = chrome.i18n.getMessage("rule_dst");
  var rule_regex  = chrome.i18n.getMessage("rule_regexp");
  var rule_enable = chrome.i18n.getMessage("rule_enable");
  var rule_delete = chrome.i18n.getMessage("rule_delete");
  // buttons
  var btn_new    = chrome.i18n.getMessage("btn_new");
  var btn_reset  = chrome.i18n.getMessage("btn_reset");
  var btn_import = chrome.i18n.getMessage("btn_import");
  var btn_export = chrome.i18n.getMessage("btn_export");
  // about
  var about      = chrome.i18n.getMessage("about");
  var copyright  = chrome.i18n.getMessage("copyright") + " &copy; <a target=\"_blank\" href=\"https://crispgm.com/\">David Zhang</a>, 2017.";
  var home       = "<a target=\"_blank\" href=\"https://urlautoredirector.github.io/\">" + chrome.i18n.getMessage("official_page") + "</a>";
  var contribute = chrome.i18n.getMessage("contribute") + " <a target=\"_blank\" href=\"https://github.com/URLAutoRedirector/URLAutoRedirector\">GitHub - UrlAutoRedirector</a>.";
  var ideas      = chrome.i18n.getMessage("ideas");

  $(document).attr("title", title);
  $(".general-label").text(general);
  $(".general-newtab").text(general_new_tab);
  $(".general-curtab").text(general_cur_tab);
  $(".general-notify").text(general_notify);

  $(".rules-label").text(rules);
  $(".src-title").text(rule_src);
  $(".dst-title").text(rule_dst);
  $(".is-regex-title").text(rule_regex);
  $(".enable-title").text(rule_enable);
  $(".is-delete-title").text(rule_delete);

  $("#new-rule").val(btn_new);
  $("#reset-rule").val(btn_reset);
  $("#import-rule").val(btn_import);
  $("#export-rule").val(btn_export);

  $(".about-label").text(about);
  $(".about-copyright").html(copyright);
  $(".about-home").html(home);
  $(".about-contribute").html(contribute);
  $(".about-ideas").text(ideas);
}

document.addEventListener("DOMContentLoaded", getOptions(showOptions));
