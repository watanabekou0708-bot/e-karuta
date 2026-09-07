var timeout;

getStatus();

getTbattleToTable();

// ステータス取得
function getStatus() {

	$.ajax({
		url:  "../inc/getAllDeviceStatus.php",
		type: "POST",
		dataType: "json",
	}).done(function(data) {
		if(data['STATUS'] == "OK") {
            // 審判用端末の配列数分ループして値を表示する
			var deviceNameArray = ["A", "B", "C", "D", "E", "F", "G", "H"];
			var html = "";
			for (var keyString in deviceNameArray) {
				var key = deviceNameArray[keyString];
				html += "<div>";
                html += "<div>" + key + "</div>";
                html += "<div>";
                html += data['DATA'][key] + '<br>';
                html += '<input type="button" value="準備中" onclick="setAdminDeviceInfo(this,\''+key+'\')">';
                html += '<input type="button" value="抽選" onclick="setAdminDeviceInfo(this,\''+key+'\')">';
                html += '<input type="button" value="得点" onclick="setAdminDeviceInfo(this,\''+key+'\')">';
                html += "</div>";
                html += "</div>";
			}
			$("#userInfo").html(html);
            // スコアボードの値を表示する
            var deviceNameArray = ["Score"];
            var html = "";
            for (var keyString in deviceNameArray) {
                var key = deviceNameArray[keyString];
                html += "<div>";
                html += "<div>" + key + "</div>";
                //html += "<div>" + data['DATA'][key] + "</div>";
				html += "<div>" + "第" + data['DATA'][key] + "回戦" + "</div>";
                html += "</div>";
            }
            $("#scoreInfo").html(html);
            // 抽選完了人数の取得
            getLotteryCount();
		} else {
			alert("想定外エラー");
		}
	}).fail(function(XMLHttpRequest, textStatus, errorThrown) {
		console.log("Failed");
		console.log("Error:" + errorThrown.message);
		console.log("Error:" + textStatus);
	});

	if(typeof(timeout) !== "undefind") {
		clearTimeout(timeout);
	}
	timeout = setTimeout(getStatus, 500);
}

// 抽選完了人数の取得
function getLotteryCount() {

    $.ajax({
        url:  "lotteryCount.php",
        type: "POST",
        dataType: "json",
    }).done(function(data) {
        if(data['STATUS'] == "OK") {
            for (var i = 0, len = data['DATA'].length; i < len; i++) {
                $("#tBattleTable span#" + i).html(data['DATA'][i]);
            }
        } else {
            alert("想定外エラー");
        }
    }).fail(function(XMLHttpRequest, textStatus, errorThrown) {
        console.log("Failed");
        console.log("Error:" + errorThrown.message);
        console.log("Error:" + textStatus);
    });

}

// tBattleテーブルの取得
function getTbattleToTable() {

    $.ajax({
        url:  "tBattleToTable.php",
        type: "POST",
        dataType: "json",
    }).done(function(data) {
        if(data['STATUS'] == "OK") {
            $("#tBattleTable tbody").html(data['DATA']);
        } else {
            alert("想定外エラー");
        }
    }).fail(function(XMLHttpRequest, textStatus, errorThrown) {
        console.log("Failed");
        console.log("Error:" + errorThrown.message);
        console.log("Error:" + textStatus);
    });

}

// 指定したスコアボードをセットする
function setScoreBord(battle) {

	if (battle == null) battle = 1;

	$.ajax({
		url:  "setScoreBord.php",
		type: "POST",
		dataType: "json",
		data: { battle: battle }
	}).done(function(data) {
		if(data['STATUS'] == "OK") {
			console.log('スコアボードの対戦回数をセットしました。');
		} else {
			alert("想定外エラー");
		}
	}).fail(function(XMLHttpRequest, textStatus, errorThrown) {
		console.log("Failed");
		console.log("Error:" + errorThrown.message);
		console.log("Error:" + textStatus);
	});

}

function reset() {
	del(false);
	set(false);
}

function del(async) {
	if (async == null) async = true;

	$.ajax({
		url: 'delBattleData.php',
		type: 'POST',
		async: async,
		success: function(){
			if( async ) alert("対戦成績を初期化しました。");
		}
	});
}

function set(async) {
	if (async == null) async = true;

	$.ajax({
		url: 'getBattleData.php',
		type: 'POST',
		async: async,
		data: {lottery: 1},
		success: function(data) {
			// 組み合わせ作成 1,8,6,2,8,6
			var data_array = data.split(",");
			var data_count = data_array.length / 3; // 何行分のデータがあるか
			var kekka1 = new Array();
			var kekka2 = new Array();
			var kekka3 = new Array("2-A", "2-B", "2-C", "2-D", "2-E", "2-F", "2-G", "2-H");
			var cnt = 0;
			for(var i = 0; i < data_count; i++) { // 行数分繰り返す
				for(var j = 0; j < data_array[i * 3 + 1]; j++) { // テーブルの数分繰り返す
					if(i == 0) {
						for(var k = 0; k < data_array[i * 3 + 2]; k++) { // １つのテーブルの人数分繰り返す
							cnt++;
							kekka1.push(data_array[i * 3] + "-" + cov(j + 1));
						}
					} else {
						for(var k = 0; k < data_array[i * 3 + 2] - 1; k++) { // ２回目の抽選人数を各テーブルで一人ずつ減らす（欠席時にはその場所に教員が代理で入るため）
							kekka2.push(data_array[i * 3] + "-" + cov(j + 1));
						}
					}
				}
			}
			Array.prototype.push.apply(kekka1, kekka2);
			// 組み合わせのシャッフル
			shuffle(kekka1);
			shuffle(kekka3);
			// 欠席対応配列の追加
			Array.prototype.push.apply(kekka1, kekka3);
			console.log(kekka1);
			// データベースへ書き込み
            $.ajax({
                url: "setTableData.php",
                type: "POST",
                dataType: "json",
                data: {data: kekka1}
            }).done(function(data) {
                if(data['STATUS'] == "OK") {
                    console.log("組み合わせテーブルを作成しました。");
                } else {
                    alert("4.想定外エラー:" + data['DATA']);
                }
            }).fail(function(XMLHttpRequest, textStatus, errorThrown) {
                console.log("バグ発生！");
                console.log("Error:" + textStatus);
                console.log("Error:" + errorThrown.message);
            });
		}
	});
}
function cov(num) {
	if(num == 1) {
		return "A";
	}else if(num == 2) {
		return "B";
	}else if(num == 3) {
		return "C";
	}else if(num == 4) {
		return "D";
	}else if(num == 5) {
		return "E";
	}else if(num == 6) {
		return "F";
	}else if(num == 7) {
		return "G";
	}else if(num == 8) {
		return "H";
	}
}
function shuffle(array) {
	var n = array.length, t, i;
	while (n) {
		i = Math.floor(Math.random() * n--);
		t = array[n];
		array[n] = array[i];
		array[i] = t;
	}
	return array;
}

function setAdminDeviceInfo(obj, deviceName) {

	if (deviceName == null) deviceName = 'PC';

	var hostSendMSG;

	switch(obj.value) {
		case '準備中':
			hostSendMSG = 'wait';
			break;
		case '抽選':
			hostSendMSG = 'lottery';
			break;
		case '得点':
			hostSendMSG = 'score';
			break;
	}

    $.ajax({
        url: 'setHostSendMSG.php',
        type: 'POST',
		data: {
			deviceName: deviceName,
			hostSendMSG: hostSendMSG
		},
    }).done(function(data) {
    }).fail(function(XMLHttpRequest, textStatus, errorThrown) {
        console.log("Failed");
        console.log("Error:" + errorThrown.message);
        console.log("Error:" + textStatus);
    });

}

function logout() {
    $.ajax({
        url:  "logout.php",
        type: "POST"
    }).done(function(data) {
        location.href = 'logout.html';
    }).fail(function(XMLHttpRequest, textStatus, errorThrown) {
        console.log("Failed");
        console.log("Error:" + errorThrown.message);
        console.log("Error:" + textStatus);
    });
}
