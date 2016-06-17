$(document).ready(function(){
  $(".uar-prompt-layer").detach();
  $("body").append("<div class=\"uar-prompt-layer\">Redirected by URL Auto Redirector</div>");
  setInterval(function(){
  	$(".uar-prompt-layer").detach();
  }, 3000);
});