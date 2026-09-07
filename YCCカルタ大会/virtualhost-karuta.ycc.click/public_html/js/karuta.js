$(function() {

	/* ---------- Variables ----------*/

	var phase;
	var startTimeout;
	var textTimeout;
	var audioTimeout;
	var exTimeout;

	var nameList = [];
	var readIndex = 0;
	var textBuffer = "";
	var textIndex = 0;

	var startTime;
	var level;

	var levels = ["", "初級", "中級", "上級"];

	var order;
	var nameList;

	var data;
	var locked;

	/* ---------- Events and Settings ----------*/

	$("#logo").attr('src', 'data:image/gif;base64,R0lGODlhmgE1APf/AJubm0pKShEREU9PT7uUint7e01NTW1tbVJSUsmspVlZWcNHKMlJKUNDQ42NjcrKynV1dUhISGJiYl1dXejd2ltbWzw8PHl5eVVVVWRkZOnf3NnGwfj19UZGRkxMTKRPOQgICB8fHzY2NtXBvCoqKi0tLbJFKjExMb5GKXBwcDQ0NK1GLDAwMDk5ObpFKYSEhFdXV0FBQZGRkSEhIQQEBKRYRkRERKVkVCcnJxQUFM2zrIKCgiMjIw8PD2BgYCkpKRkZGax2aTo6OiQkJBgYGBYWFhwcHKhJMbB/c6pHMKpxYwEBAadJMqlvYAsLC6NTQMxKKj8/Py8vL19fX29vb4+Pj7+/v6+vr39/f5+fn9/f38/Pz+/v7/39/fz8/PX19fPz8/f39/r6+r6+vvn5+YuLi/Dw8Ofn5/b29o6OjsfHx5eXl93d3bS0tOHh4erq6unp6fHx8ZOTk3JycsXFxX19fe3t7aenp+Li4mdnZ+vr69nZ2dHR0YeHh2tra7Ozs8PDw/v7+7y8vGhoaOXl5fj4+IqKij4+PsnJyYaGhri4uHZ2domJifT09NfX16urq2pqar29vZycnNbW1tXV1aOjo6WlpXd3d8HBwdjY2OTk5Le3t5KSkra2tnx8fC4uLmZmZqCgoObm5paWls3Nzdvb262trZWVldPT06mpqdTU1O7u7s7Ozn5+fsbGxmlpabGxsbKystra2szMzKSkpJiYmICAgIGBgfLy8rq6uru7u97e3ujo6Ozs7ODg4JmZmbW1tV5eXsLCwsjIyNLS0qqqqrCwsKioqIiIiNzc3OPj43Nzc7m5ucTExKNSPaKiopSUlPLs6qRgUN3MyP79/a6urqNZSKRfT56enqysrG5ubtDQ0MDAwKGhoZ2dnePV0riPhaNWQ+7m5erh3/38+6VNOKRaSPTw7tG6tKNXRa5GLLeMgqampsGfl/fz8qdoWa15bLyYj8+2sMaooezj4e3l48ZIKdC4stK8t/v6+d/QzKRQO6ZLNMKhmgAAAP///yH/C1hNUCBEYXRhWE1QPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMwMTQgNzkuMTU2Nzk3LCAyMDE0LzA4LzIwLTA5OjUzOjAyICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIiB4bXBNTTpPcmlnaW5hbERvY3VtZW50SUQ9InV1aWQ6NUQyMDg5MjQ5M0JGREIxMTkxNEE4NTkwRDMxNTA4QzgiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MkNCNUNFODM4NTM1MTFFNDg2MDk4QzQ4NTIxMTBDRUUiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MkNCNUNFODI4NTM1MTFFNDg2MDk4QzQ4NTIxMTBDRUUiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgSWxsdXN0cmF0b3IgQ0MgMjAxNCAoV2luZG93cykiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0idXVpZDpiM2JmZjBlNi1iMjhkLTRmN2EtOWE0MC03M2VmNGRkNDE5ZWMiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6YWNiZGVjZDEtYWZmNy00ODQ5LTkwNDAtNjI4ZTZjMzg5OGI0Ii8+IDxkYzp0aXRsZT4gPHJkZjpBbHQ+IDxyZGY6bGkgeG1sOmxhbmc9IngtZGVmYXVsdCI+UHJpbnQ8L3JkZjpsaT4gPC9yZGY6QWx0PiA8L2RjOnRpdGxlPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PgH//v38+/r5+Pf29fTz8vHw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');

	$("#progressbox").on('transitionend', function(e) {
		e.stopPropagation();
		$(this).hide();
		$("#buttons").show();
		exTimeout = setTimeout(function(){
			clearTimeout(exTimeout);
			phase = 'loading';
			init();
		}, 100);
	});

	$(".button").on("click", function(e) {
		if (isLocked()) {
			return;
		}
		lock();
		var clickIndex = $(this).attr('class').match(/\d+/)[0];
		$(this).siblings().css('zIndex', 0);
		$(this).css('zIndex', 1);
		if (clickIndex == 1) {
			level = parseInt($(this).attr('id').match(/\d+/)[0]);
			$('#main_contents').show();
			exTimeout = setTimeout(function() {
				clearTimeout(exTimeout);
				$('#title_contents').addClass('after');
			}, 100);
		} else {
			$(".button").each(function(i, el) {
				var index = $(this).attr('class').match(/\d+/)[0];
				$(this).removeClass('layer' + index);
				$(this).addClass('layer' + (clickIndex == 2 ? (index == 1 ? 3 : --index) : (index == 3 ? 1 : ++index)));
			});
		}
	});

	$(".button").on("transitionend", function(e) {
		e.stopPropagation();
		unlock();
	});

	$('#title_contents').on("transitionend", function() {
		if ($("#title_contents").css('opacity') == 0) {
			$("#title_contents").hide();
			$("#main_contents").addClass("after");
			prepare();
		}
	});

	$("#main_contents").on("transitionend", function(e) {
		unlock();
		if (phase === 'ready') {
			startTime = +new Date();
			$(".button").attr("class", "button layer0");
			start();
		} else if (phase === "running") {
			$("#main_contents").hide();
			$("#title_contents").show();
			exTimeout = setTimeout(function() {
				clearTimeout(exTimeout);
				$("#title_contents").removeClass('after');
				resetContents();
				init();
			}, 100);
		} else if (phase === "replay") {
			resetContents();
			init();
			prepare();
			exTimeout = setTimeout(function() {
				clearTimeout(exTimeout);
				$("#main_contents").addClass("after");
			}, 100);
		}
	});

	$('.cards').on('click', function() {
		if ($(this).find('span').html() === order[readIndex]) {
			$(this).css('opacity', 0);
			$('#display').html("");
			stopAudio('#audio_player');
			readIndex++;
			if (readIndex < order.length) {
				start();
			} else {
				var time = +new Date() - startTime;
			}
		} else {
			$(this).css("transitionDuration", "0.1s");
			$(this).addClass('missed');
		}
	});

	$(".cards").on("transitionend", function(e) {
		e.stopPropagation();
		if ($(this).css("opacity") == 0) {
			$(this).hide();
		} else if ($(this).hasClass("missed")) {
			$(this).css("transitionDuration", "1s");
			$(this).removeClass("missed");
		} else {
			$(this).css("transitionDuration", "0.5s");
		}
	});

	$("#return").on("click", function(e) {
		if (isLocked()) {
			return;
		}
		clearTimeout(startTimeout);
		clearTimeout(textTimeout);
		stopAudio('#audio_player');
		$("#main_contents").removeClass('after');
	});

	$("#replay").on("click", function(e) {
		if (isLocked()) {
			return;
		}
		clearTimeout(startTimeout);
		clearTimeout(textTimeout);
		stopAudio('#audio_player');
		phase = "replay";
		$("#main_contents").removeClass('after');
	});

	/* ---------- Functions ----------*/

	function init() {
		$("#buttons").removeClass('before');
		$(".button").css("transition", "all 0.75s ease 0s");
		$(".button").each(function(i, el) {
			$(this).removeClass('layer0');
			$(this).addClass('layer' + $(this).attr('id').match(/\d+/)[0]);
		});
	}

	function prepare() {
		if (phase !== 'loading' && phase !== 'replay') {
			return;
		}
		prepareContents();
		prepareStyles();
		phase = 'ready';
		lock();
	}

	function prepareContents() {
		var indexList = $.array(36, function(i) {
			return i;
		});

		nameList = [];
		order = [];

		$.each(data, function(key, value) {
			if (data[key].level === levels[level]) {
				var index = Math.floor(Math.random() * indexList.length);
				nameList[indexList[index]] = key;
				indexList.splice(index, 1);
			}
		});

		indexList = $.array(36, function(i) {
			return i;
		});

		$.each(data, function(key, value) {
			if (data[key].level === levels[level]) {
				var index = Math.floor(Math.random() * indexList.length);
				order[indexList[index]] = key;
				indexList.splice(index, 1);
			}
		});
	}

	function prepareStyles() {
		$('.cards').height($('.cards').width() * 55 / 92);
		$('.cards').css('lineHeight', $('.cards').height() + 'px');

		$.each(nameList, function(i, el) {
			$('#card' + i).append('<div class="underline"></div>');
			$('#card' + i).append('<span>' + el + '</span>');
		});

		$('.cards').css('left', function() {
			return $(this).position().left;
		});
		$('.cards').css('top', function() {
			return $(this).position().top + 24;
		});
		$('.cards').css({
			width: $('#main_contents').width() / 6 - 16
		});

		$('.cards').css({
			position: "absolute"
		});

		$('.underline').css({
			width: $('.cards').width() * 0.8,
			marginLeft: $('.cards').width() * 0.1,
			marginTop: ($('.cards').height() - $('.underline').height()) / 2 + 2
		});

		$('.cards').css("transition", "all 0.5s ease 0s");
	}

	function resetContents() {
		unlock();
		phase = "loading";
		$('.cards').attr("style", "");
		$('.cards, #display').empty();
	}

	function read(key) {
		var audio = 'data:audio/mp3;base64,' + data[key].audio;
		playAudio('#audio_player', audio);
	}

	function display(key) {
		displayCharcter(key);
	}

	function start() {
		phase = "running";
		clearTimeout(startTimeout);
		startTimeout = setTimeout(function() {
			textIndex = 0;
			textBuffer = "";
			read(order[readIndex]);
			display(order[readIndex]);
		}, 100);
	}

	function displayCharcter(key) {
		clearTimeout(textTimeout);
		if (textIndex < data[key].text.length) {
			textTimeout = setTimeout(function() {
				textBuffer += data[key].text[textIndex++];
				$("#display").html('<span>' + textBuffer + '</span>');
				displayCharcter(key);
			}, 30);
		}
	}

	function playAudio(audio, src) {
		$(audio).attr("src", src);
		$(audio).get(0).play();
	}

	function stopAudio(audio) {
		$(audio).get(0).pause();
	}

	function fadeAudio(audio, rate) {
		$(audio).prop("volume", Math.max(0, $(audio).prop("volume") - rate));
		if ($(audio).prop("volume") > 0) {
			audioTimeout = setTimeout(function() {
				fadeAudio(audio, rate);
			}, 50);
		}
	};

	function lock() {
		locked = true;
	}

	function unlock() {
		locked = false;
	}

	function isLocked() {
		return locked;
	}

	/* ---------- Execute ----------*/

	$.ajax({
		url: 'json/data.json',
		dataType: 'json',
		xhr: function() {
			var xmlHttpRequest = $.ajaxSettings.xhr();
			xmlHttpRequest.onprogress = function(d) {
				$("#progress").width(d.loaded / d.total * 100 + '%');
			}
			return xmlHttpRequest;
		}
	}).done(function(d) {
		$("#progressbox").addClass('after');
		data = d;
	});
});