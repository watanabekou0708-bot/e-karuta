$(function() {

	// $.ajax({
	// 	url:  "setSession.php",
	// 	type: "POST",
	// 	dataType: "json",
	// 	async: false
	// }).done(function(data) {
	// 	if(data['STATUS'] == "OK") {
	// 		setDeviceInfo(isCurrentDir);
	// 	} else {
	// 		alert("3.想定外エラー:" + data['ACCESS']);
	// 	}
	// }).fail(function(XMLHttpRequest, textStatus, errorThrown) {
	// 	console.log("Failed");
	// 	console.log("Error:" + errorThrown.message);
	// 	console.log("Error:" + textStatus);
	// });

    sessionStorage.setItem("deviceName", 'Score');

	reload();

	function reload() {

		$.ajax({
			url:  "reload.php",
			type: "POST",
			dataType: "json",
		}).done(function(data) {
			if(data['STATUS'] == "OK") {
				// 半角 → 全角
				data['HOST'][0] = data['HOST'][0].replace(/[A-Za-z0-9]/g, function(s) {
					return String.fromCharCode(s.charCodeAt(0) + 0xFEE0);
				});
				data['HOST'][2] = data['HOST'][2].replace(/[A-Za-z0-9]/g, function(s) {
					return String.fromCharCode(s.charCodeAt(0) + 0xFEE0);
				});
				var str = "第" + data['HOST'][0] + "回戦";
				$("#round").html(str);
				str = "★各テーブルで勝ち上がれる人数は<strong>" + data['HOST'][2] + "人</strong>です★";
				$("#kati").html(str);
				$("#container").html(data['HOST'][1]);
				setDeviceInfo(data['HOST'][0]);
			} else {
				alert("4.想定外エラー:" + data['ACCESS']);
			}
		}).fail(function(XMLHttpRequest, textStatus, errorThrown) {
			console.log("Failed");
			console.log("Error:" + errorThrown.message);
			console.log("Error:" + textStatus);
		});

		if(typeof(timeout) !== "undefind") {
			clearTimeout(timeout);
		}
		timeout = setTimeout(reload, 500);
	}

});
