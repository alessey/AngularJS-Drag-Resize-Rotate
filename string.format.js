if (typeof String.prototype.format !== "function") {
	String.prototype.format = function() {
		var args = arguments;
		var argn = arguments.length;
		var to_s = function(val) {
			var vtype = typeof val;
			return vtype === "string"
				? val : (vtype === "number" || vtype === "boolean"
					? "" + val : (vtype === "object" && val !== null && typeof val.toString === "function"
						? val.toString() : ""));
		};
		var arg0 = (argn === 1 && args[0] === Object(args[0])) ? args[0] : undefined;
		var fx = (arg0 === undefined)
			? function (str, i) { i = +i; return (i>=0 && i<argn) ? to_s(args[i]) : str; } // "{0}".foramt("a");
			: function (str, k) { return (k in arg0) ? to_s(arg0[k]) : str; }              // "{key}".format({key: "a"});
		;
		return this.replace(/{([^{}]*)}/g, fx);
	};
}
