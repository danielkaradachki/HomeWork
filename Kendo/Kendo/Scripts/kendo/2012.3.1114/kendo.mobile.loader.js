/*
* Kendo UI Complete v2012.3.1114 (http://kendoui.com)
* Copyright 2012 Telerik AD. All rights reserved.
*
* Kendo UI Complete commercial licenses may be obtained at
* https://www.kendoui.com/purchase/license-agreement/kendo-ui-complete-commercial.aspx
* If you do not own a commercial license, this file shall be governed by the trial license terms.
*/
(function($, undefined) {
    var kendo = window.kendo,
        ui = kendo.mobile.ui,
        Widget = ui.Widget,
        CAPTURE_EVENTS = ["touchstart", "touchend", "touchmove", "mousedown", "mousemove", "mouseup"];

    var Loader = Widget.extend({
        init: function(container, options) {
            var that = this,
                element = $('<div class="km-loader"><span class="km-loading km-spin"></span></div>');

            Widget.fn.init.call(that, element, options);

            that.container = container;

            that._attachCapture();

            element.append(that.options.loading).hide().appendTo(container);
        },

        options: {
            name: "Loader",
            loading: "<h1>Loading...</h1>",
            timeout: 100
        },

        show: function() {
            var that = this;

            clearTimeout(that._loading);

            if (that.options.loading === false) {
                return;
            }

            that._loading = setTimeout(function() {
                that.element.show();
            }, that.options.timeout);
        },

        hide: function() {
            var that = this;
            clearTimeout(that._loading);
            that.element.hide();
        },

        transition: function() {
            this.transitioning = true;
        },

        transitionDone: function() {
            this.transitioning = false;
        },

        _attachCapture: function() {
            var that = this;
            that.transitioning = false;

            function capture(e) {
                if (that.transitioning) {
                    e.stopPropagation();
                }
            }

            for (var i = 0; i < CAPTURE_EVENTS.length; i ++) {
                that.container[0].addEventListener(CAPTURE_EVENTS[i], capture, true);
            }
        }
    });

    ui.plugin(Loader);
})(window.kendo.jQuery);
