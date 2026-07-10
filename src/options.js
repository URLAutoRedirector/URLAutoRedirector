// URLAutoRedirector
// Copyright (c) David Zhang, 2026
// Idea inspired by Albert Li.

var isNewTab;
var isNotify;
var rules;
var ruleList;
var draggedRule;

function query(selector, root) {
  return (root || document).querySelector(selector);
}

function queryAll(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function setText(selector, value) {
  queryAll(selector).forEach(function (element) {
    element.textContent = value;
  });
}

function setOptions() {
  var newOptions = {
    options: {
      isNewTab: isNewTab,
      isNotify: isNotify,
      rules: rules,
    },
  };
  chrome.storage.sync.set(newOptions, function () {
    chrome.runtime.sendMessage({type: 'syncOptions', options: newOptions}, function () {
      console.log('[msg:send] syncOptions');
    });
  });
}

function gatherRulesOnForm() {
  rules = queryAll('.rule-item').filter(function (ruleItem) {
    return ruleItem.dataset.isDeleted !== 'true';
  }).map(function (ruleItem) {
    return {
      src: query('.src', ruleItem).value,
      dst: query('.dst', ruleItem).value,
      isEnabled: query('.is-enabled', ruleItem).dataset.isEnabled === 'true',
      isRegex: query('.is-regex', ruleItem).dataset.isRegex === 'true',
    };
  });
}

function saveRulesFromForm() {
  gatherRulesOnForm();
  setOptions();
}

function createIcon(className, title) {
  var icon = document.createElement('div');
  icon.className = className;
  if (title) icon.title = title;
  return icon;
}

function newRuleItem(src, dst, isRegex, isEnabled) {
  var item = document.createElement('li');
  item.className = 'rule-item';
  item.dataset.isDeleted = 'false';

  var dragHandle = createIcon('icon icon-bars drag-item', 'Drag item to reorder');
  dragHandle.draggable = true;
  item.append(dragHandle);

  var source = document.createElement('input');
  source.type = 'text';
  source.className = 'src';
  source.value = src;
  item.append(source);

  var destination = document.createElement('input');
  destination.type = 'text';
  destination.className = 'dst';
  destination.value = dst;
  item.append(destination);

  var regex = createIcon(
    'icon ' + (isRegex ? 'icon-check-square-o' : 'icon-square-o') + ' is-regex',
  );
  regex.dataset.isRegex = String(isRegex);
  item.append(regex);

  var enabled = createIcon(
    'icon ' + (isEnabled ? 'icon-toggle-on' : 'icon-toggle-off') + ' is-enabled',
    chrome.i18n.getMessage('title_enable'),
  );
  enabled.dataset.isEnabled = String(isEnabled);
  item.append(enabled);

  item.append(createIcon(
    'icon icon-ban is-deleted',
    chrome.i18n.getMessage('title_delete'),
  ));
  return item;
}

function showOptions() {
  query("input[name='tabOption'][value='newTab']").checked = isNewTab;
  query("input[name='tabOption'][value='curTab']").checked = !isNewTab;
  query("input[name='notifyOption']").checked = isNotify;
  ruleList.replaceChildren.apply(ruleList, rules.map(function (rule) {
    return newRuleItem(rule.src, rule.dst, rule.isRegex, rule.isEnabled);
  }));
}

function getOptions(callback) {
  chrome.storage.sync.get('options', function (data) {
    var options = data.options || {};
    isNewTab = Boolean(options.isNewTab);
    isNotify = options.isNotify !== false;
    rules = Array.isArray(options.rules) ? options.rules : [];
    callback();
  });
}

function toggleRuleIcon(icon, dataName, enabledClass, disabledClass) {
  var enabled = icon.dataset[dataName] === 'true';
  icon.dataset[dataName] = String(!enabled);
  icon.classList.toggle(enabledClass, !enabled);
  icon.classList.toggle(disabledClass, enabled);
  saveRulesFromForm();
}

function startDrag(event) {
  var handle = event.target.closest('.drag-item');
  if (!handle) return;
  draggedRule = handle.closest('.rule-item');
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', '');
  draggedRule.classList.add('is-dragging');
}

function moveDraggedRule(event) {
  if (!draggedRule) return;
  var target = event.target.closest('.rule-item');
  event.preventDefault();
  if (!target || target === draggedRule) return;
  var beforeTarget = event.clientY < target.getBoundingClientRect().top + target.offsetHeight / 2;
  ruleList.insertBefore(draggedRule, beforeTarget ? target : target.nextSibling);
}

function finishDrag() {
  if (!draggedRule) return;
  draggedRule.classList.remove('is-dragging');
  draggedRule = null;
  saveRulesFromForm();
}

function bindRuleEvents() {
  ruleList.addEventListener('click', function (event) {
    var target = event.target;
    if (target.classList.contains('is-regex')) {
      toggleRuleIcon(target, 'isRegex', 'icon-check-square-o', 'icon-square-o');
    } else if (target.classList.contains('is-enabled')) {
      toggleRuleIcon(target, 'isEnabled', 'icon-toggle-on', 'icon-toggle-off');
    } else if (target.classList.contains('is-deleted') && confirm(chrome.i18n.getMessage('confirm_delete'))) {
      target.closest('.rule-item').remove();
      saveRulesFromForm();
    }
  });
  ruleList.addEventListener('change', function (event) {
    if (event.target.matches(".rule-item > input[type='text']")) saveRulesFromForm();
  });
  ruleList.addEventListener('dragstart', startDrag);
  ruleList.addEventListener('dragover', moveDraggedRule);
  ruleList.addEventListener('drop', function (event) {
    event.preventDefault();
  });
  ruleList.addEventListener('dragend', finishDrag);
}

function bindInterfaceEvents() {
  queryAll('.tabOption').forEach(function (option) {
    option.addEventListener('change', function () {
      isNewTab = query("input[name='tabOption']:checked").value === 'newTab';
      isNotify = query("input[name='notifyOption']").checked;
      setOptions();
    });
  });
  query('#new-rule').addEventListener('click', function () {
    ruleList.append(newRuleItem('', '', false, true));
  });
  query('#reset-rule').addEventListener('click', function () {
    if (!confirm(chrome.i18n.getMessage('confirm_reset'))) return;
    ruleList.replaceChildren();
    chrome.runtime.sendMessage({type: 'resetRules'}, function () {
      console.log('[msg:send] resetRules');
    });
  });
  query('#import-rule').addEventListener('click', importRules);
  query('#export-rule').addEventListener('click', exportRules);
  query('#clear-rule').addEventListener('click', function () {
    if (!confirm(chrome.i18n.getMessage('confirm_clear'))) return;
    ruleList.replaceChildren();
    rules = [];
    setOptions();
  });
}

function importRules() {
  var file = query('#upload-rule').files[0];
  if (!file) {
    alert(chrome.i18n.getMessage('import_error_no_file'));
    return;
  }
  var reader = new FileReader();
  reader.onload = function (event) {
    try {
      var importedRules = JSON.parse(event.target.result);
      if (!Array.isArray(importedRules) || importedRules.length === 0) {
        alert(chrome.i18n.getMessage('import_error_no_rule'));
        return;
      }
      rules = rules.concat(importedRules.map(function (rule) {
        return {
          src: rule.src || '',
          dst: rule.dst || '',
          isEnabled: rule.isEnabled !== false,
          isRegex: Boolean(rule.isRegex),
        };
      }));
      setOptions();
      showOptions();
      alert(chrome.i18n.getMessage('import_success'));
    } catch (_error) {
      alert(chrome.i18n.getMessage('import_error_no_rule'));
    }
  };
  reader.readAsText(file, 'UTF-8');
}

function exportRules() {
  var blob = new Blob([JSON.stringify(rules, null, 2)], {type: 'application/json'});
  var link = document.createElement('a');
  link.download = 'redirecting-rules.json';
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}

/*eslint max-statements: 0*/
function setInterface() {
  document.title = chrome.i18n.getMessage('options_page_title') + ' - ' + chrome.i18n.getMessage('ext_name');
  setText('.general-label', chrome.i18n.getMessage('options_general'));
  setText('.general-newtab', chrome.i18n.getMessage('options_new_tab'));
  setText('.general-curtab', chrome.i18n.getMessage('options_cur_tab'));
  setText('.general-notify', chrome.i18n.getMessage('options_notify'));
  setText('.rules-label', chrome.i18n.getMessage('options_rules'));
  setText('.src-title', chrome.i18n.getMessage('rule_src'));
  setText('.dst-title', chrome.i18n.getMessage('rule_dst'));
  setText('.is-regex-title', chrome.i18n.getMessage('rule_regexp'));
  setText('.enable-title', chrome.i18n.getMessage('rule_enable'));
  setText('.is-delete-title', chrome.i18n.getMessage('rule_delete'));
  setText('.hint-misconf', chrome.i18n.getMessage('rule_misconf'));
  query('#new-rule').value = chrome.i18n.getMessage('btn_new');
  query('#reset-rule').value = chrome.i18n.getMessage('btn_reset');
  query('#import-rule').value = chrome.i18n.getMessage('btn_import');
  query('#export-rule').value = chrome.i18n.getMessage('btn_export');
  query('#clear-rule').value = chrome.i18n.getMessage('btn_clear');
  setText('.about-label', chrome.i18n.getMessage('about'));
  query('.about-copyright').innerHTML = chrome.i18n.getMessage('copyright') +
    ' &copy; <a target="_blank" href="https://crisp.dev/">David Zhang</a>, 2026.';
  query('.about-home').innerHTML = '<a target="_blank" href="https://urlautoredirector.github.io/">' +
    chrome.i18n.getMessage('official_page') + '</a>';
  query('.about-contribute').innerHTML = chrome.i18n.getMessage('contribute') +
    ' <a target="_blank" href="https://github.com/URLAutoRedirector/URLAutoRedirector">GitHub - URLAutoRedirector</a>.';
  setText('.about-ideas', chrome.i18n.getMessage('ideas'));
}

document.addEventListener('DOMContentLoaded', function () {
  ruleList = query('#rule-list');
  setInterface();
  bindInterfaceEvents();
  bindRuleEvents();
  getOptions(showOptions);
});

chrome.runtime.onMessage.addListener(function (request) {
  console.log('[msg:recv] ' + request.type);
  if (request.type === 'reloadOptions') getOptions(showOptions);
});
