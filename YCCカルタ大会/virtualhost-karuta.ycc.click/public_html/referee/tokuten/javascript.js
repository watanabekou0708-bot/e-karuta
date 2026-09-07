var table = sessionStorage.getItem("table");
var battle = sessionStorage.getItem("battle");
var tyuusenn = sessionStorage.getItem("tyuusenn");
var ninnzuu;
var f = 0;
function start(){
	if(sessionStorage.getItem("id")=="referee1"){
		$.ajax({
			url: 'get_battle.php',
			type: 'POST',
			data: {tyuusenn: tyuusenn},
			success:function(data){
				if(data>battle){
					sessionStorage.setItem("tyuusenn",(tyuusenn)-0+1);
					$.ajax({
						url: 'get_tBattle_data.php',
						type: 'POST',
						data: {tyuusenn:tyuusenn},
						success:function(data){
							var　data_array = data.split(",");
							var data_count = data_array.length/3;//何行分のデータがあるか
							var kekka = new Array();
							for(var i=0;i<data_count;i++){//行数分繰り返す
								for(var j=0;j<data_array[i*3+1];j++){//テーブルの数分繰り返す
									for(var k=0;k<data_array[i*3+2];k++){//１つのテーブルの人数分繰り返す
										kekka.push(data_array[i*3]+"-"+cov(j+1));
									}
								}
							}

							var temp;
							var i1,i2;
							for(var i=0;i<=300;i++){
								i1=return_random(0,kekka.length-1);
								i2=return_random(0,kekka.length-1);
								temp=kekka[i1];
								kekka[i1]=kekka[i2];
								kekka[i2]=temp;
							}

							$.ajax({
								url: 'set_table_data.php',
								type: 'POST',
								data: {data:kekka}
							});
						}
					});
				}
			}
		});

		$.ajax({
			url: 'set_zyunnbi.php',
			type: 'POST'
		});

		$.ajax({
			url: 'delete_data.php',
			type: 'POST'
		});
		
		$.ajax({
			url: 'set_battle.php',
			type: 'POST',
			data: {battle:battle},
			success:function(data){
				f=data;
			}
		});
		
	}

	$.ajax({
		url: 'get_battle.php',
		type: 'POST',
		data: {tyuusenn: tyuusenn},
		success:function(data){
			if(data>battle){
				sessionStorage.setItem("tyuusenn",(tyuusenn)-0+1);
			}
		}
	});

	sessionStorage.setItem("battle",(sessionStorage.getItem("battle"))-0+1);

	$.ajax({
		url: 'get_table_data.php',
		type: 'POST',
		data:{table:table,battle:battle},
		success:function(data){
			if(data == ""){
				alert("今回は審判の役割がありません。\n準備中ページに移動します。");
				document.location = "../zyunnbityuu/index.html";
			}
			document.body.innerHTML = "<h1>第" + battle +"回戦" + table +" 進行に合わせて得点を指定してください。</h1><div id='list'></div>"
			var　data_array = data.split(",");

			var div = document.createElement("div");
			var input = document.createElement("input");
			input.type="button";

			var list = document.getElementById("list");
			ninnzuu=data_array.length/3;
			for(var i=1;i<=data_array.length/3;i++){
				var clone_div_player = div.cloneNode(false);
				var clone_div_name = div.cloneNode(false);
				var clone_input_karuta_count_p = input.cloneNode(false);
				var clone_div_karuta_count = div.cloneNode(false);
				var clone_input_karuta_count_m = input.cloneNode(false);
				var clone_input_otetuki_count_p = input.cloneNode(false);
				var clone_div_otetuki_count = div.cloneNode(false);
				var clone_input_otetuki_count_m = input.cloneNode(false);
				
				clone_div_player.className="class-player";
				clone_div_player.style.marginLeft="206px";
				clone_div_player.style.marginTop="20px";
				list.appendChild(clone_div_player);

				clone_div_name.className="class-name";
				clone_div_name.id="name_"+i;
				clone_div_name.innerHTML=data_array[(i-1)*3];
				clone_div_player.appendChild(clone_div_name);

				clone_input_karuta_count_p.className="class-button";
				clone_input_karuta_count_p.id=i+",karuta_count_p";
				clone_input_karuta_count_p.value="＋";
				clone_input_karuta_count_p.style.marginLeft="10px";
				clone_input_karuta_count_p.onclick=function(){
					var temp = this.id;
					temp=temp.split(",");
					var element = document.getElementById("karuta_count_"+temp[0]);
					element.innerHTML=(element.innerHTML-0)+1;
					update(temp[0]);
				}
				clone_div_player.appendChild(clone_input_karuta_count_p);

				clone_div_karuta_count.className="class-text";
				clone_div_karuta_count.id="karuta_count_" + i;
				clone_div_karuta_count.innerHTML=data_array[(i-1)*3+1];
				clone_div_player.appendChild(clone_div_karuta_count);

				clone_input_karuta_count_m.className="class-button";
				clone_input_karuta_count_m.id=i+",karuta_count_m";
				clone_input_karuta_count_m.value="－";
				clone_input_karuta_count_m.style.marginRight="10px";
				clone_input_karuta_count_m.onclick=function(){
					var temp = this.id;
					temp=temp.split(",");
					var element = document.getElementById("karuta_count_"+temp[0]);
					if(element.innerHTML!="0"){
						element.innerHTML=(element.innerHTML-0)-1;
						update(temp[0]);
					}
				}
				clone_div_player.appendChild(clone_input_karuta_count_m);

				clone_input_otetuki_count_p.className="class-button";
				clone_input_otetuki_count_p.id=i+",otetuki_count_p";
				clone_input_otetuki_count_p.value="＋";
				clone_input_otetuki_count_p.onclick=function(){
					var temp = this.id;
					temp=temp.split(",");
					var element = document.getElementById("otetuki_count_"+temp[0]);
					element.innerHTML=(element.innerHTML-0)+1;
					update(temp[0]);
				}
				clone_div_player.appendChild(clone_input_otetuki_count_p);

				clone_div_otetuki_count.className="class-text";
				clone_div_otetuki_count.id="otetuki_count_" + i;
				clone_div_otetuki_count.innerHTML=data_array[(i-1)*3+2];
				clone_div_player.appendChild(clone_div_otetuki_count);

				clone_input_otetuki_count_m.className="class-button";
				clone_input_otetuki_count_m.id=i+",otetuki_count_m";
				clone_input_otetuki_count_m.value="－";
				clone_input_otetuki_count_m.onclick=function(){
					var temp = this.id;
					temp=temp.split(",");
					var element = document.getElementById("otetuki_count_"+temp[0]);
					if(element.innerHTML!="0"){
						element.innerHTML=(element.innerHTML-0)-1;
						update(temp[0]);
					}
				}
				clone_div_player.appendChild(clone_input_otetuki_count_m);
			}

			var button = input.cloneNode(false);
			button.id="kannryou";
			button.value="完了";
			button.onclick=function(){
				var pleyer_name = new Array();
				var score = new Arrray();

				for(var i=1;i<=ninnzuu;i++){
					player_name.push(document.getElementById("name_"+i).innerHTML);
					var karuta_count = document.getElementById("karuta_count_"+i).innerHTML-0;
					var otetuki_count = document.getElementById("otetuki_count_"+i).innerHTML-0;
					score.push(karuta_count-otetuki_count);
				}

				var max1=-10000;
				var max2=-10000;
				var banngou_1i=new Array();
				var banngou_2i=new Array();

				for(var i=0;i<score.length;i++){
					if(max1<=score[i]){
						max1=score[i];
						banngou_1i.push(i);
					}
				}

				for(var i=0;i<score.length;i++){
					if(max2<=score[i] && max1 != score[i]){
						max2=score[i];
						banngou_2i.push(i);
					}
				}

				$.ajax({
					url: 'get_kati.php',
					type: 'POST',
					data: {battle:battle},
					success: function(data){
						if(data>banngou_1i.length){
							for(var i=0;i<banngou_1i.length;i++){
								name_data_set(player_name[banngou_1i[i]]);
							}
							for(var i=0;i<banngou_2i.length;i++){
								name_data_set(player_name[banngou_2i[i]]);
							}
						}else{
							for(var i=0;i<banngou_1i.length;i++){
								name_data_set(player_name[banngou_1i[i]]);
							}
						}
					}
				});

				document.location = "../zyunnbityuu/index.html";
			}

			document.body.appendChild(button);
			
		}
	});a
}

function name_data_set(name){
	$.ajax({
		url: 'set_data.php',
		type: 'POST',
		data: {name:name}
	});
}

function update(i){
	var player_name = document.getElementById("name_"+i).innerHTML;
	var karuta_count = document.getElementById("karuta_count_"+i).innerHTML-0;
	var otetuki_count = document.getElementById("otetuki_count_"+i).innerHTML-0;
	var score=karuta_count-otetuki_count;
	$.ajax({
		url: 'update.php',
		type: 'POST',
		data: {name: player_name,score:score,otetuki:otetuki_count}
	});
}

function cov(num){
	if(num==1){
		return "A";
	}else if(num==2){
		return "B";
	}else if(num==3){
		return "C";
	}else if(num==4){
		return "D";
	}else if(num==5){
		return "E";
	}else if(num==6){
		return "F";
	}
}

function return_random(max,min){
	return Math.floor(Math.random()*(max-min+1))+min;
}
