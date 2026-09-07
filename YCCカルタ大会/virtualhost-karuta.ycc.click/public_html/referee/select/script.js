var wrapper, id, battle, table;

$(function() {

	wrapper = document.getElementById('wrapper');

	chkReleaseDateTime();

    $.ajax({
        url:  "getTable.php",
        type: "POST",
        dataType: "json",
        data: { deviceName: sessionStorage.getItem("deviceName") }
    }).done(function(data) {
        if(data['STATUS'] == "OK") {
			id = data['ID'];
			var dataArray = data['DATA'].split("-"); // データは2-Aという感じに入っている
			battle = dataArray[0];
			table = dataArray[1];
			// document.body.innerHTML = "<p id='gyou1'>競技は<span id='mozi1'>第" + battle + "回戦</span>の</p><p id='gyou2'><span id='mozi2'>" + table + "</span>番テーブルです</p>";
			wrapper.innerHTML = "<p id='gyou1'>競技は<span id='mozi1'>第" + battle + "回戦</span>の</p><p id='gyou2'><span id='mozi2'>" + table + "</span>番テーブルです</p>";
			setTimeout("nameSelect()", 2000);
        } else {
        	// 抽選データがなくなった時もここへ来ることになるが、不正終了データの考慮はしていないので準備中を一括送信できない
            alert("1.想定外エラー:" + data['ACCESS']);
        }
    }).fail(function(XMLHttpRequest, textStatus, errorThrown) {
        console.log("バグ発生！");
        console.log("Error:" + textStatus);
        console.log("Error:" + errorThrown.message);
    });

});

function nameSelect() {

	$.ajax({
		url: 'getNameList.php',
		type: 'POST',
		success:function(data) {
			// document.body.innerHTML = "<span id='mozi3'>第" + battle + "回戦"+ table + " ご自分のお名前をタップしてください。</span>";
			wrapper.innerHTML = "<span id='mozi3'>第" + battle + "回戦"+ table + " ご自分のお名前をタップしてください。</span>";

			var table_element = document.createElement("table");
			table_element.id = "name_list_table";
			// document.body.appendChild(table_element);
			wrapper.appendChild(table_element);

			var name_list = data.split(",");
			var name_list_table = document.getElementById("name_list_table");
			var tr = document.createElement("tr");
			var td = document.createElement("td");
			var a = document.createElement("a");
			var clone_tr;
			var clone_td;
			var clone_a;
			var temp = (name_list.length - 6 % name_list.length) / 6 + 2;
			for(var i = 1; i <= temp; i++) {
				clone_tr = tr.cloneNode(false);
				clone_tr.id = "tr-" + i;
				name_list_table.appendChild(clone_tr);
			}

			var temp_clone_tr;
			var temp_clone_td;

			var c=1;
			for(var i = 0; i < name_list.length; i++) {
				if(i % 6 == 0) {
					temp_clone_tr = document.getElementById("tr-" + c);
					c++;
				}
				clone_td = td.cloneNode(false);
				clone_td.id = "td-" + (i + 1);
				clone_td.className = "td_class";

				clone_a = a.cloneNode(false);
				clone_a.innerHTML = name_list[i];
				clone_a.href = "";
				clone_a.onclick = function(e) {
					e.preventDefault();
					kakuninn(this.innerHTML);
				}

				temp_clone_tr.appendChild(clone_td);
				clone_td.appendChild(clone_a);
			}

			var button = document.createElement("input");
			button.id = "kannryou";
			button.value = "キャンセル";
			button.type = "button";
			button.onclick = function() {
				value1 = battle + "-" + table;
				$.ajax({
					url: 'setTable.php',
					type: 'POST',
					data: {
						id: id
					},
					success:function() {
						document.location = "/referee/lottery/";
					}
				});
			}
			// document.body.appendChild(button);
			wrapper.appendChild(button);
		}
	});

}

function kakuninn(text) {

	if(window.confirm(text + 'さん\nでよろしいでしょうか?')) {
		battle = battle - 0;
		$.ajax({
			url: 'setData.php',
			type: 'POST',
			data: {
				id: id,
				name: text,
				table: table,
				battle: battle
			},
			success:function() {
				document.location = "/referee/lottery/";
			}
		});
	} else {
		$.ajax({
			url: 'setTable.php',
			type: 'POST',
			data: {
				id: id
			},
			success:function() {
				document.location = "/referee/select/";
			}
		});
	}
}

// 払出予約のチェック
function chkReleaseDateTime() {

    $.ajax({
        url:  "chkReleaseDateTime.php",
        type: "POST"
    }).done(function(data) {
        // console.log(data['STATUS']);
    }).fail(function(XMLHttpRequest, textStatus, errorThrown) {
        console.log("Failed");
        console.log("Error:" + errorThrown.message);
        console.log("Error:" + textStatus);
    });

}
