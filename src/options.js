var isNewTab;
var rules;

$(document).ready(function(){
    
    getOptions(showOptions);
    
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

    $("#newRule").click(function(){
        $("#rule_list").append(newRuleItem("", "", "", false));
    });

    $("#saveRule").click(function(){
    });

    $("#discardRule").click(function(){
        $(".rule_item").remove();
        getOptions(showOptions);
    });

    $("#rule_list").sortable({
        revert: true
    });

    $("ul,li").disableSelection();
});

function setOptions()
{
    var newOptions = {
        "options": {
            "isNewTab": isNewTab,
            "rules": rules
        }
    }
    chrome.storage.local.set(newOptions);
}

function getOptions(callback)
{
    chrome.storage.local.get("options", function(data){
        isNewTab = data.options.isNewTab;
        rules = data.options.rules;
        callback();
    });
}

function showOptions()
{
    if (isNewTab) {
        $("input[type='radio'][name='tabOption'][value='newTab']").attr("checked", "checked");
    }
    else {
        $("input[type='radio'][name='tabOption'][value='curTab']").attr("checked", "checked");   
    }
    for (var i=0; i<rules.length; i++) {
        $("#rule_list").append(newRuleItem(rules[i].name, rules[i].src, rules[i].dst, rules[i].isRegex));
    }
}

function newRuleItem(name, src, dst, isRegex)
{
    var ruleItemHTML = "<li class=\"ui-state-default rule_item\">" + 
                       "<input type=\"text\" class=\"name\" value=" + name + ">" +
                       "<input type=\"text\" class=\"src\" value=" + src + ">" +
                       "<input type=\"text\" class=\"dst\" value=" + dst + ">" +
                       "<input type=\"checkbox\" class=\"isRegex\"" + (isRegex == true ? "checked" : "") + ">" +
                       "</li>";
   return ruleItemHTML;
}

document.addEventListener("DOMContentLoaded", getOptions);
