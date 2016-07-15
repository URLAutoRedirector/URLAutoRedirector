// UrlAutoRedirector
// Copyright (c) David Zhang, 2016
// Idea inspired by Albert Li.

if(typeof jQuery != "undefined"){
  $(document).ready(function(){
    $(".uar-prompt-layer").detach();
    var promptMsg = chrome.i18n.getMessage("prompt_msg");
    $("body").append("<div class=\"uar-prompt-layer\">" + promptMsg + "</div>");
    setInterval(function(){
      $(".uar-prompt-layer").detach();
    }, 3000);
  });
}