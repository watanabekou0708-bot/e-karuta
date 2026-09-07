(function($) {
	$.array = function(length, arg) {
		if (typeof arg === 'undefined') {
			return new Array(length);
		} else if (typeof arg === 'function') {
			var array = [];
			for (var i = 0; i < length; i++) {
				array[i] = arg(i);
			}
			return array;
		} else if (typeof arg === 'object') {
			var array = [];
			for (var i = 0; i < length; i++) {
				array[i] = $.extend(true, {}, arg);
			}
			return array;
		} else if (typeof arg === 'array') {
			var array = [];
			for (var i = 0; i < length; i++) {
				array[i] = $.extend(true, [], arg);
			}
			return array;
		} else {
			var array = [];
			for (var i = 0; i < length; i++) {
				array[i] = arg;
			}
			return array;
		}
	}
})(jQuery);