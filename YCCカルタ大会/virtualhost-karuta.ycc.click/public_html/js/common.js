var timeout;

// URLやディレクトリをグローバル変数に格納
var isLocal = window.location; // http://karuta.ycc.click/referee/wait/
var isUrl = window.location.origin; // http://karuta.ycc.click
var isHref = window.location.href; // http://karuta.ycc.click/referee/wait/
var isFullDir = isUrl + getDir(isLocal); // http://karuta.ycc.click/referee/wait/
var isFullParentDir = isUrl + getDir(isLocal, 1); // http://karuta.ycc.click/referee/
var isDirSplit = location.href.split("/"); // http:,,karuta.ycc.click,referee,wait,
var isCurrentDir = isDirSplit[isDirSplit.length - 2]; // wait
var isParentDir = isDirSplit[isDirSplit.length - 3]; // referee
function getDir(place, n) {
    return place.pathname.replace(new RegExp("(?:\\\/+[^\\\/]*){0," + ((n || 0) + 1) + "}$"), "/");
}

// 端末送信情報確認し状況によって端末情報を更新しページ遷移
var locationArray = ["lottery", "score", "select", "wait"];
function chkDeviceInfo() {

    if( isCurrentDir == 'referee' ) isCurrentDir = 'Login';

    $.ajax({
        url:  "/inc/chkDeviceInfo.php",
        type: "POST",
        dataType: "json",
        data: { deviceName: sessionStorage.getItem("deviceName") }
    }).done(function(data) {
        if(data['STATUS'] == "OK") {
            console.log(data['ACCESS']+'のメッセージを受信しました。');
            if(data['HOST'] != data['GUEST']) {
                setDeviceInfo(data['HOST']);
                if($.inArray(data['HOST'], locationArray) >= 0) {
                    document.location = '/referee/' + data['HOST'] + '/';
                } else {
                    console.log('ページ遷移しない値を受信しました。');
                }
            }
        } else {
            alert("2.想定外エラー:" + data['ACCESS']);
            document.location = '/';
        }
    }).fail(function(XMLHttpRequest, textStatus, errorThrown) {
        console.log("バグ発生！");
        console.log("Error:" + errorThrown.message);
        console.log("Error:" + textStatus);
    });

    if(typeof(timeout) !== "undefind") {
        clearTimeout(timeout);
    }
    timeout = setTimeout(chkDeviceInfo, 500);

}

// 端末送信情報更新
function setDeviceInfo(guestSendMSG) {

    $.ajax({
        url:  "/inc/setDeviceInfo.php",
        type: "POST",
        dataType: "json",
        data: {
            deviceName: sessionStorage.getItem("deviceName"),
            guestSendMSG: guestSendMSG
        }
    }).done(function(data) {
        if(data['STATUS'] == "OK") {
            console.log(data['ACCESS']+'のメッセージを送信しました。');
        } else {
            alert("3.想定外エラー:" + data['ACCESS']);
            document.location = '/';
        }
    }).fail(function(XMLHttpRequest, textStatus, errorThrown) {
        console.log("バグ発生！");
        console.log("Error:" + errorThrown.message);
        console.log("Error:" + textStatus);
    });

}

// セッション終了
window.onbeforeunload = function() {

	$.ajax({
		url:  "/inc/setDeviceInfo.php",
		type: "POST",
		dataType: "json",
		data: { guestSendMSG: 'No Login' },
		async: false
	}).done(function(data) {
		$.ajax({
			url:  "/inc/setSessionDestroy.php",
			type: "POST",
			dataType: "json",
			async: false
		}).done(function(data) {
			// alert("終了しました。")
			// return "本当に離れますか？";
		}).fail(function(XMLHttpRequest, textStatus, errorThrown) {
			console.log("バグ発生！");
			console.log("Error:" + errorThrown.message);
			console.log("Error:" + textStatus);
		});
	}).fail(function(XMLHttpRequest, textStatus, errorThrown) {
		console.log("バグ発生！");
		console.log("Error:" + errorThrown.message);
		console.log("Error:" + textStatus);
	});

}

// 全画面表示
var tgtFull = document.getElementById("tgtFull");
var btnFull = document.getElementById("btnFull");
// フルスクリーンイベントを検知する
document.addEventListener("webkitfullscreenchange", handleFSevent, false);
document.addEventListener("mozfullscreenchange", handleFSevent, false);
document.addEventListener("MSFullscreenChange", handleFSevent, false);
document.addEventListener("fullscreenchange", handleFSevent, false);
function handleFSevent() {
    if( (document.webkitFullscreenElement && document.webkitFullscreenElement !== null)
     || (document.mozFullScreenElement && document.mozFullScreenElement !== null)
     || (document.msFullscreenElement && document.msFullscreenElement !== null)
     || (document.fullScreenElement && document.fullScreenElement !== null) ) {
        // alert(getFSelment()+"\nフルスクリーン表示を実行しました。");
    }else{
        // alert(getFSelment()+"\nフルスクリーン表示を終了しました。");
    }
}
// フルスクリーン表示の要素を取得
function getFSelment() {
    if (document.webkitFullscreenElement) {
        return document.webkitFullscreenElement;
    } else if (document.mozFullScreenElement) {
        return document.mozFullScreenElement;
    } else if (document.msFullscreenElement) {
        return document.msFullscreenElement;
    } else if (document.fullscreenElement) {
        return document.fullscreenElement;
    }
}
/*フルスクリーン実行用ファンクション*/
function requestFullscreen() {
    if (tgtFull.webkitRequestFullscreen) {
        tgtFull.webkitRequestFullscreen(); //Chrome15+, Safari5.1+, Opera15+
    } else if (tgtFull.mozRequestFullScreen) {
        tgtFull.mozRequestFullScreen(); //FF10+
    } else if (tgtFull.msRequestFullscreen) {
        tgtFull.msRequestFullscreen(); //IE11+
    } else if (tgtFull.requestFullscreen) {
        tgtFull.requestFullscreen(); // HTML5 Fullscreen API仕様
    } else {
        alert('ご利用のブラウザはフルスクリーン操作に対応していません');
        return;
    }
    /*フルスクリーン終了用ファンクションボタンに切り替える*/
    btnFull.onclick = exitFullscreen;
    btnFull.innerHTML = '<i class="fa fa-window-restore fa-3x" aria-hidden="true"></i>';
}
/*フルスクリーン終了用ファンクション*/
function exitFullscreen() {
    if (document.webkitCancelFullScreen) {
        document.webkitCancelFullScreen(); //Chrome15+, Safari5.1+, Opera15+
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen(); //FF10+
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen(); //IE11+
    } else if(document.cancelFullScreen) {
        document.cancelFullScreen(); //Gecko:FullScreenAPI仕様
    } else if(document.exitFullscreen) {
        document.exitFullscreen(); // HTML5 Fullscreen API仕様
    }
    /*フルスクリーン実行用ファンクションボタンに切り替える*/
    btnFull.onclick = requestFullscreen;
    btnFull.innerHTML = '<i class="fa fa-window-maximize fa-3x" aria-hidden="true"></i>';
}
/*サポートしていないIE10以下とスマフォではフルスクリーンボタンを非表示*/
if(typeof window.orientation != "undefined" || (document.uniqueID && document.documentMode < 11)){
    // btnFull.style.display = "none";
}
