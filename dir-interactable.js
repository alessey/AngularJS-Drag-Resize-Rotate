(function(ng) {
	ng.app.
		directive("dirInteractable", ["$document", "$timeout",
			function($document, $timeout) {
				return {
					template: [
						'<div id="{{settings.id}}" class="i-control" ng-class="{\'i-control-default\': vm.default, \'i-control-selected\': vm.selected, \'i-control-move-enabled\': vm.move_enabled}">',
						'\t<div ng-class="{\'shown touchBox\': vm.selected, \'i-resizable-handle i-resizable-handle-nw\': vm.resize_enabled, \'small-content\': vm.is_small_content}"></div>',
						'\t<div ng-class="{\'shown touchBox\': vm.selected, \'i-resizable-handle i-resizable-handle-ne\': vm.resize_enabled, \'small-content\': vm.is_small_content}"></div>',
						'\t<div ng-class="{\'shown touchBox\': vm.selected, \'i-resizable-handle i-resizable-handle-se\': vm.resize_enabled, \'small-content\': vm.is_small_content}"></div>',
						'\t<div ng-class="{\'shown touchBox\': vm.selected, \'i-resizable-handle i-resizable-handle-sw\': vm.resize_enabled, \'small-content\': vm.is_small_content}"></div>',
						'\t<div ng-class="{\'i-rotatable-handle\': vm.rotate_enabled, \'shown\': vm.selected}"></div>',
						'\t<div class="i-content" ng-transclude></div>',
						'</div>'
					].join("\n"),
					scope: {
						"_options": "=dirInteractable"
					},
					restrict: "A",
					replace: true,
					transclude: true,
					link: function(scope, elem/*, attrs*/) {

						var defaults = {
							constrain_ar: false,
							enabled: true,
							move_enabled: true,
							resize_enabled: true,
							rotate_enabled: true,
							id: ""+(new Date).getTime(),
							width: 100,
							height: 100,
							x: 100,
							y: 100,
							angle: 0
						};

						scope.settings = ng.extend(defaults, scope._options);

						/* initialize control */
						var control = {
							id: scope.settings.id,
							width: scope.settings.width,
							height: scope.settings.height,
							x: scope.settings.x,
							y: scope.settings.y,
							angle: scope.settings.angle,
							aspect_ratio: scope.settings.width / scope.settings.height,
							selected: false,
							offset: {
								x: 0,
								y: 0
							}
						};

						/* scope linked properties */
						scope.vm = {};
						Object.defineProperty(scope.vm, "default", {
							get: function() {
								return !control.selected;
							}
						});
						Object.defineProperty(scope.vm, "selected", {
							get: function() {
								return control.selected && scope.settings.enabled;
							}
						});
						Object.defineProperty(scope.vm, "move_enabled", {
							get: function() {
								return control.selected && scope.settings.move_enabled;
							}
						});
						Object.defineProperty(scope.vm, "resize_enabled", {
							get: function() {
								return scope.settings.resize_enabled;
							}
						});
						Object.defineProperty(scope.vm, "rotate_enabled", {
							get: function() {
								return scope.settings.rotate_enabled;
							}
						});
						Object.defineProperty(scope.vm, "is_small_content", {
							get: function() {
								return control.width < 26 || control.height < 26;
							}
						});

						/* set up initial state, disable browser dragging images */
						elem.
							css({"position": "absolute"}).
							add(elem.find("img")).
								attr("draggable", "false").
								attr("unselectable", "on").
								addClass("unselectable").
								on("dragstart", function() { return false; } );

						/* timeout to give elements a cycle to render */
						$timeout(function() {
							set_position();
							set_rotation(control.angle);
						}, 100);

						/* if enabled, set up events */
						if (scope.settings.enabled) {
							elem.
								off("mousedown.{0} touchstart.{0}".format(control.id)).
								on("mousedown.{0} touchstart.{0}".format(control.id), mousedown);

							$document.
								off("mouseup.{0} touchend.{0}".format(control.id)).
								on("mouseup.{0} touchend.{0}".format(control.id), function(e) {
									$document.off("mousemove.{0} touchmove.{0}".format(control.id));
								}).
								off("mousedown.{0} touchstart.{0}".format(control.id)).
								on("mousedown.{0} touchstart.{0}".format(control.id), function(e) {
									var selected = e.target.id === control.id || ng.element(e.target).closest(".i-control").attr("id") === control.id;
									if (!selected && control.selected) {
										scope.$root.$apply_safe(function() {
											control.selected = false;
										});
									}
								});
						}

						/* utility functions */
						var set_rotation = function(angle) {
							elem.css({"transform": "rotate({0}rad)".format(angle)});
						};

						var set_position = function() {
							// have to round or Chrome (osX) will show remnants when dragging...
							if (control.width < 10) {  // width/height must be > 10
								control.width = 10;
							}
							if (control.height < 10) {
								control.height = 10;
							}

							elem.css({
								"width": Math.round(control.width),
								"height": Math.round(control.height),
								"left": Math.round(control.x),
								"top": Math.round(control.y)
							});
						};

						var get_rotation_offset = function() {
							if (control.angle) {
								set_rotation(0);
							}

							var offset = elem.offset();

							if (control.angle) {
								set_rotation(control.angle);
							}

							return offset;
						};

						var to_degrees = function(radians) {
							return (radians * (180 / Math.PI)) % 360;
						};

						var to_radians = function(degrees) {
							return (degrees % 360) * (Math.PI / 180);
						};

						var get_element_center = function() {
							var offset = get_rotation_offset();

							return {
								x: offset.left + control.width / 2,
								y: offset.top + control.height / 2
							}
						};

						var get_mouse_delta = function(e) {
							return {
								x: e.pageX - control.offset.x,
								y: e.pageY - control.offset.y
							};
						};

						var calculate_delta = function(e) {
							var delta = get_mouse_delta(e);
							set_offset(e);

							return get_rotated_delta(delta);
						};

						var get_rotated_delta = function(delta) {
							var dWidth = {x: delta.x * Math.cos(control.angle), y: -delta.x * Math.sin(control.angle)};
							var dHeight = {x: delta.y * Math.sin(control.angle), y: delta.y * Math.cos(control.angle)};

							return {
								x: dWidth.x + dHeight.x,
								y: dWidth.y + dHeight.y
							};
						};

						var set_offset = function(e) {
							control.offset = {
								x: e.pageX,
								y: e.pageY
							};
						};

						var check_snap = function() {
							var deg = to_degrees(control.angle);
							var mod90 = Math.abs(deg) % 90;
							if (mod90 > 85 || mod90 < 5) {
								control.angle = to_radians(Math.round(deg / 90) * 90);
							}
						};

						var get_event_location = function(e) {
							return typeof e.pageX != "undefined" ? e : e.originalEvent.changedTouches[0];
						};

						/* event handlers */
						function mousedown(e) {
							if (!control.selected) {
								scope.$root.$apply_safe(function() {
									control.selected = true;
								});
							}
							else {
								var classes = e.target.className;
								var loc = get_event_location(e);
								if (classes.match(/i\-rotatable\-handle/gi)) {

									// rotate
									var center = get_element_center();
									var start_from_center = {
										x: loc.pageX - center.x,
										y: loc.pageY - center.y
									};
									var start_angle = Math.atan2(start_from_center.y, start_from_center.x);
									var element_start_angle = control.angle;

									$document.
										off("mousemove.{0} touchmove.{0}".format(control.id)).
										on("mousemove.{0} touchmove.{0}".format(control.id), function(e) {
											e.preventDefault();  // prevent scrolling on touch devices

											var loc = get_event_location(e);
											var center = get_element_center();
											var from_center = {
												x: loc.pageX - center.x,
												y: loc.pageY - center.y
											};
											var angle = Math.atan2(from_center.y, from_center.x);

											control.angle = angle - start_angle + element_start_angle;

											// snap to 90's from within 5 degrees
											check_snap();

											set_rotation(control.angle);
										});
								}
								else if (classes.match(/i\-resizable\-handle\-(..)/gi)) {
									var handle = RegExp.$1.toLowerCase();

									// resize
									control.offset = {
										x: loc.pageX,
										y: loc.pageY
									};

									switch (handle) {
										case "ne":
											$document.
												off("mousemove.{0} touchmove.{0}".format(control.id)).
												on("mousemove.{0} touchmove.{0}".format(control.id), ne_resize);
											break;
										case "se":
											$document.
												off("mousemove.{0} touchmove.{0}".format(control.id)).
												on("mousemove.{0} touchmove.{0}".format(control.id), se_resize);
											break;
										case "sw":
											$document.
												off("mousemove.{0} touchmove.{0}".format(control.id)).
												on("mousemove.{0} touchmove.{0}".format(control.id), sw_resize);
											break;
										case "nw":
											$document.
												off("mousemove.{0} touchmove.{0}".format(control.id)).
												on("mousemove.{0} touchmove.{0}".format(control.id), nw_resize);
											break;
										default:
											console.error("Invalid Handle: {0}".format(handle));
											break;
									}
								}
								else {
									// drag
									control.offset = {
										x: loc.pageX,
										y: loc.pageY
									};

									if (scope.settings.move_enabled) {
										$document
											.off("mousemove.{0} touchmove.{0}".format(control.id))
											.on("mousemove.{0} touchmove.{0}".format(control.id), drag);
									}
								}
							}
						};

						function ne_resize(e) {
							e.preventDefault();  // prevent scrolling on touch devices

							var loc = get_event_location(e);
							var delta = calculate_delta(loc);

							if (scope.settings.constrain_ar) {
								delta.x = -delta.y * control.aspect_ratio;
							}

							control.width = control.width + delta.x;
							control.height = control.height - delta.y;
							control.x = control.x + delta.y * Math.sin(-control.angle) - (0.5 * delta.y * Math.sin(-control.angle)) - delta.x * 0.5 * (1 - Math.cos(control.angle));
							control.y = control.y + delta.y * Math.cos(-control.angle) + (0.5 * delta.y * (1 - Math.cos(-control.angle))) + (0.5 * delta.x * Math.sin(control.angle));

							set_position();
						};

						function nw_resize(e) {
							e.preventDefault();  // prevent scrolling on touch devices

							var loc = get_event_location(e);
							var delta = calculate_delta(loc);

							if (scope.settings.constrain_ar) {
								delta.x = delta.y * control.aspect_ratio;
							}

							control.width = control.width - delta.x;
							control.height = control.height - delta.y;
							control.x = control.x + delta.x * Math.cos(control.angle) + delta.y * Math.sin(-control.angle) + (0.5 * delta.x * (1-Math.cos(control.angle))) - (0.5 * delta.y * Math.sin(-control.angle));
							control.y = control.y + delta.y * Math.cos(-control.angle) + delta.x * Math.sin(control.angle) + (0.5 * delta.y * (1-Math.cos(-control.angle))) - (0.5 * delta.x * Math.sin(control.angle));

							set_position();
						};

						function se_resize(e) {
							e.preventDefault();  // prevent scrolling on touch devices

							var loc = get_event_location(e);
							var delta = calculate_delta(loc);

							if (scope.settings.constrain_ar) {
								delta.x = delta.y * control.aspect_ratio;
							}

							control.width = control.width + delta.x;
							control.height = control.height + delta.y;
							control.x = control.x + 0.5 * delta.y * Math.sin(-control.angle) - (0.5 * delta.x * (1 - Math.cos(control.angle)));
							control.y = control.y + 0.5 * delta.x * Math.sin(control.angle) - (0.5 * delta.y * (1 - Math.cos(-control.angle)));

							set_position();
						};

						function sw_resize(e) {
							e.preventDefault();  // prevent scrolling on touch devices

							var loc = get_event_location(e);
							var delta = calculate_delta(loc);

							if (scope.settings.constrain_ar) {
								delta.x = -delta.y * control.aspect_ratio;
							}

							control.width = control.width - delta.x;
							control.height = control.height + delta.y;
							control.x = control.x + delta.x * Math.cos(control.angle) + delta.y * 0.5 * Math.sin(-control.angle) + (0.5 * delta.x * (1 - Math.cos(control.angle)));
							control.y = control.y + delta.x * Math.sin(control.angle) - (0.5 * delta.y * (1 - Math.cos(-control.angle))) - 0.5 * delta.x * Math.sin(control.angle);

							set_position();
						};

						function drag(e) {
							e.preventDefault();  // prevent scrolling on touch devices

							var loc = get_event_location(e);
							var delta = get_mouse_delta(loc);
							set_offset(loc);

							control.x += delta.x;
							control.y += delta.y;

							set_position();
						};

						scope.$on("$destroy", function() {
							// remove handlers
							// -- one or more space-separated event types
							elem.
								off("mousedown.{0} mouseup.{0}".format(control.id));

							elem.
								off("touchstart.{0}".format(control.id));

							$document.
								off("mousedown.{0} mouseup.{0} click.{0}".format(control.id));

							$document.
								off("touchstart.{0} touchend.{0} touchmove.{0}".format(control.id));
						});
					}
				}
		}]);
})(window.angular);