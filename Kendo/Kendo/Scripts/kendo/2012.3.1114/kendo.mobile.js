/*
* Kendo UI Complete v2012.3.1114 (http://kendoui.com)
* Copyright 2012 Telerik AD. All rights reserved.
*
* Kendo UI Complete commercial licenses may be obtained at
* https://www.kendoui.com/purchase/license-agreement/kendo-ui-complete-commercial.aspx
* If you do not own a commercial license, this file shall be governed by the trial license terms.
*/
;(function($, undefined) {
    var kendo = window.kendo = window.kendo || {},
        extend = $.extend,
        each = $.each,
        proxy = $.proxy,
        isArray = $.isArray,
        noop = $.noop,
        isFunction = $.isFunction,
        math = Math,
        Template,
        JSON = window.JSON || {},
        support = {},
        percentRegExp = /%/,
        formatRegExp = /\{(\d+)(:[^\}]+)?\}/g,
        boxShadowRegExp = /(\d+?)px\s*(\d+?)px\s*(\d+?)px\s*(\d+?)?/i,
        FUNCTION = "function",
        STRING = "string",
        NUMBER = "number",
        OBJECT = "object",
        NULL = "null",
        BOOLEAN = "boolean",
        UNDEFINED = "undefined",
        getterCache = {},
        setterCache = {},
        slice = [].slice,
        globalize = window.Globalize;

    function Class() {}

    Class.extend = function(proto) {
        var base = function() {},
            member,
            that = this,
            subclass = proto && proto.init ? proto.init : function () {
                that.apply(this, arguments);
            },
            fn;

        base.prototype = that.prototype;
        fn = subclass.fn = subclass.prototype = new base();

        for (member in proto) {
            if (typeof proto[member] === OBJECT && !(proto[member] instanceof Array) && proto[member] !== null) {
                // Merge object members
                fn[member] = extend(true, {}, base.prototype[member], proto[member]);
            } else {
                fn[member] = proto[member];
            }
        }

        fn.constructor = subclass;
        subclass.extend = that.extend;

        return subclass;
    };

    var Observable = Class.extend({
        init: function() {
            this._events = {};
        },

        bind: function(eventName, handlers, one) {
            var that = this,
                idx,
                eventNames = typeof eventName === STRING ? [eventName] : eventName,
                length,
                original,
                handler,
                handlersIsFunction = typeof handlers === FUNCTION,
                events;

            for (idx = 0, length = eventNames.length; idx < length; idx++) {
                eventName = eventNames[idx];

                handler = handlersIsFunction ? handlers : handlers[eventName];

                if (handler) {
                    if (one) {
                        original = handler;
                        handler = function() {
                            that.unbind(eventName, handler);
                            original.apply(that, arguments);
                        };
                    }
                    events = that._events[eventName] = that._events[eventName] || [];
                    events.push(handler);
                }
            }

            return that;
        },

        one: function(eventNames, handlers) {
            return this.bind(eventNames, handlers, true);
        },

        first: function(eventName, handlers) {
            var that = this,
                idx,
                eventNames = typeof eventName === STRING ? [eventName] : eventName,
                length,
                handler,
                handlersIsFunction = typeof handlers === FUNCTION,
                events;

            for (idx = 0, length = eventNames.length; idx < length; idx++) {
                eventName = eventNames[idx];

                handler = handlersIsFunction ? handlers : handlers[eventName];

                if (handler) {
                    events = that._events[eventName] = that._events[eventName] || [];
                    events.unshift(handler);
                }
            }

            return that;
        },

        trigger: function(eventName, e) {
            var that = this,
                events = that._events[eventName],
                idx,
                length,
                isDefaultPrevented = false;

            if (events) {
                e = e || {};

                e.sender = that;

                e.preventDefault = function () {
                    isDefaultPrevented = true;
                };

                e.isDefaultPrevented = function() {
                    return isDefaultPrevented;
                };

                events = events.slice();

                //Do not cache the length of the events array as removing events attached through one will fail
                for (idx = 0, length = events.length; idx < length; idx++) {
                    events[idx].call(that, e);
                }
            }

            return isDefaultPrevented;
        },

        unbind: function(eventName, handler) {
            var that = this,
                events = that._events[eventName],
                idx,
                length;

            if (eventName === undefined) {
                that._events = {};
            } else if (events) {
                if (handler) {
                    for (idx = 0, length = events.length; idx < length; idx++) {
                        if (events[idx] === handler) {
                            events.splice(idx, 1);
                        }
                    }
                } else {
                    that._events[eventName] = [];
                }
            }

            return that;
        }
    });


     function compilePart(part, stringPart) {
         if (stringPart) {
             return "'" +
                 part.split("'").join("\\'")
                     .split('\\"').join('\\\\\\"')
                     .replace(/\n/g, "\\n")
                     .replace(/\r/g, "\\r")
                     .replace(/\t/g, "\\t") + "'";
         } else {
             var first = part.charAt(0),
                 rest = part.substring(1);

             if (first === "=") {
                 return "+(" + rest + ")+";
             } else if (first === ":") {
                 return "+e(" + rest + ")+";
             } else {
                 return ";" + part + ";o+=";
             }
         }
     }

    var argumentNameRegExp = /^\w+/,
        encodeRegExp = /\$\{([^}]*)\}/g,
        escapedCurlyRegExp = /\\\}/g,
        curlyRegExp = /__CURLY__/g,
        escapedSharpRegExp = /\\#/g,
        sharpRegExp = /__SHARP__/g,
        zeros = ["", "0", "00", "000", "0000"];

    Template = {
        paramName: "data", // name of the parameter of the generated template
        useWithBlock: true, // whether to wrap the template in a with() block
        render: function(template, data) {
            var idx,
                length,
                html = "";

            for (idx = 0, length = data.length; idx < length; idx++) {
                html += template(data[idx]);
            }

            return html;
        },
        compile: function(template, options) {
            var settings = extend({}, this, options),
                paramName = settings.paramName,
                argumentName = paramName.match(argumentNameRegExp)[0],
                useWithBlock = settings.useWithBlock,
                functionBody = "var o,e=kendo.htmlEncode;",
                parts,
                idx;

            if (isFunction(template)) {
                if (template.length === 2) {
                    //looks like jQuery.template
                    return function(d) {
                        return template($, { data: d }).join("");
                    };
                }
                return template;
            }

            functionBody += useWithBlock ? "with(" + paramName + "){" : "";

            functionBody += "o=";

            parts = template
                .replace(escapedCurlyRegExp, "__CURLY__")
                .replace(encodeRegExp, "#=e($1)#")
                .replace(curlyRegExp, "}")
                .replace(escapedSharpRegExp, "__SHARP__")
                .split("#");

            for (idx = 0; idx < parts.length; idx ++) {
                functionBody += compilePart(parts[idx], idx % 2 === 0);
            }

            functionBody += useWithBlock ? ";}" : ";";

            functionBody += "return o;";

            functionBody = functionBody.replace(sharpRegExp, "#");

            try {
                return new Function(argumentName, functionBody);
            } catch(e) {
                throw new Error(kendo.format("Invalid template:'{0}' Generated code:'{1}'", template, functionBody));
            }
        }
    };

function pad(number, digits, end) {
    number = number + "";
    digits = digits || 2;
    end = digits - number.length;

    if (end) {
        return zeros[digits].substring(0, end) + number;
    }

    return number;
}

    //JSON stringify
(function() {
    var escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap,
        indent,
        meta = {
            "\b": "\\b",
            "\t": "\\t",
            "\n": "\\n",
            "\f": "\\f",
            "\r": "\\r",
            "\"" : '\\"',
            "\\": "\\\\"
        },
        rep,
        toString = {}.toString;

    if (typeof Date.prototype.toJSON !== FUNCTION) {

        Date.prototype.toJSON = function (key) {
            var that = this;

            return isFinite(that.valueOf()) ?
                pad(that.getUTCFullYear(), 4) + "-" +
                pad(that.getUTCMonth() + 1)   + "-" +
                pad(that.getUTCDate())        + "T" +
                pad(that.getUTCHours())       + ":" +
                pad(that.getUTCMinutes())     + ":" +
                pad(that.getUTCSeconds())     + "Z" : null;
        };

        String.prototype.toJSON = Number.prototype.toJSON = Boolean.prototype.toJSON = function (key) {
            return this.valueOf();
        };
    }

    function quote(string) {
        escapable.lastIndex = 0;
        return escapable.test(string) ? "\"" + string.replace(escapable, function (a) {
            var c = meta[a];
            return typeof c === STRING ? c :
                "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
        }) + "\"" : "\"" + string + "\"";
    }

    function str(key, holder) {
        var i,
            k,
            v,
            length,
            mind = gap,
            partial,
            value = holder[key],
            type;

        if (value && typeof value === OBJECT && typeof value.toJSON === FUNCTION) {
            value = value.toJSON(key);
        }

        if (typeof rep === FUNCTION) {
            value = rep.call(holder, key, value);
        }

        type = typeof value;
        if (type === STRING) {
            return quote(value);
        } else if (type === NUMBER) {
            return isFinite(value) ? String(value) : NULL;
        } else if (type === BOOLEAN || type === NULL) {
            return String(value);
        } else if (type === OBJECT) {
            if (!value) {
                return NULL;
            }
            gap += indent;
            partial = [];
            if (toString.apply(value) === "[object Array]") {
                length = value.length;
                for (i = 0; i < length; i++) {
                    partial[i] = str(i, value) || NULL;
                }
                v = partial.length === 0 ? "[]" : gap ?
                    "[\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "]" :
                    "[" + partial.join(",") + "]";
                gap = mind;
                return v;
            }
            if (rep && typeof rep === OBJECT) {
                length = rep.length;
                for (i = 0; i < length; i++) {
                    if (typeof rep[i] === STRING) {
                        k = rep[i];
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ": " : ":") + v);
                        }
                    }
                }
            } else {
                for (k in value) {
                    if (Object.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ": " : ":") + v);
                        }
                    }
                }
            }

            v = partial.length === 0 ? "{}" : gap ?
                "{\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "}" :
                "{" + partial.join(",") + "}";
            gap = mind;
            return v;
        }
    }

    if (typeof JSON.stringify !== FUNCTION) {
        JSON.stringify = function (value, replacer, space) {
            var i;
            gap = "";
            indent = "";

            if (typeof space === NUMBER) {
                for (i = 0; i < space; i += 1) {
                    indent += " ";
                }

            } else if (typeof space === STRING) {
                indent = space;
            }

            rep = replacer;
            if (replacer && typeof replacer !== FUNCTION && (typeof replacer !== OBJECT || typeof replacer.length !== NUMBER)) {
                throw new Error("JSON.stringify");
            }

            return str("", {"": value});
        };
    }
})();

// Date and Number formatting
(function() {
    var dateFormatRegExp = /dddd|ddd|dd|d|MMMM|MMM|MM|M|yyyy|yy|HH|H|hh|h|mm|m|fff|ff|f|tt|ss|s|"[^"]*"|'[^']*'/g,
        standardFormatRegExp =  /^(n|c|p|e)(\d*)$/i,
        literalRegExp = /["'].*?["']/g,
        commaRegExp = /\,/g,
        EMPTY = "",
        POINT = ".",
        COMMA = ",",
        SHARP = "#",
        ZERO = "0",
        PLACEHOLDER = "??",
        EN = "en-US";

    //cultures
    kendo.cultures = {"en-US" : {
        name: EN,
        numberFormat: {
            pattern: ["-n"],
            decimals: 2,
            ",": ",",
            ".": ".",
            groupSize: [3],
            percent: {
                pattern: ["-n %", "n %"],
                decimals: 2,
                ",": ",",
                ".": ".",
                groupSize: [3],
                symbol: "%"
            },
            currency: {
                pattern: ["($n)", "$n"],
                decimals: 2,
                ",": ",",
                ".": ".",
                groupSize: [3],
                symbol: "$"
            }
        },
        calendars: {
            standard: {
                days: {
                    names: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
                    namesAbbr: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
                    namesShort: [ "Su", "Mo", "Tu", "We", "Th", "Fr", "Sa" ]
                },
                months: {
                    names: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
                    namesAbbr: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
                },
                AM: [ "AM", "am", "AM" ],
                PM: [ "PM", "pm", "PM" ],
                patterns: {
                    d: "M/d/yyyy",
                    D: "dddd, MMMM dd, yyyy",
                    F: "dddd, MMMM dd, yyyy h:mm:ss tt",
                    g: "M/d/yyyy h:mm tt",
                    G: "M/d/yyyy h:mm:ss tt",
                    m: "MMMM dd",
                    M: "MMMM dd",
                    s: "yyyy'-'MM'-'ddTHH':'mm':'ss",
                    t: "h:mm tt",
                    T: "h:mm:ss tt",
                    u: "yyyy'-'MM'-'dd HH':'mm':'ss'Z'",
                    y: "MMMM, yyyy",
                    Y: "MMMM, yyyy"
                },
                "/": "/",
                ":": ":",
                firstDay: 0
            }
        }
    }};


     function findCulture(culture) {
        if (culture) {
            if (culture.numberFormat) {
                return culture;
            }

            if (typeof culture === STRING) {
                var cultures = kendo.cultures;
                return cultures[culture] || cultures[culture.split("-")[0]] || null;
            }

            return null;
        }

        return null;
    }

    function getCulture(culture) {
        if (culture) {
            culture = findCulture(culture);
        }

        return culture || kendo.cultures.current;
    }

    kendo.culture = function(cultureName) {
        var cultures = kendo.cultures, culture;

        if (cultureName !== undefined) {
            culture = findCulture(cultureName) || cultures[EN];
            culture.calendar = culture.calendars.standard;
            cultures.current = culture;
        } else {
            return cultures.current;
        }
    };

    kendo.findCulture = findCulture;
    kendo.getCulture = getCulture;

    //set current culture to en-US.
    kendo.culture(EN);

    function formatDate(date, format, culture) {
        culture = getCulture(culture);

        var calendar = culture.calendars.standard,
            days = calendar.days,
            months = calendar.months;

        format = calendar.patterns[format] || format;

        return format.replace(dateFormatRegExp, function (match) {
            var result;

            if (match === "d") {
                result = date.getDate();
            } else if (match === "dd") {
                result = pad(date.getDate());
            } else if (match === "ddd") {
                result = days.namesAbbr[date.getDay()];
            } else if (match === "dddd") {
                result = days.names[date.getDay()];
            } else if (match === "M") {
                result = date.getMonth() + 1;
            } else if (match === "MM") {
                result = pad(date.getMonth() + 1);
            } else if (match === "MMM") {
                result = months.namesAbbr[date.getMonth()];
            } else if (match === "MMMM") {
                result = months.names[date.getMonth()];
            } else if (match === "yy") {
                result = pad(date.getFullYear() % 100);
            } else if (match === "yyyy") {
                result = pad(date.getFullYear(), 4);
            } else if (match === "h" ) {
                result = date.getHours() % 12 || 12;
            } else if (match === "hh") {
                result = pad(date.getHours() % 12 || 12);
            } else if (match === "H") {
                result = date.getHours();
            } else if (match === "HH") {
                result = pad(date.getHours());
            } else if (match === "m") {
                result = date.getMinutes();
            } else if (match === "mm") {
                result = pad(date.getMinutes());
            } else if (match === "s") {
                result = date.getSeconds();
            } else if (match === "ss") {
                result = pad(date.getSeconds());
            } else if (match === "f") {
                result = math.floor(date.getMilliseconds() / 100);
            } else if (match === "ff") {
                result = math.floor(date.getMilliseconds() / 10);
            } else if (match === "fff") {
                result = date.getMilliseconds();
            } else if (match === "tt") {
                result = date.getHours() < 12 ? calendar.AM[0] : calendar.PM[0];
            }

            return result !== undefined ? result : match.slice(1, match.length - 1);
        });
    }

    //number formatting
    function formatNumber(number, format, culture) {
        culture = getCulture(culture);

        var numberFormat = culture.numberFormat,
            groupSize = numberFormat.groupSize[0],
            groupSeparator = numberFormat[COMMA],
            decimal = numberFormat[POINT],
            precision = numberFormat.decimals,
            pattern = numberFormat.pattern[0],
            literals = [],
            symbol,
            isCurrency, isPercent,
            customPrecision,
            formatAndPrecision,
            negative = number < 0,
            integer,
            fraction,
            integerLength,
            fractionLength,
            replacement = EMPTY,
            value = EMPTY,
            idx,
            length,
            ch,
            hasGroup,
            hasNegativeFormat,
            decimalIndex,
            sharpIndex,
            zeroIndex,
            percentIndex,
            startZeroIndex,
            start = -1,
            end;

        //return empty string if no number
        if (number === undefined) {
            return EMPTY;
        }

        if (!isFinite(number)) {
            return number;
        }

        //if no format then return number.toString() or number.toLocaleString() if culture.name is not defined
        if (!format) {
            return culture.name.length ? number.toLocaleString() : number.toString();
        }

        formatAndPrecision = standardFormatRegExp.exec(format);

        // standard formatting
        if (formatAndPrecision) {
            format = formatAndPrecision[1].toLowerCase();

            isCurrency = format === "c";
            isPercent = format === "p";

            if (isCurrency || isPercent) {
                //get specific number format information if format is currency or percent
                numberFormat = isCurrency ? numberFormat.currency : numberFormat.percent;
                groupSize = numberFormat.groupSize[0];
                groupSeparator = numberFormat[COMMA];
                decimal = numberFormat[POINT];
                precision = numberFormat.decimals;
                symbol = numberFormat.symbol;
                pattern = numberFormat.pattern[negative ? 0 : 1];
            }

            customPrecision = formatAndPrecision[2];

            if (customPrecision) {
                precision = +customPrecision;
            }

            //return number in exponential format
            if (format === "e") {
                return customPrecision ? number.toExponential(precision) : number.toExponential(); // toExponential() and toExponential(undefined) differ in FF #653438.
            }

            // multiply if format is percent
            if (isPercent) {
                number *= 100;
            }

            number = number.toFixed(precision);
            number = number.split(POINT);

            integer = number[0];
            fraction = number[1];

            //exclude "-" if number is negative.
            if (negative) {
                integer = integer.substring(1);
            }

            value = integer;
            integerLength = integer.length;

            //add group separator to the number if it is longer enough
            if (integerLength >= groupSize) {
                value = EMPTY;
                for (idx = 0; idx < integerLength; idx++) {
                    if (idx > 0 && (integerLength - idx) % groupSize === 0) {
                        value += groupSeparator;
                    }
                    value += integer.charAt(idx);
                }
            }

            if (fraction) {
                value += decimal + fraction;
            }

            if (format === "n" && !negative) {
                return value;
            }

            number = EMPTY;

            for (idx = 0, length = pattern.length; idx < length; idx++) {
                ch = pattern.charAt(idx);

                if (ch === "n") {
                    number += value;
                } else if (ch === "$" || ch === "%") {
                    number += symbol;
                } else {
                    number += ch;
                }
            }

            return number;
        }

        //custom formatting
        //
        //separate format by sections.

        //make number positive
        if (negative) {
            number = -number;
        }

        format = format.split(";");
        if (negative && format[1]) {
            //get negative format
            format = format[1];
            hasNegativeFormat = true;
        } else if (number === 0) {
            //format for zeros
            format = format[2] || format[0];
            if (format.indexOf(SHARP) == -1 && format.indexOf(ZERO) == -1) {
                //return format if it is string constant.
                return format;
            }
        } else {
            format = format[0];
        }

        if (format.indexOf("'") > -1 || format.indexOf("\"") > -1) {
            format = format.replace(literalRegExp, function(match) {
                literals.push(match);
                return PLACEHOLDER;
            });
        }

        percentIndex = format.indexOf("%");

        isPercent = percentIndex != -1;
        isCurrency = format.indexOf("$") != -1;

        //multiply number if the format has percent
        if (isPercent) {
            if (format[percentIndex - 1] !== "\\") {
                number *= 100;
            } else {
                format = format.split("\\").join("");
            }
        }

        if (isCurrency || isPercent) {
            //get specific number format information if format is currency or percent
            numberFormat = isCurrency ? numberFormat.currency : numberFormat.percent;
            groupSize = numberFormat.groupSize[0];
            groupSeparator = numberFormat[COMMA];
            decimal = numberFormat[POINT];
            precision = numberFormat.decimals;
            symbol = numberFormat.symbol;
        }

        hasGroup = format.indexOf(COMMA) > -1;
        if (hasGroup) {
            format = format.replace(commaRegExp, EMPTY);
        }

        decimalIndex = format.indexOf(POINT);
        length = format.length;

        if (decimalIndex != -1) {
            zeroIndex = format.lastIndexOf(ZERO);
            sharpIndex = format.lastIndexOf(SHARP);
            fraction = number.toString().split(POINT)[1] || EMPTY;

            if (sharpIndex > zeroIndex && fraction.length > (sharpIndex - zeroIndex)) {
                idx = sharpIndex;
            } else if (zeroIndex != -1 && zeroIndex >= decimalIndex) {
                idx = zeroIndex;
            }

            if (idx) {
                number = number.toFixed(idx - decimalIndex);
            }

        } else {
            number = number.toFixed(0);
        }

        sharpIndex = format.indexOf(SHARP);
        startZeroIndex = zeroIndex = format.indexOf(ZERO);

        //define the index of the first digit placeholder
        if (sharpIndex == -1 && zeroIndex != -1) {
            start = zeroIndex;
        } else if (sharpIndex != -1 && zeroIndex == -1) {
            start = sharpIndex;
        } else {
            start = sharpIndex > zeroIndex ? zeroIndex : sharpIndex;
        }

        sharpIndex = format.lastIndexOf(SHARP);
        zeroIndex = format.lastIndexOf(ZERO);

        //define the index of the last digit placeholder
        if (sharpIndex == -1 && zeroIndex != -1) {
            end = zeroIndex;
        } else if (sharpIndex != -1 && zeroIndex == -1) {
            end = sharpIndex;
        } else {
            end = sharpIndex > zeroIndex ? sharpIndex : zeroIndex;
        }

        if (start == length) {
            end = start;
        }

        if (start != -1) {
            value = number.toString().split(POINT);
            integer = value[0];
            fraction = value[1] || EMPTY;

            integerLength = integer.length;
            fractionLength = fraction.length;

            //add group separator to the number if it is longer enough
            if (hasGroup) {
                if (integerLength === groupSize && integerLength < decimalIndex - startZeroIndex) {
                    integer = groupSeparator + integer;
                } else if (integerLength > groupSize) {
                    value = EMPTY;
                    for (idx = 0; idx < integerLength; idx++) {
                        if (idx > 0 && (integerLength - idx) % groupSize === 0) {
                            value += groupSeparator;
                        }
                        value += integer.charAt(idx);
                    }

                    integer = value;
                }
            }

            number = format.substring(0, start);

            if (negative && !hasNegativeFormat) {
                number += "-";
            }

            for (idx = start; idx < length; idx++) {
                ch = format.charAt(idx);

                if (decimalIndex == -1) {
                    if (end - idx < integerLength) {
                        number += integer;
                        break;
                    }
                } else {
                    if (zeroIndex != -1 && zeroIndex < idx) {
                        replacement = EMPTY;
                    }

                    if ((decimalIndex - idx) <= integerLength && decimalIndex - idx > -1) {
                        number += integer;
                        idx = decimalIndex;
                    }

                    if (decimalIndex === idx) {
                        number += (fraction ? decimal : EMPTY) + fraction;
                        idx += end - decimalIndex + 1;
                        continue;
                    }
                }

                if (ch === ZERO) {
                    number += ch;
                    replacement = ch;
                } else if (ch === SHARP) {
                    number += replacement;
                }
            }

            if (end >= start) {
                number += format.substring(end + 1);
            }

            //replace symbol placeholders
            if (isCurrency || isPercent) {
                value = EMPTY;
                for (idx = 0, length = number.length; idx < length; idx++) {
                    ch = number.charAt(idx);
                    value += (ch === "$" || ch === "%") ? symbol : ch;
                }
                number = value;
            }

            if (literals[0]) {
                length = literals.length;
                for (idx = 0; idx < length; idx++) {
                    number = number.replace(PLACEHOLDER, literals[idx]);
                }
            }
        }

        return number;
    }

    var toString = function(value, fmt, culture) {
        if (fmt) {
            if (value instanceof Date) {
                return formatDate(value, fmt, culture);
            } else if (typeof value === NUMBER) {
                return formatNumber(value, fmt, culture);
            }
        }

        return value !== undefined ? value : "";
    };

    if (globalize) {
        toString = proxy(globalize.format, globalize);
    }

    kendo.format = function(fmt) {
        var values = arguments;

        return fmt.replace(formatRegExp, function(match, index, placeholderFormat) {
            var value = values[parseInt(index, 10) + 1];

            return toString(value, placeholderFormat ? placeholderFormat.substring(1) : "");
        });
    };

    kendo._extractFormat = function (format) {
        if (format.slice(0,3) === "{0:") {
            format = format.slice(3, format.length - 1);
        }

        return format;
    };

    kendo.toString = toString;
    })();


(function() {
    var nonBreakingSpaceRegExp = /\u00A0/g,
        exponentRegExp = /[eE][\-+]?[0-9]+/,
        shortTimeZoneRegExp = /[+|\-]\d{1,2}/,
        longTimeZoneRegExp = /[+|\-]\d{1,2}:\d{2}/,
        dateRegExp = /^\/Date\((.*?)\)\/$/,
        formatsSequence = ["G", "g", "d", "F", "D", "y", "m", "T", "t"],
        numberRegExp = {
            2: /^\d{1,2}/,
            4: /^\d{4}/
        };

    function outOfRange(value, start, end) {
        return !(value >= start && value <= end);
    }

    function designatorPredicate(designator) {
        return designator.charAt(0);
    }

    function mapDesignators(designators) {
        return $.map(designators, designatorPredicate);
    }

    //if date's day is different than the typed one - adjust
    function adjustDate(date, hours) {
        if (!hours && date.getHours() === 23) {
            date.setHours(date.getHours() + 2);
        }
    }

    function parseExact(value, format, culture) {
        if (!value) {
            return null;
        }

        var lookAhead = function (match) {
                var i = 0;
                while (format[idx] === match) {
                    i++;
                    idx++;
                }
                if (i > 0) {
                    idx -= 1;
                }
                return i;
            },
            getNumber = function(size) {
                var rg = numberRegExp[size] || new RegExp('^\\d{1,' + size + '}'),
                    match = value.substr(valueIdx, size).match(rg);

                if (match) {
                    match = match[0];
                    valueIdx += match.length;
                    return parseInt(match, 10);
                }
                return null;
            },
            getIndexByName = function (names) {
                var i = 0,
                    length = names.length,
                    name, nameLength;

                for (; i < length; i++) {
                    name = names[i];
                    nameLength = name.length;

                    if (value.substr(valueIdx, nameLength) == name) {
                        valueIdx += nameLength;
                        return i + 1;
                    }
                }
                return null;
            },
            checkLiteral = function() {
                var result = false;
                if (value.charAt(valueIdx) === format[idx]) {
                    valueIdx++;
                    result = true;
                }
                return result;
            },
            calendar = culture.calendars.standard,
            year = null,
            month = null,
            day = null,
            hours = null,
            minutes = null,
            seconds = null,
            milliseconds = null,
            idx = 0,
            valueIdx = 0,
            literal = false,
            date = new Date(),
            shortYearCutOff = 30,
            defaultYear = date.getFullYear(),
            ch, count, length, pattern,
            pmHour, UTC, ISO8601, matches,
            amDesignators, pmDesignators,
            hoursOffset, minutesOffset,
            century;

        if (!format) {
            format = "d"; //shord date format
        }

        //if format is part of the patterns get real format
        pattern = calendar.patterns[format];
        if (pattern) {
            format = pattern;
        }

        format = format.split("");
        length = format.length;

        for (; idx < length; idx++) {
            ch = format[idx];

            if (literal) {
                if (ch === "'") {
                    literal = false;
                } else {
                    checkLiteral();
                }
            } else {
                if (ch === "d") {
                    count = lookAhead("d");
                    day = count < 3 ? getNumber(2) : getIndexByName(calendar.days[count == 3 ? "namesAbbr" : "names"]);

                    if (day === null || outOfRange(day, 1, 31)) {
                        return null;
                    }
                } else if (ch === "M") {
                    count = lookAhead("M");
                    month = count < 3 ? getNumber(2) : getIndexByName(calendar.months[count == 3 ? 'namesAbbr' : 'names']);

                    if (month === null || outOfRange(month, 1, 12)) {
                        return null;
                    }
                    month -= 1; //because month is zero based
                } else if (ch === "y") {
                    count = lookAhead("y");
                    year = getNumber(count);

                    if (year === null) {
                        return null;
                    }

                    if (count == 2) {
                        century = defaultYear - defaultYear % 100;
                        if (shortYearCutOff < year) {
                            century -= 100;
                        }
                        year = century + year;
                    }
                } else if (ch === "h" ) {
                    lookAhead("h");
                    hours = getNumber(2);
                    if (hours == 12) {
                        hours = 0;
                    }
                    if (hours === null || outOfRange(hours, 0, 11)) {
                        return null;
                    }
                } else if (ch === "H") {
                    lookAhead("H");
                    hours = getNumber(2);
                    if (hours === null || outOfRange(hours, 0, 23)) {
                        return null;
                    }
                } else if (ch === "m") {
                    lookAhead("m");
                    minutes = getNumber(2);
                    if (minutes === null || outOfRange(minutes, 0, 59)) {
                        return null;
                    }
                } else if (ch === "s") {
                    lookAhead("s");
                    seconds = getNumber(2);
                    if (seconds === null || outOfRange(seconds, 0, 59)) {
                        return null;
                    }
                } else if (ch === "f") {
                    count = lookAhead("f");
                    milliseconds = getNumber(count);

                    if (milliseconds !== null && count > 3) {
                        milliseconds = parseInt(milliseconds.toString().substring(0, 3), 10);
                    }

                    if (milliseconds === null || outOfRange(milliseconds, 0, 999)) {
                        return null;
                    }

                } else if (ch === "t") {
                    count = lookAhead("t");
                    amDesignators = calendar.AM;
                    pmDesignators = calendar.PM;

                    if (count === 1) {
                        amDesignators = mapDesignators(amDesignators);
                        pmDesignators = mapDesignators(pmDesignators);
                    }

                    pmHour = getIndexByName(pmDesignators);
                    if (!pmHour && !getIndexByName(amDesignators)) {
                        return null;
                    }
                }
                else if (ch === "z") {
                    UTC = true;
                    count = lookAhead("z");

                    if (value.substr(valueIdx, 1) === "Z") {
                        if (!ISO8601) {
                            return null;
                        }

                        checkLiteral();
                        continue;
                    }

                    matches = value.substr(valueIdx, 6)
                                   .match(count > 2 ? longTimeZoneRegExp : shortTimeZoneRegExp);

                    if (!matches) {
                        return null;
                    }

                    matches = matches[0];
                    valueIdx = matches.length;
                    matches = matches.split(":");

                    hoursOffset = parseInt(matches[0], 10);
                    if (outOfRange(hoursOffset, -12, 13)) {
                        return null;
                    }

                    if (count > 2) {
                        minutesOffset = parseInt(matches[1], 10);
                        if (isNaN(minutesOffset) || outOfRange(minutesOffset, 0, 59)) {
                            return null;
                        }
                    }
                } else if (ch === "T") {
                    ISO8601 = checkLiteral();
                } else if (ch === "'") {
                    literal = true;
                    checkLiteral();
                } else if (!checkLiteral()) {
                    return null;
                }
            }
        }

        if (year === null) {
            year = defaultYear;
        }

        if (pmHour && hours < 12) {
            hours += 12;
        }

        if (day === null) {
            day = 1;
        }

        if (UTC) {
            if (hoursOffset) {
                hours += -hoursOffset;
            }

            if (minutesOffset) {
                minutes += -minutesOffset;
            }

            value = new Date(Date.UTC(year, month, day, hours, minutes, seconds, milliseconds));
        } else {
            value = new Date(year, month, day, hours, minutes, seconds, milliseconds);
            adjustDate(value, hours);
        }

        if (year < 100) {
            value.setFullYear(year);
        }

        return value;
    }

    kendo._adjustDate = adjustDate;

    kendo.parseDate = function(value, formats, culture) {
        if (value instanceof Date) {
            return value;
        }

        var idx = 0,
            date = null,
            length, patterns;

        if (value && value.indexOf("/D") === 0) {
            date = dateRegExp.exec(value);
            if (date) {
                return new Date(parseInt(date[1], 10));
            }
        }

        culture = kendo.getCulture(culture);

        if (!formats) {
            formats = [];
            patterns = culture.calendar.patterns;
            length = formatsSequence.length;

            for (; idx < length; idx++) {
                formats[idx] = patterns[formatsSequence[idx]];
            }
            formats[idx] = "ddd MMM dd yyyy HH:mm:ss";
            formats[++idx] = "yyyy-MM-ddTHH:mm:ss.fffffffzzz";
            formats[++idx] = "yyyy-MM-ddTHH:mm:ss.fffzzz";
            formats[++idx] = "yyyy-MM-ddTHH:mm:sszzz";
            formats[++idx] = "yyyy-MM-ddTHH:mmzzz";
            formats[++idx] = "yyyy-MM-ddTHH:mmzz";
            formats[++idx] = "yyyy-MM-dd";

            idx = 0;
        }

        formats = isArray(formats) ? formats: [formats];
        length = formats.length;

        for (; idx < length; idx++) {
            date = parseExact(value, formats[idx], culture);
            if (date) {
                return date;
            }
        }

        return date;
    };

    kendo.parseInt = function(value, culture) {
        var result = kendo.parseFloat(value, culture);
        if (result) {
            result = result | 0;
        }
        return result;
    };

    kendo.parseFloat = function(value, culture, format) {
        if (!value && value !== 0) {
           return null;
        }

        if (typeof value === NUMBER) {
           return value;
        }

        value = value.toString();
        culture = kendo.getCulture(culture);

        var number = culture.numberFormat,
            percent = number.percent,
            currency = number.currency,
            symbol = currency.symbol,
            percentSymbol = percent.symbol,
            negative = value.indexOf("-") > -1,
            parts, isPercent;

        //handle exponential number
        if (exponentRegExp.test(value)) {
            value = parseFloat(value);
            if (isNaN(value)) {
                value = null;
            }
            return value;
        }

        if (value.indexOf(symbol) > -1 || (format && format.toLowerCase().indexOf("c") > -1)) {
            number = currency;
            parts = number.pattern[0].replace("$", symbol).split("n");
            if (value.indexOf(parts[0]) > -1 && value.indexOf(parts[1]) > -1) {
                value = value.replace(parts[0], "").replace(parts[1], "");
                negative = true;
            }
        } else if (value.indexOf(percentSymbol) > -1) {
            isPercent = true;
            number = percent;
            symbol = percentSymbol;
        }

        value = value.replace("-", "")
                     .replace(symbol, "")
                     .replace(nonBreakingSpaceRegExp, " ")
                     .split(number[","].replace(nonBreakingSpaceRegExp, " ")).join("")
                     .replace(number["."], ".");

        value = parseFloat(value);

        if (isNaN(value)) {
            value = null;
        } else if (negative) {
            value *= -1;
        }

        if (value && isPercent) {
            value /= 100;
        }

        return value;
    };

    if (globalize) {
        kendo.parseDate = function (value, format, culture) {
            if (value instanceof Date) {
                return value;
            }

            return globalize.parseDate(value, format, culture);
        };

        kendo.parseFloat = function (value, culture, format) {
            if (typeof value === NUMBER) {
                return value;
            }

            return globalize.parseFloat(value, culture);
        };
    }
})();

    function wrap(element) {
        var browser = support.browser,
            percentage,
            isRtl = element.css("direction") == "rtl";

        if (!element.parent().hasClass("k-animation-container")) {
            var shadow = element.css(kendo.support.transitions.css + "box-shadow") || element.css("box-shadow"),
                radius = shadow ? shadow.match(boxShadowRegExp) || [ 0, 0, 0, 0, 0 ] : [ 0, 0, 0, 0, 0 ],
                blur = math.max((+radius[3]), +(radius[4] || 0)),
                left = (-radius[1]) + blur,
                right = (+radius[1]) + blur,
                bottom = (+radius[2]) + blur,
                width = element[0].style.width,
                height = element[0].style.height,
                percentWidth = percentRegExp.test(width),
                percentHeight = percentRegExp.test(height);

            if (browser.opera) { // Box shadow can't be retrieved in Opera
                left = right = bottom = 5;
            }

            percentage = percentWidth || percentHeight;

            if (!percentWidth) { width = element.outerWidth(); }
            if (!percentHeight) { height = element.outerHeight(); }

            element.wrap(
                         $("<div/>")
                         .addClass("k-animation-container")
                         .css({
                             width: width,
                             height: height,
                             marginLeft: left * (isRtl ? 1 : -1),
                             paddingLeft: left,
                             paddingRight: right,
                             paddingBottom: bottom
                         }));

            if (percentage) {
                element.css({
                    width: "100%",
                    height: "100%",
                    boxSizing: "border-box",
                    mozBoxSizing: "border-box",
                    webkitBoxSizing: "border-box"
                });
            }
        } else {
            var wrapper = element.parent(".k-animation-container"),
                wrapperStyle = wrapper[0].style;

            if (wrapper.is(":hidden")) {
                wrapper.show();
            }

            percentage = percentRegExp.test(wrapperStyle.width) || percentRegExp.test(wrapperStyle.height);

            if (!percentage) {
                wrapper.css({
                    width: element.outerWidth(),
                    height: element.outerHeight()
                });
            }
        }

        if (browser.msie && math.floor(browser.version) <= 7) {
            element.css({
                zoom: 1
            });
        }

        return element.parent();
    }

    function deepExtend(destination) {
        var i = 1,
            length = arguments.length;

        for (i = 1; i < length; i++) {
            deepExtendOne(destination, arguments[i]);
        }

        return destination;
    }

    function deepExtendOne(destination, source) {
        var ObservableArray = kendo.data.ObservableArray,
            property,
            propValue,
            propType,
            destProp;

        for (property in source) {
            propValue = source[property];
            propType = typeof propValue;
            if (propType === OBJECT && propValue !== null && propValue.constructor !== Array && propValue.constructor !== ObservableArray) {
                if (propValue instanceof Date) {
                    destination[property] = new Date(propValue.getTime());
                } else {
                    destProp = destination[property];
                    if (typeof (destProp) === OBJECT) {
                        destination[property] = destProp || {};
                    } else {
                        destination[property] = {};
                    }
                    deepExtendOne(destination[property], propValue);
                }
            } else if (propType !== UNDEFINED) {
                destination[property] = propValue;
            }
        }

        return destination;
    }

    function testRx(agent, rxs, dflt) {
        for (var rx in rxs) {
            if (rxs.hasOwnProperty(rx) && rxs[rx].test(agent)) {
                return rx;
            }
        }
        return dflt !== undefined ? dflt : agent;
    }

    function getComputedStyles(element, properties) {
        var styles = {}, computedStyle;

        if (document.defaultView && document.defaultView.getComputedStyle) {
            computedStyle = document.defaultView.getComputedStyle(element, "");

            if (properties) {
                $.each(properties, function(idx, value) {
                    styles[value] = computedStyle.getPropertyValue(value);
                });
            }
        } else {
            computedStyle = element.currentStyle;

            if (properties) {
                $.each(properties, function(idx, value) {
                    styles[value] = computedStyle[value.replace(/\-(\w)/g, function (strMatch, g1) { return g1.toUpperCase(); })];
                });
            }
        }

        if (!kendo.size(styles)) {
            styles = computedStyle;
        }

        return styles;
    }

    (function() {
        support.scrollbar = function() {
            var div = document.createElement("div"),
                result;

            div.style.cssText = "overflow:scroll;overflow-x:hidden;zoom:1;clear:both";
            div.innerHTML = "&nbsp;";
            document.body.appendChild(div);

            result = div.offsetWidth - div.scrollWidth;

            document.body.removeChild(div);
            return result;
        };

        support.isRtl = function(element) {
            return $(element).closest(".k-rtl").length > 0;
        };

        var table = document.createElement("table");

        // Internet Explorer does not support setting the innerHTML of TBODY and TABLE elements
        try {
            table.innerHTML = "<tr><td></td></tr>";

            support.tbodyInnerHtml = true;
        } catch (e) {
            support.tbodyInnerHtml = false;
        }

        support.touch = "ontouchstart" in window;
        support.pointers = navigator.msPointerEnabled;

        var transitions = support.transitions = false,
            transforms = support.transforms = false,
            elementProto = "HTMLElement" in window ? HTMLElement.prototype : [];

        support.hasHW3D = ("WebKitCSSMatrix" in window && "m11" in new window.WebKitCSSMatrix()) || "MozPerspective" in document.documentElement.style || "msPerspective" in document.documentElement.style;
        support.hasNativeScrolling = typeof document.documentElement.style.webkitOverflowScrolling == "string";

        each([ "Moz", "webkit", "O", "ms" ], function () {
            var prefix = this.toString(),
                hasTransitions = typeof table.style[prefix + "Transition"] === STRING;

            if (hasTransitions || typeof table.style[prefix + "Transform"] === STRING) {
                var lowPrefix = prefix.toLowerCase();

                transforms = {
                    css: "-" + lowPrefix + "-",
                    prefix: prefix,
                    event: (lowPrefix === "o" || lowPrefix === "webkit") ? lowPrefix : lowPrefix === "ms" ? "MS" : ""
                };

                if (hasTransitions) {
                    transitions = transforms;
                    transitions.event = transitions.event ? transitions.event + "TransitionEnd" : "transitionend";
                }

                return false;
            }
        });

        support.transforms = transforms;
        support.transitions = transitions;

        support.devicePixelRatio = window.devicePixelRatio === undefined ? 1 : window.devicePixelRatio;

        support.detectOS = function (ua) {
            var os = false, minorVersion, match = [],
                agentRxs = {
                    fire: /(Silk)\/(\d+)\.(\d+(\.\d+)?)/,
                    android: /(Android|Android.*(?:Opera|Firefox).*?\/)\s*(\d+)\.(\d+(\.\d+)?)/,
                    iphone: /(iPhone|iPod).*OS\s+(\d+)[\._]([\d\._]+)/,
                    ipad: /(iPad).*OS\s+(\d+)[\._]([\d_]+)/,
                    meego: /(MeeGo).+NokiaBrowser\/(\d+)\.([\d\._]+)/,
                    webos: /(webOS)\/(\d+)\.(\d+(\.\d+)?)/,
                    blackberry: /(BlackBerry|BB10).*?Version\/(\d+)\.(\d+(\.\d+)?)/,
                    playbook: /(PlayBook).*?Tablet\s*OS\s*(\d+)\.(\d+(\.\d+)?)/,
                    winphone: /(IEMobile)\/(\d+)\.(\d+(\.\d+)?)/,
                    windows: /(MSIE)\s+(\d+)\.(\d+(\.\d+)?)/
                },
                osRxs = {
                    ios: /^i(phone|pad|pod)$/i,
                    android: /^android|fire$/i,
                    blackberry: /^blackberry|playbook/i,
                    windows: /windows|winphone/
                },
                formFactorRxs = {
                    tablet: /playbook|ipad|fire/i
                },
                browserRxs = {
                    omini: /Opera\sMini/i,
                    omobile: /Opera\sMobi/i,
                    firefox: /Firefox|Fennec/i,
                    mobilesafari: /version\/.*safari/i,
                    chrome: /chrome/i,
                    webkit: /webkit/i,
                    ie: /MSIE|Windows\sPhone/i
                };

            for (var agent in agentRxs) {
                if (agentRxs.hasOwnProperty(agent)) {
                    match = ua.match(agentRxs[agent]);
                    if (match) {
                        if (agent == "windows" && "plugins" in navigator) { return false; } // Break if not Metro/Mobile Windows

                        os = {};
                        os.device = agent;
                        os.tablet = testRx(agent, formFactorRxs, false);
                        os.browser = testRx(ua, browserRxs, "default");
                        os.name = testRx(agent, osRxs);
                        os[os.name] = true;
                        os.majorVersion = match[2];
                        os.minorVersion = match[3].replace("_", ".");
                        minorVersion = os.minorVersion.replace(".", "").substr(0, 2);
                        os.flatVersion = os.majorVersion + minorVersion + (new Array(3 - (minorVersion.length < 3 ? minorVersion.length : 2)).join("0"));
                        os.appMode = window.navigator.standalone || (/file|local/).test(window.location.protocol) || typeof window.PhoneGap !== UNDEFINED || typeof window.cordova !== UNDEFINED; // Use file protocol to detect appModes.

                        if (os.android && support.devicePixelRatio < 1.5 && (window.outerWidth > 800 || window.outerHeight > 800 || (window.screen && (window.screen.availWidth > 800 || window.screen.availHeight > 800)))) {
                            os.tablet = agent;
                        }

                        break;
                    }
                }
            }
            return os;
        };

        support.mobileOS = support.detectOS(navigator.userAgent);

        support.kineticScrollNeeded = support.mobileOS && support.touch;

        function detectBrowser(ua) {
            var browser = false, match = [],
                browserRxs = {
                    webkit: /(chrome)[ \/]([\w.]+)/i,
                    safari: /(webkit)[ \/]([\w.]+)/i,
                    opera: /(opera)(?:.*version|)[ \/]([\w.]+)/i,
                    msie: /(msie) ([\w.]+)/i,
                    mozilla: /(mozilla)(?:.*? rv:([\w.]+)|)/i
                };

            for (var agent in browserRxs) {
                if (browserRxs.hasOwnProperty(agent)) {
                    match = ua.match(browserRxs[agent]);
                    if (match) {
                        browser = {};
                        browser[agent] = true;
                        browser[match[1].toLowerCase()] = true;
                        browser.version = match[2];

                        break;
                    }
                }
            }
            return browser;
        }

        support.browser = detectBrowser(navigator.userAgent);

        support.zoomLevel = function() {
            return support.touch ? (document.documentElement.clientWidth / window.innerWidth) : 1;
        };

        support.eventCapture = document.documentElement.addEventListener;

        support.placeholder = "placeholder" in document.createElement("input");
        support.stableSort = (function() {
            var sorted = [0,1,2,3,4,5,6,7,8,9,10,11,12].sort(function() { return 0; } );
            return sorted[0] === 0 && sorted[1] === 1 && sorted[2] === 2 && sorted[3] === 3 && sorted[4] === 4 &&
                sorted[5] === 5 && sorted[6] === 6 && sorted[7] === 7 && sorted[8] === 8 &&
                sorted[9] === 9 && sorted[10] === 10 && sorted[11] === 11 && sorted[12] === 12;
        })();

        support.matchesSelector = elementProto.webkitMatchesSelector || elementProto.mozMatchesSelector ||
                                  elementProto.msMatchesSelector || elementProto.oMatchesSelector || elementProto.matchesSelector ||
          function( selector ) {
              var nodeList = document.querySelectorAll ? ( this.parentNode || document ).querySelectorAll( selector ) || [] : $(selector),
                  i = nodeList.length;

              while (i--) {
                  if (nodeList[i] == this) {
                      return true;
                  }
              }

              return false;
          };
    })();


    function size(obj) {
        var result = 0, key;
        for (key in obj) {
            if (obj.hasOwnProperty(key) && key != "toJSON") { // Ignore fake IE7 toJSON.
                result++;
            }
        }

        return result;
    }

    function isNodeEmpty(element) {
        return $.trim($(element).contents().filter(function () { return this.nodeType != 8; }).html()) === "";
    }

    function getOffset(element, type) {
        if (!type) {
            type = "offset";
        }

        var result = element[type](),
            mobileOS = support.mobileOS;

        if (support.touch && mobileOS.ios && mobileOS.flatVersion < 410) { // Extra processing only in broken iOS'
            var offset = type == "offset" ? result : element.offset(),
                positioned = (result.left == offset.left && result.top == offset.top);

            if (positioned) {
                return {
                    top: result.top - window.scrollY,
                    left: result.left - window.scrollX
                };
            }
        }

        return result;
    }

    var directions = {
        left: { reverse: "right" },
        right: { reverse: "left" },
        down: { reverse: "up" },
        up: { reverse: "down" },
        top: { reverse: "bottom" },
        bottom: { reverse: "top" },
        "in": { reverse: "out" },
        out: { reverse: "in" }
    };

    function parseEffects(input) {
        var effects = {};

        each((typeof input === "string" ? input.split(" ") : input), function(idx) {
            effects[idx] = this;
        });

        return effects;
    }

    function fx(element) {
        return new kendo.fx.Element(element);
    }

    $.extend(fx, {
        Element: function(element) {
            this.element = $(element);
        },

        promise: function (element, options) {
            if (!element.is(":visible")) {
                element.css({ display: element.data("olddisplay") || "block" }).css("display");
            }

            if (options.hide) {
                element.data("olddisplay", element.css("display")).hide();
            }

            if (options.init) {
                options.init();
            }

            if (options.completeCallback) {
                options.completeCallback(element); // call the external complete callback with the element
            }

            element.dequeue();
        },

        transitionPromise: function(element, destination, options) {
            var container = kendo.wrap(element);
            container.append(destination);

            element.hide();
            destination.show();

            if (options.completeCallback) {
                options.completeCallback(element); // call the external complete callback with the element
            }

            return element;
        }
    });

    function prepareAnimationOptions(options, duration, reverse, complete) {
        if (typeof options === STRING) {
            // options is the list of effect names separated by space e.g. animate(element, "fadeIn slideDown")

            // only callback is provided e.g. animate(element, options, function() {});
            if (isFunction(duration)) {
                complete = duration;
                duration = 400;
                reverse = false;
            }

            if (isFunction(reverse)) {
                complete = reverse;
                reverse = false;
            }

            if (typeof duration === BOOLEAN){
                reverse = duration;
                duration = 400;
            }

            options = {
                effects: options,
                duration: duration,
                reverse: reverse,
                complete: complete
            };
        }

        return extend({
            //default options
            effects: {},
            duration: 400, //jQuery default duration
            reverse: false,
            init: noop,
            teardown: noop,
            hide: false
        }, options, { completeCallback: options.complete, complete: noop }); // Move external complete callback, so deferred.resolve can be always executed.

    }

    function animate(element, options, duration, reverse, complete) {
        var idx = 0,
            length = element.length,
            instance;

        for (; idx < length; idx ++) {
            instance = $(element[idx]);
            instance.queue(function() {
                fx.promise(instance, prepareAnimationOptions(options, duration, reverse, complete));
            });
        }

        return element;
    }

    function animateTo(element, destination, options, duration, reverse, complete) {
        return fx.transitionPromise(element, destination, prepareAnimationOptions(options, duration, reverse, complete));
    }

    function toggleClass(element, classes, options, add) {
        if (classes) {
            classes = classes.split(" ");

            each(classes, function(idx, value) {
                element.toggleClass(value, add);
            });
        }

        return element;
    }

    if (!("kendoAnimate" in $.fn)) {
        extend($.fn, {
            kendoStop: function(clearQueue, gotoEnd) {
                return this.stop(clearQueue, gotoEnd);
            },

            kendoAnimate: function(options, duration, reverse, complete) {
                return animate(this, options, duration, reverse, complete);
            },

            kendoAnimateTo: function(destination, options, duration, reverse, complete) {
                return animateTo(this, destination, options, duration, reverse, complete);
            },

            kendoAddClass: function(classes, options){
                return kendo.toggleClass(this, classes, options, true);
            },
            kendoRemoveClass: function(classes, options){
                return kendo.toggleClass(this, classes, options, false);
            },
            kendoToggleClass: function(classes, options, toggle){
                return kendo.toggleClass(this, classes, options, toggle);
            }
        });
    }

    var ampRegExp = /&/g,
        ltRegExp = /</g,
        gtRegExp = />/g;
    function htmlEncode(value) {
        return ("" + value).replace(ampRegExp, "&amp;").replace(ltRegExp, "&lt;").replace(gtRegExp, "&gt;");
    }

    var touchLocation = function(e) {
        var originalEvent = typeof e.pageX == UNDEFINED ? e.originalEvent : e;
        return {
            idx: support.pointers ? originalEvent.pointerId : 0,
            x: originalEvent.pageX,
            y: originalEvent.pageY
        };
    };

    var eventTarget = function (e) {
        return e.target;
    };

    if (support.touch) {

        var mobileChrome = (support.mobileOS.browser == "chrome" && !support.mobileOS.ios);

        touchLocation = function(e, id) {
            var changedTouches = e.changedTouches || e.originalEvent.changedTouches;

            if (id) {
                var output = null;
                each(changedTouches, function(idx, value) {
                    if (id == value.identifier) {
                        output = {
                            idx: value.identifier,
                            x: value.pageX,
                            y: value.pageY
                        };
                    }
                });
                return output;
            } else {
                return {
                    idx: changedTouches[0].identifier,
                    x: changedTouches[0].pageX,
                    y: changedTouches[0].pageY
                };
            }
        };

        eventTarget = function(e) {
            var touches = "originalEvent" in e ? e.originalEvent.changedTouches : "changedTouches" in e ? e.changedTouches : null,
                property = mobileChrome ? "screen" : "client";

            return touches ? document.elementFromPoint(touches[0][property + "X"], touches[0][property + "Y"]) : e.target;
        };

        each(["swipe", "swipeLeft", "swipeRight", "swipeUp", "swipeDown", "doubleTap", "tap"], function(m, value) {
            $.fn[value] = function(callback) {
                return this.bind(value, callback);
            };
        });
    }

    if (support.touch) {
        if (!support.mobileOS) {
            support.mousedown = "mousedown touchstart";
            support.mouseup = "mouseup touchend";
            support.mousemove = "mousemove touchmove";
            support.mousecancel = "mouseleave touchcancel";
            support.click = "click touchend";
            support.resize = "resize";
        } else {
            support.mousedown = "touchstart";
            support.mouseup = "touchend";
            support.mousemove = "touchmove";
            support.mousecancel = "touchcancel";
            support.click = "touchend";
            support.resize = "orientationchange";
        }
    } else if (support.pointers) {
        support.mousemove = "MSPointerMove";
        support.mousedown = "MSPointerDown";
        support.mouseup = "MSPointerUp";
        support.mousecancel = "MSPointerCancel";
        support.click = "MSPointerUp";
        support.resize = "orientationchange resize";
    } else {
        support.mousemove = "mousemove";
        support.mousedown = "mousedown";
        support.mouseup = "mouseup";
        support.mousecancel = "mouseleave";
        support.click = "click";
        support.resize = "resize";
    }


    var wrapExpression = function(members) {
        var result = "d",
            index,
            idx,
            length,
            member,
            count = 1;

        for (idx = 0, length = members.length; idx < length; idx++) {
            member = members[idx];
            if (member !== "") {
                index = member.indexOf("[");

                if (index !== 0) {
                    if (index == -1) {
                        member = "." + member;
                    } else {
                        count++;
                        member = "." + member.substring(0, index) + " || {})" + member.substring(index);
                    }
                }

                count++;
                result += member + ((idx < length - 1) ? " || {})" : ")");
            }
        }
        return new Array(count).join("(") + result;
    },
    localUrlRe = /^([a-z]+:)?\/\//i;

    extend(kendo, {
        ui: kendo.ui || {},
        fx: kendo.fx || fx,
        mobile: kendo.mobile || {},
        data: kendo.data || {},
        dataviz: kendo.dataviz || {ui: { roles: {}}},
        keys: {
            INSERT: 45,
            DELETE: 46,
            BACKSPACE: 8,
            TAB: 9,
            ENTER: 13,
            ESC: 27,
            LEFT: 37,
            UP: 38,
            RIGHT: 39,
            DOWN: 40,
            END: 35,
            HOME: 36,
            SPACEBAR: 32,
            PAGEUP: 33,
            PAGEDOWN: 34,
            F2: 113,
            F10: 121,
            F12: 123
        },
        support: kendo.support || support,
        animate: kendo.animate || animate,
        ns: "",
        attr: function(value) {
            return "data-" + kendo.ns + value;
        },
        wrap: wrap,
        deepExtend: deepExtend,
        getComputedStyles: getComputedStyles,
        size: size,
        isNodeEmpty: isNodeEmpty,
        getOffset: kendo.getOffset || getOffset,
        parseEffects: kendo.parseEffects || parseEffects,
        toggleClass: kendo.toggleClass || toggleClass,
        directions: kendo.directions || directions,
        Observable: Observable,
        Class: Class,
        Template: Template,
        template: proxy(Template.compile, Template),
        render: proxy(Template.render, Template),
        stringify: proxy(JSON.stringify, JSON),
        touchLocation: touchLocation,
        eventTarget: eventTarget,
        htmlEncode: htmlEncode,
        isLocalUrl: function(url) {
            return url && !localUrlRe.test(url);
        },

        expr: function(expression, safe) {
            expression = expression || "";

            if (expression && expression.charAt(0) !== "[") {
                expression = "." + expression;
            }

            if (safe) {
                expression =  wrapExpression(expression.split("."));
            } else {
                expression = "d" + expression;
            }

            return expression;
        },

        getter: function(expression, safe) {
            return getterCache[expression] = getterCache[expression] || new Function("d", "return " + kendo.expr(expression, safe));
        },

        setter: function(expression) {
            return setterCache[expression] = setterCache[expression] || new Function("d,value", "d." + expression + "=value");
        },

        accessor: function(expression) {
            return {
                get: kendo.getter(expression),
                set: kendo.setter(expression)
            };
        },

        guid: function() {
            var id = "", i, random;

            for (i = 0; i < 32; i++) {
                random = math.random() * 16 | 0;

                if (i == 8 || i == 12 || i == 16 || i == 20) {
                    id += "-";
                }
                id += (i == 12 ? 4 : (i == 16 ? (random & 3 | 8) : random)).toString(16);
            }

            return id;
        },

        roleSelector: function(role) {
            return role.replace(/(\S+)/g, "[" + kendo.attr("role") + "=$1],").slice(0, -1);
        },


        logToConsole: function(message) {
            var console = window.console;

            if (typeof(console) != "undefined" && console.log) {
                console.log(message);
            }
        }
    });

    var Widget = Observable.extend( {
        init: function(element, options) {
            var that = this;

            that.element = kendo.jQuery(element).handler(that);

            Observable.fn.init.call(that);

            options = that.options = extend(true, {}, that.options, options);

            if (!that.element.attr(kendo.attr("role"))) {
                that.element.attr(kendo.attr("role"), (options.name || "").toLowerCase());
            }

            that.element.data("kendo" + options.prefix + options.name, that);

            that.bind(that.events, options);
        },

        events: [],

        options: {
            prefix: ""
        },

        _tabindex: function(target) {
            target = target || this.wrapper;

            var element = this.element,
                TABINDEX = "tabindex",
                tabindex = target.attr(TABINDEX) || element.attr(TABINDEX);

            element.removeAttr(TABINDEX);

            target.attr(TABINDEX, !isNaN(tabindex) ? tabindex : 0);
        },

        setOptions: function(options) {
            var that = this,
                idx = 0,
                length = that.events.length,
                e;

            for (; idx < length; idx ++) {
                e = that.events[idx];
                if (that.options[e] && options[e]) {
                    that.unbind(e, that.options[e]);
                }
            }

            $.extend(that.options, options);
            that.bind(that.events, options);
        },

        destroy: function() {
            var that = this;

            that.element.removeData("kendo" + that.options.prefix + that.options.name);

            that.unbind();
        }
    });

    kendo.notify = noop;

    var templateRegExp = /template$/i,
        jsonRegExp = /^\s*(?:\{(?:.|\n)*\}|\[(?:.|\n)*\])\s*$/,
        jsonFormatRegExp = /^\{(\d+)(:[^\}]+)?\}/,
        dashRegExp = /([A-Z])/g;

    function parseOption(element, option) {
        var value;

        if (option.indexOf("data") === 0) {
            option = option.substring(4);
            option = option.charAt(0).toLowerCase() + option.substring(1);
        }

        option = option.replace(dashRegExp, "-$1");
        value = element.getAttribute("data-" + kendo.ns + option);

        if (value === null) {
            value = undefined;
        } else if (value === "null") {
            value = null;
        } else if (value === "true") {
            value = true;
        } else if (value === "false") {
            value = false;
        } else if (!isNaN(parseFloat(value))) {
            value = parseFloat(value);
        } else if (jsonRegExp.test(value) && !jsonFormatRegExp.test(value)) {
            value = eval("(" + value + ")");
        }

        return value;
    }

    function parseOptions(element, options) {
        var result = {},
            option,
            value;

        for (option in options) {
            value = parseOption(element, option);

            if (value !== undefined) {

                if (templateRegExp.test(option)) {
                    value = kendo.template($("#" + value).html());
                }

                result[option] = value;
            }
        }

        return result;
    }

    kendo.initWidget = function(element, options, roles) {
        var result,
            option,
            widget,
            idx,
            length,
            role,
            value,
            dataSource;

        // Preserve backwards compatibility with (element, options, namespace) signature, where namespace was kendo.ui
        if (!roles) {
            roles = kendo.ui.roles;
        } else if (roles.roles) {
            roles = roles.roles;
        }

        element = element.nodeType ? element : element[0];

        role = element.getAttribute("data-" + kendo.ns + "role");

        if (!role) {
            return;
        }

        if (role.indexOf(".") === -1) {
            widget = roles[role];
        } else { // full namespace path - like kendo.ui.Widget
            widget = kendo.getter(role)(window);
        }

        if (!widget) {
            return;
        }

        dataSource = parseOption(element, "dataSource");

        options = $.extend({}, parseOptions(element, widget.fn.options), options);

        if (dataSource) {
            if (typeof dataSource === STRING) {
                options.dataSource = kendo.getter(dataSource)(window);
            } else {
                options.dataSource = dataSource;
            }
        }

        for (idx = 0, length = widget.fn.events.length; idx < length; idx++) {
            option = widget.fn.events[idx];

            value = parseOption(element, option);

            if (value !== undefined) {
                options[option] = kendo.getter(value)(window);
            }
        }

        result = $(element).data("kendo" + widget.fn.options.prefix + widget.fn.options.name);

        if (!result) {
            result = new widget(element, options);
        } else {
            result.setOptions(options);
        }

        return result;
    };

    kendo.rolesFromNamespaces = function(namespaces) {
        var roles;

        if (!namespaces[0]) {
            namespaces = [kendo.ui, kendo.dataviz.ui];
        }

        roles = $.map(namespaces, function(namespace) { return namespace.roles; }).reverse();

        return extend.apply(null, [{}].concat(roles));
    };

    kendo.init = function(element) {
        var roles = kendo.rolesFromNamespaces(slice.call(arguments, 1));

        $(element).find("[data-" + kendo.ns + "role]").andSelf().each(function(){
            kendo.initWidget(this, {}, roles);
        });
    };

    kendo.destroy = function(element) {
        $(element).find("[data-" + kendo.ns + "role]").andSelf().each(function(){
            var element = $(this),
                widget = kendo.widgetInstance(element, kendo.ui) ||
                         kendo.widgetInstance(element, kendo.mobile.ui) ||
                         kendo.widgetInstance(element, kendo.dataviz.ui);

            if (widget) {
                widget.destroy();
            }
        });
    };

    kendo.parseOptions = parseOptions;

    extend(kendo.ui, {
        Widget: Widget,
        roles: {},
        progress: function(container, toggle) {
            var mask = container.find(".k-loading-mask");

            if (toggle) {
                if (!mask.length) {
                    mask = $("<div class='k-loading-mask'><span class='k-loading-text'>Loading...</span><div class='k-loading-image'/><div class='k-loading-color'/></div>")
                        .width("100%").height("100%")
                        .prependTo(container)
                        .css({ top: container.scrollTop(), left: container.scrollLeft() });
                }
            } else if (mask) {
                mask.remove();
            }
        },
        plugin: function(widget, register, prefix) {
            var name = widget.fn.options.name,
                getter;

            register = register || kendo.ui;
            prefix = prefix || "";

            register[name] = widget;

            register.roles[name.toLowerCase()] = widget;

            getter = "getKendo" + prefix + name;
            name = "kendo" + prefix + name;

            $.fn[name] = function(options) {
                var value = this,
                    args;

                if (typeof options === STRING) {
                    args = slice.call(arguments, 1);

                    this.each(function(){
                        var widget = $.data(this, name),
                            method,
                            result;

                        if (!widget) {
                            throw new Error(kendo.format("Cannot call method '{0}' of {1} before it is initialized", options, name));
                        }

                        method = widget[options];

                        if (typeof method !== FUNCTION) {
                            throw new Error(kendo.format("Cannot find method '{0}' of {1}", options, name));
                        }

                        result = method.apply(widget, args);

                        if (result !== undefined) {
                            value = result;
                            return false;
                        }
                    });
                } else {
                    this.each(function() {
                        new widget(this, options);
                    });
                }

                return value;
            };

            $.fn[getter] = function() {
                return this.data(name);
            };
        }
    });

    var MobileWidget = Widget.extend({
        init: function(element, options) {
            Widget.fn.init.call(this, element, options);
            this.element.autoApplyNS();
            this.wrapper = this.element;
        },

        destroy: function() {
            Widget.fn.destroy.call(this);
            this.element.kendoDestroy();
        },

        options: {
            prefix: "Mobile"
        },

        events: [],

        viewShow: $.noop,

        view: function() {
            var viewElement = this.element.closest(kendo.roleSelector("view") + "," + kendo.roleSelector("splitview"));
            return viewElement.data("kendoMobileView") || viewElement.data("kendoMobileSplitView");
        }
    });

    extend(kendo.mobile, {
        init: function(element) {
            kendo.init(element, kendo.mobile.ui, kendo.ui, kendo.dataviz.ui);
        },

        ui: {
            Widget: MobileWidget,
            roles: {},
            plugin: function(widget) {
                kendo.ui.plugin(widget, kendo.mobile.ui, "Mobile");
            }
        }
    });

    kendo.touchScroller = function(elements, options) {
        // return the first touch scroller
        return $(elements).map(function(idx, element) {
            element = $(element);
            if (support.kineticScrollNeeded && kendo.mobile.ui.Scroller && !element.data("kendoMobileScroller")) {
                element.kendoMobileScroller(options);
                return element.data("kendoMobileScroller");
            } else {
                return false;
            }
        })[0];
    };

    kendo.preventDefault = function(e) {
        e.preventDefault();
    };

    kendo.widgetInstance = function(element, suite) {
        var widget = suite.roles[element.data(kendo.ns + "role")];

        if (widget) {
            return element.data("kendo" + widget.fn.options.prefix + widget.fn.options.name);
        }
    };

    kendo.onResize = function(callback) {
        var handler = callback;
        if (support.mobileOS.android) {
            handler = function() { setTimeout(callback, 200); };
        }

        $(window).on(support.resize, handler);
    };

    kendo.attrValue = function(element, key) {
        return element.data(kendo.ns + key);
    };

    kendo.days = {
        Sunday: 0,
        Monday: 1,
        Tuesday: 2,
        Wednesday: 3,
        Thursday: 4,
        Friday: 5,
        Saturday: 6
    };

    function focusable(element, isTabIndexNotNaN) {
        var nodeName = element.nodeName.toLowerCase();

        return (/input|select|textarea|button|object/.test(nodeName) ?
                !element.disabled :
                "a" === nodeName ?
                element.href || isTabIndexNotNaN :
                isTabIndexNotNaN
               ) &&
            visible(element);
    }

    function visible(element) {
        return !$(element).parents().andSelf().filter(function() {
            return $.css(this,"visibility") === "hidden" || $.expr.filters.hidden(this);
        }).length;
    }

    $.extend($.expr[ ":" ], {
        focusable: function(element) {
            var idx = $.attr(element, "tabindex");
            return focusable(element, !isNaN(idx) && idx > -1);
        }
    });


    var MOUSE_EVENTS = ["mousedown", "mousemove", "mouseenter", "mouseleave", "mouseover", "mouseout", "mouseup", "click"];

    $.extend(kendo, {
        setupMouseMute: function() {
            var idx = 0,
                length = MOUSE_EVENTS.length,
                element = document.documentElement;

            if (kendo.mouseTrap || !support.eventCapture) {
                return;
            }

            kendo.mouseTrap = true;
            kendo.captureMouseEvents = false;

            var handler = function(e) {
                if (kendo.captureMouse) {
                    e.stopPropagation();
                    if (e.type === "click") {
                        e.preventDefault();
                    }
                }
            };

            for (; idx < length; idx++) {
                element.addEventListener(MOUSE_EVENTS[idx], handler, true);
            }
        },

        muteMouse: function() {
            kendo.captureMouse = true;
            clearTimeout(kendo.mouseTrapTimeoutID);
        },

        unMuteMouse: function() {
            kendo.mouseTrapTimeoutID = setTimeout(function() {
                kendo.captureMouse = false;
            }, 400);
        }
    });

    var eventMap = {
        down: "touchstart mousedown",
        move: "mousemove touchmove",
        up: "mouseup touchend touchcancel",
        cancel: "mouseleave touchcancel"
    };

    if (support.pointers) {
        eventMap = {
            down: "MSPointerDown",
            move: "MSPointerMove",
            up: "MSPointerUp",
            cancel: "MSPointerCancel"
        };
    }

    function applyEventMap(e) {
        return (eventMap[e] || e);
    }

    var on = $.fn.on;

    var kendoJQuery = $.sub();

    extend(kendoJQuery.fn, {
        handler: function(handler) {
            this.data("handler", handler);
            return this;
        },

        autoApplyNS: function() {
            this.data("kendoNS", "." + kendo.guid());
            return this;
        },

        on: function() {
            var that = this,
                ns = that.data("kendoNS");

            // support for event map signature
            if (arguments.length === 1) {
                return on.call(that, arguments[0]);
            }

            var context = that,
                args = slice.call(arguments);

            if (typeof args[args.length -1] === UNDEFINED) {
                args.pop();
            }

            var callback =  args[args.length - 1],
                events = args[0].replace(/([^ ]+)/g, applyEventMap);

            if (ns) {

                events = events.replace(/( |$)/g, ns + " ");
            }

            // setup mouse trap
            if (support.touch && events.indexOf("mouse") > -1 && this[0] !== document.documentElement) {
                kendo.setupMouseMute();

                on.call(this, {
                    touchstart: kendo.muteMouse,
                    touchend: kendo.unMuteMouse
                });
            }

            if (typeof callback === STRING) {
                context = that.data("handler");
                callback = context[callback];

                args[args.length - 1] = function(e) {
                    callback.call(context, e);
                };
            }

            args[0] = events;

            on.apply(that, args);

            return that;
        },


        kendoDestroy: function() {
            var ns = this.data("kendoNS");
            if (ns) {
                this.off(ns);
            }
            return this;
        }
    });

    kendo.jQuery = kendoJQuery;
    kendo.eventMap = eventMap;
})(jQuery);
(function($, undefined) {
    /**
     * @name kendo.fx
     * @namespace This object contains the fx library that is used by all widgets using animation.
     * If this file is not included, all animations will be disabled but the basic functionality preserved.
     */
    var kendo = window.kendo,
        fx = kendo.fx,
        each = $.each,
        extend = $.extend,
        proxy = $.proxy,
        support = kendo.support,
        browser = support.browser,
        transforms = support.transforms,
        transitions = support.transitions,
        scaleProperties = { scale: 0, scalex: 0, scaley: 0, scale3d: 0 },
        translateProperties = { translate: 0, translatex: 0, translatey: 0, translate3d: 0 },
        hasZoom = (typeof document.documentElement.style.zoom !== "undefined") && !transforms,
        matrix3dRegExp = /matrix3?d?\s*\(.*,\s*([\d\.\-]+)\w*?,\s*([\d\.\-]+)\w*?,\s*([\d\.\-]+)\w*?,\s*([\d\.\-]+)\w*?/i,
        cssParamsRegExp = /^(-?[\d\.\-]+)?[\w\s]*,?\s*(-?[\d\.\-]+)?[\w\s]*/i,
        translateXRegExp = /translatex?$/i,
        oldEffectsRegExp = /(zoom|fade|expand)(\w+)/,
        singleEffectRegExp = /(zoom|fade|expand)/,
        unitRegExp = /[xy]$/i,
        transformProps = ["perspective", "rotate", "rotatex", "rotatey", "rotatez", "rotate3d", "scale", "scalex", "scaley", "scalez", "scale3d", "skew", "skewx", "skewy", "translate", "translatex", "translatey", "translatez", "translate3d", "matrix", "matrix3d"],
        transform2d = ["rotate", "scale", "scalex", "scaley", "skew", "skewx", "skewy", "translate", "translatex", "translatey", "matrix"],
        transform2units = { "rotate": "deg", scale: "", skew: "px", translate: "px" },
        cssPrefix = transforms.css,
        Effects = {},
        round = Math.round,
        BLANK = "",
        PX = "px",
        NONE = "none",
        AUTO = "auto",
        WIDTH = "width",
        HEIGHT = "height",
        HIDDEN = "hidden",
        ORIGIN = "origin",
        ABORT_ID = "abortId",
        OVERFLOW = "overflow",
        TRANSLATE = "translate",
        TRANSITION = cssPrefix + "transition",
        TRANSFORM = cssPrefix + "transform",
        PERSPECTIVE = cssPrefix + "perspective",
        BACKFACE = cssPrefix + "backface-visibility",
        directions = {
            left: {
                reverse: "right",
                property: "left",
                transition: "translatex",
                vertical: false,
                modifier: -1
            },
            right: {
                reverse: "left",
                property: "left",
                transition: "translatex",
                vertical: false,
                modifier: 1
            },
            down: {
                reverse: "up",
                property: "top",
                transition: "translatey",
                vertical: true,
                modifier: 1
            },
            up: {
                reverse: "down",
                property: "top",
                transition: "translatey",
                vertical: true,
                modifier: -1
            },
            top: {
                reverse: "bottom"
            },
            bottom: {
                reverse: "top"
            },
            "in": {
                reverse: "out",
                modifier: -1
            },
            out: {
                reverse: "in",
                modifier: 1
            },

            vertical: {
                reverse: "vertical"
            },

            horizontal: {
                reverse: "horizontal"
            }
        };

        kendo.directions = directions;

    extend($.fn, {
        kendoStop: function(clearQueue, gotoEnd) {
            if (transitions) {
                return kendo.fx.stopQueue(this, clearQueue || false, gotoEnd || false);
            } else {
                return this.stop(clearQueue, gotoEnd);
            }
        }
    });

    /* jQuery support for all transform animations (FF 3.5/3.6, Opera 10.x, IE9 */

    if (transforms && !transitions) {
        each(transform2d, function(idx, value) {
            $.fn[value] = function(val) {
                if (typeof val == "undefined") {
                    return animationProperty(this, value);
                } else {
                    var that = $(this)[0],
                        transformValue = value + "(" + val + transform2units[value.replace(unitRegExp, "")] + ")";

                    if (that.style.cssText.indexOf(TRANSFORM) == -1) {
                        $(this).css(TRANSFORM, transformValue);
                    } else {
                        that.style.cssText = that.style.cssText.replace(new RegExp(value + "\\(.*?\\)", "i"), transformValue);
                    }
                }
                return this;
            };

            $.fx.step[value] = function (fx) {
                $(fx.elem)[value](fx.now);
            };
        });

        var curProxy = $.fx.prototype.cur;
        $.fx.prototype.cur = function () {
            if (transform2d.indexOf(this.prop) != -1) {
                return parseFloat($(this.elem)[this.prop]());
            }

            return curProxy.apply(this, arguments);
        };
    }

    kendo.toggleClass = function(element, classes, options, add) {
        if (classes) {
            classes = classes.split(" ");

            if (transitions) {
                options = extend({
                    exclusive: "all",
                    duration: 400,
                    ease: "ease-out"
                }, options);

                element.css(TRANSITION, options.exclusive + " " + options.duration + "ms " + options.ease);
                setTimeout(function() {
                    element.css(TRANSITION, "").css(HEIGHT);
                }, options.duration); // TODO: this should fire a kendoAnimate session instead.
            }

            each(classes, function(idx, value) {
                element.toggleClass(value, add);
            });
        }

        return element;
    };

    kendo.parseEffects = function(input, mirror) {
        var effects = {};

        if (typeof input === "string") {
            each(input.split(" "), function(idx, value) {
                var redirectedEffect = !singleEffectRegExp.test(value),
                    resolved = value.replace(oldEffectsRegExp, function(match, $1, $2) {
                        return $1 + ":" + $2.toLowerCase();
                    }), // Support for old zoomIn/fadeOut style, now deprecated.
                    effect = resolved.split(":"),
                    direction = effect[1],
                    effectBody = {};

                if (effect.length > 1) {
                    effectBody.direction = (mirror && redirectedEffect ? directions[direction].reverse : direction);
                }

                effects[effect[0]] = effectBody;
            });
        } else {
            each(input, function(idx) {
                var direction = this.direction;

                if (direction && mirror && !singleEffectRegExp.test(idx)) {
                    this.direction = directions[direction].reverse;
                }

                effects[idx] = this;
            });
        }

        return effects;
    };

    function parseInteger(value) {
        return parseInt(value, 10);
    }

    function parseCSS(element, property) {
        return parseInteger(element.css(property));
    }


    function parseTransitionEffects(options) {
        var effects = options.effects;

        if (effects === "zoom") {
            effects = "zoom:in fade:in";
        }
        if (effects === "fade") {
            effects = "fade:in";
        }
        if (effects === "slide") {
            effects = "tile:left";
        }
        if (/^slide:(.+)$/.test(effects)) {
            effects = "tile:" + RegExp.$1;
        }
        if (effects === "overlay") {
            effects = "slideIn:left";
        }
        if (/^overlay:(.+)$/.test(effects)) {
            effects = "slideIn:" + RegExp.$1;
        }

        options.effects = kendo.parseEffects(effects);

        return options;
    }

    function keys(obj) {
        var acc = [];
        for (var propertyName in obj) {
            acc.push(propertyName);
        }
        return acc;
    }

    function strip3DTransforms(properties) {
        for (var key in properties) {
            if (transformProps.indexOf(key) != -1 && transform2d.indexOf(key) == -1) {
                delete properties[key];
            }
        }

        return properties;
    }

    function normalizeCSS(element, properties) {
        var transformation = [], cssValues = {}, lowerKey, key, value, isTransformed;

        for (key in properties) {
            lowerKey = key.toLowerCase();
            isTransformed = transforms && transformProps.indexOf(lowerKey) != -1;

            if (!support.hasHW3D && isTransformed && transform2d.indexOf(lowerKey) == -1) {
                delete properties[key];
            } else {
                value = properties[key];

                if (isTransformed) {
                    transformation.push(key + "(" + value + ")");
                } else {
                    cssValues[key] = value;
                }
            }
        }

        if (transformation.length) {
            cssValues[TRANSFORM] = transformation.join(" ");
        }

        return cssValues;
    }

    if (transitions) {
        extend(kendo.fx, {
            transition: function(element, properties, options) {
                var css,
                    delay = 0,
                    oldKeys = element.data("keys") || [],
                    timeoutID;

                options = extend({
                        duration: 200,
                        ease: "ease-out",
                        complete: null,
                        exclusive: "all"
                    },
                    options
                );

                var stopTransition = function() {
                   if (timeoutID) {
                       clearTimeout(timeoutID);
                       timeoutID = null;
                       element
                           .removeData(ABORT_ID)
                           .dequeue()
                           .css(TRANSITION, "")
                           .css(TRANSITION);

                       options.complete.call(element);
                   }
                };

                options.duration = $.fx ? $.fx.speeds[options.duration] || options.duration : options.duration;

                css = normalizeCSS(element, properties);

                $.merge(oldKeys, keys(css));
                element
                    .data("keys", $.unique(oldKeys))
                    .height();

                element.css(TRANSITION, options.exclusive + " " + options.duration + "ms " + options.ease).css(TRANSITION);
                element.css(css).css(TRANSFORM);

                if (browser.mozilla) {
                    element.one(transitions.event, stopTransition);
                    delay = 50;
                }

                timeoutID = setTimeout(stopTransition, options.duration + delay);
                element.data(ABORT_ID, timeoutID);
            },

            stopQueue: function(element, clearQueue, gotoEnd) {
                if (element.data(ABORT_ID)) {
                    clearTimeout(element.data(ABORT_ID));
                    element.removeData(ABORT_ID);
                }

                var that = this, cssValues,
                    taskKeys = element.data("keys"),
                    retainPosition = (gotoEnd === false && taskKeys);

                if (retainPosition) {
                    cssValues = kendo.getComputedStyles(element[0], taskKeys);
                }

                element.css(TRANSITION, "").css(TRANSITION);

                if (retainPosition) {
                    element.css(cssValues);
                }

                element.removeData("keys");

                if (that.complete) {
                    that.complete.call(element);
                }

                element.stop(clearQueue);
                return element;
            }
        });
    }

    function animationProperty(element, property) {
        if (transforms) {
            var transform = element.css(TRANSFORM);
            if (transform == NONE) {
                return property == "scale" ? 1 : 0;
            }

            var match = transform.match(new RegExp(property + "\\s*\\(([\\d\\w\\.]+)")),
                computed = 0;

            if (match) {
                computed = parseInteger(match[1]);
            } else {
                match = transform.match(matrix3dRegExp) || [0, 0, 0, 0, 0];
                property = property.toLowerCase();

                if (translateXRegExp.test(property)) {
                    computed = parseFloat(match[3] / match[2]);
                } else if (property == "translatey") {
                    computed = parseFloat(match[4] / match[2]);
                } else if (property == "scale") {
                    computed = parseFloat(match[2]);
                } else if (property == "rotate") {
                    computed = parseFloat(Math.atan2(match[2], match[1]));
                }
            }

            return computed;
        } else {
            return parseFloat(element.css(property));
        }
    }

    var EffectSet = kendo.Class.extend({
        init: function(element, options) {
            var that = this;

            that.element = element;
            that.effects = [];
            that.options = options;
            that.restore = [];
        },

        run: function(effects) {
            var that = this,
                effect,
                idx, jdx,
                length = effects.length,
                element = that.element,
                options = that.options,
                deferred = $.Deferred(),
                start = {},
                end = {},
                target,
                children,
                childrenLength;

            that.effects = effects;

            deferred.then($.proxy(that, "complete"));

            element.data("animating", true);

            for (idx = 0; idx < length; idx ++) {
                effect = effects[idx];

                effect.setReverse(options.reverse);
                effect.setOptions(options);

                that.addRestoreProperties(effect.restore);

                effect.prepare(start, end);

                children = effect.children();

                for (jdx = 0, childrenLength = children.length; jdx < childrenLength; jdx ++) {
                    children[jdx].duration(options.duration).run();
                }
            }

            // legacy support for options.properties
            for (var effectName in options.effects) {
                extend(end, options.effects[effectName].properties);
            }

            // Show the element initially
            if (!element.is(":visible")) {
                extend(start, { display: element.data("olddisplay") || "block" });
            }

            if (transforms && !options.reset) {
                target = element.data("targetTransform");

                if (target) {
                    start = extend(target, start);
                }
            }

            start = normalizeCSS(element, start);

            if (transforms && !transitions) {
                start = strip3DTransforms(start);
            }

            element.css(start)
                   .css(TRANSFORM); // Nudge

            for (idx = 0; idx < length; idx ++) {
                effects[idx].setup();
            }

            if (options.init) {
                options.init();
            }

            element.data("targetTransform", end);
            kendo.fx.animate(element, end, extend({}, options, { complete: deferred.resolve }));

            return deferred.promise();
        },

        stop: function() {
            $(this.element).kendoStop();
        },

        addRestoreProperties: function(restore) {
            var element = this.element,
                value,
                i = 0,
                length = restore.length;

            for (; i < length; i ++) {
                value = restore[i];

                this.restore.push(value);

                if (!element.data(value)) {
                    element.data(value, element.css(value));
                }
            }
        },

        restoreCallback: function() {
            var element = this.element;

            for (var i = 0, length = this.restore.length; i < length; i ++) {
                var value = this.restore[i];
                element.css(value, element.data(value));
            }
        },

        complete: function() {
            var that = this,
                idx = 0,
                element = that.element,
                options = that.options,
                effects = that.effects,
                length = effects.length;

            element
                .removeData("animating")
                .dequeue(); // call next animation from the queue

            if (options.hide) {
                element.data("olddisplay", element.css("display")).hide();
            }

            this.restoreCallback();

            if (hasZoom && !transforms) {
                setTimeout($.proxy(this, "restoreCallback"), 0); // Again jQuery callback in IE8-
            }

            for (; idx < length; idx ++) {
                effects[idx].teardown();
            }

            if (options.completeCallback) {
                options.completeCallback(element);
            }
        }
    });

    kendo.fx.promise = function(element, options) {
        var effects = [],
            effectClass,
            effectSet = new EffectSet(element, options),
            parsedEffects = kendo.parseEffects(options.effects),
            effect;

        options.effects = parsedEffects;

        for (var effectName in parsedEffects) {
            effectClass = Effects[effectName];

            if (effectClass) {
                effect = new effectClass(element, parsedEffects[effectName].direction);
                effects.push(effect);
            }
        }

        if (effects[0]) {
            effectSet.run(effects);
        } else { // Not sure how would an fx promise reach this state - means that you call kendoAnimate with no valid effects? Why?
            if (!element.is(":visible")) {
                element.css({ display: element.data("olddisplay") || "block" }).css("display");
            }

            if (options.init) {
                options.init();
            }

            element.dequeue();
            effectSet.complete();
        }
    };

    kendo.fx.transitionPromise = function(element, destination, options) {
        kendo.fx.animateTo(element, destination, options);
        return element;
    };

    extend(kendo.fx, {
        animate: function(elements, properties, options) {
            var useTransition = options.transition !== false;
            delete options.transition;

            if (transitions && "transition" in fx && useTransition) {
                fx.transition(elements, properties, options);
            } else {
                if (transforms) {
                    elements.animate(strip3DTransforms(properties), { queue: false, show: false, hide: false, duration: options.duration, complete: options.complete }); // Stop animate from showing/hiding the element to be able to hide it later on.
                } else {
                    elements.each(function() {
                        var element = $(this),
                            multiple = {};

                        each(transformProps, function(idx, value) { // remove transforms to avoid IE and older browsers confusion
                            var params,
                                currentValue = properties ? properties[value]+ " " : null; // We need to match

                            if (currentValue) {
                                var single = properties;

                                if (value in scaleProperties && properties[value] !== undefined) {
                                    params = currentValue.match(cssParamsRegExp);
                                    if (transforms) {
                                        extend(single, { scale: +params[0] });
                                    }
                                } else {
                                    if (value in translateProperties && properties[value] !== undefined) {
                                        var position = element.css("position"),
                                            isFixed = (position == "absolute" || position == "fixed");

                                        if (!element.data(TRANSLATE)) {
                                            if (isFixed) {
                                                element.data(TRANSLATE, {
                                                    top: parseCSS(element, "top") || 0,
                                                    left: parseCSS(element, "left") || 0,
                                                    bottom: parseCSS(element, "bottom"),
                                                    right: parseCSS(element, "right")
                                                });
                                            } else {
                                                element.data(TRANSLATE, {
                                                    top: parseCSS(element, "marginTop") || 0,
                                                    left: parseCSS(element, "marginLeft") || 0
                                                });
                                            }
                                        }

                                        var originalPosition = element.data(TRANSLATE);

                                        params = currentValue.match(cssParamsRegExp);
                                        if (params) {

                                            var dX = value == TRANSLATE + "y" ? +null : +params[1],
                                                dY = value == TRANSLATE + "y" ? +params[1] : +params[2];

                                            if (isFixed) {
                                                if (!isNaN(originalPosition.right)) {
                                                    if (!isNaN(dX)) { extend(single, { right: originalPosition.right - dX }); }
                                                } else {
                                                    if (!isNaN(dX)) { extend(single, { left: originalPosition.left + dX }); }
                                                }

                                                if (!isNaN(originalPosition.bottom)) {
                                                    if (!isNaN(dY)) { extend(single, { bottom: originalPosition.bottom - dY }); }
                                                } else {
                                                    if (!isNaN(dY)) { extend(single, { top: originalPosition.top + dY }); }
                                                }
                                            } else {
                                                if (!isNaN(dX)) { extend(single, { marginLeft: originalPosition.left + dX }); }
                                                if (!isNaN(dY)) { extend(single, { marginTop: originalPosition.top + dY }); }
                                            }
                                        }
                                    }
                                }

                                if (!transforms && value != "scale" && value in single) {
                                    delete single[value];
                                }

                                if (single) {
                                    extend(multiple, single);
                                }
                            }
                        });

                        if (browser.msie) {
                            delete multiple.scale;
                        }

                        element.animate(multiple, { queue: false, show: false, hide: false, duration: options.duration, complete: options.complete }); // Stop animate from showing/hiding the element to be able to hide it later on.
                    });
                }
            }
        },

        animateTo: function(element, destination, options) {
            var direction,
                commonParent = element.parents().filter(destination.parents()).first(),
                originalOverflow;

            options = parseTransitionEffects(options);
            if (!support.mobileOS.android) {
                originalOverflow = commonParent.css(OVERFLOW);
                commonParent.css(OVERFLOW, "hidden");
            }

            $.each(options.effects, function(name, definition) {
                direction = direction || definition.direction;
            });

            function complete(animatedElement) {
                destination[0].style.cssText = "";
                element[0].style.cssText = ""; // Removing the whole style attribute breaks Android.
                if (!support.mobileOS.android) {
                    commonParent.css(OVERFLOW, originalOverflow);
                }
                if (options.completeCallback) {
                    options.completeCallback.call(element, animatedElement);
                }
            }

            options.complete = browser.msie ? function() { setTimeout(complete, 0); } : complete;
            options.previous = (options.reverse ? destination : element);

            options.reset = true; // Reset transforms if there are any.

            // execute callback only once, and hook up derived animations to previous view only once.
            (options.reverse ? element : destination).each(function() {
                $(this).kendoAnimate(extend(true, {}, options));
                options.complete = null;
                options.previous = null;
            });
        }
    });

    var Effect = kendo.Class.extend({
        init: function(element, direction) {
            var that = this;
            that.element = element;
            that._direction = direction;
            that.options = {};
            that._additionalEffects = [];

            if (!that.restore) {
                that.restore = [];
            }
        },

// Public API
        reverse: function() {
            this._reverse = true;
            return this.run();
        },

        play: function() {
            this._reverse = false;
            return this.run();
        },

        add: function(additional) {
            this._additionalEffects.push(additional);
            return this;
        },

        direction: function(value) {
            this._direction = value;
            return this;
        },

        duration: function(duration) {
            this._duration = duration;
            return this;
        },

        compositeRun: function() {
            var that = this,
                effectSet = new EffectSet(that.element, { reverse: that._reverse, duration: that._duration }),
                effects = that._additionalEffects.concat([ that ]);

            return effectSet.run(effects);
        },

        run: function() {
            if (this._additionalEffects && this._additionalEffects[0]) {
                return this.compositeRun();
            }

            var that = this,
                element = that.element,
                idx = 0,
                restore = that.restore,
                length = restore.length,
                value,
                deferred = $.Deferred(),
                start = {},
                end = {},
                target,
                children = that.children(),
                childrenLength = children.length;

            deferred.then($.proxy(that, "_complete"));

            element.data("animating", true);

            for (idx = 0; idx < length; idx ++) {
                value = restore[idx];

                if (!element.data(value)) {
                    element.data(value, element.css(value));
                }
            }

            for (idx = 0; idx < childrenLength; idx ++) {
                children[idx].duration(that._duration).run();
            }

            that.prepare(start, end);

            if (!element.is(":visible")) {
                extend(start, { display: element.data("olddisplay") || "block" });
            }

            if (transforms) {
                target = element.data("targetTransform");

                if (target) {
                    start = extend(target, start);
                }
            }

            start = normalizeCSS(element, start);

            if (transforms && !transitions) {
                start = strip3DTransforms(start);
            }

            element.css(start).css(TRANSFORM); // Nudge

            that.setup();

            element.data("targetTransform", end);
            kendo.fx.animate(element, end, { duration: that._duration, complete: deferred.resolve });

            return deferred.promise();
        },

        stop: function() {
            var idx = 0,
                children = this.children(),
                childrenLength = children.length;

            for (idx = 0; idx < childrenLength; idx ++) {
                children[idx].stop();
            }

            $(this.element).kendoStop();
            return this;
        },

        restoreCallback: function() {
            var element = this.element;

            for (var i = 0, length = this.restore.length; i < length; i ++) {
                var value = this.restore[i];
                element.css(value, element.data(value));
            }
        },

        _complete: function() {
            var that = this,
                element = that.element;

            element
                .removeData("animating")
                .dequeue(); // call next animation from the queue

            that.restoreCallback();

            if (that.shouldHide()) {
                element.data("olddisplay", element.css("display")).hide();
            }

            if (hasZoom && !transforms) {
                setTimeout($.proxy(that, "restoreCallback"), 0); // Again jQuery callback in IE8-
            }

            that.teardown();
        },

        /////////////////////////// Support for kendo.animate;
        setOptions: function(options) {
            extend(true, this.options, options);
        },

        children: function() {
            return [];
        },

        shouldHide: $.noop,

        setup: $.noop,
        prepare: $.noop,
        teardown: $.noop,
        directions: [],

        setReverse: function(reverse) {
            this._reverse = reverse;
            return this;
        }
    });

    function toUpperCase(letter) {
        return letter.toUpperCase();
    }

    function capitalize(word) {
        return word.replace(/^./, toUpperCase);
    }

    function createEffect(name, definition) {
        var effectClass = Effect.extend(definition),
            directions = effectClass.prototype.directions;

        Effects[name] = effectClass;

        fx.Element.prototype[name] = function(direction, opt1, opt2, opt3) {
            return new effectClass(this.element, direction, opt1, opt2, opt3);
        };

        each(directions, function(idx, theDirection) {
            fx.Element.prototype[name + capitalize(theDirection)] = function(opt1, opt2, opt3) {
                return new effectClass(this.element, theDirection, opt1, opt2, opt3);
            };
        });
    }

    var FOUR_DIRECTIONS = ["left", "right", "up", "down"],
        IN_OUT = ["in", "out"];

    createEffect("slideIn", {
        directions: FOUR_DIRECTIONS,

        prepare: function(start, end) {
            var that = this,
                tmp,
                element = that.element,
                direction = directions[that._direction],
                offset = -direction.modifier * (direction.vertical ? element.outerHeight() : element.outerWidth()),
                startValue = offset / (that.options && that.options.divisor || 1) + PX,
                endValue = "0px";

            if (that._reverse) {
                tmp = start;
                start = end;
                end = tmp;
            }

            if (transforms) {
                start[direction.transition] = startValue;
                end[direction.transition] = endValue;
            } else {
                start[direction.property] = startValue;
                end[direction.property] = endValue;
            }
        }
    });

    createEffect("tile", {
        directions: FOUR_DIRECTIONS,

        init: function(element, direction, previous) {
            Effect.prototype.init.call(this, element, direction);
            this.options = { previous: previous };
        },

        children: function() {
            var that = this,
                reverse = that._reverse,
                previous = that.options.previous,
                dir = that._direction;

            var children = [ fx(that.element).slideIn(dir).setReverse(reverse) ];

            if (previous) {
                children.push( fx(previous).slideIn(directions[dir].reverse).setReverse(!reverse) );
            }

            return children;
        }
    });

    function createToggleEffect(name, property, endValue) {
        createEffect(name, {
            directions: IN_OUT,

            restore: [ property ],

            startValue: function(value) {
                this._startValue = value;
                return this;
            },

            endValue: function(value) {
                this._endValue = value;
                return this;
            },

            shouldHide: function() {
               return (this._direction === "out" && this._end() === endValue) ? !this._reverse : this._reverse;
            },

            _end: function() {
                return this._endValue || endValue;
            },

            _start: function() {
                return this._startValue || 1;
            },

            prepare: function(start, end) {
                var that = this,
                    opacity = that.element.data(property),
                    out = that.shouldHide(),
                    value = isNaN(opacity) ? that._start() : opacity;

                start[property] = end[property] = that._end();

                if (out) {
                    start[property] = value;
                } else {
                    end[property] = value;
                }
            }
        });
    }

    createToggleEffect("fade", "opacity", 0);
    createToggleEffect("zoom", "scale", 0.01);

    createEffect("slideMargin", {
        prepare: function(start, end) {
            var that = this,
                element = that.element,
                options = that.options,
                origin = element.data(ORIGIN),
                offset = options.offset,
                margin,
                reverse = that._reverse;

            if (!reverse && origin === null) {
                element.data(ORIGIN, parseFloat(element.css("margin-" + options.axis)));
            }

            margin = (element.data(ORIGIN) || 0);
            end["margin-" + options.axis] = !reverse ? margin + offset : margin;
        }
    });

    createEffect("slideTo", {
        prepare: function(start, end) {
            var that = this,
                element = that.element,
                options = that.options,
                offset = options.offset.split(","),
                reverse = that._reverse;

            if (transforms) {
                end.translatex = !reverse ? offset[0] : 0;
                end.translatey = !reverse ? offset[1] : 0;
            } else {
                end.left = !reverse ? offset[0] : 0;
                end.top = !reverse ? offset[1] : 0;
            }
            element.css("left");
        }
    });

    createEffect("expand", {
        directions: ["horizontal", "vertical"],

        restore: [ OVERFLOW ],

        prepare: function(start, end) {
            var that = this,
                element = that.element,
                options = that.options,
                reverse = that._reverse,
                property = that._direction === "vertical" ? HEIGHT : WIDTH,
                setLength = element[0].style[property],
                oldLength = element.data(property),
                length = parseFloat(oldLength || setLength),
                realLength = round(element.css(property, AUTO)[property]());

            start.overflow = HIDDEN;

            length = (options && options.reset) ? realLength || length : length || realLength;

            end[property] = (reverse ? 0 : length) + PX;
            start[property] = (reverse ? length : 0) + PX;

            if (oldLength === undefined) {
                element.data(property, setLength);
            }
        },

        shouldHide: function() {
           return this._reverse;
        },

        teardown: function() {
            var that = this,
                element = that.element,
                property = that._direction === "vertical" ? HEIGHT : WIDTH,
                length = element.data(property);

            if (length == AUTO || length === BLANK) {
                setTimeout(function() { element.css(property, AUTO).css(property); }, 0); // jQuery animate complete callback in IE is called before the last animation step!
            }
        }
    });

    var TRANSFER_START_STATE = { position: "absolute", marginLeft: 0, marginTop: 0, scale: 1 };
    /**
     * Intersection point formulas are taken from here - http://zonalandeducation.com/mmts/intersections/intersectionOfTwoLines1/intersectionOfTwoLines1.html
     * Formula for a linear function from two points from here - http://demo.activemath.org/ActiveMath2/search/show.cmd?id=mbase://AC_UK_calculus/functions/ex_linear_equation_two_points
     * The transform origin point is the intersection point of the two lines from the top left corners/top right corners of the element and target.
     * The math and variables below MAY BE SIMPLIFIED (zeroes removed), but this would make the formula too cryptic.
     */
    createEffect("transfer", {
        init: function(element, target) {
            this.element = element;
            this.options = { target: target };
            this.restore = [];
        },

        setup: function() {
            this.element.appendTo(document.body);
        },

        prepare: function(start, end) {
            var that = this,
                element = that.element,
                options = that.options,
                reverse = that._reverse,
                target = options.target,
                offset,
                currentScale = animationProperty(element, "scale"),
                targetOffset = target.offset(),
                scale = target.outerHeight() / element.outerHeight();

            extend(start, TRANSFER_START_STATE);
            end.scale = 1;

            element.css(TRANSFORM, "scale(1)").css(TRANSFORM);
            offset = element.offset();
            element.css(TRANSFORM, "scale(" + currentScale + ")");

            var x1 = 0,
                y1 = 0,

                x2 = targetOffset.left - offset.left,
                y2 = targetOffset.top - offset.top,

                x3 = x1 + element.outerWidth(),
                y3 = y1,

                x4 = x2 + target.outerWidth(),
                y4 = y2,

                Z1 = (y2 - y1) / (x2 - x1),
                Z2 = (y4 - y3) / (x4 - x3),

                X = (y1 - y3 - Z1 * x1 + Z2 * x3) / (Z2 - Z1),
                Y = y1 + Z1 * (X - x1);

            start.top = offset.top;
            start.left = offset.left;
            start.transformOrigin = X + PX + " " + Y + PX;

            if (reverse) {
                start.scale = scale;
            } else {
                end.scale = scale;
            }
        }
    });


    var CLIPS = {
        top: "rect(auto auto $size auto)",
        bottom: "rect($size auto auto auto)",
        left: "rect(auto $size auto auto)",
        right: "rect(auto auto auto $size)"
    };

    var ROTATIONS = {
        top:    { start: "rotatex(0deg)", end: "rotatex(180deg)" },
        bottom: { start: "rotatex(-180deg)", end: "rotatex(0deg)" },
        left:   { start: "rotatey(0deg)", end: "rotatey(-180deg)" },
        right:  { start: "rotatey(180deg)", end: "rotatey(0deg)" }
    };

    function clipInHalf(container, direction) {
        var vertical = kendo.directions[direction].vertical,
            size = (container[vertical ? HEIGHT : WIDTH]() / 2) + "px";

        return CLIPS[direction].replace("$size", size);
    }

    createEffect("turningPage", {
        directions: FOUR_DIRECTIONS,

        init: function(element, direction, container) {
            Effect.prototype.init.call(this, element, direction);
            this._container = container;
        },

        prepare: function(start, end) {
            var that = this,
                reverse = that._reverse,
                direction = reverse ? directions[that._direction].reverse : that._direction,
                rotation = ROTATIONS[direction];

            start.zIndex = 1;

            if (that._clipInHalf) {
               start.clip = clipInHalf(that._container, kendo.directions[direction].reverse);
            }

            start[BACKFACE] = HIDDEN;

            end[TRANSFORM] = reverse ? rotation.start : rotation.end;
            start[TRANSFORM] = reverse ? rotation.end : rotation.start;
        },

        setup: function() {
            this._container.append(this.element);
        },

        face: function(value) {
            this._face = value;
            return this;
        },

        shouldHide: function() {
            var that = this,
                reverse = that._reverse,
                face = that._face;

            return (reverse && !face) || (!reverse && face);
        },

        clipInHalf: function(value) {
            this._clipInHalf = value;
            return this;
        },

        temporary: function(value) {
            this._temporary = value;
            return this;
        },

        teardown: function() {
            if (this._temporary) {
                this.element.remove();
            }
        }
    });

    createEffect("staticPage", {
        directions: FOUR_DIRECTIONS,

        init: function(element, direction, container) {
            Effect.prototype.init.call(this, element, direction);
            this._container = container;
        },

        restore: ["clip"],

        prepare: function(start, end) {
            var that = this,
                direction = that._reverse ? directions[that._direction].reverse : that._direction;

            start.clip = clipInHalf(that._container, direction);
        },

        shouldHide: function() {
            var that = this,
                reverse = that._reverse,
                face = that._face;

            return (reverse && !face) || (!reverse && face);
        },

        face: function(value) {
            this._face = value;
            return this;
        }
    });

    createEffect("pageturn", {
        directions: ["horizontal", "vertical"],

        init: function(element, direction, face, back) {
            Effect.prototype.init.call(this, element, direction);
            this.options = {};
            this.options.face = face;
            this.options.back = back;
        },

        children: function() {
            var that = this,
                options = that.options,
                direction = that._direction === "horizontal" ? "left" : "top",
                reverseDirection = kendo.directions[direction].reverse,
                reverse = that._reverse,
                temp,
                faceClone = options.face.clone(true).removeAttr("id"),
                backClone = options.back.clone(true).removeAttr("id"),
                element = that.element;

            if (reverse) {
                temp = direction;
                direction = reverseDirection;
                reverseDirection = temp;
            }

            return [
                fx(options.face).staticPage(direction, element).face(true).setReverse(reverse),
                fx(options.back).staticPage(reverseDirection, element).setReverse(reverse),
                fx(faceClone).turningPage(direction, element).face(true).clipInHalf(true).temporary(true).setReverse(reverse),
                fx(backClone).turningPage(reverseDirection, element).clipInHalf(true).temporary(true).setReverse(reverse)
            ];
        },

        prepare: function(start, end) {
            start[PERSPECTIVE] = 1000;
            start.transformStyle = "preserve-3d";
        },

        teardown: function() {
            this.element.find(".temp-pages").remove();
        }
    });

    createEffect("flip", {
        directions: ["horizontal", "vertical"],

        init: function(element, direction, face, back) {
            Effect.prototype.init.call(this, element, direction);
            this.options = {};
            this.options.face = face;
            this.options.back = back;
        },

        children: function() {
            var that = this,
                options = that.options,
                direction = that._direction === "horizontal" ? "left" : "top",
                reverseDirection = kendo.directions[direction].reverse,
                reverse = that._reverse,
                temp,
                element = that.element;

            if (reverse) {
                temp = direction;
                direction = reverseDirection;
                reverseDirection = temp;
            }

            return [
                fx(options.face).turningPage(direction, element).face(true).setReverse(reverse),
                fx(options.back).turningPage(reverseDirection, element).setReverse(reverse)
            ];
        },

        prepare: function(start, end) {
            start[PERSPECTIVE] = 1000;
            start.transformStyle = "preserve-3d";
        }
    });

    var animationFrame  = window.requestAnimationFrame       ||
                          window.webkitRequestAnimationFrame ||
                          window.mozRequestAnimationFrame    ||
                          window.oRequestAnimationFrame      ||
                          window.msRequestAnimationFrame     ||
                          function(callback){ setTimeout(callback, 1000 / 60); };

    var Animation = kendo.Class.extend({
        init: function() {
            var that = this;
            that._tickProxy = proxy(that._tick, that);
            that._started = false;
        },

        tick: $.noop,
        done: $.noop,
        onEnd: $.noop,
        onCancel: $.noop,

        start: function() {
            if (!this.done()) {
                this._started = true;
                animationFrame(this._tickProxy);
            }
        },

        cancel: function() {
            this._started = false;
            this.onCancel();
        },

        _tick: function() {
            var that = this;
            if (!that._started) { return; }

            that.tick();

            if (!that.done()) {
                animationFrame(that._tickProxy);
            } else {
                that._started = false;
                that.onEnd();
            }
        }
    });

    var Transition = Animation.extend({
        init: function(options) {
            var that = this;
            extend(that, options);
            Animation.fn.init.call(that);
        },

        done: function() {
            return this.timePassed() >= this.duration;
        },

        timePassed: function() {
            return Math.min(this.duration, (+new Date()) - this.startDate);
        },

        moveTo: function(options) {
            var that = this,
                movable = that.movable;

            that.initial = movable[that.axis];
            that.delta = options.location - that.initial;

            that.duration = options.duration || 300;

            that.tick = that._easeProxy(options.ease);

            that.startDate = +new Date();
            that.start();
        },

        _easeProxy: function(ease) {
            var that = this;

            return function() {
                that.movable.moveAxis(that.axis, ease(that.timePassed(), that.initial, that.delta, that.duration));
            };
        }
    });

    extend(Transition, {
        easeOutExpo: function (t, b, c, d) {
            return (t==d) ? b+c : c * (-Math.pow(2, -10 * t/d) + 1) + b;
        },

        easeOutBack: function (t, b, c, d, s) {
            s = 1.70158;
            return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
        }
    });

    fx.Animation = Animation;
    fx.Transition = Transition;
    fx.createEffect = createEffect;
    fx.Effects = Effects;
})(window.kendo.jQuery);
(function($, undefined) {
    var kendo = window.kendo,
        extend = $.extend,
        odataFilters = {
            eq: "eq",
            neq: "ne",
            gt: "gt",
            gte: "ge",
            lt: "lt",
            lte: "le",
            contains : "substringof",
            endswith: "endswith",
            startswith: "startswith"
        },
        mappers = {
            pageSize: $.noop,
            page: $.noop,
            filter: function(params, filter) {
                if (filter) {
                    params.$filter = toOdataFilter(filter);
                }
            },
            sort: function(params, orderby) {
                var expr = $.map(orderby, function(value) {
                    var order = value.field.replace(/\./g, "/");

                    if (value.dir === "desc") {
                        order += " desc";
                    }

                    return order;
                }).join(",");

                if (expr) {
                    params.$orderby = expr;
                }
            },
            skip: function(params, skip) {
                if (skip) {
                    params.$skip = skip;
                }
            },
            take: function(params, take) {
                if (take) {
                    params.$top = take;
                }
            }
        },
        defaultDataType = {
            read: {
                dataType: "jsonp"
            }
        };

    function toOdataFilter(filter) {
        var result = [],
            logic = filter.logic || "and",
            idx,
            length,
            field,
            type,
            format,
            operator,
            value,
            ignoreCase,
            filters = filter.filters;

        for (idx = 0, length = filters.length; idx < length; idx++) {
            filter = filters[idx];
            field = filter.field;
            value = filter.value;
            operator = filter.operator;

            if (filter.filters) {
                filter = toOdataFilter(filter);
            } else {
                ignoreCase = filter.ignoreCase;
                field = field.replace(/\./g, "/");
                filter = odataFilters[operator];

                if (filter && value !== undefined) {
                    type = $.type(value);
                    if (type === "string") {
                        format = "'{1}'";
                        value = value.replace(/'/g, "''");

                        if (ignoreCase === true) {
                            field = "tolower(" + field + ")";
                        }

                    } else if (type === "date") {
                        format = "datetime'{1:yyyy-MM-ddTHH:mm:ss}'";
                    } else {
                        format = "{1}";
                    }

                    if (filter.length > 3) {
                        if (filter !== "substringof") {
                            format = "{0}({2}," + format + ")";
                        } else {
                            format = "{0}(" + format + ",{2})";
                        }
                    } else {
                        format = "{2} {0} " + format;
                    }

                    filter = kendo.format(format, filter, value, field);
                }
            }

            result.push(filter);
        }

        filter = result.join(" " + logic + " ");

        if (result.length > 1) {
            filter = "(" + filter + ")";
        }

        return filter;
    }

    extend(true, kendo.data, {
        schemas: {
            odata: {
                type: "json",
                data: function(data) {
                    return data.d.results || [data.d];
                },
                total: "d.__count"
            }
        },
        transports: {
            odata: {
                read: {
                    cache: true, // to prevent jQuery from adding cache buster
                    dataType: "jsonp",
                    jsonp: "$callback"
                },
                update: {
                    cache: true,
                    dataType: "json",
                    contentType: "application/json", // to inform the server the the request body is JSON encoded
                    type: "PUT" // can be PUT or MERGE
                },
                create: {
                    cache: true,
                    dataType: "json",
                    contentType: "application/json",
                    type: "POST" // must be POST to create new entity
                },
                destroy: {
                    cache: true,
                    dataType: "json",
                    type: "DELETE"
                },
                parameterMap: function(options, type) {
                    var params,
                        value,
                        option,
                        dataType;

                    options = options || {};
                    type = type || "read";
                    dataType = (this.options || defaultDataType)[type];
                    dataType = dataType ? dataType.dataType : "json";

                    if (type === "read") {
                        params = {
                            $inlinecount: "allpages"
                        };

                        if (dataType != "json") {
                            params.$format = "json";
                        }

                        for (option in options) {
                            if (mappers[option]) {
                                mappers[option](params, options[option]);
                            } else {
                                params[option] = options[option];
                            }
                        }
                    } else {
                        if (dataType !== "json") {
                            throw new Error("Only json dataType can be used for " + type + " operation.");
                        }

                        if (type !== "destroy") {
                            for (option in options) {
                                value = options[option];
                                if (typeof value === "number") {
                                    options[option] = value + "";
                                }
                            }

                            params = kendo.stringify(options);
                        }
                    }

                    return params;
                }
            }
        }
    });
})(window.kendo.jQuery);
(function($, undefined) {
    var kendo = window.kendo,
        isArray = $.isArray,
        isPlainObject = $.isPlainObject,
        map = $.map,
        each = $.each,
        extend = $.extend,
        getter = kendo.getter,
        Class = kendo.Class;

    var XmlDataReader = Class.extend({
        init: function(options) {
            var that = this,
                total = options.total,
                model = options.model,
                data = options.data;

            if (model) {
                if (isPlainObject(model)) {
                    if (model.fields) {
                        each(model.fields, function(field, value) {
                            if (isPlainObject(value) && value.field) {
                                value = extend(value, { field: that.getter(value.field) });
                            } else {
                                value = { field: that.getter(value) };
                            }
                            model.fields[field] = value;
                        });
                    }
                    var id = model.id;
                    if (id) {
                        var idField = {};

                        idField[that.xpathToMember(id, true)] = { field : that.getter(id) };
                        model.fields = extend(idField, model.fields);
                        model.id = that.xpathToMember(id);
                    }
                    model = kendo.data.Model.define(model);
                }

                that.model = model;
            }

            if (total) {
                total = that.getter(total);
                that.total = function(data) {
                    return parseInt(total(data), 10);
                };
            }

            if (data) {
                data = that.xpathToMember(data);
                that.data = function(value) {
                    var result = that.evaluate(value, data),
                        modelInstance;

                    result = isArray(result) ? result : [result];

                    if (that.model && model.fields) {
                        modelInstance = new that.model();

                        return map(result, function(value) {
                            if (value) {
                                var record = {}, field;

                                for (field in model.fields) {
                                    record[field] = modelInstance._parse(field, model.fields[field].field(value));
                                }

                                return record;
                            }
                        });
                    }

                    return result;
                };
            }
        },
        total: function(result) {
            return this.data(result).length;
        },
        errors: function(data) {
            return data ? data.errors : null;
        },
        parseDOM: function(element) {
            var result = {},
                parsedNode,
                node,
                nodeType,
                nodeName,
                member,
                attribute,
                attributes = element.attributes,
                attributeCount = attributes.length,
                idx;

            for (idx = 0; idx < attributeCount; idx++) {
                attribute = attributes[idx];
                result["@" + attribute.nodeName] = attribute.nodeValue;
            }

            for (node = element.firstChild; node; node = node.nextSibling) {
                nodeType = node.nodeType;

                if (nodeType === 3 || nodeType === 4) {
                    // text nodes or CDATA are stored as #text field
                    result["#text"] = node.nodeValue;
                } else if (nodeType === 1) {
                    // elements are stored as fields
                    parsedNode = this.parseDOM(node);

                    nodeName = node.nodeName;

                    member = result[nodeName];

                    if (isArray(member)) {
                        // elements of same nodeName are stored as array
                        member.push(parsedNode);
                    } else if (member !== undefined) {
                        member = [member, parsedNode];
                    } else {
                        member = parsedNode;
                    }

                    result[nodeName] = member;
                }
            }
            return result;
        },

        evaluate: function(value, expression) {
            var members = expression.split("."),
                member,
                result,
                length,
                intermediateResult,
                idx;

            while (member = members.shift()) {
                value = value[member];

                if (isArray(value)) {
                    result = [];
                    expression = members.join(".");

                    for (idx = 0, length = value.length; idx < length; idx++) {
                        intermediateResult = this.evaluate(value[idx], expression);

                        intermediateResult = isArray(intermediateResult) ? intermediateResult : [intermediateResult];

                        result.push.apply(result, intermediateResult);
                    }

                    return result;
                }
            }

            return value;
        },

        parse: function(xml) {
            var documentElement,
                tree,
                result = {};

            documentElement = xml.documentElement || $.parseXML(xml).documentElement;

            tree = this.parseDOM(documentElement);

            result[documentElement.nodeName] = tree;

            return result;
        },

        xpathToMember: function(member, raw) {
            if (!member) {
                return "";
            }

            member = member.replace(/^\//, "") // remove the first "/"
                           .replace(/\//g, "."); // replace all "/" with "."

            if (member.indexOf("@") >= 0) {
                // replace @attribute with '["@attribute"]'
                return member.replace(/\.?(@.*)/, raw? '$1':'["$1"]');
            }

            if (member.indexOf("text()") >= 0) {
                // replace ".text()" with '["#text"]'
                return member.replace(/(\.?text\(\))/, raw? '#text':'["#text"]');
            }

            return member;
        },
        getter: function(member) {
            return getter(this.xpathToMember(member), true);
        }
    });

    $.extend(true, kendo.data, {
        XmlDataReader: XmlDataReader,
        readers: {
            xml: XmlDataReader
        }
    });
})(window.kendo.jQuery);
(function($, undefined) {
    var extend = $.extend,
        proxy = $.proxy,
        isFunction = $.isFunction,
        isPlainObject = $.isPlainObject,
        isEmptyObject = $.isEmptyObject,
        isArray = $.isArray,
        grep = $.grep,
        ajax = $.ajax,
        map,
        each = $.each,
        noop = $.noop,
        kendo = window.kendo,
        Observable = kendo.Observable,
        Class = kendo.Class,
        STRING = "string",
        FUNCTION = "function",
        CREATE = "create",
        READ = "read",
        UPDATE = "update",
        DESTROY = "destroy",
        CHANGE = "change",
        SYNC = "sync",
        GET = "get",
        ERROR = "error",
        REQUESTSTART = "requestStart",
        REQUESTEND = "requestEnd",
        crud = [CREATE, READ, UPDATE, DESTROY],
        identity = function(o) { return o; },
        getter = kendo.getter,
        stringify = kendo.stringify,
        math = Math,
        push = [].push,
        join = [].join,
        pop = [].pop,
        splice = [].splice,
        shift = [].shift,
        slice = [].slice,
        unshift = [].unshift,
        toString = {}.toString,
        stableSort = kendo.support.stableSort,
        dateRegExp = /^\/Date\((.*?)\)\/$/,
        quoteRegExp = /(?=['\\])/g;

    var ObservableArray = Observable.extend({
        init: function(array, type) {
            var that = this;

            that.type = type || ObservableObject;

            Observable.fn.init.call(that);

            that.length = array.length;

            that.wrapAll(array, that);
        },

        toJSON: function() {
            var idx, length = this.length, value, json = new Array(length);

            for (idx = 0; idx < length; idx++){
                value = this[idx];

                if (value instanceof ObservableObject) {
                    value = value.toJSON();
                }

                json[idx] = value;
            }

            return json;
        },

        parent: noop,

        wrapAll: function(source, target) {
            var that = this,
                idx,
                length,
                parent = function() {
                    return that;
                };

            target = target || [];

            for (idx = 0, length = source.length; idx < length; idx++) {
                target[idx] = that.wrap(source[idx], parent);
            }

            return target;
        },

        wrap: function(object, parent) {
            var that = this,
                observable;

            if (object !== null && toString.call(object) === "[object Object]") {
                observable = object instanceof that.type || object instanceof Model;

                if (!observable) {
                    object = object instanceof ObservableObject ? object.toJSON() : object;
                    object = new that.type(object);
                }

                object.parent = parent;

                object.bind(CHANGE, function(e) {
                    that.trigger(CHANGE, {
                        field: e.field,
                        node: e.node,
                        index: e.index,
                        items: e.items || [this],
                        action: e.node  ? (e.action || "itemchange") : "itemchange"
                    });
                });
            }

            return object;
        },

        push: function() {
            var index = this.length,
                items = this.wrapAll(arguments),
                result;

            result = push.apply(this, items);

            this.trigger(CHANGE, {
                action: "add",
                index: index,
                items: items
            });

            return result;
        },

        slice: slice,

        join: join,

        pop: function() {
            var length = this.length, result = pop.apply(this);

            if (length) {
                this.trigger(CHANGE, {
                    action: "remove",
                    index: length - 1,
                    items:[result]
                });
            }

            return result;
        },

        splice: function(index, howMany, item) {
            var items = this.wrapAll(slice.call(arguments, 2)),
                result, i, len;

            result = splice.apply(this, [index, howMany].concat(items));

            if (result.length) {
                this.trigger(CHANGE, {
                    action: "remove",
                    index: index,
                    items: result
                });

                for (i = 0, len = result.length; i < len; i++) {
                    if (result[i].children) {
                        result[i].unbind(CHANGE);
                    }
                }
            }

            if (item) {
                this.trigger(CHANGE, {
                    action: "add",
                    index: index,
                    items: items
                });
            }
            return result;
        },

        shift: function() {
            var length = this.length, result = shift.apply(this);

            if (length) {
                this.trigger(CHANGE, {
                    action: "remove",
                    index: 0,
                    items:[result]
                });
            }

            return result;
        },

        unshift: function() {
            var items = this.wrapAll(arguments),
                result;

            result = unshift.apply(this, items);

            this.trigger(CHANGE, {
                action: "add",
                index: 0,
                items: items
            });

            return result;
        },

        indexOf: function(item) {
            var that = this,
                idx,
                length;

            for (idx = 0, length = that.length; idx < length; idx++) {
                if (that[idx] === item) {
                    return idx;
                }
            }
            return -1;
        }
    });

    var ObservableObject = Observable.extend({
        init: function(value) {
            var that = this,
                member,
                field,
                parent = function() {
                    return that;
                },
                type;

            Observable.fn.init.call(this);

            for (field in value) {
                member = value[field];
                if (field.charAt(0) != "_") {
                    type = toString.call(member);

                    member = that.wrap(member, field, parent);
                }
                that[field] = member;
            }

            that.uid = kendo.guid();
        },

        shouldSerialize: function(field) {
            return this.hasOwnProperty(field) && field !== "_events" && typeof this[field] !== FUNCTION && field !== "uid";
        },

        toJSON: function() {
            var result = {}, value, field;

            for (field in this) {
                if (this.shouldSerialize(field)) {
                    value = this[field];

                    if (value instanceof ObservableObject || value instanceof ObservableArray) {
                        value = value.toJSON();
                    }

                    result[field] = value;
                }
            }

            return result;
        },

        get: function(field) {
            var that = this, result;

            that.trigger(GET, { field: field });

            if (field === "this") {
                result = that;
            } else {
                result = kendo.getter(field, true)(that);
            }

            return result;
        },

        _set: function(field, value) {
            var that = this;
            if (field.indexOf(".")) {
                var paths = field.split("."),
                    path = "";

                while (paths.length > 1) {
                    path += paths.shift();
                    var obj = kendo.getter(path, true)(that);
                    if (obj instanceof ObservableObject) {
                        obj.set(paths.join("."), value);
                        return;
                    }
                    path += ".";
                }
            }

            kendo.setter(field)(that, value);
        },

        set: function(field, value) {
            var that = this,
                current = kendo.getter(field, true)(that),
                parent = function() { return that; };

            if (current !== value) {
                if (!that.trigger("set", { field: field, value: value })) {

                    that._set(field, that.wrap(value, field, parent));

                    that.trigger(CHANGE, { field: field });
                }
            }
        },

        parent: noop,

        wrap: function(object, field, parent) {
            var that = this,
                type = toString.call(object),
                isObservableArray = object instanceof ObservableArray;

            if (object !== null && object !== undefined && type === "[object Object]" && !(object instanceof DataSource) && !isObservableArray) {
                if (!(object instanceof ObservableObject)) {
                    object = new ObservableObject(object);
                }

                object.parent = parent;

                (function(field) {
                    object.bind(GET, function(e) {
                        e.field = field + "." + e.field;
                        that.trigger(GET, e);
                    });

                    object.bind(CHANGE, function(e) {
                        e.field = field + "." + e.field;
                        that.trigger(CHANGE, e);
                    });
                })(field);
            } else if (object !== null && (type === "[object Array]" || isObservableArray)) {
                if (!isObservableArray) {
                    object = new ObservableArray(object);
                }
                object.parent = parent;

                (function(field) {
                    object.bind(CHANGE, function(e) {
                        that.trigger(CHANGE, { field: field, index: e.index, items: e.items, action: e.action});
                    });
                })(field);
            } else if (object !== null && object instanceof DataSource) {
                object._parent = parent; // assign parent to the DataSource if part of observable object
            }


            return object;
        }
    });

    function equal(x, y) {
        if (x === y) {
            return true;
        }

        var xtype = $.type(x), ytype = $.type(y), field;

        if (xtype !== ytype) {
            return false;
        }

        if (xtype === "date") {
            return x.getTime() === y.getTime();
        }

        if (xtype !== "object" && xtype !== "array") {
            return false;
        }

        for (field in x) {
            if (!equal(x[field], y[field])) {
                return false;
            }
        }

        return true;
    }

    var parsers = {
        "number": function(value) {
            return kendo.parseFloat(value);
        },

        "date": function(value) {
            return kendo.parseDate(value);
        },

        "boolean": function(value) {
            if (typeof value === STRING) {
                return value.toLowerCase() === "true";
            }
            return value != null ? !!value : value;
        },

        "string": function(value) {
            return value != null ? (value + "") : value;
        },

        "default": function(value) {
            return value;
        }
    };

    var defaultValues = {
        "string": "",
        "number": 0,
        "date": new Date(),
        "boolean": false,
        "default": ""
    };

    function getFieldByName(obj, name) {
        var field,
            fieldName;

        for (fieldName in obj) {
            field = obj[fieldName];
            if (isPlainObject(field) && field.field && field.field === name) {
                return field;
            } else if (field === name) {
                return field;
            }
        }
        return null;
    }

    var Model = ObservableObject.extend({
        init: function(data) {
            var that = this;

            if (!data || $.isEmptyObject(data)) {
                data = $.extend({}, that.defaults, data);
            }

            ObservableObject.fn.init.call(that, data);

            that.dirty = false;

            if (that.idField) {
                that.id = that.get(that.idField);

                if (that.id === undefined) {
                    that.id = that._defaultId;
                }
            }
        },

        shouldSerialize: function(field) {
            return ObservableObject.fn.shouldSerialize.call(this, field) && field !== "uid" && !(this.idField !== "id" && field === "id") && field !== "dirty" && field !== "_accessors";
        },

        _parse: function(field, value) {
            var that = this,
                fieldName = field,
                fields = (that.fields || {}),
                parse;

            field = fields[field];
            if (!field) {
                field = getFieldByName(fields, fieldName);
            }
            if (field) {
                parse = field.parse;
                if (!parse && field.type) {
                    parse = parsers[field.type.toLowerCase()];
                }
            }

            return parse ? parse(value) : value;
        },

        editable: function(field) {
            field = (this.fields || {})[field];
            return field ? field.editable !== false : true;
        },

        set: function(field, value, initiator) {
            var that = this;

            if (that.editable(field)) {
                value = that._parse(field, value);

                if (!equal(value, that.get(field))) {
                    that.dirty = true;
                    ObservableObject.fn.set.call(that, field, value, initiator);
                }
            }
        },

        accept: function(data) {
            var that = this,
                parent = function() { return that; },
                field;

            for (field in data) {
                that._set(field, that.wrap(data[field], field, parent));
            }

            if (that.idField) {
                that.id = that.get(that.idField);
            }

            that.dirty = false;
        },

        isNew: function() {
            return this.id === this._defaultId;
        }
    });

    Model.define = function(base, options) {
        if (options === undefined) {
            options = base;
            base = Model;
        }

        var model,
            proto = extend({ defaults: {} }, options),
            name,
            field,
            type,
            value,
            id = proto.id;

        if (id) {
            proto.idField = id;
        }

        if (proto.id) {
            delete proto.id;
        }

        if (id) {
            proto.defaults[id] = proto._defaultId = "";
        }

        for (name in proto.fields) {
            field = proto.fields[name];
            type = field.type || "default";
            value = null;

            name = typeof (field.field) === STRING ? field.field : name;

            if (!field.nullable) {
                value = proto.defaults[name] = field.defaultValue !== undefined ? field.defaultValue : defaultValues[type.toLowerCase()];
            }

            if (options.id === name) {
                proto._defaultId = value;
            }

            proto.defaults[name] = value;

            field.parse = field.parse || parsers[type];
        }

        model = base.extend(proto);
        model.define = function(options) {
            return Model.define(model, options);
        };

        if (proto.fields) {
            model.fields = proto.fields;
            model.idField = proto.idField;
        }

        return model;
    };

    var Comparer = {
        selector: function(field) {
            return isFunction(field) ? field : getter(field);
        },

        asc: function(field) {
            var selector = this.selector(field);
            return function (a, b) {
                a = selector(a);
                b = selector(b);

                if (a == null && b ==null) {
                    return 0;
                }

                if ((a && !b) || b == null) {
                    return 1;
                }

                if (b && !a) {
                    return -1;
                }

                return a > b ? 1 : (a < b ? -1 : 0);
            };
        },

        desc: function(field) {
            var selector = this.selector(field);
            return function (a, b) {
                a = selector(a);
                b = selector(b);

                if (a == null && b == null) {
                    return 0;
                }

                if ((a && !b) || b == null) {
                    return -1;
                }

                if ((b && !a) || a == null) {
                    return 1;
                }

                return a < b ? 1 : (a > b ? -1 : 0);
            };
        },

        create: function(descriptor) {
            return this[descriptor.dir.toLowerCase()](descriptor.field);
        },

        combine: function(comparers) {
            return function(a, b) {
                var result = comparers[0](a, b),
                    idx,
                    length;

                for (idx = 1, length = comparers.length; idx < length; idx ++) {
                    result = result || comparers[idx](a, b);
                }

                return result;
            };
        }
    };

    var PositionComparer = extend({}, Comparer, {
        asc: function(field) {
            var selector = this.selector(field);
            return function (a, b) {
                var valueA = selector(a);
                var valueB = selector(b);

                if (valueA && valueA.getTime && valueB && valueB.getTime) {
                    valueA = valueA.getTime();
                    valueB = valueB.getTime();
                }

                if (valueA === valueB) {
                    return a.__position - b.__position;
                }

                if (valueB == null) {
                    return 1;
                }

                return valueA > valueB ? 1 : (valueA < valueB ? -1 : 0);
            };
        },

        desc: function(field) {
            var selector = this.selector(field);
            return function (a, b) {
                var valueA = selector(a);
                var valueB = selector(b);

                if (valueA && valueA.getTime && valueB && valueB.getTime) {
                    valueA = valueA.getTime();
                    valueB = valueB.getTime();
                }

                if (valueA === valueB) {
                    return a.__position - b.__position;
                }

                return valueA < valueB ? 1 : (valueA > valueB ? -1 : 0);
            };
        }
    });

    map = function (array, callback) {
        var idx, length = array.length, result = new Array(length);

        for (idx = 0; idx < length; idx++) {
            result[idx] = callback(array[idx], idx, array);
        }

        return result;
    };

    var operators = (function(){

        function quote(value) {
            return value.replace(quoteRegExp, "\\");
        }

        function operator(op, a, b, ignore) {
            var date;

            if (b != null) {
                if (typeof b === STRING) {
                    b = quote(b);
                    date = dateRegExp.exec(b);
                    if (date) {
                        b = new Date(+date[1]);
                    } else if (ignore) {
                        b = "'" + b.toLowerCase() + "'";
                        a = "(" + a + " || '').toLowerCase()";
                    } else {
                        b = "'" + b + "'";
                    }
                }

                if (b.getTime) {
                    //b looks like a Date
                    a = "(" + a + "?" + a + ".getTime():" + a + ")";
                    b = b.getTime();
                }
            }

            return a + " " + op + " " + b;
        }

        return {
            eq: function(a, b, ignore) {
                return operator("==", a, b, ignore);
            },
            neq: function(a, b, ignore) {
                return operator("!=", a, b, ignore);
            },
            gt: function(a, b, ignore) {
                return operator(">", a, b, ignore);
            },
            gte: function(a, b, ignore) {
                return operator(">=", a, b, ignore);
            },
            lt: function(a, b, ignore) {
                return operator("<", a, b, ignore);
            },
            lte: function(a, b, ignore) {
                return operator("<=", a, b, ignore);
            },
            startswith: function(a, b, ignore) {
                if (ignore) {
                    a = a + ".toLowerCase()";
                    if (b) {
                        b = b.toLowerCase();
                    }
                }

                if (b) {
                    b = quote(b);
                }

                return a + ".lastIndexOf('" + b + "', 0) == 0";
            },
            endswith: function(a, b, ignore) {
                if (ignore) {
                    a = a + ".toLowerCase()";
                    if (b) {
                        b = b.toLowerCase();
                    }
                }

                if (b) {
                    b = quote(b);
                }

                return a + ".indexOf('" + b + "', " + a + ".length - " + (b || "").length + ") >= 0";
            },
            contains: function(a, b, ignore) {
                if (ignore) {
                    a = "(" + a + " || '').toLowerCase()";
                    if (b) {
                        b = b.toLowerCase();
                    }
                }

                if (b) {
                    b = quote(b);
                }

                return a + ".indexOf('" + b + "') >= 0";
            },
            doesnotcontain: function(a, b, ignore) {
                if (ignore) {
                    a = "(" + a + " || '').toLowerCase()";
                    if (b) {
                        b = b.toLowerCase();
                    }
                }

                if (b) {
                    b = quote(b);
                }

                return a + ".indexOf('" + b + "') == -1";
            }
        };
    })();

    function Query(data) {
        this.data = data || [];
    }

    Query.filterExpr = function(expression) {
        var expressions = [],
            logic = { and: " && ", or: " || " },
            idx,
            length,
            filter,
            expr,
            fieldFunctions = [],
            operatorFunctions = [],
            field,
            operator,
            filters = expression.filters;

        for (idx = 0, length = filters.length; idx < length; idx++) {
            filter = filters[idx];
            field = filter.field;
            operator = filter.operator;

            if (filter.filters) {
                expr = Query.filterExpr(filter);
                //Nested function fields or operators - update their index e.g. __o[0] -> __o[1]
                filter = expr.expression
                .replace(/__o\[(\d+)\]/g, function(match, index) {
                    index = +index;
                    return "__o[" + (operatorFunctions.length + index) + "]";
                })
                .replace(/__f\[(\d+)\]/g, function(match, index) {
                    index = +index;
                    return "__f[" + (fieldFunctions.length + index) + "]";
                });

                operatorFunctions.push.apply(operatorFunctions, expr.operators);
                fieldFunctions.push.apply(fieldFunctions, expr.fields);
            } else {
                if (typeof field === FUNCTION) {
                    expr = "__f[" + fieldFunctions.length +"](d)";
                    fieldFunctions.push(field);
                } else {
                    expr = kendo.expr(field);
                }

                if (typeof operator === FUNCTION) {
                    filter = "__o[" + operatorFunctions.length + "](" + expr + ", " + filter.value + ")";
                    operatorFunctions.push(operator);
                } else {
                    filter = operators[(operator || "eq").toLowerCase()](expr, filter.value, filter.ignoreCase !== undefined? filter.ignoreCase : true);
                }
            }

            expressions.push(filter);
        }

        return  { expression: "(" + expressions.join(logic[expression.logic]) + ")", fields: fieldFunctions, operators: operatorFunctions };
    };

    function normalizeSort(field, dir) {
        if (field) {
            var descriptor = typeof field === STRING ? { field: field, dir: dir } : field,
            descriptors = isArray(descriptor) ? descriptor : (descriptor !== undefined ? [descriptor] : []);

            return grep(descriptors, function(d) { return !!d.dir; });
        }
    }

    var operatorMap = {
        "==": "eq",
        equals: "eq",
        isequalto: "eq",
        equalto: "eq",
        equal: "eq",
        "!=": "neq",
        ne: "neq",
        notequals: "neq",
        isnotequalto: "neq",
        notequalto: "neq",
        notequal: "neq",
        "<": "lt",
        islessthan: "lt",
        lessthan: "lt",
        less: "lt",
        "<=": "lte",
        le: "lte",
        islessthanorequalto: "lte",
        lessthanequal: "lte",
        ">": "gt",
        isgreaterthan: "gt",
        greaterthan: "gt",
        greater: "gt",
        ">=": "gte",
        isgreaterthanorequalto: "gte",
        greaterthanequal: "gte",
        ge: "gte",
        notsubstringof: "doesnotcontain"
    };

    function normalizeOperator(expression) {
        var idx,
        length,
        filter,
        operator,
        filters = expression.filters;

        if (filters) {
            for (idx = 0, length = filters.length; idx < length; idx++) {
                filter = filters[idx];
                operator = filter.operator;

                if (operator && typeof operator === STRING) {
                    filter.operator = operatorMap[operator.toLowerCase()] || operator;
                }

                normalizeOperator(filter);
            }
        }
    }

    function normalizeFilter(expression) {
        if (expression && !isEmptyObject(expression)) {
            if (isArray(expression) || !expression.filters) {
                expression = {
                    logic: "and",
                    filters: isArray(expression) ? expression : [expression]
                };
            }

            normalizeOperator(expression);

            return expression;
        }
    }

    Query.normalizeFilter = normalizeFilter;

    function normalizeAggregate(expressions) {
        return isArray(expressions) ? expressions : [expressions];
    }

    function normalizeGroup(field, dir) {
        var descriptor = typeof field === STRING ? { field: field, dir: dir } : field,
        descriptors = isArray(descriptor) ? descriptor : (descriptor !== undefined ? [descriptor] : []);

        return map(descriptors, function(d) { return { field: d.field, dir: d.dir || "asc", aggregates: d.aggregates }; });
    }

    Query.prototype = {
        toArray: function () {
            return this.data;
        },
        range: function(index, count) {
            return new Query(this.data.slice(index, index + count));
        },
        skip: function (count) {
            return new Query(this.data.slice(count));
        },
        take: function (count) {
            return new Query(this.data.slice(0, count));
        },
        select: function (selector) {
            return new Query(map(this.data, selector));
        },
        orderBy: function (selector) {
            var result = this.data.slice(0),
            comparer = isFunction(selector) || !selector ? Comparer.asc(selector) : selector.compare;

            return new Query(result.sort(comparer));
        },
        orderByDescending: function (selector) {
            return new Query(this.data.slice(0).sort(Comparer.desc(selector)));
        },
        sort: function(field, dir, comparer) {
            var idx,
            length,
            descriptors = normalizeSort(field, dir),
            comparers = [];

            comparer = comparer || Comparer;

            if (descriptors.length) {
                for (idx = 0, length = descriptors.length; idx < length; idx++) {
                    comparers.push(comparer.create(descriptors[idx]));
                }

                return this.orderBy({ compare: comparer.combine(comparers) });
            }

            return this;
        },

        filter: function(expressions) {
            var idx,
            current,
            length,
            compiled,
            predicate,
            data = this.data,
            fields,
            operators,
            result = [],
            filter;

            expressions = normalizeFilter(expressions);

            if (!expressions || expressions.filters.length === 0) {
                return this;
            }

            compiled = Query.filterExpr(expressions);
            fields = compiled.fields;
            operators = compiled.operators;

            predicate = filter = new Function("d, __f, __o", "return " + compiled.expression);

            if (fields.length || operators.length) {
                filter = function(d) {
                    return predicate(d, fields, operators);
                };
            }

            for (idx = 0, length = data.length; idx < length; idx++) {
                current = data[idx];

                if (filter(current)) {
                    result.push(current);
                }
            }
            return new Query(result);
        },

        group: function(descriptors, allData) {
            descriptors =  normalizeGroup(descriptors || []);
            allData = allData || this.data;

            var that = this,
            result = new Query(that.data),
            descriptor;

            if (descriptors.length > 0) {
                descriptor = descriptors[0];
                result = result.groupBy(descriptor).select(function(group) {
                    var data = new Query(allData).filter([ { field: group.field, operator: "eq", value: group.value } ]);
                    return {
                        field: group.field,
                        value: group.value,
                        items: descriptors.length > 1 ? new Query(group.items).group(descriptors.slice(1), data.toArray()).toArray() : group.items,
                        hasSubgroups: descriptors.length > 1,
                        aggregates: data.aggregate(descriptor.aggregates)
                    };
                });
            }
            return result;
        },

        groupBy: function(descriptor) {
            if (isEmptyObject(descriptor) || !this.data.length) {
                return new Query([]);
            }

            var field = descriptor.field,
                sorted = this._sortForGrouping(field, descriptor.dir || "asc"),
                accessor = kendo.accessor(field),
                item,
                groupValue = accessor.get(sorted[0], field),
                group = {
                    field: field,
                    value: groupValue,
                    items: []
                },
                currentValue,
                idx,
                len,
                result = [group];

            for(idx = 0, len = sorted.length; idx < len; idx++) {
                item = sorted[idx];
                currentValue = accessor.get(item, field);
                if(!groupValueComparer(groupValue, currentValue)) {
                    groupValue = currentValue;
                    group = {
                        field: field,
                        value: groupValue,
                        items: []
                    };
                    result.push(group);
                }
                group.items.push(item);
            }
            return new Query(result);
        },

        _sortForGrouping: function(field, dir) {
            var idx, length,
                data = this.data;

            if (!stableSort) {
                for (idx = 0, length = data.length; idx < length; idx++) {
                    data[idx].__position = idx;
                }

                data = new Query(data).sort(field, dir, PositionComparer).toArray();

                for (idx = 0, length = data.length; idx < length; idx++) {
                    delete data[idx].__position;
                }
                return data;
            }
            return this.sort(field, dir).toArray();
        },

        aggregate: function (aggregates) {
            var idx,
            len,
            result = {};

            if (aggregates && aggregates.length) {
                for(idx = 0, len = this.data.length; idx < len; idx++) {
                    calculateAggregate(result, aggregates, this.data[idx], idx, len);
                }
            }
            return result;
        }
    };

    function groupValueComparer(a, b) {
        if (a && a.getTime && b && b.getTime) {
            return a.getTime() === b.getTime();
        }
        return a === b;
    }

    function calculateAggregate(accumulator, aggregates, item, index, length) {
        aggregates = aggregates || [];
        var idx,
        aggr,
        functionName,
        len = aggregates.length;

        for (idx = 0; idx < len; idx++) {
            aggr = aggregates[idx];
            functionName = aggr.aggregate;
            var field = aggr.field;
            accumulator[field] = accumulator[field] || {};
            accumulator[field][functionName] = functions[functionName.toLowerCase()](accumulator[field][functionName], item, kendo.accessor(field), index, length);
        }
    }

    var functions = {
        sum: function(accumulator, item, accessor) {
            return (accumulator || 0) + accessor.get(item);
        },
        count: function(accumulator, item, accessor) {
            return (accumulator || 0) + 1;
        },
        average: function(accumulator, item, accessor, index, length) {
            accumulator = (accumulator || 0) + accessor.get(item);
            if(index == length - 1) {
                accumulator = accumulator / length;
            }
            return accumulator;
        },
        max: function(accumulator, item, accessor) {
            var value = accessor.get(item);

            accumulator = accumulator || 0;

            if(accumulator < value) {
                accumulator = value;
            }
            return accumulator;
        },
        min: function(accumulator, item, accessor) {
            var value = accessor.get(item);

            accumulator = (accumulator || value);

            if(accumulator > value) {
                accumulator = value;
            }
            return accumulator;
        }
    };

    function toJSON(array) {
        var idx, length = array.length, result = new Array(length);

        for (idx = 0; idx < length; idx++) {
            result[idx] = array[idx].toJSON();
        }

        return result;
    }

    function process(data, options) {
        options = options || {};

        var query = new Query(data),
            group = options.group,
            sort = normalizeGroup(group || []).concat(normalizeSort(options.sort || [])),
            total,
            filter = options.filter,
            skip = options.skip,
            take = options.take;

        if (filter) {
            query = query.filter(filter);
            total = query.toArray().length;
        }

        if (sort) {
            query = query.sort(sort);

            if (group) {
                data = query.toArray();
            }
        }

        if (skip !== undefined && take !== undefined) {
            query = query.range(skip, take);
        }

        if (group) {
            query = query.group(group, data);
        }

        return {
            total: total,
            data: query.toArray()
        };
    }

    function calculateAggregates(data, options) {
        options = options || {};

        var query = new Query(data),
            aggregates = options.aggregate,
            filter = options.filter;

        if(filter) {
            query = query.filter(filter);
        }

        return query.aggregate(aggregates);
    }

    var LocalTransport = Class.extend({
        init: function(options) {
            this.data = options.data;
        },

        read: function(options) {
            options.success(this.data);
        },
        update: function(options) {
            options.success(options.data);
        },
        create: function(options) {
            options.success(options.data);
        },
        destroy: function(options) {
            options.success(options.data);
        }
    });

    var RemoteTransport = Class.extend( {
        init: function(options) {
            var that = this, parameterMap;

            options = that.options = extend({}, that.options, options);

            each(crud, function(index, type) {
                if (typeof options[type] === STRING) {
                    options[type] = {
                        url: options[type]
                    };
                }
            });

            that.cache = options.cache? Cache.create(options.cache) : {
                find: noop,
                add: noop
            };

            parameterMap = options.parameterMap;

            that.parameterMap = isFunction(parameterMap) ? parameterMap : function(options) {
                var result = {};

                each(options, function(option, value) {
                    if (option in parameterMap) {
                        option = parameterMap[option];
                        if (isPlainObject(option)) {
                            value = option.value(value);
                            option = option.key;
                        }
                    }

                    result[option] = value;
                });

                return result;
            };
        },

        options: {
            parameterMap: identity
        },

        create: function(options) {
            return ajax(this.setup(options, CREATE));
        },

        read: function(options) {
            var that = this,
                success,
                error,
                result,
                cache = that.cache;

            options = that.setup(options, READ);

            success = options.success || noop;
            error = options.error || noop;

            result = cache.find(options.data);

            if(result !== undefined) {
                success(result);
            } else {
                options.success = function(result) {
                    cache.add(options.data, result);

                    success(result);
                };

                $.ajax(options);
            }
        },

        update: function(options) {
            return ajax(this.setup(options, UPDATE));
        },

        destroy: function(options) {
            return ajax(this.setup(options, DESTROY));
        },

        setup: function(options, type) {
            options = options || {};

            var that = this,
                parameters,
                operation = that.options[type],
                data = isFunction(operation.data) ? operation.data(options.data) : operation.data;

            options = extend(true, {}, operation, options);
            parameters = extend(true, {}, data, options.data);

            options.data = that.parameterMap(parameters, type);

            if (isFunction(options.url)) {
                options.url = options.url(parameters);
            }

            return options;
        }
    });

    var Cache = Class.extend({
        init: function() {
            this._store = {};
        },
        add: function(key, data) {
            if(key !== undefined) {
                this._store[stringify(key)] = data;
            }
        },
        find: function(key) {
            return this._store[stringify(key)];
        },
        clear: function() {
            this._store = {};
        },
        remove: function(key) {
            delete this._store[stringify(key)];
        }
    });

    Cache.create = function(options) {
        var store = {
            "inmemory": function() { return new Cache(); }
        };

        if (isPlainObject(options) && isFunction(options.find)) {
            return options;
        }

        if (options === true) {
            return new Cache();
        }

        return store[options]();
    };

    function convertRecords(data, getters, modelInstance) {
        var record,
            getter,
            idx,
            length;

        for (idx = 0, length = data.length; idx < length; idx++) {
            record = data[idx];
            for (getter in getters) {
                record[getter] = modelInstance._parse(getter, getters[getter](record));
            }
        }
    }

    function convertGroup(data, getters, modelInstance) {
        var record,
            idx,
            length;

        for (idx = 0, length = data.length; idx < length; idx++) {
            record = data[idx];
            record.value = modelInstance._parse(record.field, record.value);

            if (record.hasSubgroups) {
                convertGroup(record.items, getters, modelInstance);
            } else {
                convertRecords(record.items, getters, modelInstance);
            }
        }
    }

    function wrapDataAccess(originalFunction, model, converter, getters) {
        return function(data) {
            data = originalFunction(data);

            if (data && !isEmptyObject(getters)) {
                if (toString.call(data) !== "[object Array]" && !(data instanceof ObservableArray)) {
                    data = [data];
                }

                converter(data, getters, new model());
            }

            return data || [];
        };
    }

    var DataReader = Class.extend({
        init: function(schema) {
            var that = this, member, get, model, base;

            schema = schema || {};

            for (member in schema) {
                get = schema[member];

                that[member] = typeof get === STRING ? getter(get) : get;
            }

            base = schema.modelBase || Model;

            if (isPlainObject(that.model)) {
                that.model = model = base.define(that.model);
            }

            if (that.model) {
                var dataFunction = proxy(that.data, that),
                    groupsFunction = proxy(that.groups, that),
                    getters = {};

                model = that.model;

                if (model.fields) {
                    each(model.fields, function(field, value) {
                        if (isPlainObject(value) && value.field) {
                            getters[value.field] = getter(value.field);
                        } else {
                            getters[field] = getter(field);
                        }
                    });
                }

                that.data = wrapDataAccess(dataFunction, model, convertRecords, getters);
                that.groups = wrapDataAccess(groupsFunction, model, convertGroup, getters);
            }
        },
        errors: function(data) {
            return data ? data.errors : null;
        },
        parse: identity,
        data: identity,
        total: function(data) {
            return data.length;
        },
        groups: identity,
        status: function(data) {
            return data.status;
        },
        aggregates: function() {
            return {};
        }
    });

    function flattenGroups(data) {
        var idx, length, result = [];

        for (idx = 0, length = data.length; idx < length; idx++) {
            if (data[idx].hasSubgroups) {
                result = result.concat(flattenGroups(data[idx].items));
            } else {
                result = result.concat(data[idx].items.slice());
            }
        }
        return result;
    }
    function wrapGroupItems(data, model) {
        var idx, length, group, items;
        if (model) {
            for (idx = 0, length = data.length; idx < length; idx++) {
                group = data[idx];
                items = group.items;

                if (group.hasSubgroups) {
                    wrapGroupItems(items, model);
                } else if (items.length && !(items[0] instanceof model)) {
                    items.type = model;
                    items.wrapAll(items, items);
                }
            }
        }
    }

    function eachGroupItems(data, func) {
        var idx, length;

        for (idx = 0, length = data.length; idx < length; idx++) {
            if (data[idx].hasSubgroups) {
                if (eachGroupItems(data[idx].items, func)) {
                    return true;
                }
            } else {
                if (func(data[idx].items, data[idx])) {
                    return true;
                }
            }
        }
    }

    function removeModel(data, model) {
        var idx, length;

        for (idx = 0, length = data.length; idx < length; idx++) {
            if (data[idx].uid == model.uid) {
                model = data[idx];
                data.splice(idx, 1);
                return model;
            }
        }
    }

    function wrapInEmptyGroup(groups, model) {
        var parent,
            group,
            idx,
            length;

        for (idx = groups.length-1, length = 0; idx >= length; idx--) {
            group = groups[idx];
            parent = {
                value: model.get(group.field),
                field: group.field,
                items: parent ? [parent] : [model],
                hasSubgroups: !!parent,
                aggregates: {}
            };
        }

        return parent;
    }

    function indexOfPristineModel(data, model) {
        if (model) {
            return indexOf(data, function(item) {
                return item[model.idField] === model.id;
            });
        }
        return -1;
    }

    function indexOfModel(data, model) {
        if (model) {
            return indexOf(data, function(item) {
                return item.uid == model.uid;
            });
        }
        return -1;
    }

    function indexOf(data, comparer) {
        var idx, length;

        for (idx = 0, length = data.length; idx < length; idx++) {
            if (comparer(data[idx])) {
                return idx;
            }
        }

        return -1;
    }

    var DataSource = Observable.extend({
        init: function(options) {
            var that = this, model, transport, data;

            if (options) {
                data = options.data;
            }

            options = that.options = extend({}, that.options, options);

            extend(that, {
                _map: {},
                _prefetch: {},
                _data: [],
                _ranges: [],
                _view: [],
                _pristine: [],
                _destroyed: [],
                _pageSize: options.pageSize,
                _page: options.page  || (options.pageSize ? 1 : undefined),
                _sort: normalizeSort(options.sort),
                _filter: normalizeFilter(options.filter),
                _group: normalizeGroup(options.group),
                _aggregate: options.aggregate,
                _total: options.total
            });

            Observable.fn.init.call(that);

            transport = options.transport;

            if (transport) {
                transport.read = typeof transport.read === STRING ? { url: transport.read } : transport.read;

                if (options.type) {
                    if (kendo.data.transports[options.type] && !isPlainObject(kendo.data.transports[options.type])) {
                       that.transport = new kendo.data.transports[options.type](extend(transport, { data: data }));
                    } else {
                        transport = extend(true, {}, kendo.data.transports[options.type], transport);
                    }

                    options.schema = extend(true, {}, kendo.data.schemas[options.type], options.schema);
                }

                if (!that.transport) {
                    that.transport = isFunction(transport.read) ? transport: new RemoteTransport(transport);
                }
            } else {
                that.transport = new LocalTransport({ data: options.data });
            }

            that.reader = new kendo.data.readers[options.schema.type || "json" ](options.schema);

            model = that.reader.model || {};

            that._data = that._observe(that._data);

            that.bind([ERROR, CHANGE, REQUESTSTART, SYNC, REQUESTEND], options);
        },

        options: {
            data: [],
            schema: {
               modelBase: Model
            },
            serverSorting: false,
            serverPaging: false,
            serverFiltering: false,
            serverGrouping: false,
            serverAggregates: false,
            sendAllFields: true,
            batch: false
        },

        _flatData: function(data) {
            if (this.options.serverGrouping && this.group().length) {
                return flattenGroups(data);
            }
            return data;
        },

        get: function(id) {
            var idx, length, data = this._flatData(this._data);

            for (idx = 0, length = data.length; idx < length; idx++) {
                if (data[idx].id == id) {
                    return data[idx];
                }
            }
        },

        getByUid: function(id) {
            var idx, length, data = this._flatData(this._data);

            if (!data) {
                return;
            }

            for (idx = 0, length = data.length; idx < length; idx++) {
                if (data[idx].uid == id) {
                    return data[idx];
                }
            }
        },

        sync: function() {
            var that = this,
                idx,
                length,
                created = [],
                updated = [],
                destroyed = that._destroyed,
                data = that._flatData(that._data);

            if (!that.reader.model) {
                return;
            }

            for (idx = 0, length = data.length; idx < length; idx++) {
                if (data[idx].isNew()) {
                    created.push(data[idx]);
                } else if (data[idx].dirty) {
                    updated.push(data[idx]);
                }
            }

            var promises = that._send("create", created);

            promises.push.apply(promises ,that._send("update", updated));
            promises.push.apply(promises ,that._send("destroy", destroyed));

            $.when.apply(null, promises)
                .then(function() {
                    var idx,
                    length;

                    for (idx = 0, length = arguments.length; idx < length; idx++){
                        that._accept(arguments[idx]);
                    }

                    that._change({ action: "sync" });

                    that.trigger(SYNC);
                });
        },

        _accept: function(result) {
            var that = this,
                models = result.models,
                response = result.response,
                idx = 0,
                serverGroup = that.options.serverGrouping && that.group() && that.group().length,
                pristine = that.reader.data(that._pristine),
                type = result.type,
                length;

            that.trigger(REQUESTEND, { response: response, type: type });

            if (response) {
                response = that.reader.parse(response);

                if (that._handleCustomErrors(response)) {
                    return;
                }

                response = that.reader.data(response);

                if (!$.isArray(response)) {
                    response = [response];
                }
            } else {
                response = $.map(models, function(model) { return model.toJSON(); } );
            }

            if (type === "destroy") {
                that._destroyed = [];
            }

            for (idx = 0, length = models.length; idx < length; idx++) {
                if (type !== "destroy") {
                    models[idx].accept(response[idx]);

                    if (type === "create") {
                        pristine.push(serverGroup ? wrapInEmptyGroup(that.group(), models[idx]) : response[idx]);
                    } else if (type === "update") {
                        if (serverGroup) {
                            that._updatePristineGroupModel(models[idx], response[idx]);
                        } else {
                            extend(pristine[that._pristineIndex(models[idx])], response[idx]);
                        }
                    }
                } else {
                    if (serverGroup) {
                        that._removePristineGroupModel(models[idx]);
                    } else {
                        pristine.splice(that._pristineIndex(models[idx]), 1);
                    }
                }
            }
        },

        _pristineIndex: function(model) {
            var that = this,
                idx,
                length,
                pristine = that.reader.data(that._pristine);

            for (idx = 0, length = pristine.length; idx < length; idx++) {
                if (pristine[idx][model.idField] === model.id) {
                    return idx;
                }
            }
            return -1;
        },

        _updatePristineGroupModel: function(model, values) {
            var pristineData = this.reader.groups(this._pristine),
                index;

            eachGroupItems(pristineData,
                function(items, group) {
                    index = indexOfPristineModel(items, model);
                    if (index > -1) {
                        extend(true, items[index], values);
                        return true;
                    }
                });
        },

        _removePristineGroupModel: function(model) {
            var pristineData = this.reader.groups(this._pristine),
                index;

            eachGroupItems(pristineData,
                function(items, group) {
                    index = indexOfPristineModel(items, model);
                    if (index > -1) {
                        items.splice(index, 1);
                        return true;
                    }
                });
        },
        _promise: function(data, models, type) {
            var that = this,
            transport = that.transport;

            return $.Deferred(function(deferred) {
                transport[type].call(transport, extend({
                    success: function(response) {
                        deferred.resolve({
                            response: response,
                            models: models,
                            type: type
                        });
                    },
                    error: function(response, status, error) {
                        deferred.reject(response);
                        that.error(response, status, error);
                    }
                }, data)
                );
            }).promise();
        },

        _send: function(method, data) {
            var that = this,
                idx,
                length,
                promises = [];

            if (that.options.batch) {
                if (data.length) {
                    promises.push(that._promise( { data: { models: toJSON(data) } }, data , method));
                }
            } else {
                for (idx = 0, length = data.length; idx < length; idx++) {
                    promises.push(that._promise( { data: data[idx].toJSON() }, [ data[idx] ], method));
                }
            }

            return promises;
        },

        add: function(model) {
            return this.insert(this._data.length, model);
        },

        insert: function(index, model) {
            if (!model) {
                model = index;
                index = 0;
            }

            if (!(model instanceof Model)) {
                if (this.reader.model) {
                    model = new this.reader.model(model);
                } else {
                    model = new ObservableObject(model);
                }
            }

            if (this.options.serverGrouping && this.group() && this.group().length) {
                this._data.splice(index, 0, wrapInEmptyGroup(this.group(), model));
            } else {
                this._data.splice(index, 0, model);
            }

            return model;
        },

        cancelChanges: function(model) {
            var that = this,
                pristineIndex,
                serverGroup = that.options.serverGrouping && that.group() && that.group().length,
                read = !serverGroup ? that.reader.data : that.reader.groups,
                pristine = read(that._pristine),
                index;

            if (model instanceof kendo.data.Model) {
                if (serverGroup) {
                    that._cancelGroupModel(model);
                } else {
                    index = that.indexOf(model);
                    pristineIndex = that._pristineIndex(model);
                    if (index != -1) {
                        if (pristineIndex != -1 && !model.isNew()) {
                           that._data[index].accept(pristine[pristineIndex]);
                        } else {
                            that._data.splice(index, 1);
                        }
                    }
                }
            } else {
                that._destroyed = [];
                that._data = that._observe(pristine);
                that._change();
            }
        },

        read: function(data) {
            var that = this, params = that._params(data);

            that._queueRequest(params, function() {
                that.trigger(REQUESTSTART);
                that._ranges = [];
                that.transport.read({
                    data: params,
                    success: proxy(that.success, that),
                    error: proxy(that.error, that)
                });
            });
        },

        _cancelGroupModel: function(model) {
            var pristineData = this.reader.groups(this._pristine),
                pristine,
                idx;

            eachGroupItems(pristineData,
                function(items, group) {
                    idx = indexOfPristineModel(items, model);
                    if (idx > -1) {
                        pristine = items[idx];
                        return true;
                    }
                });

            if (idx > -1) {
                eachGroupItems(this._data, function(items, group) {
                    idx = indexOfModel(items, model);
                    if (idx > -1) {
                        if (!model.isNew()) {
                            extend(true, items[idx], pristine);
                        } else {
                            items.splice(idx, 1);
                        }
                    }
                });
            }
        },

        indexOf: function(model) {
            return indexOfModel(this._data, model);
        },

        _params: function(data) {
            var that = this,
            options =  extend({
                take: that.take(),
                skip: that.skip(),
                page: that.page(),
                pageSize: that.pageSize(),
                sort: that._sort,
                filter: that._filter,
                group: that._group,
                aggregate: that._aggregate
            }, data);

            if (!that.options.serverPaging) {
                delete options.take;
                delete options.skip;
                delete options.page;
                delete options.pageSize;
            }
            if (!that.options.serverGrouping) {
                delete options.group;
            }
            if (!that.options.serverFiltering) {
                delete options.filter;
            }
            if (!that.options.serverSorting) {
                delete options.sort;
            }
            if (!that.options.serverAggregates) {
                delete options.aggregate;
            }
            return options;
        },

        _queueRequest: function(options, callback) {
            var that = this;
            if (!that._requestInProgress) {
                that._requestInProgress = true;
                that._pending = undefined;
                callback();
            } else {
                that._pending = { callback: proxy(callback, that), options: options };
            }
        },

        _dequeueRequest: function() {
            var that = this;
            that._requestInProgress = false;
            if (that._pending) {
                that._queueRequest(that._pending.options, that._pending.callback);
            }
        },

        remove: function(model) {
            var data = this._data;

            if (this.options.serverGrouping && this.group() && this.group().length) {
                return this._removeGroupItem(data, model);
            }
            return removeModel(data, model);
        },

        _removeGroupItem: function(data, model) {
            var result,
                that = this;

            eachGroupItems(data, function(items, group) {
                result = removeModel(items, model);
                if (result) {
                    if (!result.isNew || !result.isNew()) {
                        that._destroyed.push(result);
                    }
                    return true;
                }
            });
            return model;
        },

        error: function(xhr, status, errorThrown) {
            this._dequeueRequest();
            this.trigger(REQUESTEND, { });
            this.trigger(ERROR, { xhr: xhr, status: status, errorThrown: errorThrown });
        },

        _handleCustomErrors: function(response) {
            if (this.reader.errors) {
                var errors = this.reader.errors(response);
                if (errors) {
                    this.trigger(ERROR, { xhr: null, status: "customerror", errorThrown: "custom error", errors: errors });
                    return true;
                }
            }
            return false;
        },

        _parent: noop,

        success: function(data) {
            var that = this,
                options = that.options,
                hasGroups = options.serverGrouping === true && that._group && that._group.length > 0;

            that.trigger(REQUESTEND, { response: data, type: "read" });

            data = that.reader.parse(data);

            if (that._handleCustomErrors(data)) {
                that._dequeueRequest();
                return;
            }

            that._pristine = isPlainObject(data) ? $.extend(true, {}, data) : data.slice ? data.slice(0) : data;

            that._total = that.reader.total(data);

            if (that._aggregate && options.serverAggregates) {
                that._aggregateResult = that.reader.aggregates(data);
            }

            if (hasGroups) {
                data = that.reader.groups(data);
            } else {
                data = that.reader.data(data);
            }

            that._data = that._observe(data);

            var start = that._skip || 0,
            end = start + that._data.length;

            that._ranges.push({ start: start, end: end, data: that._data });
            that._ranges.sort( function(x, y) { return x.start - y.start; } );

            that._dequeueRequest();
            that._process(that._data);
        },

        _observe: function(data) {
            var that = this,
                model = that.reader.model,
                wrap = false;

            if (model && data.length) {
                wrap = !(data[0] instanceof model);
            }

            if (data instanceof ObservableArray) {
                if (wrap) {
                    data.type = that.reader.model;
                    data.wrapAll(data, data);
                }
            } else {
                data = new ObservableArray(data, that.reader.model);
                data.parent = function() { return that._parent(); };
            }

            if (that.group() && that.group().length && that.options.serverGrouping) {
                wrapGroupItems(data, model);
            }

            return data.bind(CHANGE, proxy(that._change, that));
        },

        _change: function(e) {
            var that = this, idx, length, action = e ? e.action : "";

            if (action === "remove") {
                for (idx = 0, length = e.items.length; idx < length; idx++) {
                    if (!e.items[idx].isNew || !e.items[idx].isNew()) {
                        that._destroyed.push(e.items[idx]);
                    }
                }
            }

            if (that.options.autoSync && (action === "add" || action === "remove" || action === "itemchange")) {
                that.sync();
            } else {
                var total = that._total || that.reader.total(that._pristine);
                if (action === "add") {
                    total++;
                } else if (action === "remove") {
                    total--;
                } else if (action !== "itemchange" && !that.options.serverPaging) {
                    total = that.reader.total(that._pristine);
                }

                that._total = total;

                that._process(that._data, e);
            }
        },

        _process: function (data, e) {
            var that = this,
                options = {},
                result;

            if (that.options.serverPaging !== true) {
                options.skip = that._skip;
                options.take = that._take || that._pageSize;

                if(options.skip === undefined && that._page !== undefined && that._pageSize !== undefined) {
                    options.skip = (that._page - 1) * that._pageSize;
                }
            }

            if (that.options.serverSorting !== true) {
                options.sort = that._sort;
            }

            if (that.options.serverFiltering !== true) {
                options.filter = that._filter;
            }

            if (that.options.serverGrouping !== true) {
                options.group = that._group;
            }

            if (that.options.serverAggregates !== true) {
                options.aggregate = that._aggregate;
                that._aggregateResult = calculateAggregates(data, options);
            }

            result = process(data, options);

            that._view = result.data;

            if (result.total !== undefined && !that.options.serverFiltering) {
                that._total = result.total;
            }

            e = e || {};

            e.items = e.items || that._view;

            that.trigger(CHANGE, e);
        },

        at: function(index) {
            return this._data[index];
        },

        data: function(value) {
            var that = this;
            if (value !== undefined) {
                that._data = this._observe(value);

                that._total = that._data.length;

                that._process(that._data);
            } else {
                return that._data;
            }
        },

        view: function() {
            return this._view;
        },

        query: function(options) {
            var that = this,
            result,
            remote = that.options.serverSorting || that.options.serverPaging || that.options.serverFiltering || that.options.serverGrouping || that.options.serverAggregates;

            if (options !== undefined) {
                that._pageSize = options.pageSize;
                that._page = options.page;
                that._sort = options.sort;
                that._filter = options.filter;
                that._group = options.group;
                that._aggregate = options.aggregate;
                that._skip = options.skip;
                that._take = options.take;

                if(that._skip === undefined) {
                    that._skip = that.skip();
                    options.skip = that.skip();
                }

                if(that._take === undefined && that._pageSize !== undefined) {
                    that._take = that._pageSize;
                    options.take = that._take;
                }

                if (options.sort) {
                    that._sort = options.sort = normalizeSort(options.sort);
                }

                if (options.filter) {
                    that._filter = options.filter = normalizeFilter(options.filter);
                }

                if (options.group) {
                    that._group = options.group = normalizeGroup(options.group);
                }
                if (options.aggregate) {
                    that._aggregate = options.aggregate = normalizeAggregate(options.aggregate);
                }
            }

            if (remote || (that._data === undefined || that._data.length === 0)) {
                that.read(options);
            } else {
                that.trigger(REQUESTSTART);
                result = process(that._data, options);

                if (!that.options.serverFiltering) {
                    if (result.total !== undefined) {
                        that._total = result.total;
                    } else {
                        that._total = that._data.length;
                    }
                }

                that._view = result.data;
                that._aggregateResult = calculateAggregates(that._data, options);
                that.trigger(CHANGE, { items: result.data });
            }
        },

        fetch: function(callback) {
            var that = this;

            if (callback && isFunction(callback)) {
                that.one(CHANGE, callback);
            }

            that._query();
        },

        _query: function(options) {
            var that = this;

            that.query(extend({}, {
                page: that.page(),
                pageSize: that.pageSize(),
                sort: that.sort(),
                filter: that.filter(),
                group: that.group(),
                aggregate: that.aggregate()
            }, options));
        },

        next: function(options) {
            var that = this,
                page = that.page(),
                total = that.total();

            options = options || {};

            if (!page || (total && page + 1 > that.totalPages())) {
                return;
            }

            that._skip = page * that.take();

            page += 1;
            options.page = page;

            that._query(options);

            return page;
        },

        prev: function(options) {
            var that = this,
                page = that.page();

            options = options || {};

            if (!page || page === 1) {
                return;
            }

            that._skip = that._skip - that.take();

            page -= 1;
            options.page = page;

            that._query(options);

            return page;
        },

        page: function(val) {
            var that = this,
            skip;

            if(val !== undefined) {
                val = math.max(math.min(math.max(val, 1), that.totalPages()), 1);
                that._query({ page: val });
                return;
            }
            skip = that.skip();

            return skip !== undefined ? math.round((skip || 0) / (that.take() || 1)) + 1 : undefined;
        },

        pageSize: function(val) {
            var that = this;

            if(val !== undefined) {
                that._query({ pageSize: val, page: 1 });
                return;
            }

            return that.take();
        },

        sort: function(val) {
            var that = this;

            if(val !== undefined) {
                that._query({ sort: val });
                return;
            }

            return that._sort;
        },

        filter: function(val) {
            var that = this;

            if (val === undefined) {
                return that._filter;
            }

            that._query({ filter: val, page: 1 });
        },

        group: function(val) {
            var that = this;

            if(val !== undefined) {
                that._query({ group: val });
                return;
            }

            return that._group;
        },

        total: function() {
            return this._total || 0;
        },

        aggregate: function(val) {
            var that = this;

            if(val !== undefined) {
                that._query({ aggregate: val });
                return;
            }

            return that._aggregate;
        },

        aggregates: function() {
            return this._aggregateResult;
        },

        totalPages: function() {
            var that = this,
            pageSize = that.pageSize() || that.total();

            return math.ceil((that.total() || 0) / pageSize);
        },

        inRange: function(skip, take) {
            var that = this,
            end = math.min(skip + take, that.total());

            if (!that.options.serverPaging && that.data.length > 0) {
                return true;
            }

            return that._findRange(skip, end).length > 0;
        },

        range: function(skip, take) {
            skip = math.min(skip || 0, this.total());
            var that = this,
            pageSkip = math.max(math.floor(skip / take), 0) * take,
            size = math.min(pageSkip + take, that.total()),
            data;

            data = that._findRange(skip, math.min(skip + take, that.total()));

            if (data.length) {
                that._skip = skip > that.skip() ? math.min(size, (that.totalPages() - 1) * that.take()) : pageSkip;

                that._take = take;

                var paging = that.options.serverPaging;
                var sorting = that.options.serverSorting;
                var filtering = that.options.serverFiltering;
                try {
                    that.options.serverPaging = true;
                    that.options.serverSorting = true;
                    that.options.serverFiltering = true;
                    if (paging) {
                        that._data = data = that._observe(data);
                    }
                    that._process(data);
                } finally {
                    that.options.serverPaging = paging;
                    that.options.serverSorting = sorting;
                    that.options.serverFiltering = filtering;
                }

                return;
            }

            if (take !== undefined) {
                if (!that._rangeExists(pageSkip, size)) {
                    that.prefetch(pageSkip, take, function() {
                        if (skip > pageSkip && size < that.total() && !that._rangeExists(size, math.min(size + take, that.total()))) {
                            that.prefetch(size, take, function() {
                                that.range(skip, take);
                            });
                        } else {
                            that.range(skip, take);
                        }
                    });
                } else if (pageSkip < skip) {
                    that.prefetch(size, take, function() {
                        that.range(skip, take);
                    });
                }
            }
        },

        _findRange: function(start, end) {
            var that = this,
                ranges = that._ranges,
                range,
                data = [],
                skipIdx,
                takeIdx,
                startIndex,
                endIndex,
                rangeData,
                rangeEnd,
                processed,
                options = that.options,
                remote = options.serverSorting || options.serverPaging || options.serverFiltering || options.serverGrouping || options.serverAggregates,
                length;

            for (skipIdx = 0, length = ranges.length; skipIdx < length; skipIdx++) {
                range = ranges[skipIdx];
                if (start >= range.start && start <= range.end) {
                    var count = 0;

                    for (takeIdx = skipIdx; takeIdx < length; takeIdx++) {
                        range = ranges[takeIdx];

                        if (range.data.length && start + count >= range.start) {
                            rangeData = range.data;
                            rangeEnd = range.end;

                            if (!remote) {
                                processed = process(range.data, { sort: that.sort(), filter: that.filter() });
                                rangeData = processed.data;

                                if (processed.total !== undefined) {
                                    rangeEnd = processed.total;
                                }
                            }

                            startIndex = 0;
                            if (start + count > range.start) {
                                startIndex = (start + count) - range.start;
                            }
                            endIndex = rangeData.length;
                            if (rangeEnd > end) {
                                endIndex = endIndex - (rangeEnd - end);
                            }
                            count += endIndex - startIndex;
                            data = data.concat(rangeData.slice(startIndex, endIndex));

                            if (end <= range.end && count == end - start) {
                                return data;
                            }
                        }
                    }
                    break;
                }
            }
            return [];
        },

        skip: function() {
            var that = this;

            if (that._skip === undefined) {
                return (that._page !== undefined ? (that._page  - 1) * (that.take() || 1) : undefined);
            }
            return that._skip;
        },

        take: function() {
            var that = this;
            return that._take || that._pageSize;
        },

        prefetch: function(skip, take, callback) {
            var that = this,
            size = math.min(skip + take, that.total()),
            range = { start: skip, end: size, data: [] },
            options = {
                take: take,
                skip: skip,
                page: skip / take + 1,
                pageSize: take,
                sort: that._sort,
                filter: that._filter,
                group: that._group,
                aggregate: that._aggregate
            };

            if (!that._rangeExists(skip, size)) {
                clearTimeout(that._timeout);

                that._timeout = setTimeout(function() {
                    that._queueRequest(options, function() {
                        that.transport.read({
                            data: options,
                            success: function (data) {
                                that._dequeueRequest();
                                var found = false;
                                for (var i = 0, len = that._ranges.length; i < len; i++) {
                                    if (that._ranges[i].start === skip) {
                                        found = true;
                                        range = that._ranges[i];
                                        break;
                                    }
                                }
                                if (!found) {
                                    that._ranges.push(range);
                                }

                                data = that.reader.parse(data);
                                range.data = that._observe(that.reader.data(data));
                                range.end = range.start + range.data.length;
                                that._ranges.sort( function(x, y) { return x.start - y.start; } );
                                that._total = that.reader.total(data);
                                if (callback) {
                                    callback();
                                }
                            }
                        });
                    });
                }, 100);
            } else if (callback) {
                callback();
            }
        },

        _rangeExists: function(start, end) {
            var that = this,
            ranges = that._ranges,
            idx,
            length;

            for (idx = 0, length = ranges.length; idx < length; idx++) {
                if (ranges[idx].start <= start && ranges[idx].end >= end) {
                    return true;
                }
            }
            return false;
        }
    });

    DataSource.create = function(options) {
        options = options && options.push ? { data: options } : options;

        var dataSource = options || {},
        data = dataSource.data,
        fields = dataSource.fields,
        table = dataSource.table,
        select = dataSource.select,
        idx,
        length,
        model = {},
        field;

        if (!data && fields && !dataSource.transport) {
            if (table) {
                data = inferTable(table, fields);
            } else if (select) {
                data = inferSelect(select, fields);
            }
        }

        if (kendo.data.Model && fields && (!dataSource.schema || !dataSource.schema.model)) {
            for (idx = 0, length = fields.length; idx < length; idx++) {
                field = fields[idx];
                if (field.type) {
                    model[field.field] = field;
                }
            }

            if (!isEmptyObject(model)) {
                dataSource.schema = extend(true, dataSource.schema, { model:  { fields: model } });
            }
        }

        dataSource.data = data;

        return dataSource instanceof DataSource ? dataSource : new DataSource(dataSource);
    };

    function inferSelect(select, fields) {
        var options = $(select)[0].children,
            idx,
            length,
            data = [],
            record,
            firstField = fields[0],
            secondField = fields[1],
            value,
            option;

        for (idx = 0, length = options.length; idx < length; idx++) {
            record = {};
            option = options[idx];

            record[firstField.field] = option.text;

            value = option.attributes.value;

            if (value && value.specified) {
                value = option.value;
            } else {
                value = option.text;
            }

            record[secondField.field] = value;

            data.push(record);
        }

        return data;
    }

    function inferTable(table, fields) {
        var tbody = $(table)[0].tBodies[0],
        rows = tbody ? tbody.rows : [],
        idx,
        length,
        fieldIndex,
        fieldCount = fields.length,
        data = [],
        cells,
        record,
        cell,
        empty;

        for (idx = 0, length = rows.length; idx < length; idx++) {
            record = {};
            empty = true;
            cells = rows[idx].cells;

            for (fieldIndex = 0; fieldIndex < fieldCount; fieldIndex++) {
                cell = cells[fieldIndex];
                if(cell.nodeName.toLowerCase() !== "th") {
                    empty = false;
                    record[fields[fieldIndex].field] = cell.innerHTML;
                }
            }
            if(!empty) {
                data.push(record);
            }
        }

        return data;
    }

    var Node = Model.define({
        init: function(value) {
            var that = this,
                hasChildren = that.hasChildren || value && value.hasChildren,
                childrenField = "items",
                childrenOptions = {};

            kendo.data.Model.fn.init.call(that, value);


            if (typeof that.children === STRING) {
                childrenField = that.children;
            }

            childrenOptions = {
                schema: {
                    data: childrenField,
                    model: {
                        hasChildren: hasChildren,
                        id: that.idField
                    }
                }
            };

            if (typeof that.children !== STRING) {
                extend(childrenOptions, that.children);
            }

            childrenOptions.data = value;

            if (!hasChildren) {
                hasChildren = childrenOptions.schema.data;
            }

            if (typeof hasChildren === STRING) {
                hasChildren = kendo.getter(hasChildren);
            }

            if (isFunction(hasChildren)) {
                that.hasChildren = !!hasChildren.call(that, that);
            }

            that._childrenOptions = childrenOptions;

            if (that.hasChildren) {
                that._initChildren();
            }

            that._loaded = !!(value && value[childrenField]);
        },

        _initChildren: function() {
            var that = this,
                childrenField = that._childrenOptions.schema.data;

            if (!(that.children instanceof HierarchicalDataSource)) {
                that.children = new HierarchicalDataSource(that._childrenOptions);
                that.children._parent = function(){
                    return that;
                };

                that.children.bind(CHANGE, function(e){
                    e.node = e.node || that;
                    that.trigger(CHANGE, e);
                });

                if (childrenField) {
                    that[childrenField] = that.children.data();
                }
            }
        },

        append: function(model) {
            this._initChildren();
            this.loaded(true);
            this.children.add(model);
        },

        hasChildren: false,

        level: function() {
            var parentNode = this.parentNode(),
                level = 0;

            while (parentNode && parentNode.parentNode) {
                level++;
                parentNode = parentNode.parentNode ? parentNode.parentNode() : null;
            }

            return level;
        },

        load: function() {
            var that = this,
                options = {};

            that._initChildren();

            if (!that._loaded || that.hasChildren) {
                options[that.idField || "id"] = that.id;

                if (!that._loaded) {
                    that.children._data = undefined;
                }

                that.children.one(CHANGE, function() {
                            that._loaded = true;
                        })
                        ._query(options);
            }
        },

        parentNode: function() {
            var array = this.parent();

            return array.parent();
        },

        loaded: function(value) {
            if (value !== undefined) {
                this._loaded = value;
            } else {
                return this._loaded;
            }
        },

        shouldSerialize: function(field) {
            return Model.fn.shouldSerialize.call(this, field) &&
                    field !== "children" &&
                    field !== "_loaded" &&
                    field !== "hasChildren" &&
                    field !== "_childrenOptions";
        }
    });

    var HierarchicalDataSource = DataSource.extend({
        init: function(options) {
            var node = Node.define({
                children: options
            });

            DataSource.fn.init.call(this, extend(true, {}, { schema: { modelBase: node, model: node } }, options));
        },

        remove: function(node){
            var parentNode = node.parentNode(),
                dataSource = this,
                result;

            if (parentNode) {
                dataSource = parentNode.children;
            }

            result = DataSource.fn.remove.call(dataSource, node);

            if (parentNode && !dataSource.data().length) {
                parentNode.hasChildren = false;
            }

            return result;
        },

        insert: function(index, model) {
            var parentNode = this._parent();

            if (parentNode) {
                parentNode.hasChildren = true;
                parentNode._initChildren();
            }

            return DataSource.fn.insert.call(this, index, model);
        },

        _find: function(method, value) {
            var idx, length, node, data, children;

            node = DataSource.fn[method].call(this, value);

            if (node) {
                return node;
            }

            data = this._flatData(this.data());

            if (!data) {
                return;
            }

            for (idx = 0, length = data.length; idx < length; idx++) {
                children = data[idx].children;

                if (!(children instanceof HierarchicalDataSource)) {
                    continue;
                }

                node = children[method](value);

                if (node) {
                    return node;
                }
            }
        },

        get: function(id) {
            return this._find("get", id);
        },

        getByUid: function(uid) {
            return this._find("getByUid", uid);
        }
    });

    function inferList(list, fields) {
        var items = $(list).children(),
            idx,
            length,
            data = [],
            record,
            textField = fields[0].field,
            urlField = fields[1] && fields[1].field,
            spriteCssClassField = fields[2] && fields[2].field,
            imageUrlField = fields[3] && fields[3].field,
            item,
            id,
            textChild,
            className,
            children;

        for (idx = 0, length = items.length; idx < length; idx++) {
            record = {};
            item = items.eq(idx);

            textChild = item[0].firstChild;
            children = item.children();
            list = children.filter("ul");
            children = children.filter(":not(ul)");

            id = item.attr("data-id");

            if (id) {
                record.id = id;
            }

            if (textChild) {
                record[textField] = textChild.nodeType == 3 ? textChild.nodeValue : children.text();
            }

            if (urlField) {
                record[urlField] = children.find("a").attr("href");
            }

            if (imageUrlField) {
                record[imageUrlField] = children.find("img").attr("src");
            }

            if (spriteCssClassField) {
                className = children.find(".k-sprite").prop("className");
                record[spriteCssClassField] = className && $.trim(className.replace("k-sprite", ""));
            }

            if (list.length) {
                record.items = inferList(list.eq(0), fields);
            }

            if (item.attr("data-hasChildren") == "true") {
                record.hasChildren = true;
            }

            data.push(record);
        }

        return data;
    }

    HierarchicalDataSource.create = function(options) {
        options = options && options.push ? { data: options } : options;

        var dataSource = options || {},
            data = dataSource.data,
            fields = dataSource.fields,
            list = dataSource.list;

        if (data && data._dataSource) {
            return data._dataSource;
        }

        if (!data && fields && !dataSource.transport) {
            if (list) {
                data = inferList(list, fields);
            }
        }

        dataSource.data = data;

        return dataSource instanceof HierarchicalDataSource ? dataSource : new HierarchicalDataSource(dataSource);
    };

    extend(true, kendo.data, {
        readers: {
            json: DataReader
        },
        Query: Query,
        DataSource: DataSource,
        HierarchicalDataSource: HierarchicalDataSource,
        Node: Node,
        ObservableObject: ObservableObject,
        ObservableArray: ObservableArray,
        LocalTransport: LocalTransport,
        RemoteTransport: RemoteTransport,
        Cache: Cache,
        DataReader: DataReader,
        Model: Model
    });
})(window.kendo.jQuery);
(function ($, unefined) {
    var kendo = window.kendo,
        Observable = kendo.Observable,
        ObservableObject = kendo.data.ObservableObject,
        ObservableArray = kendo.data.ObservableArray,
        toString = {}.toString,
        binders = {},
        Class = kendo.Class,
        innerText,
        proxy = $.proxy,
        VALUE = "value",
        SOURCE = "source",
        EVENTS = "events",
        CHECKED = "checked",
        CHANGE = "change";

    (function() {
        var a = document.createElement("a");
        if (a.innerText !== undefined) {
            innerText = "innerText";
        } else if (a.textContent !== undefined) {
            innerText = "textContent";
        }
    })();

    var Binding = Observable.extend( {
        init: function(source, path) {
            var that = this;

            Observable.fn.init.call(that);

            that.source = source;
            that.path = path;
            that.dependencies = {};
            that.dependencies[path] = true;
            that.observable = that.source instanceof Observable;

            that._access = function(e) {
                that.dependencies[e.field] = true;
            };

            if (that.observable) {
                that._change = function(e) {
                    that.change(e);
                };

                that.source.bind(CHANGE, that._change);
            }
        },

        change: function(e) {
            var dependency,
                idx,
                ch,
                that = this;

            if (that.path === "this") {
                that.trigger(CHANGE, e);
            } else {
                for (dependency in that.dependencies) {
                    idx = dependency.indexOf(e.field);

                    if (idx === 0) {
                       ch = dependency.charAt(e.field.length);

                       if (!ch || ch === "." || ch === "[") {
                            that.trigger(CHANGE, e);
                            break;
                       }
                    }
                }
            }
        },

        start: function() {
            if (this.observable) {
                this.source.bind("get", this._access);
            }
        },

        stop: function() {
            if (this.observable) {
                this.source.unbind("get", this._access);
            }
        },

        get: function() {
            var that = this,
                source = that.source,
                index,
                path = that.path,
                result = source;

            that.start();

            if (that.observable) {
                result = source.get(path);

                // Traverse the observable hierarchy if the binding is not resolved at the current level.
                while (result === undefined && source) {
                    source = source.parent();

                    if (source instanceof ObservableObject) {
                        result = source.get(path);
                    }
                }

                // If the result is a function - invoke it
                if (typeof result === "function") {
                    index = path.lastIndexOf(".");

                    // If the function is a member of a nested observable object make that nested observable the context (this) of the function
                    if (index > 0) {
                        source = source.get(path.substring(0, index));
                    }

                    // Set the context (this) of the function
                    result = proxy(result, source);

                    // Invoke the function
                    result = result(that.source);
                }

                // If the binding is resolved by a parent object
                if (source && source !== that.source) {

                    that.currentSource = source; // save parent object

                    // Listen for changes in the parent object
                    source.unbind(CHANGE, that._change)
                          .bind(CHANGE, that._change);
                }
            }

            that.stop();

            return result;
        },

        set: function(value) {
            var that = this,
                source = that.currentSource || that.source;

            source.set(that.path, value);
        },

        destroy: function() {
            if (this.observable) {
                this.source.unbind(CHANGE, this._change);
            }
        }
    });

    var EventBinding = Binding.extend( {
        get: function() {
            var source = this.source,
                path = this.path,
                handler;

            handler = source.get(path);

            while (!handler && source) {
                source = source.parent();
                if (source instanceof ObservableObject) {
                    handler = source.get(path);
                }
            }

            return proxy(handler, source);
        }
    });

    var TemplateBinding = Binding.extend( {
        init: function(source, path, template) {
            var that = this;

            Binding.fn.init.call(that, source, path);

            that.template = template;
        },

        render: function(value) {
            var html;

            this.start();

            html = kendo.render(this.template, value);

            this.stop();

            return html;
        }
    });

    var Binder = Class.extend({
        init: function(element, bindings, options) {
            this.element = element;
            this.bindings = bindings;
            this.options = options;
        },

        bind: function(binding, attribute) {
            var that = this;

            binding = attribute ? binding[attribute] : binding;

            binding.bind(CHANGE, function(e) {
                that.refresh(attribute || e);
            });

            that.refresh(attribute);
        },

        destroy: function() {
        }
    });

    binders.attr = Binder.extend({
        refresh: function(key) {
            this.element.setAttribute(key, this.bindings.attr[key].get());
        }
    });

    binders.style = Binder.extend({
        refresh: function(key) {
            this.element.style[key] = this.bindings.style[key].get();
        }
    });

    binders.enabled = Binder.extend({
        refresh: function() {
            if (this.bindings.enabled.get()) {
                this.element.removeAttribute("disabled");
            } else {
                this.element.setAttribute("disabled", "disabled");
            }
        }
    });

    binders.readonly = Binder.extend({
       refresh: function() {
            if (this.bindings.readonly.get()) {
                this.element.setAttribute("readonly", "readonly");
            } else {
                this.element.removeAttribute("readonly");
            }
       }
    });

    binders.disabled = Binder.extend({
        refresh: function() {
            if (this.bindings.disabled.get()) {
                this.element.setAttribute("disabled", "disabled");
            } else {
                this.element.removeAttribute("disabled");
            }
        }
    });

    binders.events = Binder.extend({
        init: function(element, bindings, options) {
            Binder.fn.init.call(this, element, bindings, options);
            this.handlers = {};
        },

        refresh: function(key) {
            var element = $(this.element),
                binding = this.bindings.events[key],
                handler = this.handlers[key];

            if (handler) {
                element.off(key, handler);
            }

            handler = this.handlers[key] = binding.get();

            element.on(key, binding.source, handler);
        },

        destroy: function() {
            var element = $(this.element),
                handler;

            for (handler in this.handlers) {
                element.off(handler, this.handlers[handler]);
            }
        }
    });

    binders.text = Binder.extend({
        refresh: function() {
            var text = this.bindings.text.get();

            if (text == null) {
                text = "";
            }

            this.element[innerText] = text;
        }
    });

    binders.visible = Binder.extend({
        refresh: function() {
            if (this.bindings.visible.get()) {
                this.element.style.display = "";
            } else {
                this.element.style.display = "none";
            }
        }
    });

    binders.invisible = Binder.extend({
        refresh: function() {
            if (!this.bindings.invisible.get()) {
                this.element.style.display = "";
            } else {
                this.element.style.display = "none";
            }
        }
    });

    binders.html = Binder.extend({
        refresh: function() {
            this.element.innerHTML = this.bindings.html.get();
        }
    });

    binders.value = Binder.extend({
        init: function(element, bindings, options) {
            Binder.fn.init.call(this, element, bindings, options);

            this._change = proxy(this.change, this);
            this.eventName = options.valueUpdate || CHANGE;

            $(this.element).on(this.eventName, this._change);

            this._initChange = false;
        },

        change: function() {
            this._initChange = this.eventName != CHANGE;
            this.bindings[VALUE].set(this.element.value);
            this._initChange = false;
        },

        refresh: function() {
            if (!this._initChange) {
                var value = this.bindings[VALUE].get();

                if (value == null) {
                    value = "";
                }

                this.element.value = value;
            }

            this._initChange = false;
        },

        destroy: function() {
            $(this.element).off(this.eventName, this._change);
        }
    });

    binders.source = Binder.extend({
        init: function(element, bindings, options) {
            Binder.fn.init.call(this, element, bindings, options);
        },

        refresh: function(e) {
            var that = this,
                source = that.bindings.source.get();

            if (source instanceof ObservableArray) {
                e = e || {};

                if (e.action == "add") {
                    that.add(e.index, e.items);
                } else if (e.action == "remove") {
                    that.remove(e.index, e.items);
                } else if (e.action != "itemchange") {
                    that.render();
                }
            } else {
                that.render();
            }
        },

        container: function() {
            var element = this.element;

            if (element.nodeName.toLowerCase() == "table") {
                if (!element.tBodies[0]) {
                    element.appendChild(document.createElement("tbody"));
                }
                element = element.tBodies[0];
            }

            return element;
        },

        template: function() {
            var options = this.options,
                template = options.template,
                nodeName = this.container().nodeName.toLowerCase();

            if (!template) {
                if (nodeName == "select") {
                    if (options.valueField || options.textField) {
                        template = kendo.format('<option value="#:{0}#">#:{1}#</option>',
                            options.valueField || options.textField, options.textField || options.valueField);
                    } else {
                        template = "<option>#:data#</option>";
                    }
                } else if (nodeName == "tbody") {
                    template = "<tr><td>#:data#</td></tr>";
                } else if (nodeName == "ul" || nodeName == "ol") {
                    template = "<li>#:data#</li>";
                } else {
                    template = "#:data#";
                }

                template = kendo.template(template);
            }

            return template;
        },

        destroy: function() {
            var source = this.bindings.source.get();

            source.unbind(CHANGE, this._change);
        },

        add: function(index, items) {
            var element = this.container(),
                idx,
                length,
                child,
                clone = element.cloneNode(false),
                reference = element.children[index];

            $(clone).html(kendo.render(this.template(), items));

            if (clone.children.length) {
                for (idx = 0, length = items.length; idx < length; idx++) {
                    child = clone.children[0];
                    element.insertBefore(child, reference || null);
                    bindElement(child, items[idx], this.options.roles);
                }
            }
        },

        remove: function(index, items) {
            var idx,
            element = this.container();

            for (idx = 0; idx < items.length; idx++) {
                element.removeChild(element.children[index]);
            }
        },

        render: function() {
            var source = this.bindings.source.get(),
                 idx,
                 length,
                 element = this.container(),
                 template = this.template(),
                 parent;

            if (!(source instanceof ObservableArray) && toString.call(source) !== "[object Array]") {
                if (source.parent) {
                    parent = source.parent;
                }

                source = new ObservableArray([source]);

                if (source.parent) {
                    source.parent = parent;
                }
            }

            if (this.bindings.template) {
                $(element).html(this.bindings.template.render(source));

                if (element.children.length) {
                    for (idx = 0, length = source.length; idx < length; idx++) {
                        bindElement(element.children[idx], source[idx], this.options.roles);
                    }
                }
            }
            else {
                $(element).html(kendo.render(template, source));
            }
        }
    });

    binders.input = {
        checked: Binder.extend({
            init: function(element, bindings, options) {
                Binder.fn.init.call(this, element, bindings, options);
                this._change = proxy(this.change, this);

                $(this.element).change(this._change);
            },
            change: function() {
                var element = this.element;
                var value = this.value();

                if (element.type == "radio") {
                    this.bindings[CHECKED].set(value);
                } else if (element.type == "checkbox") {
                    var source = this.bindings[CHECKED].get();
                    var index;

                    if (source instanceof ObservableArray) {
                        value = this.element.value;

                        if (value !== "on" && value !== "off") {
                            index = source.indexOf(value);
                            if (index > -1) {
                                source.splice(index, 1);
                            } else {
                                source.push(value);
                            }
                        }
                    } else {
                        this.bindings[CHECKED].set(value);
                    }
                }
            },

            refresh: function() {
                var value = this.bindings[CHECKED].get(),
                    source = value,
                    element = this.element;

                if (element.type == "checkbox") {
                    if (source instanceof ObservableArray) {
                        value = this.element.value;
                        if (source.indexOf(value) >= 0) {
                            value = true;
                        }
                    }

                    element.checked = value === true;
                } else if (element.type == "radio" && value != null) {
                    if (element.value === value.toString()) {
                        element.checked = true;
                    }
                }
            },

            value: function() {
                var element = this.element,
                    value = element.value;

                if (element.type == "checkbox") {
                    value = element.checked;
                }

                return value;
            },
            destroy: function() {
                $(this.element).off(CHANGE, this._change);
            }
        })
    };

    binders.select = {
        value: Binder.extend({
            init: function(target, bindings, options) {
                Binder.fn.init.call(this, target, bindings, options);

                this._change = proxy(this.change, this);
                $(this.element).change(this._change);
            },

            change: function() {
                var values = [],
                    element = this.element,
                    source,
                    field = this.options.valueField || this.options.textField,
                    option,
                    valueIndex,
                    value,
                    idx,
                    length;

                for (idx = 0, length = element.options.length; idx < length; idx++) {
                    option = element.options[idx];

                    if (option.selected) {
                        value = option.attributes.value;

                        if (value && value.specified) {
                            value = option.value;
                        } else {
                            value = option.text;
                        }

                        values.push(value);
                    }
                }

                if (field) {
                    source = this.bindings.source.get();
                    for (valueIndex = 0; valueIndex < values.length; valueIndex++) {
                        for (idx = 0, length = source.length; idx < length; idx++) {
                            if (source[idx].get(field) == values[valueIndex]) {
                                values[valueIndex] = source[idx];
                                break;
                            }
                        }
                    }
                }

                value = this.bindings[VALUE].get();
                if (value instanceof ObservableArray) {
                    value.splice.apply(value, [0, value.length].concat(values));
                } else if (value instanceof ObservableObject || !field) {
                    this.bindings[VALUE].set(values[0]);
                } else {
                    this.bindings[VALUE].set(values[0].get(field));
                }
            },
            refresh: function() {
                var optionIndex,
                    element = this.element,
                    options = element.options,
                    value = this.bindings[VALUE].get(),
                    values = value,
                    field = this.options.valueField || this.options.textField,
                    optionValue;

                if (!(values instanceof ObservableArray)) {
                    values = new ObservableArray([value]);
                }

                for (var valueIndex = 0; valueIndex < values.length; valueIndex++) {
                    value = values[valueIndex];

                    if (field && value instanceof ObservableObject) {
                        value = value.get(field);
                    }

                    for (optionIndex = 0; optionIndex < options.length; optionIndex++) {
                        optionValue = options[optionIndex].value;
                        if (optionValue === "" && value !== "") {
                            optionValue = options[optionIndex].text;
                        }

                        if (optionValue == value) {
                            options[optionIndex].selected = true;
                        }
                    }
                }
            },
            destroy: function() {
                $(this.element).off(CHANGE, this._change);
            }
        })
    };

    binders.widget = {
        events : Binder.extend({
            init: function(widget, bindings, options) {
                Binder.fn.init.call(this, widget.element[0], bindings, options);
                this.widget = widget;
                this.handlers = {};
            },

            refresh: function(key) {
                var binding = this.bindings.events[key],
                    handler = this.handlers[key];

                if (handler) {
                    this.widget.unbind(key, handler);
                }

                handler = binding.get();

                this.handlers[key] = function(e) {
                    e.data = binding.source;

                    handler(e);

                    if (e.data === binding.source) {
                        delete e.data;
                    }
                };

                this.widget.bind(key, this.handlers[key]);
            },

            destroy: function() {
                var handler;

                for (handler in this.handlers) {
                    this.widget.unbind(handler, this.handlers[handler]);
                }
            }
        }),

        checked: Binder.extend({
            init: function(widget, bindings, options) {
                Binder.fn.init.call(this, widget.element[0], bindings, options);

                this.widget = widget;
                this._change = proxy(this.change, this);
                this.widget.bind(CHANGE, this._change);
            },
            change: function() {
                this.bindings[CHECKED].set(this.value());
            },

            refresh: function() {
                this.widget.check(this.bindings[CHECKED].get() === true);
            },

            value: function() {
                var element = this.element,
                    value = element.value;

                if (value == "on" || value == "off") {
                    value = element.checked;
                }

                return value;
            },

            destroy: function() {
                this.widget.unbind(CHANGE, this._change);
            }
        }),

        visible: Binder.extend({
            init: function(widget, bindings, options) {
                Binder.fn.init.call(this, widget.element[0], bindings, options);

                this.widget = widget;
            },

            refresh: function() {
                var visible = this.bindings.visible.get();
                this.widget.wrapper[0].style.display = visible ? "" : "none";
            }
        }),

        invisible: Binder.extend({
            init: function(widget, bindings, options) {
                Binder.fn.init.call(this, widget.element[0], bindings, options);

                this.widget = widget;
            },

            refresh: function() {
                var invisible = this.bindings.invisible.get();
                this.widget.wrapper[0].style.display = invisible ? "none" : "";
            }
        }),

        enabled: Binder.extend({
            init: function(widget, bindings, options) {
                Binder.fn.init.call(this, widget.element[0], bindings, options);

                this.widget = widget;
            },

            refresh: function() {
                if (this.widget.enable) {
                    this.widget.enable(this.bindings.enabled.get());
                }
            }
        }),

        disabled: Binder.extend({
            init: function(widget, bindings, options) {
                Binder.fn.init.call(this, widget.element[0], bindings, options);

                this.widget = widget;
            },

            refresh: function() {
                if (this.widget.enable) {
                    this.widget.enable(!this.bindings.disabled.get());
                }
            }
        }),

        source: Binder.extend({
            init: function(widget, bindings, options) {
                var that = this;

                Binder.fn.init.call(that, widget.element[0], bindings, options);

                that.widget = widget;
                that._dataBinding = proxy(that.dataBinding, that);
                that._dataBound = proxy(that.dataBound, that);
                that._itemChange = proxy(that.itemChange, that);
            },

            itemChange: function(e) {
                bindElement(e.item[0], e.data, (e.ns || kendo.ui).roles);
            },

            dataBinding: function() {
                var idx,
                    length,
                    widget = this.widget,
                    items = widget.items();

                for (idx = 0, length = items.length; idx < length; idx++) {
                    unbindElementTree(items[idx]);
                }
            },

            dataBound: function(e) {
                var idx,
                    length,
                    widget = this.widget,
                    items = widget.items(),
                    dataSource = widget.dataSource,
                    view = dataSource.view(),
                    ns = e.ns || kendo.ui,
                    groups = dataSource.group() || [];

                if (items.length) {
                    if (groups.length) {
                        view = flattenGroups(view);
                    }

                    for (idx = 0, length = view.length; idx < length; idx++) {
                        bindElement(items[idx], view[idx], ns.roles);
                    }
                }
            },

            refresh: function(e) {
                var that = this,
                    source,
                    widget = that.widget;

                e = e || {};

                if (!e.action) {
                    that.destroy();

                    widget.bind("dataBinding", that._dataBinding);
                    widget.bind("dataBound", that._dataBound);
                    widget.bind("itemChange", that._itemChange);

                    if (widget.dataSource instanceof kendo.data.DataSource) {
                        source = that.bindings.source.get();
                        if (source instanceof kendo.data.DataSource) {
                            widget.setDataSource(source);
                        } else if (source && source._dataSource) {
                            widget.setDataSource(source._dataSource);
                        } else {
                            widget.dataSource.data(source);
                        }
                    }
                }
            },

            destroy: function() {
                var widget = this.widget;

                widget.unbind("dataBinding", this._dataBinding);
                widget.unbind("dataBound", this._dataBound);
                widget.unbind("itemChange", this._itemChange);
            }
        }),

        value: Binder.extend({
            init: function(widget, bindings, options) {
                Binder.fn.init.call(this, widget.element[0], bindings, options);

                this.widget = widget;
                this._change = $.proxy(this.change, this);
                this.widget.first(CHANGE, this._change);

                var value = this.bindings.value.get();
                this._valueIsObservableObject = value == null || value instanceof ObservableObject;
            },

            change: function() {
                var value = this.widget.value();
                var idx, length;

                var field = this.options.dataValueField || this.options.dataTextField;

                if (field) {
                    var source,
                        isObservableObject = this._valueIsObservableObject;

                    if (this.bindings.source) {
                        source = this.bindings.source.get();
                    }

                    if (value === "" && isObservableObject) {
                        value = null;
                    } else {
                        if (!source || source instanceof kendo.data.DataSource) {
                            source = this.widget.dataSource.view();
                        }

                        for (idx = 0, length = source.length; idx < length; idx++) {
                            if (source[idx].get(field) == value) {
                                if (isObservableObject) {
                                    value = source[idx];
                                } else {
                                    value = source[idx].get(field);
                                }
                                break;
                            }
                        }
                    }
                }

                this.bindings.value.set(value);
            },

            refresh: function() {
                var field = this.options.dataValueField || this.options.dataTextField;
                var value = this.bindings.value.get();

                if (field && value instanceof ObservableObject) {
                    value = value.get(field);
                }

                this.widget.value(value);
            },

            destroy: function() {
                this.widget.unbind(CHANGE, this._change);
            }
        })
    };

    var BindingTarget = Class.extend( {
        init: function(target, options) {
            this.target = target;
            this.options = options;
            this.toDestroy = [];
        },

        bind: function(bindings) {
            var nodeName = this.target.nodeName.toLowerCase(),
                key,
                hasValue,
                hasSource,
                hasEvents,
                specificBinders = binders[nodeName] || {};

            for (key in bindings) {
                if (key == VALUE) {
                    hasValue = true;
                } else if (key == SOURCE) {
                    hasSource = true;
                } else if (key == EVENTS) {
                    hasEvents = true;
                } else {
                    this.applyBinding(key, bindings, specificBinders);
                }
            }

            if (hasSource) {
                this.applyBinding(SOURCE, bindings, specificBinders);
            }

            if (hasValue) {
                this.applyBinding(VALUE, bindings, specificBinders);
            }

            if (hasEvents) {
                this.applyBinding(EVENTS, bindings, specificBinders);
            }
        },

        applyBinding: function(name, bindings, specificBinders) {
            var binder = specificBinders[name] || binders[name],
                toDestroy = this.toDestroy,
                attribute,
                binding = bindings[name];

            if (binder) {
                binder = new binder(this.target, bindings, this.options);

                toDestroy.push(binder);

                if (binding instanceof Binding) {
                    binder.bind(binding);
                    toDestroy.push(binding);
                } else {
                    for (attribute in binding) {
                        binder.bind(binding, attribute);
                        toDestroy.push(binding[attribute]);
                    }
                }
            } else if (name !== "template") {
                throw new Error("The " + name + " binding is not supported by the " + this.target.nodeName.toLowerCase() + " element");
            }
        },

        destroy: function() {
            var idx,
                length,
                toDestroy = this.toDestroy;

            for (idx = 0, length = toDestroy.length; idx < length; idx++) {
                toDestroy[idx].destroy();
            }
        }
    });

    var WidgetBindingTarget = BindingTarget.extend( {
        bind: function(bindings) {
            var that = this,
                binding,
                hasValue = false,
                hasSource = false;

            for (binding in bindings) {
                if (binding == VALUE) {
                    hasValue = true;
                } else if (binding == SOURCE) {
                    hasSource = true;
                } else {
                    that.applyBinding(binding, bindings);
                }
            }

            if (hasSource) {
                that.applyBinding(SOURCE, bindings);
            }

            if (hasValue) {
                that.applyBinding(VALUE, bindings);
            }
        },

        applyBinding: function(name, bindings) {
            var binder = binders.widget[name],
                toDestroy = this.toDestroy,
                attribute,
                binding = bindings[name];

            if (binder) {
                binder = new binder(this.target, bindings, this.target.options);

                toDestroy.push(binder);


                if (binding instanceof Binding) {
                    binder.bind(binding);
                    toDestroy.push(binding);
                } else {
                    for (attribute in binding) {
                        binder.bind(binding, attribute);
                        toDestroy.push(binding[attribute]);
                    }
                }
            } else {
                throw new Error("The " + name + " binding is not supported by the " + this.target.options.name + " widget");
            }
        }
    });

    function flattenGroups(data) {
        var idx, length, result = [];

        for (idx = 0, length = data.length; idx < length; idx++) {
            if (data[idx].hasSubgroups) {
                result = result.concat(flattenGroups(data[idx].items));
            } else {
                result = result.concat(data[idx].items);
            }
        }
        return result;
    }

    function bindingTargetForRole(role, element, roles) {
        var type = roles[role];

        if (type) {
            return new WidgetBindingTarget(kendo.initWidget(element, type.options, roles));
        }
    }

    var keyValueRegExp = /[A-Za-z0-9_\-]+:(\{([^}]*)\}|[^,}]+)/g,
        whiteSpaceRegExp = /\s/g;

    function parseBindings(bind) {
        var result = {},
            idx,
            length,
            token,
            colonIndex,
            key,
            value,
            tokens;

        tokens = bind.match(keyValueRegExp);

        for (idx = 0, length = tokens.length; idx < length; idx++) {
            token = tokens[idx];
            colonIndex = token.indexOf(":");

            key = token.substring(0, colonIndex);
            value = token.substring(colonIndex + 1);

            if (value.charAt(0) == "{") {
                value = parseBindings(value);
            }

            result[key] = value;
        }

        return result;
    }

    function createBindings(bindings, source, type) {
        var binding,
            result = {};

        for (binding in bindings) {
            result[binding] = new type(source, bindings[binding]);
        }

        return result;
    }

    function bindElement(element, source, roles) {
        var role = element.getAttribute("data-" + kendo.ns + "role"),
            idx,
            bind = element.getAttribute("data-" + kendo.ns + "bind"),
            children = element.children,
            deep = true,
            bindings,
            options = {},
            target;

        if (role || bind) {
            unbindElement(element);
        }

        if (role) {
            target = bindingTargetForRole(role, element, roles);
        }

        if (bind) {
            bind = parseBindings(bind.replace(whiteSpaceRegExp, ""));

            if (!target) {
                options = kendo.parseOptions(element, {textField: "", valueField: "", template: "", valueUpdate: CHANGE});
                options.roles = roles;
                target = new BindingTarget(element, options);
            }

            target.source = source;

            bindings = createBindings(bind, source, Binding);

            if (options.template) {
                bindings.template = new TemplateBinding(source, "", options.template);
            }

            if (bindings.click) {
                bind.events = bind.events || {};
                bind.events.click = bind.click;
                delete bindings.click;
            }

            if (bindings.source) {
                deep = false;
            }

            if (bind.attr) {
                bindings.attr = createBindings(bind.attr, source, Binding);
            }

            if (bind.style) {
                bindings.style = createBindings(bind.style, source, Binding);
            }

            if (bind.events) {
                bindings.events = createBindings(bind.events, source, EventBinding);
            }

            target.bind(bindings);
        }

        if (target) {
            element.kendoBindingTarget = target;
        }

        if (deep && children) {
            for (idx = 0; idx < children.length; idx++) {
                bindElement(children[idx], source, roles);
            }
        }
    }

    function bind(dom, object) {
        var idx,
            length,
            roles = kendo.rolesFromNamespaces([].slice.call(arguments, 2));

        object = kendo.observable(object);
        dom = $(dom);

        for (idx = 0, length = dom.length; idx < length; idx++ ) {
            bindElement(dom[idx], object, roles);
        }
    }

    function unbindElement(element) {
        var bindingTarget = element.kendoBindingTarget;

        if (bindingTarget) {
            bindingTarget.destroy();

            if ($.support.deleteExpando) {
                delete element.kendoBindingTarget;
            } else if (element.removeAttribute) {
                element.removeAttribute("kendoBindingTarget");
            } else {
                element.kendoBindingTarget = null;
            }
        }
    }

    function unbindElementTree(element) {
        var idx,
            length,
            children = element.children;

        unbindElement(element);

        if (children) {
            for (idx = 0, length = children.length; idx < length; idx++) {
                unbindElementTree(children[idx]);
            }
        }
    }

    function unbind(dom) {
        var idx, length;

        dom = $(dom);

        for (idx = 0, length = dom.length; idx < length; idx++ ) {
            unbindElementTree(dom[idx]);
        }
    }

    function notify(widget, namespace) {
        var element = widget.element,
            bindingTarget = element[0].kendoBindingTarget;

        if (bindingTarget) {
            bind(element, bindingTarget.source, namespace);
        }
    }

    kendo.unbind = unbind;
    kendo.bind = bind;
    kendo.data.binders = binders;
    kendo.data.Binder = Binder;
    kendo.notify = notify;

    kendo.observable = function(object) {
        if (!(object instanceof ObservableObject)) {
            object = new ObservableObject(object);
        }

        return object;
    };

    kendo.observableHierarchy = function(array) {
        var dataSource = kendo.data.HierarchicalDataSource.create(array);

        function recursiveRead(data) {
            var i, children;

            for (i = 0; i < data.length; i++) {
                data[i]._initChildren();

                children = data[i].children;

                children.fetch();

                data[i].items = children.data();

                recursiveRead(data[i].items);
            }
        }

        dataSource.fetch();

        recursiveRead(dataSource.data());

        dataSource._data._dataSource = dataSource;

        return dataSource._data;
    };

})(window.kendo.jQuery);
;(function($, undefined) {
    var kendo = window.kendo,
        Widget = kendo.ui.Widget,
        NS = ".kendoValidator",
        INVALIDMSG = "k-invalid-msg",
        INVALIDINPUT = "k-invalid",
        emailRegExp = /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i,
        urlRegExp = /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i,
        INPUTSELECTOR = ":input:not(:button,[type=submit],[type=reset],[disabled],[readonly])",
        NUMBERINPUTSELECTOR = "[type=number],[type=range]",
        BLUR = "blur",
        NAME = "name",
        FORM = "form",
        NOVALIDATE = "novalidate",
        proxy = $.proxy,
        patternMatcher = function(value, pattern) {
            if (typeof pattern === "string") {
                pattern = new RegExp('^(?:' + pattern + ')$');
            }
            return pattern.test(value);
        },
        matcher = function(input, selector, pattern) {
            var value = input.val();

            if (input.filter(selector).length && value !== "") {
                return patternMatcher(value, pattern);
            }
            return true;
        },
        hasAttribute = function(input, name) {
            if (input.length)  {
                return input[0].attributes[name] !== undefined;
            }
            return false;
        },
        nameSpecialCharRegExp = /(\[|\]|\$|\.|\:|\+)/g;

    if (!kendo.ui.validator) {
        kendo.ui.validator = { rules: {}, messages: {} };
    }

    function resolveRules(element) {
        var resolvers = kendo.ui.validator.ruleResolvers || {},
            rules = {},
            name;

        for (name in resolvers) {
            $.extend(true, rules, resolvers[name].resolve(element));
        }
        return rules;
    }

    function decode(value) {
        return value.replace(/&amp/g, '&amp;')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');
    }

    function numberOfDecimalDigits(value) {
        value = (value + "").split('.');
        if (value.length > 1) {
            return value[1].length;
        }
        return 0;
    }

    var Validator = Widget.extend({
        init: function(element, options) {
            var that = this,
                resolved = resolveRules(element);

            options = options || {};

            options.rules = $.extend({}, kendo.ui.validator.rules, resolved.rules, options.rules);
            options.messages = $.extend({}, kendo.ui.validator.messages, resolved.messages, options.messages);

            Widget.fn.init.call(that, element, options);

            that._errorTemplate = kendo.template(that.options.errorTemplate);

            if (that.element.is(FORM)) {
                that.element.attr(NOVALIDATE, NOVALIDATE);
            }

            that._errors = {};
            that._attachEvents();
        },

        options: {
            name: "Validator",
            errorTemplate: '<span class="k-widget k-tooltip k-tooltip-validation">' +
                '<span class="k-icon k-warning"> </span> #=message#</span>',
            messages: {
                required: "{0} is required",
                pattern: "{0} is not valid",
                min: "{0} should be greater than or equal to {1}",
                max: "{0} should be smaller than or equal to {1}",
                step: "{0} is not valid",
                email: "{0} is not valid email",
                url: "{0} is not valid URL",
                date: "{0} is not valid date"
            },
            rules: {
                required: function(input) {
                    var checkbox = input.filter("[type=checkbox]").length && input.attr("checked") !== "checked",
                        value = input.val();

                    return !(hasAttribute(input, "required") && (value === "" || !value  || checkbox));
                },
                pattern: function(input) {
                    if (input.filter("[type=text],[type=email],[type=url],[type=tel],[type=search],[type=password]").filter("[pattern]").length && input.val() !== "") {
                        return patternMatcher(input.val(), input.attr("pattern"));
                    }
                    return true;
                },
                min: function(input) {
                    if (input.filter(NUMBERINPUTSELECTOR + ",[" + kendo.attr("type") + "=number]").filter("[min]").length && input.val() !== "") {
                        var min = parseFloat(input.attr("min")) || 0,
                            val = parseFloat(input.val());

                        return min <= val;
                    }
                    return true;
                },
                max: function(input) {
                    if (input.filter(NUMBERINPUTSELECTOR + ",[" + kendo.attr("type") + "=number]").filter("[max]").length && input.val() !== "") {
                        var max = parseFloat(input.attr("max")) || 0,
                            val = parseFloat(input.val());

                        return max >= val;
                    }
                    return true;
                },
                step: function(input) {
                    if (input.filter(NUMBERINPUTSELECTOR + ",[" + kendo.attr("type") + "=number]").filter("[step]").length && input.val() !== "") {
                        var min = parseFloat(input.attr("min")) || 0,
                            step = parseFloat(input.attr("step")) || 1,
                            val = parseFloat(input.val()),
                            decimals = numberOfDecimalDigits(step),
                            raise;

                        if (decimals) {
                            raise = Math.pow(10, decimals);
                            return (((val-min)*raise)%(step*raise)) / Math.pow(100, decimals) === 0;
                        }
                        return ((val-min)%step) === 0;
                    }
                    return true;
                },
                email: function(input) {
                    return matcher(input, "[type=email],[" + kendo.attr("type") + "=email]", emailRegExp);
                },
                url: function(input) {
                    return matcher(input, "[type=url],[" + kendo.attr("type") + "=url]", urlRegExp);
                },
                date: function(input) {
                    if (input.filter("[type^=date],[" + kendo.attr("type") + "=date]").length && input.val() !== "") {
                        return kendo.parseDate(input.val(), input.attr(kendo.attr("format"))) !== null;
                    }
                    return true;
                }
            },
            validateOnBlur: true
        },

        destroy: function() {
            Widget.fn.destroy.call(this);

            this.element.off(NS);
        },

        _submit: function(e) {
            if (!this.validate()) {
                e.stopPropagation();
                e.stopImmediatePropagation();
                e.preventDefault();
                return false;
            }
            return true;
        },

        _attachEvents: function() {
            var that = this;

            if (that.element.is(FORM)) {
                that.element.on("submit" + NS, proxy(that._submit, that));
            }

            if (that.options.validateOnBlur) {
                if (!that.element.is(INPUTSELECTOR)) {
                    that.element.on(BLUR + NS, INPUTSELECTOR, function() {
                        that.validateInput($(this));
                    });
                } else {
                    that.element.on(BLUR + NS, function() {
                        that.validateInput(that.element);
                    });
                }
            }
        },

        validate: function() {
            var that = this,
                inputs,
                idx,
                invalid = false,
                length;

            that._errors = {};

            if (!that.element.is(INPUTSELECTOR)) {
                inputs = that.element.find(INPUTSELECTOR);

                for (idx = 0, length = inputs.length; idx < length; idx++) {
                    if (!that.validateInput(inputs.eq(idx))) {
                        invalid = true;
                    }
                }
                return !invalid;
            }
            return that.validateInput(that.element);
        },

        validateInput: function(input) {
            input = $(input);

            var that = this,
                template = that._errorTemplate,
                result = that._checkValidity(input),
                valid = result.valid,
                className = "." + INVALIDMSG,
                fieldName = (input.attr(NAME) || ""),
                lbl = that._findMessageContainer(fieldName).add(input.next(className)).hide(),
                messageText;

            input.removeAttr("aria-invalid");

            if (!valid) {
                messageText = that._extractMessage(input, result.key);
                that._errors[fieldName] = messageText;
                var messageLabel = $(template({ message: decode(messageText) }));

                that._decorateMessageContainer(messageLabel, fieldName);

                if (!lbl.replaceWith(messageLabel).length) {
                    messageLabel.insertAfter(input);
                }
                messageLabel.show();

                input.attr("aria-invalid", true);
            }

            input.toggleClass(INVALIDINPUT, !valid);

            return valid;
        },

        _findMessageContainer: function(fieldName) {
            var locators = kendo.ui.validator.messageLocators,
                name,
                containers = this.element.find("." + INVALIDMSG + "[" + kendo.attr("for") +"=" + fieldName.replace(nameSpecialCharRegExp, "\\$1") + "]");

            for (name in locators) {
                containers = containers.add(locators[name].locate(this.element, fieldName));
            }

            return containers;
        },

        _decorateMessageContainer: function(container, fieldName) {
            var locators = kendo.ui.validator.messageLocators,
                name;

            container.addClass(INVALIDMSG)
                .attr(kendo.attr("for"), fieldName || "");

            for (name in locators) {
                locators[name].decorate(container, fieldName);
            }

            container.attr("role", "alert");
        },

        _extractMessage: function(input, ruleKey) {
            var that = this,
                customMessage = that.options.messages[ruleKey],
                fieldName = input.attr(NAME);

            customMessage = $.isFunction(customMessage) ? customMessage(input) : customMessage;

            return kendo.format(input.attr(kendo.attr(ruleKey + "-msg")) || input.attr("validationMessage") || input.attr("title") || customMessage || "", fieldName, input.attr(ruleKey));
        },

        _checkValidity: function(input) {
            var rules = this.options.rules,
                rule;

            for (rule in rules) {
                if (!rules[rule](input)) {
                    return { valid: false, key: rule };
                }
            }

            return { valid: true };
        },

        errors: function() {
            var results = [],
                errors = this._errors,
                error;

            for (error in errors) {
                results.push(errors[error]);
            }
            return results;
        }
    });

    kendo.ui.plugin(Validator);
})(window.kendo.jQuery);
(function($, undefined) {
    var kendo = window.kendo,
        location = window.location,
        history = window.history,
        _checkUrlInterval = 50,
        hashStrip = /^#*/,
        documentMode = window.document.documentMode,
        oldIE = kendo.support.browser.msie && (!documentMode || documentMode <= 8),
        hashChangeSupported = ("onhashchange" in window) && !oldIE,
        document = window.document;

    var History = kendo.Observable.extend({

        start: function(options) {
            options = options || {};

            var that = this;

            that._pushStateRequested = !!options.pushState;
            that._pushState = that._pushStateRequested && that._pushStateSupported();
            that.root = options.root || "/";
            that._interval = 0;

            this.bind(["change", "ready"], options);
            if (that._normalizeUrl()) {
                return true;
            }

            that.current = that._currentLocation();
            that._listenToLocationChange();
            that.trigger("ready", {url: that.current});
        },

        stop: function() {
            $(window).unbind(".kendo");
            this.unbind("change");
            this.unbind("ready");
            clearInterval(this._interval);
        },

        _normalizeUrl: function() {
            var that = this,
                pushStateUrl,
                atRoot = that.root == location.pathname,
                pushStateUrlNeedsTransform = that._pushStateRequested && !that._pushStateSupported() && !atRoot,
                hashUrlNeedsTransform = that._pushState && atRoot && location.hash;

            if (pushStateUrlNeedsTransform) {
                location.replace(that.root + '#' + that._stripRoot(location.pathname));
                return true;
            } else if (hashUrlNeedsTransform) {
                pushStateUrl = that._makePushStateUrl(location.hash.replace(hashStrip, ''));
                history.replaceState({}, document.title, pushStateUrl);
                return false;
            }
            return false;
        },

        _listenToLocationChange: function() {
            var that = this, _checkUrlProxy = $.proxy(that._checkUrl, that);

            if (this._pushState) {
                $(window).bind("popstate.kendo", _checkUrlProxy);
            } else if (hashChangeSupported) {
                $(window).bind("hashchange.kendo", _checkUrlProxy);
            } else {
                that._interval = setInterval(_checkUrlProxy, _checkUrlInterval);
            }
        },

        _pushStateSupported: function() {
            return window.history && window.history.pushState;
        },

        _checkUrl: function(e) {
            var that = this, current = that._currentLocation();

            if (current != that.current) {
                that.navigate(current);
            }
        },

        _stripRoot: function(url) {
            var that = this;

            if (url.indexOf(that.root) === 0) {
                return ('/' + url.substr(that.root.length)).replace(/\/\//g, '/');
            } else {
                return url;
            }
        },


        _makePushStateUrl: function(address) {
            var that = this;

            if (address.indexOf(that.root) !== 0) {
                address = (that.root + address).replace(/\/\//g, '/');
            }

            return location.protocol + '//' + location.host + address;
        },

        _currentLocation: function() {
            var that = this, current;

            if (that._pushState) {
                current = location.pathname;

                if (location.search) {
                    current += location.search;
                }

                return that._stripRoot(current);
            } else {
                return location.hash.replace(hashStrip, '');
            }
        },

        change: function(callback) {
            this.bind('change', callback);
        },

        navigate: function(to, silent) {
            var that = this;

            if (to === '#:back') {
                history.back();
                return;
            }

            to = to.replace(hashStrip, '');

            if (that.current === to || that.current === decodeURIComponent(to)) {
                return;
            }

            if (that._pushState) {
                history.pushState({}, document.title, that._makePushStateUrl(to));
                that.current = to;
            } else {
                location.hash = that.current = to;
            }

            if (!silent) {
                that.trigger("change", {url: that.current});
            }
        }
    });

    kendo.history = new History();
})(window.kendo.jQuery);
(function ($, undefined) {
    var kendo = window.kendo,
        support = kendo.support,
        pointers = support.pointers,
        document = window.document,
        SURFACE = $(document.documentElement),
        Class = kendo.Class,
        Observable = kendo.Observable,
        now = $.now,
        extend = $.extend,
        OS = support.mobileOS,
        invalidZeroEvents = OS && OS.android,

        // UserEvents events
        PRESS = "press",
        START = "start",
        MOVE = "move",
        END = "end",
        CANCEL = "cancel",
        TAP = "tap",
        GESTURESTART = "gesturestart",
        GESTURECHANGE = "gesturechange",
        GESTUREEND = "gestureend",
        GESTURETAP = "gesturetap";

    function preventTrigger(e) {
        e.preventDefault();

        var target = $(e.currentTarget),   // Determine the correct parent to receive the event and bubble.
            parent = target.closest(".k-widget").parent();

        if (!parent[0]) {
            parent = target.parent();
        }

        parent.trigger($.Event(e.type, { target: target }));
    }

    function touchDelta(touch1, touch2) {
        var x1 = touch1.x.location,
            y1 = touch1.y.location,
            x2 = touch2.x.location,
            y2 = touch2.y.location,
            dx = x1 - x2,
            dy = y1 - y2;

        return {
            center: {
               x: (x1 + x2) / 2,
               y: (y1 + y2) / 2
            },

            distance: Math.sqrt(dx*dx + dy*dy)
        };
    }

    function getTouches(e) {
        var touches = [],
            originalEvent = e.originalEvent,
            idx = 0, length,
            changedTouches,
            touch;

        if (e.api) {
            touches.push({
                id: 2,  // hardcoded ID for API call;
                event: e,
                target: e.target,
                location: e
            });
        }
        else if (e.type.match(/touch/)) {
            changedTouches = originalEvent ? originalEvent.changedTouches : [];
            for (length = changedTouches.length; idx < length; idx ++) {
                touch = changedTouches[idx];
                touches.push({
                    location: touch,
                    event: e,
                    target: touch.target,
                    id: touch.identifier
                });
            }
        }
        else if (support.pointers) {
            touches.push({
                location: originalEvent,
                event: e,
                target: e.target,
                id: originalEvent.pointerId

            });
        } else {
            touches.push({
                id: 1, // hardcoded ID for mouse event;
                event: e,
                target: e.target,
                location: e
            });
        }

        return touches;
    }

    var TouchAxis = Class.extend({
        init: function(axis, location) {
            var that = this;

            that.axis = axis;

            that._updateLocationData(location);

            that.startLocation = that.location;
            that.velocity = that.delta = 0;
            that.timeStamp = now();
        },

        move: function(location) {
            var that = this,
                offset = location["page" + that.axis],
                timeStamp = now(),
                timeDelta = (timeStamp - that.timeStamp) || 1; // Firing manually events in tests can make this 0;

            if (!offset && invalidZeroEvents) {
                return;
            }

            that.delta = offset - that.location;

            that._updateLocationData(location);

            that.initialDelta = offset - that.startLocation;
            that.velocity = that.delta / timeDelta;
            that.timeStamp = timeStamp;
        },

        _updateLocationData: function(location) {
            var that = this, axis = that.axis;

            that.location = location["page" + axis];
            that.client = location["client" + axis];
            that.screen = location["screen" + axis];
        }
    });

    var Touch = Class.extend({
        init: function(userEvents, target, touchInfo) {
            var that = this;

            extend(that, {
                x: new TouchAxis("X", touchInfo.location),
                y: new TouchAxis("Y", touchInfo.location),
                userEvents: userEvents,
                target: target,
                currentTarget: touchInfo.currentTarget,
                id: touchInfo.id,
                _moved: false,
                _finished: false
            });

            that._trigger(PRESS, touchInfo);
        },

        move: function(touchInfo) {
            var that = this;

            if (that._finished) { return; }

            that.x.move(touchInfo.location);
            that.y.move(touchInfo.location);

            if (!that._moved) {
                if (that._withinIgnoreThreshold()) {
                    return;
                }

                if (!UserEvents.current || UserEvents.current === that.userEvents) {
                    that._start(touchInfo);
                } else {
                    return that.dispose();
                }
            }

            // Event handlers may cancel the drag in the START event handler, hence the double check for pressed.
            if (!that._finished) {
                that._trigger(MOVE, touchInfo);
            }
        },

        end: function(touchInfo) {
            var that = this;

            that.endTime = now();

            if (that._finished) { return; }

            if (that._moved) {
                that._trigger(END, touchInfo);
            } else {
                that._trigger(TAP, touchInfo);
            }

            that.dispose();
        },

        dispose: function() {
            var that = this,
                userEvents = that.userEvents,
                activeTouches = userEvents.touches;

            that._finished = true;

            activeTouches.splice($.inArray(that, activeTouches), 1);
        },

        skip: function() {
            this.dispose();
        },

        cancel: function() {
            this.dispose();
        },

        isMoved: function() {
            return this._moved;
        },

        _start: function(touchInfo) {
            this.startTime = now();
            this._moved = true;
            this._trigger(START, touchInfo);
        },

        _trigger: function(name, touchInfo) {
            var that = this,
                jQueryEvent = touchInfo.event,
                data = {
                    touch: that,
                    x: that.x,
                    y: that.y,
                    target: that.target,
                    event: jQueryEvent
                };

            if(that.userEvents.notify(name, data)) {
                jQueryEvent.preventDefault();
            }
        },

        _withinIgnoreThreshold: function() {
            var xDelta = this.x.initialDelta,
                yDelta = this.y.initialDelta;

            return Math.sqrt(xDelta * xDelta + yDelta * yDelta) <= this.userEvents.threshold;
        }
    });

    var UserEvents = Observable.extend({
        init: function(element, options) {
            var that = this,
                filter;

            options = options || {};
            filter = that.filter = options.filter;
            that.threshold = options.threshold || 0;
            that.touches = [];
            that._maxTouches = options.multiTouch ? 2 : 1;

            element = $(element).handler(that);
            Observable.fn.init.call(that);

            extend(that, {
                element: element,
                surface: options.global ? SURFACE : options.surface || element,
                stopPropagation: options.stopPropagation,
                pressed: false
            });

            that.surface.handler(that)
                .on("move", "_move")
                .on("up cancel", "_end");

            element.on("down", filter, "_start");

            if (pointers) {
                element.css("-ms-touch-action", "pinch-zoom double-tap-zoom");
            }

            if (options.preventDragEvent) {
                element.on("dragstart", kendo.preventDefault);
            }

            if (!options.allowSelection) {
                element.on("mousedown selectstart", filter, preventTrigger);
            }

            if (support.eventCapture) {
                var downEvents = kendo.eventMap.up.split(" "),
                    idx = 0,
                    length = downEvents.length,
                    surfaceElement = that.surface[0],
                    preventIfMoving = function(e) {
                        if (that._isMoved()) {
                            e.preventDefault();
                        }
                    };

                for(; idx < length; idx ++) {
                    surfaceElement.addEventListener(downEvents[idx], preventIfMoving, true);
                }
            }

            that.bind([
            PRESS,
            TAP,
            START,
            MOVE,
            END,
            CANCEL,
            GESTURESTART,
            GESTURECHANGE,
            GESTUREEND,
            GESTURETAP], options);
        },

        destroy: function() {
            this.element.kendoDestroy();
            this.surface.kendoDestroy();
            this._disposeAll();
        },

        capture: function() {
            UserEvents.current = this;
        },

        cancel: function() {
            this._disposeAll();
            this.trigger(CANCEL);
        },

        notify: function(eventName, data) {
            var that = this,
                touches = that.touches;

            if (this._isMultiTouch()) {
                switch(eventName) {
                    case MOVE:
                        eventName = GESTURECHANGE;
                        break;
                    case END:
                        eventName = GESTUREEND;
                        break;
                    case TAP:
                        eventName = GESTURETAP;
                        break;
                }

                $.extend(data, {touches: touches}, touchDelta(touches[0], touches[1]));
            }

            return this.trigger(eventName, data);
        },

        // API
        press: function(x, y, target) {
            this._apiCall("_start", x, y, target);
        },

        move: function(x, y) {
            this._apiCall("_move", x, y);
        },

        end: function(x, y) {
            this._apiCall("_end", x, y);
        },

        _isMultiTouch: function() {
            return this.touches.length > 1;
        },

        _maxTouchesReached: function() {
            return this.touches.length >= this._maxTouches;
        },

        _disposeAll: function() {
            $.each(this.touches, function() {
                this.dispose();
            });
        },

        _isMoved: function() {
            return $.grep(this.touches, function(touch) {
                return touch.isMoved();
            }).length;
        },

        _isPressed: function() {
            return this.touches.length;
        },

        _start: function(e) {
            var that = this,
                idx = 0,
                filter = that.filter,
                target,
                touches = getTouches(e),
                length = touches.length,
                touch;

            if (that._maxTouchesReached()) {
                return;
            }

            UserEvents.current = null;

            that.currentTarget = e.currentTarget;

            if (that.stopPropagation) {
                e.stopPropagation();
            }

            for (; idx < length; idx ++) {
                if (that._maxTouchesReached()) {
                    break;
                }

                touch = touches[idx];

                target = $(touch.target);

                if (filter) {
                    target = target.is(filter) ? target : target.closest(filter);
                } else {
                    target = that.element;
                }

                if (!target.length) {
                    continue;
                }

                that.touches.push(new Touch(that, target, touch));

                if (that._isMultiTouch()) {
                    that.notify("gesturestart", {});
                }
            }
        },

        _move: function(e) {
            this._eachTouch("move", e);
        },

        _end: function(e) {
            this._eachTouch("end", e);
        },

        _eachTouch: function(methodName, e) {
            var that = this,
                dict = {},
                touches = getTouches(e),
                activeTouches = that.touches,
                idx,
                touch,
                touchInfo,
                matchingTouch;

            for (idx = 0; idx < activeTouches.length; idx ++) {
                touch = activeTouches[idx];
                dict[touch.id] = touch;
            }

            for (idx = 0; idx < touches.length; idx ++) {
                touchInfo = touches[idx];
                matchingTouch = dict[touchInfo.id];

                if (matchingTouch) {
                    matchingTouch[methodName](touchInfo);
                }
            }
        },

        _apiCall: function(type, x, y, target) {
            this[type]({
                api: true,
                pageX: x,
                pageY: y,
                target: target || this.element,
                stopPropagation: $.noop,
                preventDefault: $.noop
            });
        }
    });

    kendo.getTouches = getTouches;
    kendo.touchDelta = touchDelta;
    kendo.UserEvents = UserEvents;
 })(window.kendo.jQuery);
(function ($, undefined) {
    var kendo = window.kendo,
        support = kendo.support,
        document = window.document,
        Class = kendo.Class,
        Widget = kendo.ui.Widget,
        Observable = kendo.Observable,
        UserEvents = kendo.UserEvents,
        proxy = $.proxy,
        extend = $.extend,
        getOffset = kendo.getOffset,
        draggables = {},
        dropTargets = {},
        dropAreas = {},
        lastDropTarget,
        OS = support.mobileOS,
        invalidZeroEvents = OS && OS.android,
        mobileChrome = (invalidZeroEvents && OS.browser == "chrome"),
        KEYUP = "keyup",
        CHANGE = "change",

        // Draggable events
        DRAGSTART = "dragstart",
        DRAG = "drag",
        DRAGEND = "dragend",
        DRAGCANCEL = "dragcancel",

        // DropTarget events
        DRAGENTER = "dragenter",
        DRAGLEAVE = "dragleave",
        DROP = "drop";

    function contains(parent, child) {
        try {
            return $.contains(parent, child) || parent == child;
        } catch (e) {
            return false;
        }
    }

    function elementUnderCursor(e) {
        if (mobileChrome) {
            return document.elementFromPoint(e.x.screen, e.y.screen);
        } else {
            return document.elementFromPoint(e.x.client, e.y.client);
        }
    }

    function numericCssPropery(element, property) {
        return parseInt(element.css(property), 10) || 0;
    }

    function within(value, range) {
        return Math.min(Math.max(value, range.min), range.max);
    }

    function containerBoundaries(container, element) {
        var offset = container.offset(),
            minX = offset.left + numericCssPropery(container, "borderLeftWidth") + numericCssPropery(container, "paddingLeft"),
            minY = offset.top + numericCssPropery(container, "borderTopWidth") + numericCssPropery(container, "paddingTop"),
            maxX = minX + container.width() - element.outerWidth(true),
            maxY = minY + container.height() - element.outerHeight(true);

        return {
            x: { min: minX, max: maxX },
            y: { min: minY, max: maxY }
        };
    }

    function checkTarget(target, targets, areas) {
        var theTarget, theFilter, i = 0,
            targetLen = targets && targets.length,
            areaLen = areas && areas.length;

        while (target && target.parentNode) {
            for (i = 0; i < targetLen; i ++) {
                theTarget = targets[i];
                if (theTarget.element[0] === target) {
                    return { target: theTarget, targetElement: target };
                }
            }

            for (i = 0; i < areaLen; i ++) {
                theFilter = areas[i];
                if (support.matchesSelector.call(target, theFilter.options.filter)) {
                    return { target: theFilter, targetElement: target };
                }
            }

            target = target.parentNode;
        }

        return undefined;
    }

    var TapCapture = Observable.extend({
        init: function(element, options) {
            var that = this,
                domElement = element[0];

            that.capture = false;
            $.each(kendo.eventMap.down.split(" "), function() {
                domElement.addEventListener(this, proxy(that._press, that), true);
            });
            $.each(kendo.eventMap.up.split(" "), function() {
                domElement.addEventListener(this, proxy(that._release, that), true);
            });

            Observable.fn.init.call(that);

            that.bind(["press", "release"], options || {});
        },

        captureNext: function() {
            this.capture = true;
        },

        cancelCapture: function() {
            this.capture = false;
        },

        _press: function(e) {
            var that = this;
            that.trigger("press");
            if (that.capture) {
                e.preventDefault();
            }
        },

        _release: function(e) {
            var that = this;
            that.trigger("release");

            if (that.capture) {
                e.preventDefault();
                that.cancelCapture();
            }
        }
    });

    var PaneDimension = Observable.extend({
        init: function(options) {
            var that = this;
            Observable.fn.init.call(that);

            that.forcedEnabled = false;

            $.extend(that, options);

            that.scale = 1;
            that.max = 0;

            if (that.horizontal) {
                that.measure = "width";
                that.scrollSize = "scrollWidth";
                that.axis = "x";
            } else {
                that.measure = "height";
                that.scrollSize = "scrollHeight";
                that.axis = "y";
            }
        },

        outOfBounds: function(offset) {
            return  offset > this.max || offset < this.min;
        },

        forceEnabled: function() {
            this.forcedEnabled = true;
        },

        getSize: function() {
            return this.container[this.measure]();
        },

        getTotal: function() {
            return this.element[0][this.scrollSize];
        },

        rescale: function(scale) {
            this.scale = scale;
        },

        update: function(silent) {
            var that = this,
                total = that.getTotal(),
                scaledTotal = total * that.scale,
                size = that.getSize();

            that.size = size;
            that.total = scaledTotal;
            that.min = Math.min(that.max, that.size - scaledTotal);
            that.minScale = that.size / total;

            that.enabled = that.forcedEnabled || (scaledTotal > size);

            if (!silent) {
                that.trigger(CHANGE, that);
            }
        }
    });

    var PaneDimensions = Observable.extend({
        init: function(options) {
            var that = this,
                refresh = proxy(that.refresh, that);

            Observable.fn.init.call(that);

            that.x = new PaneDimension(extend({horizontal: true}, options));
            that.y = new PaneDimension(extend({horizontal: false}, options));
            that.forcedMinScale = options.minScale;

            that.bind(CHANGE, options);

            kendo.onResize(refresh);
        },

        rescale: function(newScale) {
            this.x.rescale(newScale);
            this.y.rescale(newScale);
            this.refresh();
        },

        refresh: function() {
            var that = this;
            that.x.update();
            that.y.update();
            that.enabled = that.x.enabled || that.y.enabled;
            that.minScale = that.forcedMinScale || Math.max(that.x.minScale, that.y.minScale);
            that.trigger(CHANGE);
        }
    });

    var PaneAxis = Observable.extend({
        init: function(options) {
            var that = this;
            extend(that, options);
            Observable.fn.init.call(that);
        },

        dragMove: function(delta) {
            var that = this,
                dimension = that.dimension,
                axis = that.axis,
                movable = that.movable,
                position = movable[axis] + delta;

            if (!dimension.enabled) {
                return;
            }

            if ((position < dimension.min && delta < 0) || (position > dimension.max && delta > 0)) {
                delta *= that.resistance;
            }

            movable.translateAxis(axis, delta);
            that.trigger(CHANGE, that);
        }
    });

    var Pane = Class.extend({

        init: function(options) {
            var that = this,
                x,
                y,
                resistance,
                movable;

            extend(that, {elastic: true}, options);

            resistance = that.elastic ? 0.5 : 0;
            movable = that.movable;

            that.x = x = new PaneAxis({
                axis: "x",
                dimension: that.dimensions.x,
                resistance: resistance,
                movable: movable
            });

            that.y = y = new PaneAxis({
                axis: "y",
                dimension: that.dimensions.y,
                resistance: resistance,
                movable: movable
            });

            that.userEvents.bind(["move", "end", "gesturestart", "gesturechange"], {
                gesturestart: function(e) {
                    that.gesture = e;
                },

                gesturechange: function(e) {
                    var previousGesture = that.gesture,
                        previousCenter = previousGesture.center,

                        center = e.center,

                        scaleDelta = e.distance / previousGesture.distance,

                        minScale = that.dimensions.minScale,
                        coordinates;

                    if (movable.scale <= minScale && scaleDelta < 1) {
                        // Resist shrinking. Instead of shrinking from 1 to 0.5, it will shrink to 0.5 + (1 /* minScale */ - 0.5) * 0.8 = 0.9;
                        scaleDelta += (1 - scaleDelta) * 0.8;
                    }

                    coordinates = {
                        x: (movable.x - previousCenter.x) * scaleDelta + center.x - movable.x,
                        y: (movable.y - previousCenter.y) * scaleDelta + center.y - movable.y
                    };

                    movable.scaleWith(scaleDelta);

                    x.dragMove(coordinates.x);
                    y.dragMove(coordinates.y);

                    that.dimensions.rescale(movable.scale);
                    that.gesture = e;
                },

                move: function(e) {
                    if (x.dimension.enabled || y.dimension.enabled) {
                        x.dragMove(e.x.delta);
                        y.dragMove(e.y.delta);
                        e.preventDefault();
                    } else {
                        e.touch.skip();
                    }
                },

                end: function(e) {
                    e.preventDefault();
                }
            });
        }
    });

    var TRANSFORM_STYLE = support.transitions.prefix + "Transform",
        round = Math.round,
        translate;

    if (support.hasHW3D) {
        translate = function(x, y, scale) {
            return "translate3d(" + round(x) + "px," + round(y) +"px,0) scale(" + scale + ")";
        };
    } else {
        translate = function(x, y, scale) {
            return "translate(" + round(x) + "px," + round(y) +"px) scale(" + scale + ")";
        };
    }

    var Movable = Observable.extend({
        init: function(element) {
            var that = this;

            Observable.fn.init.call(that);

            that.element = $(element);
            that.element[0].style.webkitTransformOrigin = "left top";
            that.x = 0;
            that.y = 0;
            that.scale = 1;
            that._saveCoordinates(translate(that.x, that.y, that.scale));
        },

        translateAxis: function(axis, by) {
            this[axis] += by;
            this.refresh();
        },

        scaleTo: function(scale) {
            this.scale = scale;
            this.refresh();
        },

        scaleWith: function(scaleDelta) {
            this.scale *= scaleDelta;
            this.refresh();
        },

        translate: function(coordinates) {
            this.x += coordinates.x;
            this.y += coordinates.y;
            this.refresh();
        },

        moveAxis: function(axis, value) {
            this[axis] = value;
            this.refresh();
        },

        moveTo: function(coordinates) {
            extend(this, coordinates);
            this.refresh();
        },

        refresh: function() {
            var that = this,
                newCoordinates = translate(that.x, that.y, that.scale);

            if (newCoordinates != that.coordinates) {
                that.element[0].style[TRANSFORM_STYLE] = newCoordinates;
                that._saveCoordinates(newCoordinates);
                that.trigger(CHANGE);
            }
        },

        _saveCoordinates: function(coordinates) {
            this.coordinates = coordinates;
        }
    });

    var DropTarget = Widget.extend({
        init: function(element, options) {
            var that = this;

            Widget.fn.init.call(that, element, options);

            var group = that.options.group;

            if (!(group in dropTargets)) {
                dropTargets[group] = [ that ];
            } else {
                dropTargets[group].push( that );
            }
        },

        events: [
            DRAGENTER,
            DRAGLEAVE,
            DROP
        ],

        options: {
            name: "DropTarget",
            group: "default"
        },

        destroy: function() {
            var groupName = this.options.group,
                group = dropTargets[groupName],
                i;

            if (group.length > 1) {
                Widget.fn.destroy.call(this);

                for (i = 0; i < group.length; i++) {
                    if (group[i] == this) {
                        group.splice(i, 1);
                        break;
                    }
                }
            } else {
                DropTarget.destroyGroup(groupName);
            }
        },

        _trigger: function(eventName, e) {
            var that = this,
                draggable = draggables[that.options.group];

            if (draggable) {
                return that.trigger(eventName, extend({}, e.event, {
                           draggable: draggable,
                           dropTarget: e.dropTarget
                       }));
            }
        },

        _over: function(e) {
            this._trigger(DRAGENTER, e);
        },

        _out: function(e) {
            this._trigger(DRAGLEAVE, e);
        },

        _drop: function(e) {
            var that = this,
                draggable = draggables[that.options.group];

            if (draggable) {
                draggable.dropped = !that._trigger(DROP, e);
            }
        }
    });

    DropTarget.destroyGroup = function(groupName) {
        var group = dropTargets[groupName],
            i;

        if (group) {
            for (i = 0; i < group.length; i++) {
                Widget.fn.destroy.call(group[i]);
            }

            group.length = 0;
            delete dropTargets[groupName];
        }
    };

    DropTarget._cache = dropTargets;

    var DropTargetArea = DropTarget.extend({
        init: function(element, options) {
            var that = this;

            Widget.fn.init.call(that, element, options);

            var group = that.options.group;

            if (!(group in dropAreas)) {
                dropAreas[group] = [ that ];
            } else {
                dropAreas[group].push( that );
            }
        },

        options: {
            name: "DropTargetArea",
            group: "default",
            filter: null
        }
    });

    var Draggable = Widget.extend({
        init: function (element, options) {
            var that = this;

            Widget.fn.init.call(that, element, options);

            that.userEvents = new UserEvents(that.element, {
                global: true,
                stopPropagation: true,
                filter: that.options.filter,
                threshold: that.options.distance,
                start: proxy(that._start, that),
                move: proxy(that._drag, that),
                end: proxy(that._end, that),
                cancel: proxy(that._cancel, that)
            });

            that._afterEndHandler = proxy(that._afterEnd, that);
            that.captureEscape = function(e) {
                if (e.keyCode === kendo.keys.ESC) {
                    that._trigger(DRAGCANCEL, {event: e});
                    that.userEvents.cancel();
                }
            };
        },

        events: [
            DRAGSTART,
            DRAG,
            DRAGEND,
            DRAGCANCEL
        ],

        options: {
            name: "Draggable",
            distance: 5,
            group: "default",
            cursorOffset: null,
            axis: null,
            container: null,
            dropped: false
        },

        _updateHint: function(e) {
            var that = this,
                coordinates,
                options = that.options,
                boundaries = that.boundaries,
                axis = options.axis,
                cursorOffset = that.options.cursorOffset;

            if (cursorOffset) {
               coordinates = { left: e.x.location + cursorOffset.left, top: e.y.location + cursorOffset.top };
            } else {
               that.hintOffset.left += e.x.delta;
               that.hintOffset.top += e.y.delta;
               coordinates = $.extend({}, that.hintOffset);
            }

            if (boundaries) {
                coordinates.top = within(coordinates.top, boundaries.y);
                coordinates.left = within(coordinates.left, boundaries.x);
            }

            if (axis === "x") {
                delete coordinates.top;
            } else if (axis === "y") {
                delete coordinates.left;
            }

            that.hint.css(coordinates);
        },

        _start: function(e) {
            var that = this,
                options = that.options,
                container = options.container,
                hint = options.hint;

            that.currentTarget = e.target;
            that.currentTargetOffset = getOffset(that.currentTarget);

            if (hint) {
                that.hint = $.isFunction(hint) ? $(hint(that.currentTarget)) : hint;

                var offset = getOffset(that.currentTarget);
                that.hintOffset = offset;

                that.hint.css( {
                    position: "absolute",
                    zIndex: 20000, // the Window's z-index is 10000 and can be raised because of z-stacking
                    left: offset.left,
                    top: offset.top
                })
                .appendTo(document.body);
            }

            draggables[options.group] = that;

            that.dropped = false;

            if (container) {
                that.boundaries = containerBoundaries(container, that.hint);
            }

            if (that._trigger(DRAGSTART, e)) {
                that.userEvents.cancel();
                that._afterEnd();
            }

            $(document).on(KEYUP, that.captureEscape);
        },

        _drag: function(e) {
            var that = this;

            e.preventDefault();

            that._withDropTarget(e, function(target, targetElement) {
                if (!target) {
                    if (lastDropTarget) {
                        lastDropTarget._trigger(DRAGLEAVE, extend(e, { dropTarget: $(lastDropTarget.targetElement) }));
                        lastDropTarget = null;
                    }
                    return;
                }

                if (lastDropTarget) {
                    if (targetElement === lastDropTarget.targetElement) {
                        return;
                    }

                    lastDropTarget._trigger(DRAGLEAVE, extend(e, { dropTarget: $(lastDropTarget.targetElement) }));
                }

                target._trigger(DRAGENTER, extend(e, { dropTarget: $(targetElement) }));
                lastDropTarget = extend(target, { targetElement: targetElement });
            });

            that._trigger(DRAG, e);

            if (that.hint) {
                that._updateHint(e);
            }
        },

        _end: function(e) {
            var that = this;

            that._withDropTarget(e, function(target, targetElement) {
                if (target) {
                    target._drop(extend({}, e, { dropTarget: $(targetElement) }));
                    lastDropTarget = null;
                }
            });

            that._trigger(DRAGEND, e);
            that._cancel(e.event);
        },

        _cancel: function(e) {
            var that = this;

            if (that.hint && !that.dropped) {
                that.hint.animate(that.currentTargetOffset, "fast", that._afterEndHandler);
            } else {
                that._afterEnd();
            }
        },

        _trigger: function(eventName, e) {
            var that = this;

            return that.trigger(
                eventName, extend(
                {},
                e.event,
                {
                    x: e.x,
                    y: e.y,
                    currentTarget: that.currentTarget,
                    dropTarget: e.dropTarget
                }
            ));
        },

        _withDropTarget: function(e, callback) {
            var that = this,
                target, result,
                options = that.options,
                targets = dropTargets[options.group],
                areas = dropAreas[options.group];

            if (targets && targets.length || areas && areas.length) {

                target = elementUnderCursor(e);

                if (that.hint && contains(that.hint[0], target)) {
                    that.hint.hide();
                    target = elementUnderCursor(e);
                    // IE8 does not return the element in iframe from first attempt
                    if (!target) {
                        target = elementUnderCursor(e);
                    }
                    that.hint.show();
                }

                result = checkTarget(target, targets, areas);

                if (result) {
                    callback(result.target, result.targetElement);
                } else {
                    callback();
                }
            }
        },

        destroy: function() {
            var that = this;

            Widget.fn.destroy.call(that);

            that._afterEnd();

            that.userEvents.destroy();
        },

        _afterEnd: function() {
            var that = this;

            if (that.hint) {
                that.hint.remove();
            }

            delete draggables[that.options.group];

            that.trigger("destroy");
            $(document).off(KEYUP, that.captureEscape);
        }
    });

    kendo.ui.plugin(DropTarget);
    kendo.ui.plugin(DropTargetArea);
    kendo.ui.plugin(Draggable);
    kendo.TapCapture = TapCapture;
    kendo.containerBoundaries = containerBoundaries;

    extend(kendo.ui, {
        Pane: Pane,
        PaneDimensions: PaneDimensions,
        Movable: Movable
    });

 })(window.kendo.jQuery);
(function($, undefined) {
    var kendo = window.kendo,
        ui = kendo.ui,
        Widget = ui.Widget,
        support = kendo.support,
        getOffset = kendo.getOffset,
        browser = kendo.support.browser,
        appendingToBodyTriggersResize = browser.msie && browser.version < 9,
        OPEN = "open",
        CLOSE = "close",
        DEACTIVATE = "deactivate",
        ACTIVATE = "activate",
        CENTER = "center",
        LEFT = "left",
        RIGHT = "right",
        TOP = "top",
        BOTTOM = "bottom",
        ABSOLUTE = "absolute",
        HIDDEN = "hidden",
        BODY = "body",
        LOCATION = "location",
        POSITION = "position",
        VISIBLE = "visible",
        FITTED = "fitted",
        EFFECTS = "effects",
        ACTIVE = "k-state-active",
        ACTIVEBORDER = "k-state-border",
        ACTIVECHILDREN = ".k-picker-wrap, .k-dropdown-wrap, .k-link",
        MOUSEDOWN = "down",
        DOCUMENT= $(document),
        WINDOW = $(window),
        DOCUMENT_ELEMENT = $(document.documentElement),
        RESIZE_SCROLL = "resize scroll",
        cssPrefix = support.transitions.css,
        TRANSFORM = cssPrefix + "transform",
        extend = $.extend,
        NS = ".kendoPopup",
        styles = ["font-family",
                   "font-size",
                   "font-stretch",
                   "font-style",
                   "font-weight",
                   "line-height"];

    function contains(container, target) {
        return container === target || $.contains(container, target);
    }

    var Popup = Widget.extend({
        init: function(element, options) {
            var that = this, parentPopup;

            options = options || {};

            if (options.isRtl) {
                options.origin = options.origin || BOTTOM + " " + RIGHT;
                options.position = options.position || TOP + " " + RIGHT;
            }

            Widget.fn.init.call(that, element, options);

            element = that.element;
            options = that.options;

            that.collisions = options.collision ? options.collision.split(" ") : [];

            if (that.collisions.length === 1) {
                that.collisions.push(that.collisions[0]);
            }

            parentPopup = $(that.options.anchor).closest(".k-popup,.k-group"); // When popup is in another popup, make it relative.
            options.appendTo = $($(options.appendTo)[0] || parentPopup[0] || BODY);

            that.element.hide()
                .addClass("k-popup k-group k-reset")
                .toggleClass("k-rtl", !!options.isRtl)
                .css({ position : ABSOLUTE })
                .appendTo(options.appendTo)
                .on("mouseenter" + NS, function() {
                    that._hovered = true;
                })
                .on("mouseleave" + NS, function() {
                    that._hovered = false;
                });

            that.wrapper = $();

            if (options.animation === false) {
                options.animation = { open: { effects: {} }, close: { hide: true, effects: {} } };
            }

            extend(options.animation.open, {
                complete: function() {
                    that.wrapper.css({ overflow: VISIBLE }); // Forcing refresh causes flickering in mobile.
                    that.trigger(ACTIVATE);
                }
            });

            extend(options.animation.close, {
                complete: function() {
                    that.wrapper.hide();

                    var location = that.wrapper.data(LOCATION),
                        anchor = $(options.anchor),
                        direction, dirClass;

                    if (location) {
                        that.wrapper.css(location);
                    }

                    if (options.anchor != BODY) {
                        direction = anchor.hasClass(ACTIVEBORDER + "-down") ? "down" : "up";
                        dirClass = ACTIVEBORDER + "-" + direction;

                        anchor
                            .removeClass(dirClass)
                            .children(ACTIVECHILDREN)
                            .removeClass(ACTIVE)
                            .removeClass(dirClass);

                        element.removeClass(ACTIVEBORDER + "-" + kendo.directions[direction].reverse);
                    }

                    that._closing = false;
                    that.trigger(DEACTIVATE);
                }
            });

            that._mousedownProxy = function(e) {
                that._mousedown(e);
            };

            that._currentWidth = DOCUMENT.width();

            that._resizeProxy = function(e) {
                that._resize(e);
            };

            if (options.toggleTarget) {
                $(options.toggleTarget).on(options.toggleEvent + NS, $.proxy(that.toggle, that));
            }
        },

        events: [
            OPEN,
            ACTIVATE,
            CLOSE,
            DEACTIVATE
        ],

        options: {
            name: "Popup",
            toggleEvent: "click",
            origin: BOTTOM + " " + LEFT,
            position: TOP + " " + LEFT,
            anchor: BODY,
            collision: "flip fit",
            viewport: window,
            animation: {
                open: {
                    effects: "slideIn:down",
                    transition: true,
                    duration: 200
                },
                close: { // if close animation effects are defined, they will be used instead of open.reverse
                    duration: 100,
                    hide: true
                }
            }
        },

        destroy: function() {
            var that = this,
                options = that.options,
                element = that.element.off(NS),
                parent;

            Widget.fn.destroy.call(that);

            if (options.toggleTarget) {
                $(options.toggleTarget).off(NS);
            }

            DOCUMENT_ELEMENT.unbind(MOUSEDOWN, that._mousedownProxy);
            WINDOW.unbind(RESIZE_SCROLL, that._resizeProxy);

            if (options.appendTo[0] === document.body) {
                parent = element.parent(".k-animation-container");

                if (parent[0]) {
                    parent.remove();
                } else {
                    element.remove();
                }
            }

            kendo.destroy(that.element.children());
        },

        open: function(x, y) {
            var that = this,
                fixed = { isFixed: !isNaN(parseInt(y,10)), x: x, y: y },
                element = that.element,
                options = that.options,
                direction = "down",
                animation, wrapper,
                anchor = $(options.anchor);

            if (!that.visible()) {
                element.css(kendo.getComputedStyles(anchor[0], styles));

                if (element.data("animating") || that.trigger(OPEN)) {
                    return;
                }

                DOCUMENT_ELEMENT.unbind(MOUSEDOWN, that._mousedownProxy)
                                .bind(MOUSEDOWN, that._mousedownProxy);

                // this binding hangs iOS in editor
                if (!support.mobileOS.ios) {
                    WINDOW.unbind(RESIZE_SCROLL, that._resizeProxy)
                          .bind(RESIZE_SCROLL, that._resizeProxy);
                }

                that.wrapper = wrapper = kendo.wrap(element)
                                        .css({
                                            overflow: HIDDEN,
                                            display: "block",
                                            position: ABSOLUTE
                                        });

                if (support.mobileOS.android) {
                    wrapper.add(anchor).css(TRANSFORM, "translatez(0)"); // Android is VERY slow otherwise. Should be tested in other droids as well since it may cause blur.
                }

                wrapper.css(POSITION);

                if ($(options.appendTo)[0] == document.body) {
                    wrapper.css(TOP, "-10000px");
                }

                animation = extend(true, {}, options.animation.open);
                that.flipped = that._position(fixed);
                animation.effects = kendo.parseEffects(animation.effects, that.flipped);

                direction = animation.effects.slideIn ? animation.effects.slideIn.direction : direction;

                if (options.anchor != BODY) {
                    var dirClass = ACTIVEBORDER + "-" + direction;

                    element.addClass(ACTIVEBORDER + "-" + kendo.directions[direction].reverse);

                    anchor
                        .addClass(dirClass)
                        .children(ACTIVECHILDREN)
                        .addClass(ACTIVE)
                        .addClass(dirClass);
                }

                element.data(EFFECTS, animation.effects)
                       .kendoStop(true)
                       .kendoAnimate(animation);
            }
        },

        toggle: function() {
            var that = this;

            that[that.visible() ? CLOSE : OPEN]();
        },

        visible: function() {
            return this.element.is(":" + VISIBLE);
        },

        close: function() {
            var that = this,
                options = that.options,
                animation, openEffects, closeEffects;

            if (that.visible()) {
                if (that._closing || that.trigger(CLOSE)) {
                    return;
                }

                // Close all inclusive popups.
                that.element.find(".k-popup").each(function () {
                    var that = $(this),
                        popup = that.data("kendoPopup");

                    if (popup) {
                        popup.close();
                    }
                });

                DOCUMENT_ELEMENT.unbind(MOUSEDOWN, that._mousedownProxy);
                WINDOW.unbind(RESIZE_SCROLL, that._resizeProxy);

                animation = extend(true, {}, options.animation.close);
                openEffects = that.element.data(EFFECTS);
                closeEffects = animation.effects;

                that.wrapper = kendo.wrap(that.element).css({ overflow: HIDDEN });

                if (!closeEffects && !kendo.size(closeEffects) && openEffects && kendo.size(openEffects)) {
                    animation.effects = openEffects;
                    animation.reverse = true;
                }

                that._closing = true;

                that.element.kendoStop(true).kendoAnimate(animation);
            }
        },

        _resize: function(e) {
            var that = this;

            if (appendingToBodyTriggersResize) {
                var width = DOCUMENT.width();
                if (width == that._currentWidth) {
                    return;
                }
                that._currentWidth = width;
            }

            if (!that._hovered) {
                that.close();
            }
        },

        _mousedown: function(e) {
            var that = this,
                container = that.element[0],
                options = that.options,
                anchor = $(options.anchor)[0],
                toggleTarget = options.toggleTarget,
                target = kendo.eventTarget(e),
                popup = $(target).closest(".k-popup")[0];

            if (popup && popup !== that.element[0] ){
                return;
            }

            if (!contains(container, target) && !contains(anchor, target) && !(toggleTarget && contains($(toggleTarget)[0], target))) {
                that.close();
            }
        },

        _fit: function(position, size, viewPortSize) {
            var output = 0;

            if (position + size > viewPortSize) {
                output = viewPortSize - (position + size);
            }

            if (position < 0) {
                output = -position;
            }

            return output;
        },

        _flip: function(offset, size, anchorSize, viewPortSize, origin, position, boxSize) {
            var output = 0;
                boxSize = boxSize || size;

            if (position !== origin && position !== CENTER && origin !== CENTER) {
                if (offset + boxSize > viewPortSize) {
                    output += -(anchorSize + size);
                }

                if (offset + output < 0) {
                    output += anchorSize + size;
                }
            }
            return output;
        },

        _position: function(fixed) {
            var that = this,
                element = that.element.css(POSITION, ""),
                wrapper = that.wrapper,
                options = that.options,
                viewport = $(options.viewport),
                viewportOffset = $(viewport).offset(),
                anchor = $(options.anchor),
                origins = options.origin.toLowerCase().split(" "),
                positions = options.position.toLowerCase().split(" "),
                collisions = that.collisions,
                zoomLevel = support.zoomLevel(),
                zIndex = 10002;

            var siblingContainer = anchor.parents().filter(wrapper.siblings());

            if (siblingContainer[0]) {
                var parentZIndex = Number($(siblingContainer).css("zIndex"));
                if (parentZIndex) {
                    zIndex = parentZIndex + 1;
                }
            }

            wrapper.css("zIndex", zIndex);

            if (fixed && fixed.isFixed) {
                wrapper.css({ left: fixed.x, top: fixed.y });
            } else {
                wrapper.css(that._align(origins, positions));
            }

            var pos = getOffset(wrapper, POSITION),
                offset = getOffset(wrapper),
                anchorParent = anchor.offsetParent().parent(".k-animation-container"); // If the parent is positioned, get the current positions

            if (anchorParent.length && anchorParent.data(FITTED)) {
                pos = getOffset(wrapper, POSITION);
                offset = getOffset(wrapper);
            }

            if (viewport[0] === window) {
                offset.top -= (window.pageYOffset || document.documentElement.scrollTop || 0);
                offset.left -= (window.pageXOffset || document.documentElement.scrollLeft || 0);
            }
            else {
                offset.top -= viewportOffset.top;
                offset.left -= viewportOffset.left;
            }

            if (!that.wrapper.data(LOCATION)) { // Needed to reset the popup location after every closure - fixes the resize bugs.
                wrapper.data(LOCATION, extend({}, pos));
            }

            var offsets = extend({}, offset),
                location = extend({}, pos);

            if (collisions[0] === "fit") {
                location.top += that._fit(offsets.top, wrapper.outerHeight(), viewport.height() / zoomLevel);
            }

            if (collisions[1] === "fit") {
                location.left += that._fit(offsets.left, wrapper.outerWidth(), viewport.width() / zoomLevel);
            }

            if (location.left != pos.left || location.top != pos.top) {
                wrapper.data(FITTED, true);
            } else {
                wrapper.removeData(FITTED);
            }

            var flipPos = extend({}, location);

            if (collisions[0] === "flip") {
                location.top += that._flip(offsets.top, element.outerHeight(), anchor.outerHeight(), viewport.height() / zoomLevel, origins[0], positions[0], wrapper.outerHeight());
            }

            if (collisions[1] === "flip") {
                location.left += that._flip(offsets.left, element.outerWidth(), anchor.outerWidth(), viewport.width() / zoomLevel, origins[1], positions[1], wrapper.outerWidth());
            }

            element.css(POSITION, ABSOLUTE);
            wrapper.css(location);

            return (location.left != flipPos.left || location.top != flipPos.top);
        },

        _align: function(origin, position) {
            var that = this,
                element = that.wrapper,
                anchor = $(that.options.anchor),
                verticalOrigin = origin[0],
                horizontalOrigin = origin[1],
                verticalPosition = position[0],
                horizontalPosition = position[1],
                anchorOffset = getOffset(anchor),
                appendTo = $(that.options.appendTo),
                appendToOffset,
                width = element.outerWidth(),
                height = element.outerHeight(),
                anchorWidth = anchor.outerWidth(),
                anchorHeight = anchor.outerHeight(),
                top = anchorOffset.top,
                left = anchorOffset.left,
                round = Math.round;

            if (appendTo[0] != document.body) {
                appendToOffset = getOffset(appendTo);
                top -= appendToOffset.top;
                left -= appendToOffset.left;
            }


            if (verticalOrigin === BOTTOM) {
                top += anchorHeight;
            }

            if (verticalOrigin === CENTER) {
                top += round(anchorHeight / 2);
            }

            if (verticalPosition === BOTTOM) {
                top -= height;
            }

            if (verticalPosition === CENTER) {
                top -= round(height / 2);
            }

            if (horizontalOrigin === RIGHT) {
                left += anchorWidth;
            }

            if (horizontalOrigin === CENTER) {
                left += round(anchorWidth / 2);
            }

            if (horizontalPosition === RIGHT) {
                left -= width;
            }

            if (horizontalPosition === CENTER) {
                left -= round(width / 2);
            }

            return {
                top: top,
                left: left
            };
        }
    });

    ui.plugin(Popup);
})(window.kendo.jQuery);
(function($, undefined) {
    var kendo = window.kendo,
        Widget = kendo.ui.Widget,
        proxy = $.proxy,
        abs = Math.abs,
        MAX_DOUBLE_TAP_DISTANCE = 8;

    var Swipe = kendo.Class.extend({
        init: function(element, callback, options) {
            options = $.extend({
                minXDelta: 30,
                maxYDelta: 20,
                maxDuration: 1000
            }, options);

            new kendo.UserEvents(element, {
                surface: options.surface,
                allowSelection: true,

                start: function(e) {
                    if (abs(e.x.velocity) * 2 >= abs(e.y.velocity)) {
                        e.sender.capture();
                    }
                },

                move: function(e) {
                    var touch = e.touch,
                    duration = e.event.timeStamp - touch.startTime,
                    direction = touch.x.initialDelta > 0 ? "right" : "left";

                    if (
                        abs(touch.x.initialDelta) >= options.minXDelta &&
                        abs(touch.y.initialDelta) < options.maxYDelta &&
                    duration < options.maxDuration)
                    {
                        callback({
                            direction: direction,
                            touch: touch,
                            target: touch.target
                        });

                        touch.cancel();
                    }
                }
            });
        }
    });

    var Touch = Widget.extend({
        init: function(element, options) {
            var that = this;

            Widget.fn.init.call(that, element, options);
            options = that.options;

            element = that.element;

            function eventProxy(name) {
                return function(e) {
                    that._triggerTouch(name, e);
                };
            }

            function gestureEventProxy(name) {
                return function(e) {
                    that.trigger(name, { touches: e.touches });
                };
            }

            that.events = new kendo.UserEvents(element, {
                surface: options.surface,
                multiTouch: options.multiTouch,
                allowSelection: true,
                press: proxy(that, "_touchstart"),
                tap: proxy(that, "_tap"),
                gesturestart: gestureEventProxy("gesturestart"),
                gesturechange: gestureEventProxy("gesturechange"),
                gestureend: gestureEventProxy("gestureend")
            });

            if (options.enableSwipe) {
                that.events.bind("start", proxy(that, "_swipestart"));
                that.events.bind("move", proxy(that, "_swipemove"));
            } else {
                that.events.bind("start", proxy(that, "_dragstart"));
                that.events.bind("move", eventProxy("drag"));
                that.events.bind("end", eventProxy("dragend"));
            }

            kendo.notify(that);
        },

        events: [
            "touchstart",
            "dragstart",
            "drag",
            "dragend",
            "tap",
            "doubletap",
            "hold",
            "swipe",
            "gesturestart",
            "gesturechange",
            "gestureend"
        ],

        options: {
            name: "Touch",
            surface: null,
            global: false,
            multiTouch: false,
            enableSwipe: false,
            minXDelta: 30,
            maxYDelta: 20,
            maxDuration: 1000,
            minHold: 800,
            doubleTapTimeout: 800
        },

        _cancelHold: function() {
            clearTimeout(this.holdTimeout);
        },

        _triggerTouch: function(type, e) {
            this.trigger(type, { touch: e.touch });
        },

        _touchstart: function(e) {
            var that = this;

            that._triggerTouch("touchstart", e);

            that._cancelHold();
            that.holdTimeout = setTimeout(function() {
                that._triggerTouch("hold", e);
            }, that.options.minHold);
        },

        _tap: function(e) {
            var that = this,
                lastTap = that.lastTap,
                touch = e.touch;

            that._cancelHold();


            if (lastTap &&
                (touch.endTime - lastTap.endTime < that.options.doubleTapTimeout) &&
                kendo.touchDelta(touch, lastTap).distance < MAX_DOUBLE_TAP_DISTANCE
                ) {

               that._triggerTouch("doubletap", e);
               that.lastTap = null;
            } else {
                that._triggerTouch("tap", e);
                that.lastTap = touch;
            }
        },

        _dragstart: function(e) {
            this._cancelHold();
            this._triggerTouch("dragstart", e);
        },

        _swipestart: function(e) {
            this._cancelHold();
            if (abs(e.x.velocity) * 2 >= abs(e.y.velocity)) {
                e.sender.capture();
            }
        },

        _swipemove: function(e) {
            var that = this,
                options = that.options,
                touch = e.touch,
                duration = e.event.timeStamp - touch.startTime,
                direction = touch.x.initialDelta > 0 ? "right" : "left";

            that._cancelHold();

            if (
                abs(touch.x.initialDelta) >= options.minXDelta &&
                abs(touch.y.initialDelta) < options.maxYDelta &&
                duration < options.maxDuration
                )
            {
                that.trigger("swipe", {
                    direction: direction,
                    touch: e.touch
                });

                touch.cancel();
            }
        }
    });


    window.jQuery.fn.kendoMobileSwipe = function(callback, options) {
        this.each(function() {
            new Swipe(this, callback, options);
        });
    };

    kendo.ui.plugin(Touch);
})(window.kendo.jQuery);
(function($, undefined) {
    var kendo = window.kendo,
        mobile = kendo.mobile,
        ui = mobile.ui,
        SHOW = "show",
        HIDE = "hide",
        OPEN = "open",
        CLOSE = "close",
        WRAPPER = '<div class="km-popup-wrapper" />',
        ARROW = '<div class="km-popup-arrow" />',
        OVERLAY = '<div class="km-popup-overlay" />',
        DIRECTION_CLASSES = "km-up km-down km-left km-right",
        Widget = ui.Widget,
        DIRECTIONS = {
            "down": {
                origin: "bottom center",
                position: "top center"
            },
            "up": {
                origin: "top center",
                position: "bottom center"
            },
            "left": {
                origin: "center left",
                position: "center right",
                collision: "fit flip"
            },
            "right": {
                origin: "center right",
                position: "center left",
                collision: "fit flip"
            }
        },

        ANIMATION = {
            animation: {
                open: {
                    effects: "fade:in",
                    duration: 0
                },
                close: {
                    effects: "fade:out",
                    duration: 400
                }
            }
        },
        DIMENSIONS = {
            "horizontal": { offset: "top", size: "height" },
            "vertical": { offset: "left", size: "width" }
        },

        REVERSE = {
            "up": "down",
            "down": "up",
            "left": "right",
            "right": "left"
        };

    var Popup = Widget.extend({
        init: function(element, options) {
            var that = this,
                container = mobile.application.element,
                popupOptions = {
                    viewport: kendo.mobile.application.element,
                    open: function() {
                        that.overlay.show();
                    },

                    activate: $.proxy(that._activate, that),

                    deactivate: function() {
                        that.overlay.hide();
                        that.trigger(HIDE);
                    }
                },
                axis;

            Widget.fn.init.call(that, element, options);

            element = that.element;
            options = that.options;

            element.wrap(WRAPPER).addClass("km-popup").show();

            axis = that.options.direction.match(/left|right/) ? "horizontal" : "vertical";

            that.dimensions = DIMENSIONS[axis];

            that.wrapper = element.parent().css({
                width: options.width,
                height: options.height
            }).addClass("km-popup-wrapper km-" + options.direction).hide();

            that.arrow = $(ARROW).prependTo(that.wrapper).hide();

            that.overlay = $(OVERLAY).appendTo(container).hide();
            popupOptions.appendTo = that.overlay;

            that.popup = new kendo.ui.Popup(that.wrapper, $.extend(true, popupOptions, ANIMATION, DIRECTIONS[options.direction]));
        },

        options: {
            name: "Popup",
            width: 240,
            height: 320,
            direction: "down"
        },

        events: [
            SHOW,
            HIDE
        ],

        show: function(target) {
            var that = this,
                popup = that.popup;

            popup.options.anchor = $(target);
            popup.open();
        },

        hide: function() {
            this.popup.close();
        },

        destroy: function() {
            Widget.fn.destroy.call(this);
            this.popup.destroy();
        },

        _activate: function() {
            var that = this,
                direction = that.options.direction,
                dimensions = that.dimensions,
                offset = dimensions.offset,
                popup = that.popup,
                anchor = popup.options.anchor,
                anchorOffset = $(anchor).offset(),
                elementOffset = $(popup.element).offset(),
                cssClass = popup.flipped ? REVERSE[direction] : direction,
                offsetAmount = anchorOffset[offset] - elementOffset[offset] + ($(anchor)[dimensions.size]() / 2);

            that.wrapper.removeClass(DIRECTION_CLASSES).addClass("km-" + cssClass);
            that.arrow.css(offset, offsetAmount).show();

            that.trigger(SHOW);
        }
    });

    var PopOver = Widget.extend({
        init: function(element, options) {
            var that = this,
                popupOptions;

            Widget.fn.init.call(that, element, options);

            options = that.options;

            popupOptions = $.extend({
                "show": function() { that.trigger(OPEN); },
                "hide": function() { that.trigger(CLOSE); }
            }, this.options.popup);

            that.popup = new Popup(that.element, popupOptions);

            that.pane = new ui.Pane(that.element, this.options.pane);
            that.pane.navigate("");

            kendo.notify(that, ui);
        },

        options: {
            name: "PopOver",
            popup: { },
            pane: { }
        },

        events: [
            OPEN,
            CLOSE
        ],

        open: function(target) {
            this.openFor(target);
        },

        openFor: function(target) {
            this.popup.show(target);
        },

        close: function() {
            this.popup.hide();
        },

        destroy: function() {
            Widget.fn.destroy.call(this);
            this.pane.destroy();
            this.popup.destroy();

            kendo.destroy(this.element);
        }
    });

    ui.plugin(Popup);
    ui.plugin(PopOver);
})(window.kendo.jQuery);
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
(function($, undefined) {
    var kendo = window.kendo,
        mobile = kendo.mobile,
        fx = kendo.fx,
        ui = mobile.ui,
        proxy = $.proxy,
        extend = $.extend,
        Widget = ui.Widget,
        Class = kendo.Class,
        Movable = kendo.ui.Movable,
        Pane = kendo.ui.Pane,
        PaneDimensions = kendo.ui.PaneDimensions,
        Transition = fx.Transition,
        Animation = fx.Animation,
        abs = Math.abs,
        SNAPBACK_DURATION = 500,
        SCROLLBAR_OPACITY = 0.7,
        FRICTION = 0.93,
        OUT_OF_BOUNDS_FRICTION = 0.5,
        RELEASECLASS = "km-scroller-release",
        REFRESHCLASS = "km-scroller-refresh",
        PULL = "pull",
        CHANGE = "change",
        RESIZE = "resize",
        SCROLL = "scroll";

    var ZoomSnapBack = Animation.extend({
        init: function(options) {
            var that = this;
            Animation.fn.init.call(that);
            extend(that, options);

            that.userEvents.bind("gestureend", proxy(that.start, that));
            that.tapCapture.bind("press", proxy(that.cancel, that));
        },

        done: function() {
            return this.dimensions.minScale - this.movable.scale < 0.01;
        },

        tick: function() {
            var movable = this.movable;
            movable.scaleWith(1.1);
            this.dimensions.rescale(movable.scale);
        },

        onEnd: function() {
            var movable = this.movable;
            movable.scaleTo(this.dimensions.minScale);
            this.dimensions.rescale(movable.scale);
        }
    });

    var DragInertia = Animation.extend({
        init: function(options) {
            var that = this;

            Animation.fn.init.call(that);

            extend(that, options, {
                transition: new Transition({
                    axis: options.axis,
                    movable: options.movable,
                    onEnd: function() { that._end(); }
                })
            });

            that.tapCapture.bind("press", function() { that.cancel(); });
            that.userEvents.bind("end", proxy(that.start, that));
            that.userEvents.bind("gestureend", proxy(that.start, that));
            that.userEvents.bind("tap", proxy(that.onEnd, that));
        },

        onCancel: function() {
            this.transition.cancel();
        },

        freeze: function(location) {
            var that = this;
            that.cancel();
            that._moveTo(location);
        },

        onEnd: function() {
            var that = this;
            if (that._outOfBounds()) {
                that._snapBack();
            } else {
                that._end();
            }
        },

        done: function() {
            return abs(this.velocity) < 1;
        },

        start: function(e) {
            var that = this;

            if (!that.dimension.enabled) { return; }

            if (that._outOfBounds()) {
                that._snapBack();
            } else {
                that.velocity = e.touch[that.axis].velocity * 16;
                if (that.velocity) {
                    that.tapCapture.captureNext();
                    Animation.fn.start.call(that);
                }
            }
        },

        tick: function() {
            var that = this,
                dimension = that.dimension,
                friction = that._outOfBounds() ? OUT_OF_BOUNDS_FRICTION : FRICTION,
                delta = (that.velocity *= friction),
                location = that.movable[that.axis] + delta;

                if (!that.elastic && dimension.outOfBounds(location)) {
                    location = Math.max(Math.min(location, dimension.max), dimension.min);
                    that.velocity = 0;
                }

            that.movable.moveAxis(that.axis, location);
        },

        _end: function() {
            this.tapCapture.cancelCapture();
            this.end();
        },

        _outOfBounds: function() {
            return this.dimension.outOfBounds(this.movable[this.axis]);
        },

        _snapBack: function() {
            var that = this,
                dimension = that.dimension,
                snapBack = that.movable[that.axis] > dimension.max ? dimension.max : dimension.min;
            that._moveTo(snapBack);
        },

        _moveTo: function(location) {
            this.transition.moveTo({ location: location, duration: SNAPBACK_DURATION, ease: Transition.easeOutExpo });
        }
    });

    var ScrollBar = Class.extend({
        init: function(options) {
            var that = this,
                horizontal = options.axis === "x",
                element = $('<div class="km-touch-scrollbar km-' + (horizontal ? "horizontal" : "vertical") + '-scrollbar" />');

            extend(that, options, {
                element: element,
                elementSize: 0,
                movable: new Movable(element),
                scrollMovable: options.movable,
                size: horizontal ? "width" : "height"
            });

            that.scrollMovable.bind(CHANGE, proxy(that._move, that));
            that.container.append(element);
        },

        _move: function() {
            var that = this,
                axis = that.axis,
                dimension = that.dimension,
                paneSize = dimension.size,
                scrollMovable = that.scrollMovable,
                sizeRatio = paneSize / dimension.total,
                position = Math.round(-scrollMovable[axis] * sizeRatio),
                size = Math.round(paneSize * sizeRatio);

                if (position + size > paneSize) {
                    size = paneSize - position;
                } else if (position < 0) {
                    size += position;
                    position = 0;
                }

            if (that.elementSize != size) {
                that.element.css(that.size, size + "px");
                that.elementSize = size;
            }

            that.movable.moveAxis(axis, position);
        },

        show: function() {
            this.element.css({opacity: SCROLLBAR_OPACITY, visibility: "visible"});
        },

        hide: function() {
            this.element.css({opacity: 0});
        }
    });

    var Scroller = Widget.extend({
        init: function(element, options) {
            var that = this;
            Widget.fn.init.call(that, element, options);

            element = that.element;

            element
                .css("overflow", "hidden")
                .addClass("km-scroll-wrapper")
                .wrapInner('<div class="km-scroll-container"/>')
                .prepend('<div class="km-scroll-header"/>');

            var inner = element.children().eq(1),

                tapCapture = new kendo.TapCapture(element),

                movable = new Movable(inner),

                dimensions = new PaneDimensions({
                    element: inner,
                    container: element,
                    forcedEnabled: that.options.zoom,
                    change: function() {
                        that.trigger(RESIZE);
                    }
                }),

                userEvents = new kendo.UserEvents(element, {
                    allowSelection: true,
                    preventDragEvent: true,
                    multiTouch: that.options.zoom,
                    start: function(e) {
                        dimensions.refresh();

                        var velocityX = abs(e.x.velocity),
                            velocityY = abs(e.y.velocity);

                        if (dimensions.x.enabled && velocityX * 2 >= velocityY ||
                            dimensions.y.enabled && velocityY * 2 >= velocityX) {
                            userEvents.capture();
                        } else {
                            userEvents.cancel();
                        }
                    }
                }),

                pane = new Pane({
                    movable: movable,
                    dimensions: dimensions,
                    userEvents: userEvents,
                    elastic: that.options.elastic
                }),

                zoomSnapBack = new ZoomSnapBack({
                    movable: movable,
                    dimensions: dimensions,
                    userEvents: userEvents,
                    tapCapture: tapCapture
                });

            movable.bind(CHANGE, function() {
                that.scrollTop = - movable.y;
                that.scrollLeft = - movable.x;

                that.trigger(SCROLL, {
                    scrollTop: that.scrollTop,
                    scrollLeft: that.scrollLeft
                });
            });

            extend(that, {
                movable: movable,
                dimensions: dimensions,
                zoomSnapBack: zoomSnapBack,
                userEvents: userEvents,
                pane: pane,
                tapCapture: tapCapture,
                pulled: false,
                scrollElement: inner,
                fixedContainer: element.children().first()
            });

            that._initAxis("x");
            that._initAxis("y");

            dimensions.refresh();

            if (that.options.pullToRefresh) {
                that._initPullToRefresh();
            }

            kendo.onResize($.proxy(that.reset, that));
        },

        scrollHeight: function() {
            return this.scrollElement[0].scrollHeight;
        },

        scrollWidth: function() {
            return this.scrollElement[0].scrollWidth;
        },

        options: {
            name: "Scroller",
            zoom: false,
            pullOffset: 140,
            elastic: true,
            pullTemplate: "Pull to refresh",
            releaseTemplate: "Release to refresh",
            refreshTemplate: "Refreshing"
        },

        events: [
            PULL,
            SCROLL,
            RESIZE
        ],

        setOptions: function(options) {
            var that = this;
            Widget.fn.setOptions.call(that, options);
            if (options.pullToRefresh) {
                that._initPullToRefresh();
            }
        },

        reset: function() {
            this.movable.moveTo({x: 0, y: 0});
        },

        scrollTo: function(x, y) {
            this.movable.moveTo({x: x, y: y});
        },

        pullHandled: function() {
            var that = this;
            that.refreshHint.removeClass(REFRESHCLASS);
            that.hintContainer.html(that.pullTemplate({}));
            that.yinertia.onEnd();
            that.xinertia.onEnd();
        },

        destroy: function() {
            Widget.fn.destroy.call(this);
            this.userEvents.destroy();
        },

        _initPullToRefresh: function() {
            var that = this;

            that.dimensions.y.forceEnabled();
            that.pullTemplate = kendo.template(that.options.pullTemplate);
            that.releaseTemplate = kendo.template(that.options.releaseTemplate);
            that.refreshTemplate = kendo.template(that.options.refreshTemplate);

            that.scrollElement.prepend('<span class="km-scroller-pull"><span class="km-icon"></span><span class="km-template">' + that.pullTemplate({}) + '</span></span>');
            that.refreshHint = that.scrollElement.children().first();
            that.hintContainer = that.refreshHint.children(".km-template");

            that.pane.y.bind("change", proxy(that._paneChange, that));
            that.userEvents.bind("end", proxy(that._dragEnd, that));
        },

        _dragEnd: function() {
            var that = this;

            if(!that.pulled) {
                return;
            }

            that.pulled = false;
            that.refreshHint.removeClass(RELEASECLASS).addClass(REFRESHCLASS);
            that.hintContainer.html(that.refreshTemplate({}));
            that.trigger("pull");
            that.yinertia.freeze(that.options.pullOffset / 2);
        },

        _paneChange: function() {
            var that = this;

            if (that.movable.y / OUT_OF_BOUNDS_FRICTION > that.options.pullOffset) {
                if (!that.pulled) {
                    that.pulled = true;
                    that.refreshHint.removeClass(REFRESHCLASS).addClass(RELEASECLASS);
                    that.hintContainer.html(that.releaseTemplate({}));
                }
            } else if (that.pulled) {
                that.pulled = false;
                that.refreshHint.removeClass(RELEASECLASS);
                that.hintContainer.html(that.pullTemplate({}));
            }
        },

        _initAxis: function(axis) {
            var that = this,
            movable = that.movable,
            dimension = that.dimensions[axis],
            tapCapture = that.tapCapture,

            scrollBar = new ScrollBar({
                axis: axis,
                movable: movable,
                dimension: dimension,
                container: that.element
            }),

            inertia = new DragInertia({
                axis: axis,
                movable: movable,
                tapCapture: tapCapture,
                userEvents: that.userEvents,
                dimension: dimension,
                elastic: that.options.elastic,
                end: function() { scrollBar.hide(); }
            });

            that[axis + "inertia"] = inertia;

            that.pane[axis].bind(CHANGE, function() {
                scrollBar.show();
            });
        }
    });

    ui.plugin(Scroller);
})(window.kendo.jQuery);
(function($, undefined) {
    var kendo = window.kendo,
        ui = kendo.mobile.ui,
        Popup = kendo.ui.Popup,
        SHIM = '<div class="km-shim"/>',
        Widget = ui.Widget;

    var Shim = Widget.extend({
        init: function(element, options) {
            var that = this,
                ios = kendo.mobile.application.os === "ios",
                align = options.align || (ios ?  "bottom center" : "center center"),
                position = options.position || (ios ? "bottom center" : "center center"),
                effect = options.effect || (ios ? "slideIn:up" : "fade:in"),
                shim = $(SHIM).handler(that).hide();

            Widget.fn.init.call(that, element, options);

            that.shim = shim;
            that.element = element;

            if (!that.options.modal) {
                that.shim.on("up", "hide");
            }

            kendo.mobile.application.element.append(shim);

            that.popup = new Popup(that.element, {
                anchor: shim,
                appendTo: shim,
                origin: align,
                position: position,
                animation: {
                    open: {
                        effects: effect,
                        duration: that.options.duration
                    },
                    close: {
                        duration: that.options.duration
                    }
                },
                deactivate: function() {
                    shim.hide();
                },
                open: function() {
                    shim.show();
                }
            });

            kendo.notify(that);
        },

        options: {
            name: "Shim",
            modal: true,
            align: undefined,
            position: undefined,
            effect: undefined,
            duration: 200
        },

        show: function() {
            this.popup.open();
        },

        hide: function() {
            this.popup.close();
        },

        destroy: function() {
            Widget.fn.destroy.call(this);
            this.shim.kendoDestroy();
            this.popup.destroy();
        }
    });

    ui.plugin(Shim);
})(window.kendo.jQuery);
(function($, undefined) {
    var kendo = window.kendo,
        mobile = kendo.mobile,
        ui = mobile.ui,
        attr = kendo.attr,
        Class = kendo.Class,
        Widget = ui.Widget,
        INIT = "init",
        SHOW = "show",
        BEFORE_SHOW = "beforeShow",
        HIDE = "hide",
        Z_INDEX = "z-index",
        attrValue = kendo.attrValue,
        roleSelector = kendo.roleSelector;

    var View = Widget.extend({
        init: function(element, options) {
            var that = this;

            Widget.fn.init.call(that, element, options);

            element = that.element;

            that.params = {};
            that.lastParams = {};

            $.extend(that, options);

            that._layout();
            that._scroller();
            that._model();
        },

        events: [
            INIT,
            BEFORE_SHOW,
            SHOW,
            HIDE
        ],

        options: {
            name: "View",
            title: "",
            defaultTransition: "",
            stretch: false,
            zoom: false,
            model: null
        },

        destroy: function() {
            Widget.fn.destroy.call(this);

            if (this.scroller) {
                this.scroller.destroy();
            }

            kendo.destroy(this.element);
        },

        showStart: function() {
            var that = this;
            that.element.css("display", "");

            if (!that.inited) {
                that.inited = true;
                that.trigger(INIT, {view: that});
            }

            if (that.layout) {
                that.layout.attach(that);
            }

            that._eachWidget(function(widget) {
                widget.viewShow(that);
            });

            that.trigger(SHOW, {view: that});
        },

        hideStart: function() {
            var that = this;
            if (that.layout) {
                that.layout.detach(that);
            }
        },

        hideComplete: function() {
            var that = this;
            that.element.hide();
            that.trigger(HIDE, {view: that});
        },

        updateParams: function(params) {
            var that = this;

            if (that.trigger(BEFORE_SHOW, {view: that})) {
                return;
            }

            that.lastParams = that.params;
            that.params = params;

            that.trigger(SHOW, {view: that});
        },

        switchWith: function(view, transition, params, callback) {
            var that = this;

            if (that.trigger(BEFORE_SHOW, {view: that})) {
                return;
            }

            that.lastParams = that.params;
            that.params = params;

            if (view) {
                // layout needs to be detached first, then reattached
                view.hideStart();
                that.showStart();

                new ViewTransition({
                    current: view,
                    next: that,
                    transition: transition,
                    defaultTransition: view.options.defaultTransition,
                    complete: callback
                });
            } else {
                that.showStart();
                callback();
            }
        },

        parallaxContents: function(other) {
            var that = this,
                contents = that.content;

            if (!other.header[0]) {
                contents = contents.add(that.header);
            }

            if (!other.footer[0]) {
                contents = contents.add(that.footer);
            }

            return contents;
        },

        _scroller: function() {
            var that = this;

            if (that.options.stretch) {
                that.content.addClass("km-stretched-view");
            } else {
                that.content.kendoMobileScroller({zoom: that.options.zoom});

                that.scroller = that.content.data("kendoMobileScroller");
                that.scrollerContent = that.scroller.scrollElement;
            }
        },

        _model: function() {
            var that = this,
                element = that.element,
                model = that.options.model;

            if (typeof model === "string") {
                model = kendo.getter(model)(window);
            }

            that.model = model;

            // PopOver widgets have to be initialized first, as they move their element out of the DOM.
            element.find(roleSelector("popover")).each(function(){
                kendo.initWidget(this, {}, ui.roles);
            });

            if (model) {
                kendo.bind(element.children(), model, ui, kendo.ui, kendo.dataviz.ui);
            } else {
                mobile.init(element.children());
            }
        },

        _layout: function() {
            var that = this,
                contentSelector = roleSelector("content"),
                element = that.element;

            element.data("kendoView", that).addClass("km-view");
            that.transition = attrValue(element, "transition");

            that.header = element.children(roleSelector("header")).addClass("km-header");
            that.footer = element.children(roleSelector("footer")).addClass("km-footer");

            if (!element.children(contentSelector)[0]) {
              element.wrapInner("<div " + attr("role") + '="content"></div>');
            }

            that.content = element.children(roleSelector("content"))
                                .addClass("km-content");

            that.element.prepend(that.header).append(that.footer);

            that.id = attrValue(element, "url") || "#" + element.attr("id");

            if (that.layout) {
                that.layout.setup(that);
            }
        },

        _eachWidget: function(callback) {
            var widget;
            this.element.find("[data-" + kendo.ns + "role]").each(function() {
                widget = kendo.widgetInstance($(this), ui);
                if (widget) {
                    callback(widget);
                }
            });
        }
    });

    function fade(source, destination) {
        if (source[0] && destination[0] && source[0] != destination[0]) {
            source.kendoAnimateTo(destination, {effects: "fade"});
        }
    }

    function initWidgets(collection) {
        collection.each(function() {
            kendo.initWidget($(this), {}, ui.roles);
        });
    }

    var ViewTransition = Class.extend({
        init: function (options) {
            $.extend(this, options);

            var that = this,
                current = that.current,
                next = that.next,
                currentContent = current.element,
                nextContent = next.element,
                upper = next,
                lower = current,
                transition = that._transition();

            if (transition.reverse && !transition.parallax) {
                upper = current;
                lower = next;
            }

            upper.element.css(Z_INDEX, 1);
            lower.element.css(Z_INDEX, 0);

            if (transition.parallax) {
                fade(current.footer, next.footer);
                fade(current.header, next.header);
                currentContent = current.parallaxContents(next);
                nextContent = next.parallaxContents(current);
            }

            currentContent.kendoAnimateTo(nextContent, transition);

            if (!that.back()) {
                current.nextView = next;
                current.backTransition = transition.transition;
            }
        },

        _transition: function() {
            var that = this,
                current = that.current,
                next = that.next,
                back = that.back(),
                complete = function() {
                    current.hideComplete();
                    that.complete();
                },

                viewTransition = back ? next.backTransition : next.transition,
                transition = that.transition || viewTransition || that.defaultTransition,
                animationData = transition.split(' '),
                animationType = animationData[0],
                parallax = /^slide/.test(animationType),
                reverse = animationData[1] === "reverse";

            if (that.back() && !that.transition) {
                reverse = !reverse;
            }

            return {
                effects: animationType,
                reverse: reverse,
                parallax: parallax,
                complete: complete,
                transition: transition
            };
        },

        back: function() {
            var next = this.next,
                current = this.current;

            return next.nextView === current && JSON.stringify(next.params) === JSON.stringify(next.lastParams);
        }
    });

    var Layout = Widget.extend({
        init: function(element, options) {
            var that = this;
            Widget.fn.init.call(that, element, options);

            element = that.element;

            that.element = element.detach();
            that.header = element.children(roleSelector("header")).addClass("km-header");
            that.footer = element.children(roleSelector("footer")).addClass("km-footer");
            that.elements = that.header.add(that.footer);
            kendo.mobile.init(that.element.children());
            that.trigger(INIT, {layout: that});
        },

        options: {
            name: "Layout"
        },

        events: [
            INIT,
            SHOW,
            HIDE
        ],

        setup: function (view) {
            if (!view.header[0]) { view.header = this.header; }
            if (!view.footer[0]) { view.footer = this.footer; }
        },

        detach: function (view) {
            var that = this;
            if (view.header === that.header) {
                view.element.prepend(that.header.detach().clone(true));
            }

            if (view.footer === that.footer) {
                view.element.append(that.footer.detach().clone(true));
            }

            that.trigger(HIDE, {layout: that, view: view});
        },

        attach: function(view) {
            var that = this;
            if (view.header === that.header) {
                that.header.detach();
                view.element.children(roleSelector("header")).remove();
                view.element.prepend(that.header);
            }

            if (view.footer === that.footer) {
                that.footer.detach();
                view.element.children(roleSelector("footer")).remove();
                view.element.append(that.footer);
            }

            that.trigger(SHOW, {layout: that, view: view});
        }
    });

    var Observable = kendo.Observable,
        BODY_REGEX = /<body[^>]*>(([\u000a\u000d\u2028\u2029]|.)*)<\/body>/i,
        LOAD_START = "loadStart",
        LOAD_COMPLETE = "loadComplete",
        SHOW_START = "showStart",
        VIEW_SHOW = "viewShow";

    function urlParams(url) {
        var queryString = url.split('?')[1] || "",
            params = {},
            paramParts = queryString.split(/&|=/),
            length = paramParts.length,
            idx = 0;

        for (; idx < length; idx += 2) {
            params[paramParts[idx]] = paramParts[idx + 1];
        }

        return params;
    }

    var ViewEngine = Observable.extend({
        init: function(options) {
            var that = this,
                views,
                container;

            Observable.fn.init.call(that);

            $.extend(that, options);
            that.sandbox = $("<div />");
            container = that.container;

            views = that._hideViews(container);
            that.rootView = views.first();

            if (!that.rootView[0]) {
                throw new Error('Your kendo mobile application element does not contain any direct child elements with data-role="view" attribute set. Make sure that you instantiate the mobile application using the correct container.');
            }
            that._view = null;

            that.layouts = {};

            that._setupLayouts(container);
            initWidgets(container.children(roleSelector("modalview")));

            if (that.loader) {
                that.bind(SHOW_START, function() { that.loader.transition(); });
                that.bind(LOAD_START, function() { that.loader.show(); });
                that.bind(LOAD_COMPLETE, function() { that.loader.hide(); });
                that.bind(VIEW_SHOW, function() { that.loader.transitionDone(); });
            }
        },

        view: function() {
            return this._view;
        },

        showView: function(url, transition) {
            var that = this,
                container = that.container,
                params = urlParams(url),
                local = url.charAt(0) === "#",
                remote = !local && !url.match(/^([\w\-]+)$/),
                view,
                element,
                urlPath = url.split("?")[0];

            if (url === that.url) {
                return;
            }

            that.url = url;
            that.trigger(SHOW_START);

            if (!url) {
                element = that.rootView;
            } else {
                element = container.children("[" + attr("url") + "='" + url + "']");

                if (!element[0] && !remote) {
                    element = container.children(local ? urlPath : "#" + urlPath);
                }
            }

            view = element.data("kendoView");

            if (element[0]) {
                if (!view) {
                    view = that._createView(element);
                }

                that._show(view, transition, params);
            } else {
                that._loadView(url, function(view) { that._show(view, transition, params); });
            }
        },

        _createView: function(element) {
            var that = this,
                viewOptions,
                layout = attrValue(element, "layout");

            if (typeof layout === "undefined") {
                layout = that.layout;
            }

            if (layout) {
                layout = that.layouts[layout];
            }

            viewOptions = {
                defaultTransition: that.transition,
                loader: that.loader,
                container: that.container,
                layout: layout
            };

            return kendo.initWidget(element, viewOptions, ui.roles);
        },

        _loadView: function(url, callback) {
            var that = this;

            if (that._xhr) {
                that._xhr.abort();
            }

            that.trigger(LOAD_START);

            that._xhr = $.get(url, function(html) {
                            that.trigger(LOAD_COMPLETE);
                            callback(that._createRemoteView(url, html));
                        }, 'html')
                        .fail(function(request) {
                            that.trigger(LOAD_COMPLETE);
                            if (request.status === 0 && request.responseText) {
                                callback(that._createRemoteView(url, request.responseText));
                            }
                        });
        },

        _createRemoteView: function(url, html) {
            var that = this,
                sandbox = that.sandbox,
                container = that.container,
                views,
                modalViews,
                view;

            if (BODY_REGEX.test(html)) {
                html = RegExp.$1;
            }

            sandbox[0].innerHTML = html;

            container.append(sandbox.children("script, style"));

            views = that._hideViews(sandbox);
            view = views.first();
            view.hide().attr(attr("url"), url);

            that._setupLayouts(sandbox);

            modalViews = sandbox.children(roleSelector("modalview"));

            container.append(sandbox.children(roleSelector("layout modalview")).add(views));

            // Initialize the modalviews after they have been appended to the final container
            initWidgets(modalViews);

            return that._createView(view);
        },

        _show: function(view, transition, params) {
            var that = this;
            if (that._view !== view) {
                view.switchWith(that._view, transition, params, function() {
                    that._view = view;
                    that.trigger(VIEW_SHOW, {view: view});
                });
            } else {
                that._view.updateParams(params);
                that.trigger(VIEW_SHOW, {view: view});
            }
        },

        _hideViews: function(container) {
            return container.children(roleSelector("view splitview")).hide();
        },

        _setupLayouts: function(element) {
            var that = this;

            element.children(roleSelector("layout")).each(function() {
                var layout = $(this),
                    platform = attrValue(layout,  "platform");

                if (platform === undefined || platform === mobile.application.os) {
                    that.layouts[layout.data("id")] = kendo.initWidget(layout, {}, ui.roles);
                }
            });
        }
    });

    kendo.mobile.ViewEngine = ViewEngine;

    ui.plugin(View);
    ui.plugin(Layout);
})(window.kendo.jQuery);
(function($, undefined) {
    var kendo = window.kendo,
        ui = kendo.mobile.ui,
        Shim = ui.Shim,
        Widget = ui.Widget,
        OPEN = "open",
        WRAP = '<div class="km-modalview-wrapper" />';

    var ModalView = ui.View.extend({
        init: function(element, options) {
            var that = this, width, height;

            Widget.fn.init.call(that, element, options);

            element = that.element;
            options = that.options;

            width = element[0].style.width || element.css("width");
            height = element[0].style.height || element.css("height");

            element.addClass("km-modalview").wrap(WRAP);

            that.wrapper = element.parent().css({
                width: options.width || width || 300,
                height: options.height || height || 300
            });

            element.css({ width: "", height: "" });

            that.shim = new Shim(that.wrapper, {
                modal: options.modal,
                position: "center center",
                align: "center center",
                effect: "fade:in"
            });

            that._layout();
            that._scroller();
            that._model();

            kendo.onResize(function() {
                var positionedElement = that.wrapper.parent(),
                    viewPort = positionedElement.parent();

                positionedElement.css({
                    top: (viewPort.height() - positionedElement.height()) / 2 + "px",
                    left: (viewPort.width() - positionedElement.width()) / 2 + "px"
                });
            });
        },

        events: [
            OPEN
        ],

        options: {
            name: "ModalView",
            modal: true,
            width: null,
            height: null
        },

        destroy: function() {
            Widget.fn.destroy.call(this);
            this.shim.destroy();
        },

        open: function(target) {
            this.target = $(target);
            this.shim.show();
        },

        // Interface implementation, called from the pane click handlers
        openFor: function(target) {
            this.open(target);
            this.trigger(OPEN, { target: target });
        },

        close: function() {
            this.shim.hide();
        }
    });

    ui.plugin(ModalView);
})(window.kendo.jQuery);
(function($, undefined) {
    var kendo = window.kendo,
        ui = kendo.mobile.ui,
        Widget = ui.Widget,
        View = ui.View;

    var SplitView = View.extend({
        init: function(element, options) {
            var that = this;

            Widget.fn.init.call(that, element, options);
            element = that.element;

            $.extend(that, options);
            that._layout();
            that._style();
            kendo.mobile.init(element.children(kendo.roleSelector("modalview")));

            that.panes = [];
            that.element.children(kendo.roleSelector("pane")).each(function() {
                that.panes.push(kendo.initWidget(this, {}, ui.roles));
            });
        },

        options: {
            name: "SplitView",
            style: "horizontal"
        },

        // Implement view interface
        _layout: function() {
            var that = this,
                element = that.element;

            element.data("kendoView", that).addClass("km-view km-splitview");

            that.transition = kendo.attrValue(element, "transition");
            $.extend(that, { header: [], footer: [], content: element });
        },

        _style: function () {
            var style = this.options.style,
                element = this.element,
                styles;

            if (style) {
                styles = style.split(" ");
                $.each(styles, function () {
                    element.addClass("km-split-" + this);
                });
            }
        },

        showStart: function() {
            var that = this;
            that.element.css("display", "");

            if (!that.inited) {
                that.inited = true;
                $.each(that.panes, function() {
                    this.navigate("");
                });
                that.trigger("init", {view: that});
            }

            that.trigger("show", {view: that});
        }
    });

    ui.plugin(SplitView);
})(window.kendo.jQuery);
(function($, undefined) {
    var kendo = window.kendo,
        mobile = kendo.mobile,
        roleSelector = kendo.roleSelector,
        ui = mobile.ui,
        Widget = ui.Widget,
        ViewEngine = mobile.ViewEngine,
        Loader = mobile.ui.Loader,

        EXTERNAL = "external",
        HREF = "href",
        DUMMY_HREF = "#!",

        NAVIGATE = "navigate",
        VIEW_SHOW = "viewShow",

        WIDGET_RELS = /popover|actionsheet|modalview/,
        BACK = "#:back",

        attrValue = kendo.attrValue,
        // navigation element roles
        buttonRoles = "button backbutton detailbutton listview-link",
        linkRoles = "tab";

    function appLinkClick(e) {
        if(attrValue($(e.currentTarget), "rel") != EXTERNAL) {
            e.preventDefault();
        }
    }

    function captureGhostClick(e) {
        if (attrValue($(e.currentTarget), "rel") !== EXTERNAL) {
            e.preventDefault();
        }
    }

    var Pane = Widget.extend({
        init: function(element, options) {
            var that = this;

            Widget.fn.init.call(that, element, options);

            element = that.element;

            element.addClass("km-pane");

            that.loader = new Loader(element, {
                loading: that.options.loading
            });

            that.viewEngine = new ViewEngine({
                container: element,
                transition: that.options.transition,
                layout: that.options.layout,
                loader: that.loader
            });

            that.viewEngine.bind(VIEW_SHOW, function(e) {
                that.trigger(VIEW_SHOW, e);
            });

            that.history = [];
            that._setupAppLinks();
        },

        options: {
            name: "Pane",
            transition: "",
            layout: "",
            loading: undefined
        },

        events: [
            NAVIGATE,
            VIEW_SHOW
        ],

        destroy: function() {
            Widget.fn.destroy.call(this);

            kendo.destroy(this.element);
        },

        navigate: function(url, transition) {
            var that = this,
                history = that.history;

            if (url === BACK) {
                history.pop();
                url = history[history.length - 1];
            } else {
                that.history.push(url);
            }

            that.trigger(NAVIGATE, {url: url});
            that.viewEngine.showView(url, transition);
        },

        hideLoading: function() {
            this.loader.hide();
        },

        showLoading: function() {
            this.loader.show();
        },

        view: function() {
            return this.viewEngine.view();
        },

        _setupAppLinks: function() {
            this.element.handler(this)
                .on("down", roleSelector(linkRoles), "_mouseup")
                .on("up", roleSelector(buttonRoles), "_mouseup")
                .on("click", roleSelector(linkRoles + " " + buttonRoles), appLinkClick)
                .on("touchstart", roleSelector(buttonRoles), captureGhostClick)
                .on("touchstart", ".km-popup .k-item", kendo.preventDefault); // Prevent ghost clicks in DropDownList
        },

        _mouseup: function(e) {
            if (e.which > 1 || e.isDefaultPrevented()) {
                return;
            }

            var link = $(e.currentTarget),
                transition = attrValue(link, "transition"),
                rel = attrValue(link, "rel") || "",
                target = attrValue(link, "target"),
                pane = this,
                href = link.attr(HREF);

            if (rel === EXTERNAL || (typeof href === "undefined") || href === DUMMY_HREF) {
                return;
            }

            // Prevent iOS address bar progress display for in app navigation
            link.attr(HREF, DUMMY_HREF);
            setTimeout(function() { link.attr(HREF, href); });

            if (rel.match(WIDGET_RELS)) {
                kendo.widgetInstance($(href), ui).openFor(link);
            } else {
                if (target === "_top") {
                    pane = mobile.application.pane;
                }
                else if (target) {
                    pane = $("#" + target).data("kendoMobilePane");
                }

                pane.navigate(href, transition);
            }

            e.preventDefault();
        }
    });

    ui.plugin(Pane);
})(window.kendo.jQuery);
(function($, undefined) {
    var kendo = window.kendo,
        mobile = kendo.mobile,
        history = kendo.history,
        support = kendo.support,
        Pane = mobile.ui.Pane,

        DEFAULT_OS = "ios",
        OS = support.mobileOS,
        OS_NAME_TEMPLATE = kendo.template("km-#=data.name##if(data.device){# km-on-#=data.device##}##if(data.version){# km-#=data.name##=data.version.major# km-#=data.version.major# km-m#=data.version.minor# #=data.version.appMode?'km-app':'km-web'##}#", {usedWithBlock: false}),
        BERRYPHONEGAP = OS.device == "blackberry" && OS.flatVersion >= 600 && OS.flatVersion < 1000 && OS.appMode,
        VERTICAL = "km-vertical",
        HORIZONTAL = "km-horizontal",

        MOBILE_PLATFORMS = {
            ios: { ios: true, appMode: false, browser: "default", device: "iphone", flatVersion: "500", majorVersion: "5", minorVersion: "0.0", name: "ios", tablet: false },
            android: { android: true, appMode: false, browser: "default", device: "android", flatVersion: "233", majorVersion: "2", minorVersion: "3.3", name: "android", tablet: false },
            blackberry: { blackberry: true, appMode: false, browser: "default", device: "blackberry", flatVersion: "710", majorVersion: "7", minorVersion: "1.0", name: "blackberry", tablet: false },
            meego: { meego: true, appMode: false, browser: "default", device: "meego", flatVersion: "850", majorVersion: "8", minorVersion: "5.0", name: "meego", tablet: false }
        },

        viewportTemplate = kendo.template('<meta content="initial-scale=1.0, maximum-scale=1.0, user-scalable=no#=data.height#" name="viewport" />', {usedWithBlock: false}),
        systemMeta = '<meta name="apple-mobile-web-app-capable" content="yes" /> ' +
                     '<meta name="apple-mobile-web-app-status-bar-style" content="black" /> ',
        viewportMeta = viewportTemplate({ height: "" }),

        iconMeta = kendo.template('<link rel="apple-touch-icon' + (OS.android ? '-precomposed' : '') + '" # if(data.size) { # sizes="#=data.size#" #}# href="#=data.icon#" />', {usedWithBlock: false}),

        DEVICE = OS.name,
        HIDEBAR = (OS.device == "iphone" || OS.device == "ipod") && OS.browser == "mobilesafari",
        BARCOMPENSATION = 60,

        WINDOW = $(window),
        HEAD = $("head"),
        proxy = $.proxy;

    function isOrientationHorizontal() {
        return (Math.abs(window.orientation) / 90 == 1);
    }

    function getOrientationClass() {
        return isOrientationHorizontal() ? HORIZONTAL : VERTICAL;
    }

    function applyViewportHeight() {
        $("meta[name=viewport]").remove();
        HEAD.append(viewportTemplate({
            height: isOrientationHorizontal() ?
                        ", height=" + window.innerHeight + "px"  :
                        (OS.flatVersion >= 600 && OS.flatVersion < 700) ?
                            ", height=" + window.innerWidth + "px" :
                            ", height=device-height"
        }));
    }

    var Application = kendo.Observable.extend({
        init: function(element, options) {
            var that = this;

            mobile.application = that; // global reference to current application

            that.options = $.extend({
                hideAddressBar: true,
                transition: "",
                updateDocumentTitle: true
            }, options);
            kendo.Observable.fn.init.call(that, that.options);

            $(function(){
                that.element = $(element ? element : document.body);
                that._setupPlatform();
                that._attachHideBarHandlers();
                that.pane = new Pane(that.element, that.options);
                that._setupElementClass();
                that._attachMeta();

                if (that.options.updateDocumentTitle) {
                    that._setupDocumentTitle();
                }

                that._startHistory();

                if (support.kineticScrollNeeded) {
                    $(document.documentElement).on("touchmove", false);
                }
            });
        },

        navigate: function(url, transition) {
            this.pane.navigate(url, transition);
        },

        scroller: function() {
            return this.view().scroller;
        },

        hideLoading: function() {
            this.pane.hideLoading();
        },

        showLoading: function() {
            this.pane.showLoading();
        },

        view: function() {
            return this.pane.view();
        },

        _setupPlatform: function() {
            var that = this,
                platform = that.options.platform,
                os = OS,
                version;

            if (platform) {
                if (typeof platform === "string") {
                    os = MOBILE_PLATFORMS[platform];
                } else {
                    os = platform;
                }

                OS = os;
            }

            if (os) {
                that.os = os.name;
                version = {
                    appMode: os.appMode,
                    major: os.majorVersion,
                    minor: os.minorVersion ? os.minorVersion[0] : 0
                };
            } else {
                that.os = DEFAULT_OS;
                version = false;
            }

            that.osCssClass = OS_NAME_TEMPLATE({ name: that.os, device: DEVICE, version: version });
        },

        _startHistory: function() {
            var that = this,
                historyEvents,
                initial = that.options.initial;

            historyEvents = {
                change: function(e) {
                    that.pane.navigate(e.url);
                },

                ready: function(e) {
                    var url = e.url;

                    if (!url && initial) {
                        url = initial;
                        history.navigate(initial, true);
                    }

                    that.pane.navigate(url);
                }
            };

            that.pane.bind("navigate", function(e) {
                history.navigate(e.url, true);
            });

            history.start($.extend(that.options, historyEvents));
        },

        _setupElementClass: function() {
            var that = this,
                element = that.element;

            element.parent().addClass("km-root km-" + (OS.tablet ? "tablet" : "phone"));
            element.addClass(that.osCssClass + " " + getOrientationClass());

            if (BERRYPHONEGAP) {
                applyViewportHeight();
            }

            kendo.onResize(function() {
                element.removeClass("km-horizontal km-vertical")
                    .addClass(getOrientationClass());

                if (BERRYPHONEGAP) {
                    applyViewportHeight();
                }
            });
        },

        _attachMeta: function() {
            var icon = this.options.icon, size;

            if (!BERRYPHONEGAP) {
                HEAD.prepend(viewportMeta);
            }

            HEAD.prepend(systemMeta);

            if (icon) {
                if (typeof icon === "string") {
                    icon = { "" : icon };
                }

                for(size in icon) {
                    HEAD.prepend(iconMeta({ icon: icon[size], size: size }));
                }
            }
        },

        _attachHideBarHandlers: function() {
            var that = this,
                hideBar = proxy(that._hideBar, that);

            if (OS.appMode || !that.options.hideAddressBar) {
                return;
            }

            that._initialHeight = {};

            if (HIDEBAR) {
                WINDOW.on("load", hideBar);
                kendo.onResize(hideBar);
                that.element[0].addEventListener("touchstart", hideBar, true);
            }
        },

        _setupDocumentTitle: function() {
            var that = this,
                defaultTitle = document.title;

            that.pane.bind("viewShow", function(e) {
                var title = e.view.title;
                document.title = title !== undefined ? title : defaultTitle;
            });
        },

        _hideBar: function() {
            var that = this,
                element = that.element,
                orientation = window.orientation + "",
                initialHeight = that._initialHeight,
                newHeight;

            if (!initialHeight[orientation]) {
                initialHeight[orientation] = WINDOW.height();
            }

            newHeight = initialHeight[orientation] + BARCOMPENSATION;

            if (newHeight != element.height()) {
                element.height(newHeight);
            }

            setTimeout(window.scrollTo, 0, 0, 1);
        }
    });

    kendo.mobile.Application = Application;
})(window.kendo.jQuery);
(function($, undefined) {
    var kendo = window.kendo,
        ui = kendo.mobile.ui,
        Shim = ui.Shim,
        Popup = ui.Popup,
        Widget = ui.Widget,
        OPEN = "open",
        BUTTONS = "li>a",
        CONTEXT_DATA = "actionsheetContext",
        WRAP = '<div class="km-actionsheet-wrapper" />',
        cancelTemplate = kendo.template('<li class="km-actionsheet-cancel"><a href="\\#">#:cancel#</a></li>');

    var ActionSheet = Widget.extend({
        init: function(element, options) {
            var that = this,
                os = kendo.support.mobileOS,
                ShimClass = os.tablet ? Popup : Shim;

            Widget.fn.init.call(that, element, options);

            element = that.element;

            element
                .addClass("km-actionsheet")
                .append(cancelTemplate({cancel: that.options.cancel}))
                .wrap(WRAP)
                .on("up", BUTTONS, "_click")
                .on("click", BUTTONS, kendo.preventDefault);

            that.wrapper = element.parent();
            that.shim = new ShimClass(that.wrapper, $.extend({modal: !(os.android || os.meego)}, that.options.popup) );

            kendo.notify(that, ui);

            kendo.onResize(function() {
                var positionedElement = that.wrapper.parent(),
                    viewPort = positionedElement.parent();

                positionedElement.css({
                    top: (viewPort.height() - positionedElement.height()) + "px",
                    width: viewPort.width() + "px"
                });
            });
        },

        events: [
            OPEN
        ],

        options: {
            name: "ActionSheet",
            cancel: "Cancel",
            popup: { height: "auto" }
        },

        open: function(target, context) {
            var that = this;
            that.target = $(target);
            that.context = context;
            that.shim.show(target);
        },

        close: function() {
            this.context = this.target = null;
            this.shim.hide();
        },

        openFor: function(target) {
            var that = this,
                context = target.data(CONTEXT_DATA);

            that.open(target, context);
            that.trigger(OPEN, { target: target, context: context });
        },

        destroy: function() {
            Widget.fn.destroy.call(this);
            this.shim.destroy();
        },

        _click: function(e) {
            if (e.isDefaultPrevented()) {
                return;
            }

            var action = $(e.currentTarget).data("action");

            if (action) {
                kendo.getter(action)(window)({
                    target: this.target,
                    context: this.context
                });
            }

            e.preventDefault();
            this.close();
        }
    });

    ui.plugin(ActionSheet);
})(window.kendo.jQuery);
(function($, undefined) {
    var kendo = window.kendo,
        mobile = kendo.mobile,
        ui = mobile.ui,
        Widget = ui.Widget,
        support = kendo.support,
        os = support.mobileOS,
        ANDROID3UP = os.android && os.flatVersion >= 300,
        CLICK = "click";

    function highlightButton(widget, event, highlight) {
        $(event.target).closest(".km-button,.km-detail").toggleClass("km-state-active", highlight);

        if (ANDROID3UP && widget.deactivateTimeoutID) {
            clearTimeout(widget.deactivateTimeoutID);
            widget.deactivateTimeoutID = 0;
        }
    }

    var Button = Widget.extend({
        init: function(element, options) {
            var that = this;

            Widget.fn.init.call(that, element, options);

            that._wrap();
            that._style();

            that.element
                .on("up", "_release")
                .on("down", "_activate")
                .on("up cancel", "_deactivate");

            if (ANDROID3UP) {
                that.element.on("move", "_timeoutDeactivate");
            }
        },

        events: [
            CLICK
        ],

        options: {
            name: "Button",
            icon: "",
            style: ""
        },

        _timeoutDeactivate: function(e) {
            if (!this.deactivateTimeoutID) {
                this.deactivateTimeoutID = setTimeout(highlightButton, 500, this, e, false);
            }
        },

        _activate: function(e) {
            highlightButton(this, e, true);
            document.activeElement.blur(); // Hide device keyboard
        },

        _deactivate: function(e) {
            highlightButton(this, e, false);
        },

        _release: function(e) {
            var that = this;
            if (e.which > 1) {
                return;
            }

            if (that.trigger(CLICK, {target: $(e.target), button: that.element})) {
                e.preventDefault();
            }
        },

        _style: function() {
            var style = this.options.style,
                element = this.element,
                styles;

            if (style) {
                styles = style.split(" ");
                $.each(styles, function() {
                    element.addClass("km-" + this);
                });
            }
        },

        _wrap: function() {
            var that = this,
                icon = that.options.icon,
                iconSpan = '<span class="km-icon km-' + icon,
                element = that.element.addClass("km-button"),
                span = element.children("span:not(.km-icon)").addClass("km-text"),
                image = element.find("img").addClass("km-image");

            if (!span[0] && element.html()) {
                span = element.wrapInner('<span class="km-text" />').children("span.km-text");
            }

            if (!image[0] && icon) {
                if (!span[0]) {
                    iconSpan += " km-notext";
                }
                element.prepend($(iconSpan + '" />'));
            }
        }
    });

    var BackButton = Button.extend({
        options: {
            name: "BackButton",
            style: "back"
        },

        init: function(element, options) {
            var that = this;
            Button.fn.init.call(that, element, options);

            if (typeof that.element.attr("href") === "undefined") {
                that.element.attr("href", "#:back");
            }
        }
    });

    var DetailButton = Button.extend({
        options: {
            name: "DetailButton",
            style: ""
        },

        init: function(element, options) {
            Button.fn.init.call(this, element, options);
        },

        _style: function() {
            var style = this.options.style + " detail",
                element = this.element;

            if (style) {
                var styles = style.split(" ");
                $.each(styles, function() {
                    element.addClass("km-" + this);
                });
            }
        },

        _wrap: function() {
            var that = this,
                icon = that.options.icon,
                iconSpan = '<span class="km-icon km-' + icon,
                element = that.element,
                span = element.children("span"),
                image = element.find("img").addClass("km-image");

            if (!image[0] && icon) {
                if (!span[0]) {
                    iconSpan += " km-notext";
                }
                element.prepend($(iconSpan + '" />'));
            }
        }

    });

    ui.plugin(Button);
    ui.plugin(BackButton);
    ui.plugin(DetailButton);
})(window.kendo.jQuery);
(function($, undefined) {
    var kendo = window.kendo,
        ui = kendo.mobile.ui,
        Widget = ui.Widget,
        ACTIVE = "km-state-active",
        SELECT = "select",
        SELECTOR = "li:not(." + ACTIVE +")";

    var ButtonGroup = Widget.extend({
        init: function(element, options) {
            var that = this;

            Widget.fn.init.call(that, element, options);

            that.element.addClass("km-buttongroup").find("li").each(that._button);

            that.element.on("down", SELECTOR, "_mousedown");

            that.select(that.options.index);
        },

        events: [
            SELECT
        ],

        options: {
            name: "ButtonGroup",
            index: -1
        },

        current: function() {
            return this.element.find("." + ACTIVE);
        },

        select: function (li) {
            var that = this,
                index = -1;

            if (li === undefined || li === -1) {
                return;
            }

            that.current().removeClass(ACTIVE);

            if (typeof li === "number") {
                index = li;
                li = $(that.element[0].children[li]);
            } else if (li.nodeType) {
                li = $(li);
                index = li.index();
            }

            li.addClass(ACTIVE);
            that.selectedIndex = index;
        },

        _button: function() {
            var button = $(this).addClass("km-button"),
                icon = kendo.attrValue(button, "icon"),
                span = button.children("span"),
                image = button.find("img").addClass("km-image");

            if (!span[0]) {
                span = button.wrapInner("<span/>").children("span");
            }

            span.addClass("km-text");

            if (!image[0] && icon) {
                button.prepend($('<span class="km-icon km-' + icon + '"/>'));
            }
        },

        _mousedown: function(e) {
            if (e.which > 1) {
                return;
            }

            var that = this;
            that.select(e.currentTarget);
            that.trigger(SELECT);
        }
    });

    ui.plugin(ButtonGroup);
})(window.kendo.jQuery);
(function($, undefined) {
    var kendo = window.kendo,
        Node = window.Node,
        mobile = kendo.mobile,
        ui = mobile.ui,
        support = kendo.support,
        DataSource = kendo.data.DataSource,
        Widget = ui.Widget,
        ITEM_SELECTOR = ".km-list > li, > li",
        HIGHLIGHT_SELECTOR = ".km-listview-link, .km-listview-label",
        proxy = $.proxy,
        attrValue = kendo.attrValue,
        GROUP_CLASS = "km-group-title",
        ACTIVE_CLASS = "km-state-active",
        GROUP_WRAPPER = '<div class="' + GROUP_CLASS + '"><div class="km-text"></div></div>',
        GROUP_TEMPLATE = kendo.template('<li><div class="' + GROUP_CLASS + '"><div class="km-text">#= this.headerTemplate(data) #</div></div><ul>#= kendo.render(this.template, data.items)#</ul></li>'),
        WRAPPER = '<div class="km-listview-wrapper" />',

        NS = ".kendoMobileListView",
        LAST_PAGE_REACHED = "lastPageReached",
        CLICK = "click",
        CLICK_NS = CLICK + NS,

        CHANGE = "change",
        REQUEST_START = "requestStart",
        FUNCTION = "function",

        whitespaceRegExp = /^\s+$/,
        buttonRegExp = /button/;

    function toggleiOSLabel(e) {
        var input = $(e.target).find("input"),
            value = !input[0].checked;

        if (input.is(":radio")) {
            value = true;
        }

        input.attr("checked", value) // check the input
             .trigger("change"); // trigger the change event for any listeners (MVVM)
    }

    function whitespace() {
        return this.nodeType === Node.TEXT_NODE && this.nodeValue.match(whitespaceRegExp);
    }

    function addIcon(item, icon) {
        if (icon) {
            item.prepend('<span class="km-icon km-' + icon + '"/>');
        }
    }

    function enhanceItem(item) {
        addIcon(item, attrValue(item, "icon"));
    }

    function enhanceLinkItem(item) {
        var parent = item.parent(),
            itemAndDetailButtons = item.add(parent.children(kendo.roleSelector("detailbutton"))),
            otherNodes = parent.contents().not(itemAndDetailButtons).not(whitespace);

        if (otherNodes.length) {
            return;
        }

        item.addClass("km-listview-link")
            .attr(kendo.attr("role"), "listview-link");

        addIcon(item, attrValue(parent, "icon"));
    }

    function enhanceCheckBoxItem(label) {
        if (!label.children("input[type=checkbox],input[type=radio]").length) {
            return;
        }

        var item = label.parent();

        if (item.contents().not(label).not(function() { return this.nodeType == 3; })[0]) {
            return;
        }

        label.addClass("km-listview-label");
    }

    var ListView = Widget.extend({
        init: function(element, options) {
            var that = this;

            Widget.fn.init.call(that, element, options);

            element = that.element;

            options = that.options;

            element
                .on("down", HIGHLIGHT_SELECTOR, "_highlight")
                .on("move up cancel", HIGHLIGHT_SELECTOR, "_dim")
                .on("up", ITEM_SELECTOR, "_click");

            if (support.touch) {
                element.on("up", ".km-listview-label", toggleiOSLabel);
            }

            element.wrap(WRAPPER);
            that.wrapper = that.element.parent();

            that._footer();

            that._dataSource();

            that._bindScroller();

            that._fixHeaders();

            if (options.dataSource && that.options.autoBind) {
                that.dataSource.fetch();
            } else {
                that._style();
            }

            kendo.notify(that, ui);
        },

        events: [
            CLICK,
            LAST_PAGE_REACHED
        ],

        options: {
            name: "ListView",
            style: "",
            type: "flat",
            autoBind: true,
            fixedHeaders: false,
            template: "#:data#",
            headerTemplate: '<span class="km-text">#:value#</span>',
            appendOnRefresh: false,
            loadMore: false,
            loadMoreText: "Press to load more",
            endlessScroll: false,
            scrollTreshold: 30,
            pullToRefresh: false,
            pullTemplate: "Pull to refresh",
            releaseTemplate: "Release to refresh",
            refreshTemplate: "Refreshing",
            pullOffset: 140
        },

        setOptions: function(options) {
            Widget.fn.setOptions.call(this, options);
        },

        setDataSource: function(dataSource) {
            this.options.dataSource = dataSource;
            this._dataSource();
            if (this.options.autoBind) {
                dataSource.fetch();
            }
        },

        destroy: function() {
            var that = this;

            Widget.fn.destroy.call(that);

            that._unbindDataSource();
            that.stopEndlessScrolling();
            that.stopLoadMore();

            kendo.destroy(that.element);
        },

        refresh: function(e) {
            e = e || {};

            var that = this,
                element = that.element,
                options = that.options,
                dataSource = that.dataSource,
                view = dataSource.view(),
                loading = that.loading,
                appendMethod = "html",
                contents,
                data,
                item;

            if (e.action === "itemchange") {
                data = e.items[0];
                item = $(that.template(data));

                element.find("[data-" + kendo.ns + "uid=" + data.uid + "]").replaceWith(item);

                that.trigger("itemChange", {
                    item: item,
                    data: data,
                    ns: ui
                });

                that._style();
                return;
            }

            if (!that.template) {
                that._templates();
            }

            that._cacheDataItems(view);

            that.trigger("dataBinding");

            if (dataSource.group()[0]) {
                options.type = "group";
                contents = kendo.render(that.groupTemplate, view);
            } else {
                contents = kendo.render(that.template, view);
            }

            if (loading) {
                appendMethod = "append";
            } else if (options.appendOnRefresh) {
                appendMethod = "prepend";
            }

            element[appendMethod](contents);

            if (appendMethod === "html") {
                mobile.init(element.children());
            } else {
                mobile.init($(contents));
            }

            if (loading) {
                that.loading = false;
                that._calcTreshold();
                that._toggleLoader(false);
            }

            if (options.pullToRefresh) {
                that._scroller().pullHandled();
            }

            that._hideLoading();

            that._shouldFixHeaders();
            that._style();

            that.trigger("dataBound", { ns: ui });
        },

        _cacheDataItems: function(view) {
            var that = this, item;

            if (!that.element[0].firstChild) {
                that._firstOrigin = that._first = view[0];
                that._last = view[view.length - 1];
            }

            if (that._pulled) {
                item = view[0];
                that._pulled = false;

                if (item) {
                    that._first = item;
                }
            }

            if (that.loading) {
                item = view[view.length - 1];

                if (item) {
                    that._last = item;
                }
            }
        },

        items: function() {
            if (this.options.type === "group") {
                return this.element.find(".km-list").children();
            } else {
                return this.element.children();
            }
        },

        stopEndlessScrolling: function() {
            var that = this,
                scroller = that._scroller();

           if (scroller && that._loadIcon) {
               that.loading = false;
               that._loadIcon.parent().hide();

               scroller.unbind("resize", that._scrollerResize)
                       .unbind("scroll", that._scrollerScroll);

               that.trigger(LAST_PAGE_REACHED);
           }
        },

        stopLoadMore: function() {
           var that = this;

           if (that._loadButton) {
               that.loading = false;
               that._loadButton
                   .off(CLICK_NS)
                   .parent().hide();

               that.trigger(LAST_PAGE_REACHED);
           }
        },

        _dim: function(e) {
            this._toggle(e, false);
        },

        _highlight: function(e) {
            this._toggle(e, true);
        },

        _toggle: function(e, highlight) {
            if (e.which > 1) {
                return;
            }

            var clicked = $(e.currentTarget),
                item = clicked.parent(),
                role = attrValue(clicked, "role") || "",
                plainItem = (!role.match(buttonRegExp)),
                prevented = e.isDefaultPrevented();

            if (plainItem) {
                item.toggleClass(ACTIVE_CLASS, highlight && !prevented);
            }
        },

        _unbindDataSource: function() {
            var that = this;

            that.dataSource.unbind(CHANGE, that._refreshHandler)
                           .unbind(REQUEST_START, that._requestStartHandler);
        },

        _dataSource: function() {
            var that = this,
                options = that.options;

            if (that.dataSource && that._refreshHandler) {
                that._unbindDataSource();
            } else {
                that._refreshHandler = proxy(that.refresh, that);
                that._requestStartHandler = proxy(that._showLoading, that);
            }

            that.dataSource = DataSource.create(options.dataSource)
                                        .bind(CHANGE, that._refreshHandler);

            if (!options.pullToRefresh && !options.loadMore && !options.endlessScroll) {
                that.dataSource.bind(REQUEST_START, that._requestStartHandler);
            }
        },

        _fixHeader: function(e) {
            var i = 0,
                that = this,
                scroller = that._scroller(),
                scrollTop = e.scrollTop,
                headers = that.headers,
                headerPair,
                offset,
                header;

            if (that.fixedHeaders) {
                do {
                    headerPair = headers[i++];
                    if (!headerPair) {
                        header = $("<div />");
                        break;
                    }
                    offset = headerPair.offset;
                    header = headerPair.header;
                } while (offset > scrollTop);

                if (that.currentHeader != i) {
                    scroller.fixedContainer.html(header.clone());
                    that.currentHeader = i;
                }
            }
        },

        _shouldFixHeaders: function() {
            this.fixedHeaders = this.options.type === "group" && this.options.fixedHeaders;
        },

        _cacheHeaders: function() {
            var that = this,
                headers = [];

            if (that.fixedHeaders) {
                that.element.find("." + GROUP_CLASS).each(function(_, header) {
                    header = $(header);
                    headers.unshift({
                        offset: header.position().top,
                        header: header
                    });
                });

                that.headers = headers;
                that._fixHeader({scrollTop: 0});
            }
        },

        _fixHeaders: function() {
            var that = this,
                scroller = that._scroller();

            that._shouldFixHeaders();

            if (scroller) {
                kendo.onResize(function(){
                    that._cacheHeaders();
                });

                scroller.bind("scroll", function(e) {
                    that._fixHeader(e);
                });
            }
        },

        _bindScroller: function() {
            var that = this,
                options = that.options,
                dataSource = that.dataSource,
                scroller = that._scroller();

            if (!scroller) {
                return;
            }

            if (options.pullToRefresh) {
                scroller.setOptions({
                    pullToRefresh: true,
                    pull: function() {
                        var callback = options.pullParameters,
                            params = { page: 1 };

                        if (callback) {
                            params = callback.call(that, that._first);
                        }

                        that._pulled = true;
                        dataSource.read(params);
                    },
                    pullTemplate: options.pullTemplate,
                    releaseTemplate: options.releaseTemplate,
                    refreshTemplate: options.refreshTemplate
                });
            }

            if (options.endlessScroll) {
                that._scrollHeight = scroller.element.height();
                that._scrollerResize = function() {
                    that._scrollHeight = scroller.element.height();
                    that._calcTreshold();
                },
                that._scrollerScroll = function(e) {
                    if (!that.loading && e.scrollTop + that._scrollHeight > that._treshold) {
                        that._nextPage();
                    }
                };

                scroller.setOptions({
                    resize: that._scrollerResize,
                    scroll: that._scrollerScroll
                });
            }
        },

        _calcTreshold: function() {
            var that = this,
                scroller = that._scroller();

            if (scroller) {
                that._treshold = scroller.scrollHeight() - that.options.scrollTreshold;
            }
        },

        _nextPage: function() {
            var that = this,
                options = that.options,
                callback = options.endlessScrollParameters || options.loadMoreParameters,
                params;

            that.loading = true;
            that._toggleLoader(true);

            if (callback) {
                params = callback.call(that, that._firstOrigin, that._last);
            }

            if (!that.dataSource.next(params)) {
                that.stopLoadMore();
                that.stopEndlessScrolling();
            }
        },

        _templates: function() {
            var that = this,
                template = that.options.template,
                headerTemplate = that.options.headerTemplate,
                dataIDAttribute =  ' data-uid="#=data.uid || ""#"',
                templateProxy = {},
                groupTemplateProxy = {};

            if (typeof template === FUNCTION) {
                templateProxy.template = template;
                template = "#=this.template(data)#";
            }

            groupTemplateProxy.template = that.template = proxy(kendo.template("<li" + dataIDAttribute + ">" + template + "</li>"), templateProxy);

            if (typeof headerTemplate === FUNCTION) {
                groupTemplateProxy._headerTemplate = headerTemplate;
                headerTemplate = "#=this._headerTemplate(data)#";
            }

            groupTemplateProxy.headerTemplate = kendo.template(headerTemplate);

            that.groupTemplate = proxy(GROUP_TEMPLATE, groupTemplateProxy);
        },

        _click: function(e) {
            if (e.which > 1 || e.isDefaultPrevented()) {
                return;
            }

            var that = this,
                dataItem,
                item = $(e.currentTarget),
                target = $(e.target),
                buttonElement = target.closest(kendo.roleSelector("button", "detailbutton", "backbutton")),
                button = kendo.widgetInstance(buttonElement, ui),
                id = item.attr(kendo.attr("uid"));

            if (id) {
                dataItem = that.dataSource.getByUid(id);
            }

            if (that.trigger(CLICK, {target: target, item: item, dataItem: dataItem, button: button})) {
                e.preventDefault();
            }
        },

        _style: function() {
            var that = this,
                options = that.options,
                grouped = options.type === "group",
                element = that.element,
                inset = options.style === "inset";

            element.addClass("km-listview")
                .toggleClass("km-list", !grouped)
                .toggleClass("km-listinset", !grouped && inset)
                .toggleClass("km-listgroup", grouped && !inset)
                .toggleClass("km-listgroupinset", grouped && inset);

            if (grouped) {
                element
                    .children()
                    .children("ul")
                    .addClass("km-list");

                element.children("li").each(function() {
                    var groupHeader = $(this).contents().first();
                    if (!groupHeader.is("ul") && !groupHeader.is("div." + GROUP_CLASS)) {
                        groupHeader.wrap(GROUP_WRAPPER);
                    }
                });
            }

            that._enhanceItems();

            if (!element.parents(".km-listview")[0]) {
                element.closest(".km-content").toggleClass("km-insetcontent", inset); // iOS has white background when the list is not inset.
            }

            that._cacheHeaders();
        },

        _enhanceItems: function() {
            this.items().each(function() {
                var item = $(this),
                    child,
                    enhanced = false;

                item.children().each(function() {
                    child = $(this);
                    if (child.is("a")) {
                        enhanceLinkItem(child);
                        enhanced = true;
                    } else if (child.is("label")) {
                       enhanceCheckBoxItem(child);
                       enhanced = true;
                    }
                });

                if (!enhanced) {
                    enhanceItem(item);
                }
            });
        },

        _footer: function() {
            var that = this,
                options = that.options,
                loadMore = options.loadMore,
                loadWrapper;

            if (loadMore || options.endlessScroll) {
                that._loadIcon = $('<span style="display:none" class="km-icon"></span>');
                loadWrapper = $('<span class="km-load-more"></span>').append(that._loadIcon);

                if (loadMore) {
                    that._loadButton = $('<button class="km-load km-button">' + options.loadMoreText + '</button>')
                                        .on(CLICK_NS, proxy(that._nextPage, that));

                    loadWrapper.append(that._loadButton);
                }

                that.wrapper.append(loadWrapper);
            }
        },

        _toggleLoader: function(toggle) {
            var that = this,
                icon = that._loadIcon,
                button = that._loadButton;

            if (button) {
                button.toggle(!toggle);
            }

            if (toggle) {
                icon.css("display", "block");
            } else {
                icon.hide();
            }
        },

        _scroller: function() {
            var that = this, view;

            if (!that._scrollerInstance) {
                view = that.view();
                that._scrollerInstance = view && view.scroller;
            }

            return that._scrollerInstance;
        },

        _showLoading: function() {
            var view = this.view();
            if (view) {
                view.loader.show();
            }
        },

        _hideLoading: function() {
            var view = this.view();
            if (view) {
                view.loader.hide();
            }
        }
    });

    ui.plugin(ListView);
})(window.kendo.jQuery);
(function($, undefined) {
    var kendo = window.kendo,
        ui = kendo.mobile.ui,
        roleSelector = kendo.roleSelector,
        Widget = ui.Widget;

    function createContainer(align, element) {

        var items = element.find("[" + kendo.attr("align") + "=" + align + "]");

        if (items[0]) {
            element.prepend($('<div class="km-' + align + 'item" />').append(items));
        }
    }

    function toggleTitle(centerElement) {
        var siblings = centerElement.siblings();

        centerElement.toggleClass("km-show-title", (!!siblings[0] && $.trim(centerElement.text()) === ""));
        centerElement.toggleClass("km-no-title", !!centerElement.children("ul")[0]);
        centerElement.toggleClass("km-hide-title", centerElement.css("visibility") == "hidden" && !siblings.children().is(":visible"));
    }

    var NavBar = Widget.extend({
        init: function(element, options) {
            var that = this;

            Widget.fn.init.call(that, element, options);

            element = that.element;

            element.addClass("km-navbar").wrapInner($('<div class="km-view-title" />'));
            createContainer("left", element);
            createContainer("right", element);
            that.centerElement = element.find(".km-view-title");
        },

        options: {
            name: "NavBar"
        },

        title: function(value) {
            this.element.find(roleSelector("view-title")).text(value);
            toggleTitle(this.centerElement);
        },

        viewShow: function(view) {
            if (view.options.title) {
                this.title(view.options.title);
            } else {
                toggleTitle(this.centerElement);
            }
        },

        destroy: function() {
            Widget.fn.destroy.call(this);
            kendo.destroy(this.element);
        }
    });

    ui.plugin(NavBar);
})(window.kendo.jQuery);
(function($, undefined) {
    var kendo = window.kendo,
        mobile = kendo.mobile,
        ui = mobile.ui,
        proxy = $.proxy,
        Transition = kendo.fx.Transition,
        Pane = kendo.ui.Pane,
        PaneDimensions = kendo.ui.PaneDimensions,
        Widget = ui.Widget,

        // Math
        math = Math,
        abs  = math.abs,
        ceil = math.ceil,
        round = math.round,
        max = math.max,
        min = math.min,
        floor = math.floor,
        CHANGE = "change",
        CURRENT_PAGE_CLASS = "km-current-page";

    var ScrollView = Widget.extend({
        init: function(element, options) {
            var that = this;

            Widget.fn.init.call(that, element, options);

            element = that.element;

            element
                .wrapInner("<div/>")
                .addClass("km-scrollview")
                .append('<ol class="km-pages"/>');

            that.inner = element.children().first();
            that.pager = element.children().last();
            that.page = 0;

            that.inner.css("height", that.options.contentHeight);

            var movable,
                transition,
                userEvents,
                dimensions,
                dimension,
                pane;

            movable = new kendo.ui.Movable(that.inner);

            transition = new Transition({
                axis: "x",
                movable: movable,
                onEnd: proxy(that._transitionEnd, that)
            });

            userEvents = new kendo.UserEvents(element, {
                start: function(e) {
                    if (abs(e.x.velocity) * 2 >= abs(e.y.velocity)) {
                        userEvents.capture();
                    } else {
                        userEvents.cancel();
                    }

                    transition.cancel();
                },
                allowSelection: true,
                end: proxy(that._dragEnd, that)
            });

            dimensions = new PaneDimensions({
                element: that.inner,
                container: that.element
            });

            dimension = dimensions.x;
            dimension.bind(CHANGE, proxy(that.refresh, that));

            pane = new Pane({
                dimensions: dimensions,
                userEvents: userEvents,
                movable: movable,
                elastic: true
            });

            $.extend(that, {
                movable: movable,
                transition: transition,
                userEvents: userEvents,
                dimensions: dimensions,
                dimension: dimension,
                pane: pane
            });

            that.page = that.options.page;
        },

        options: {
            name: "ScrollView",
            page: 0,
            duration: 300,
            velocityThreshold: 0.8,
            contentHeight: "auto",
            bounceVelocityThreshold: 1.6
        },

        events: [
            CHANGE
        ],

        destroy: function() {
            Widget.fn.destroy.call(this);

            this.userEvents.destroy();

            kendo.destroy(this.element);
        },

        viewShow: function(view) {
            this.dimensions.refresh();
        },

        refresh: function() {
            var that = this,
                pageHTML = "",
                dimension = that.dimension,
                width = dimension.getSize(),
                pages,
                pageElements = that.element.find("[data-role=page]");

                pageElements.width(width);
                dimension.update(true);

                // if no pages present, try to retain the current position
                if (!pageElements[0]) {
                    that.page = Math.floor((-that.movable.x) / width);
                    that.scrollTo(that.page);
                }

                pages = that.pages = ceil(dimension.getTotal() / width);

                that.minSnap = - (pages - 1) * width;
                that.maxSnap = 0;

                for (var idx = 0; idx < pages; idx ++) {
                    pageHTML += "<li/>";
                }

                that.pager.html(pageHTML);
                that._updatePager();
        },

        content: function(html) {
           this.element.children().first().html(html);
           this.dimensions.refresh();
        },

        scrollTo: function(page) {
            this.page = page;
            this._moveTo(- page * this.dimension.getSize(), Transition.easeOutExpo);
        },

        _moveTo: function(location, ease) {
            this.transition.moveTo({ location: location, duration: this.options.duration, ease: ease });
        },

        _dragEnd: function(e) {
            var that = this,
                velocity = e.x.velocity,
                width = that.dimension.size,
                options = that.options,
                velocityThreshold = options.velocityThreshold,
                snap,
                approx = round,
                ease = Transition.easeOutExpo;

            if (velocity > velocityThreshold) {
                approx = ceil;
            } else if(velocity < -velocityThreshold) {
                approx = floor;
            }

            if (abs(velocity) > options.bounceVelocityThreshold) {
                ease = Transition.easeOutBack;
            }

            snap = max(that.minSnap, min(approx(that.movable.x / width) * width, that.maxSnap));

            this._moveTo(snap, ease);
        },

        _transitionEnd:  function() {
            var that = this,
                page = Math.round(- that.movable.x / that.dimension.size);

            if (page != that.page) {
                that.page = page;
                that.trigger(CHANGE, {page: page});
                that._updatePager();
            }
        },

        _updatePager: function() {
            this.pager.children().removeClass(CURRENT_PAGE_CLASS).eq(this.page).addClass(CURRENT_PAGE_CLASS);
        }
    });

    ui.plugin(ScrollView);
})(window.kendo.jQuery);
(function($, undefined) {
    var kendo = window.kendo,
        ui = kendo.mobile.ui,
        Widget = ui.Widget,
        support = kendo.support,
        CHANGE = "change",
        SWITCHON = "km-switch-on",
        SWITCHOFF = "km-switch-off",
        MARGINLEFT = "margin-left",
        ACTIVE_STATE = "km-state-active",
        TRANSFORMSTYLE = support.transitions.css + "transform",
        proxy = $.proxy;

    function limitValue(value, minLimit, maxLimit) {
        return Math.max(minLimit, Math.min(maxLimit, value));
    }

    var Switch = Widget.extend({
        init: function(element, options) {
            var that = this, width, checked, handleWidth;

            Widget.fn.init.call(that, element, options);

            that._wrapper();
            that._drag();
            that._background();
            that._handle();

            element = that.element[0];
            element.type = "checkbox";

            width = that.wrapper.width();
            handleWidth = that.handle.outerWidth(true);

            that.constrain = width - handleWidth;
            that.snapPoint = width / 2 - handleWidth / 2;
            that._animateBackground = true;

            checked = that.options.checked;
            if (checked === null) {
                checked = element.checked;
            }

            that.check(checked);
            kendo.notify(that, kendo.mobile.ui);
        },

        events: [
            CHANGE
        ],

        options: {
            name: "Switch",
            onLabel: "ON",
            offLabel: "OFF",
            checked: null
        },

        check: function(check) {
            var that = this,
                element = that.element[0];

            if (check === undefined) {
                return element.checked;
            }

            that._position(check ? that.constrain : 0);
            element.checked = check;
            that.wrapper
                .toggleClass(SWITCHON, check)
                .toggleClass(SWITCHOFF, !check);
        },

        destroy: function() {
            Widget.fn.destroy.call(this);
            this.userEvents.destroy();
        },

        toggle: function() {
            var that = this;

            that.check(!that.element[0].checked);
        },

        _move: function(e) {
            var that = this;
            e.preventDefault();
            that._position(limitValue(that.position + e.x.delta, 0, that.constrain));
        },

        _position: function(position) {
            var that = this;

            that.position = position;
            that.handle.css(TRANSFORMSTYLE, "translatex(" + position + "px)");

            if (that._animateBackground) {
                that.background.css(MARGINLEFT, that.origin + position);
            }
        },

        _start: function(e) {
            this.userEvents.capture();
            this.handle.addClass(ACTIVE_STATE);
        },

        _stop: function(e) {
            var that = this;

            that.handle.removeClass(ACTIVE_STATE);
            that._toggle(that.position > that.snapPoint);
        },

        _toggle: function (checked) {
            var that = this,
                handle = that.handle,
                element = that.element[0],
                value = element.checked,
                duration = 200,
                distance;

            that.wrapper
                .toggleClass(SWITCHON, checked)
                .toggleClass(SWITCHOFF, !checked);

            that.position = distance = checked * that.constrain;

            if (that._animateBackground) {
                that.background
                    .kendoStop(true, true)
                    .kendoAnimate({ effects: "slideMargin", offset: distance, reset: true, reverse: !checked, axis: "left", duration: duration });
            }

            handle
                .kendoStop(true, true)
                .kendoAnimate({
                    effects: "slideTo",
                    duration: duration,
                    offset: distance + "px,0",
                    reset: true,
                    complete: function () {
                        if (value !== checked) {
                            element.checked = checked;
                            that.trigger(CHANGE, { checked: checked });
                        }
                    }
                });
        },

        _background: function() {
            var that = this,
                background;

            background = $("<span class='km-switch-wrapper'><span class='km-switch-background'></span></span>")
                            .appendTo(that.wrapper)
                            .children(".km-switch-background");

            that.origin = parseInt(background.css(MARGINLEFT), 10);
            background.data("origin", that.origin);
            that.background = background;
        },

        _handle: function() {
            var that = this,
                options = that.options;

            that.handle = $("<span class='km-switch-container'><span class='km-switch-handle' /></span>")
                            .appendTo(that.wrapper)
                            .children(".km-switch-handle");

            that.handle.append('<span class="km-switch-label-on">' + options.onLabel + '</span><span class="km-switch-label-off">' + options.offLabel + '</span>');
        },

        _wrapper: function() {
            var that = this,
                element = that.element,
                wrapper = element.parent("span.km-switch");

            if (!wrapper[0]) {
                wrapper = element.wrap('<span class="km-switch"/>').parent();
            }

            that.wrapper = wrapper;
        },

        _drag: function() {
            var that = this;

            that.userEvents = new kendo.UserEvents(that.wrapper, {
                tap: function() {
                    that._toggle(!that.element[0].checked);
                },
                start: proxy(that._start, that),
                move: proxy(that._move, that),
                end: proxy(that._stop, that)
            });
        }
    });

    ui.plugin(Switch);
})(window.kendo.jQuery);
(function($, undefined) {
    var kendo = window.kendo,
        ui = kendo.mobile.ui,
        Widget = ui.Widget,
        ACTIVE_STATE_CLASS = "km-state-active",
        SELECT = "select";

    var TabStrip = Widget.extend({
        init: function(element, options) {
            var that = this;

            Widget.fn.init.call(that, element, options);

            that.element
               .addClass("km-tabstrip")
               .find("a").each(that._buildButton)
               .eq(that.options.selectedIndex).addClass(ACTIVE_STATE_CLASS);

            that.element.on("down", "a", "_release");
        },

        events: [
            SELECT
        ],

        switchTo: function(url) {
            this._setActiveItem(this.element.find('a[href$="' + url + '"]'));
        },

        clear: function() {
            this.currentItem().removeClass(ACTIVE_STATE_CLASS);
        },

        currentItem: function() {
            return this.element.children("." + ACTIVE_STATE_CLASS);
        },

        _release: function(e) {
            if (e.which > 1) {
                return;
            }

            var that = this,
                item = $(e.currentTarget);

            if (item[0] === that.currentItem()[0]) {
                return;
            }

            if (that.trigger(SELECT, {item: item})) {
                e.preventDefault();
            } else {
                that._setActiveItem(item);
            }
        },

        _setActiveItem: function(item) {
            if (!item[0]) {
                return;
            }
            this.clear();
            item.addClass(ACTIVE_STATE_CLASS);
        },

        _buildButton: function() {
            var button = $(this),
                icon = kendo.attrValue(button, "icon"),
                image = button.find("img"),
                iconSpan = $('<span class="km-icon"/>');

            button
                .addClass("km-button")
                .attr(kendo.attr("role"), "tab")
                    .contents().not(image)
                    .wrapAll('<span class="km-text"/>');

            if (image[0]) {
                image.addClass("km-image");
            } else {
                button.prepend(iconSpan);
                if (icon) {
                    iconSpan.addClass("km-" + icon);
                }
            }
        },

        viewShow: function(view) {
            var that = this;
            that.switchTo(view.id);
        },

        destroy: function() {
            Widget.fn.destroy.call(this);
        },

        options: {
            name: "TabStrip",
            selectedIndex: 0,
            enable: true
        }
    });

    ui.plugin(TabStrip);
})(window.kendo.jQuery);
