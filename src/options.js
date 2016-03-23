var isNewTab;
var rules;

$(document).ready(function(){
    
    getOptions();
    
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

function getOptions()
{
    chrome.storage.local.get("options", function(data){
        isNewTab = data.options.isNewTab;
        rules = data.options.rules;
        showOptions();
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
}

document.addEventListener("DOMContentLoaded", getOptions);
