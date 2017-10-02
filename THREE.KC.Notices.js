function notice(text, alertType='info') {
	$("#alertConsole").prepend(`
		<div class="alert alert-` + alertType + ` alert-dismissable"><a href="#" class="close" data-dismiss="alert" aria-label="close">×</a>`
		+ text
		+ '</div>');
}

function showError(errorInfo) {
	notice("<strong>" + errorInfo.error + "</strong><br />"
	+ errorInfo.traceback, 'danger');
}

function initNotices() {
	$("body").prepend(`
	<div id="alertConsole" class="container" style="position:absolute; left:0; padding-left: 200px; padding-right:200px; top:0;width:100%; overflow: hidden;z-index:1000"></div>
	`);
}