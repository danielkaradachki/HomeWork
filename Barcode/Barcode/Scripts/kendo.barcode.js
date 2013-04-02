kendo_module({  
    id: "barcode",
    name: "Barcode",
    category: "dataviz",
    description: "Barcode widget.",
    depends: ["dataviz-core", "dataviz-svg"]
});


(function ($, undefined) {
    var kendo = window.kendo,
        dataviz = kendo.dataviz,
        Widget = kendo.ui.Widget,
        Box2D = dataviz.Box2D,
        Text = dataviz.Text,
        BAR = 1,
        SPACE = 0,
        DEFAULT_QUIETZONE_LENGTH = 10;

    var Encoding  = kendo.Class.extend({
        init: function (options) {
            this.options = $.extend(this.options, options);         
        },       
        encode: function (value, width, height) {
            this.prepareValues(value, width, height);            
            this.addQuietZone();
            this.addStart();
            this.addValue();
            this.addCheckSum();
            this.addStop();
            this.addQuietZone();     
                
            return {
                baseUnit: this.baseUnit,
                pattern: this.pattern
            };
        },      
        prepareValues: function (value) {
            throw new Error("Not implemented");
        },
        addQuietZone: function () { 
            this.pattern.push([0, this.quietZoneLength]);
        },
        addStart: function () {
            
        },
        addCheckSum: function () {
            
        },
        addValue: function () {
           
        },
        addStop: function () {
            
        }
    }); 

    var encodings = {};

    // TO DO: validate value characters
    encodings.code39 =  Encoding.extend({
        prepareValues: function (value, width, height) {
            this.baseUnit = this.getBaseUnit(value, width, height);
            this.quietZoneLength = DEFAULT_QUIETZONE_LENGTH;
            var minHeight = Math.max(0.15 * width, 24);
            if (height < minHeight) {
                throw new Error("The specified height is not sufficient");
            }
            this.value = value;
            this.pattern = [];
        },
        addStart: function () {
             var character =  this.characterMap["start"];
             this.addPattern(character.pattern);
             this.addCharacterGap();  
        },        
        addValue: function () {
            var character;
            for(var i = 0; i < this.value.length; i++){
                character = this.characterMap[this.value.charAt(i)];
                this.addPattern(character.pattern);
                this.addCharacterGap();    
            }
        },
        addCheckSum: function () {
            if (this.options.addCheck) {
                var sum = 0,
                    mod43;
                for (var i = 0; i < this.value.length; i++) {
                    sum+= this.characterMap[this.value.charAt(i)].value;
                }

                mod43 = sum % 43;
                character = this.findCharacterByValue(mod43);
                this.addPattern(character.pattern);
                this.addCharacterGap();  
            }
        },
        addStop: function () {
            var character =  this.characterMap["start"];
             this.addPattern(character.pattern);
        }, 
        getBaseUnit: function (value, width, height) {
            var ratio = this.options.minRatio,
                length = value.length,
                baseUnit; 
            while ((baseUnit = this.calculateBaseUnit(length, width, ratio)) < 0.72 &&  
                ratio <= this.options.maxRatio) {
                ratio += 0.1;
            }
            
            if (ratio > this.options.maxRatio) {
                throw new Error("The width is not big enough for the value");
            }

            this.ratio = ratio;
            return baseUnit;
        },
        calculateBaseUnit:function(length, width, ratio){
            return width / ((length + 2 + (this.options.addCheck ? 1 : 0)) * (ratio + 2) * 3 + length + 1 + 2 * DEFAULT_QUIETZONE_LENGTH);
        },
        addPattern: function (pattern) {                
            for (var i = 0; i < pattern.length; i++) {
                if (pattern[i] == "b") {
                    this.pattern.push([BAR, 1]);
                }
                else if(pattern[i] == "B"){
                    this.pattern.push([BAR, this.ratio]);
                }
                else if(pattern[i] == "w"){
                    this.pattern.push([SPACE, 1]);
                }
                else if(pattern[i] == "W"){
                    this.pattern.push([SPACE, this.ratio]);
                }  
            }
        },
        findCharacterByValue: function (value) {
            for (var character in this.characterMap) {
                if (this.characterMap[character].value === value) {
                    return this.characterMap[character];
                }
            }
        },
        addCharacterGap: function () {
            this.pattern.push([0, 1]);
        },
        characterMap: {
            K: { pattern: "BwbwbwbWB", value: 20 },             
            R: { pattern: "BwbwbwBWb", value: 27 },             
            U: { pattern: "BWbwbwbwB", value: 30 },    
            Y: { pattern: "BWbwBwbwb", value: 34},         
            start: { pattern: "bWbwBwBwb"}
        },
        options: {
            ratio: 3,
            minRatio: 2,
            maxRatio: 3.4,
            addCheck: false            
        }
    });

    encodings.code128 = Encoding.extend({
        init: function (options) {
            this.options = $.extend(this.options, options);         
        },            
        prepareValues: function (value, width, height) {
            this.type = "B",
                code = value.charCodeAt(0);
            if (code < 32) {
                this.type = "A";
            }          
            else if(value.length > 3 && parseInt(value.substr(0,4))){
                this.type = "C";
            }  
            else if(code > 127 && code < 256 && code - 128 < 32){
                this.type = "A";
            }
            //if > 128 start character ?
        },
        getCharacter: function (char) {
            var code = char.charCodeAt(),
                mapCode;
            if (code < 32) {
                mapCode = code + 64;
            }
            else if(32 <= code && code < 128){
                mapCode = code + 32;
            }
            else if(char.length > 1){
                var number = parseInt(char);
                mapCode = code + 32;
            }
            else if(code > 127 &&  code< 256){
                mapCode = code - 128;
            }            
            return this.characterMap[mapCode];
        },
        addStart: function () {
            
        },
        addCheckSum: function () {
            
        },
        addValue: function () {
           
        },
        addStop: function () {
            
        },
        characterMap: {
            75: {pattern: "112331", value: 43},//K
            82: {pattern: "231131", value: 50}, //R
            85: {pattern: "213131", value: 53}, //U
            startA: { pattern: "211412", value: 103},
            startB: { pattern: "211214", value: 104},
            startC: { pattern: "211232", value: 105},
            fnc4: {},
            shiftA: {},
            shiftB: {},
            codeA: {},
            codeB: {},
            codeC: {}
        },
        options: {
            
        }    
    });

    var Barcode = Widget.extend({
        init: function (element, options) {                                     
             Widget.fn.init.call(this, element, options);
             this.element = element;            
             this.view = new (dataviz.ui.defaultView())(); 
             this.setOptions(options);                                
        },
        setOptions: function (options) {           
            if (!this.enocoding || ( options.encoding.name && this.options.encoding.name !== 
                    options.encoding.name.toLowerCase())){
                 this.encoding = new encodings[this.options.encoding.name.toLowerCase()](options.encoding);
            }
            this.options = $.extend(this.options, options);           
            this.value(this.options.value);
        },
        redraw: function () {
            var result = this.encoding.encode(this.value, 
                this.options.width, this.options.height);
            this.view.children = [];
            this.view.options.width = this.options.width;
            this.view.options.height = this.options.height + this.options.fontSize;
            this.addBackground();
            
            this.addElements(result.pattern, result.baseUnit);
            if (this.options.showText) {
               this.addText(this.value);
            }
            this.view.renderTo(this.element);
        },
        value: function(value){            
            this.value = value;
            this.redraw();            
        },
        addElements: function (pattern, baseUnit) {
            var step,
                position = 0;
            for (var i = 0; i < pattern.length; i++) {                               
             
                step = pattern[i][1] * baseUnit;       
                if(pattern[i][0] === BAR){
                     this.view.children.push(this.view.createRect(new Box2D(position, 0, position + step, this.options.height), 
                        { fill: this.options.lineColor}));  
                }

                position+= step;                
            }
        },
        addBackground: function () {
              this.view.children.push(this.view.createRect(new Box2D(0,0, this.options.width, this.options.height),
                { fill: this.options.backColor}));
        },
        getTextWidth: function (text, font) {
            var element = $("<div style='visibility:hidden;top:-1000px;left: -100px;position:absolute;font: " + 
                font + ";'>" + text + "</div>").appendTo(document.body);
            var width = element.width();
            element.remove();
            return width;
        },
        addText: function (text) {    
            var length = this.options.width,
                fontSize = this.options.fontSize,
                font = fontSize + "px " + this.options.fontFamily,
                textLength = text.length,
                x =  (length - this.getTextWidth(text, font)) / 2,
                y = this.options.height,
                baseline = this.options.fontSize;
            this.view.children.push(this.view.createText(text, {
                baseline: baseline, x: x, y: y, color: this.options.color,
                font: font
            }));
        },
        options: {
            name: "Barcode",
            value: "",
            encoding: {
                name: "code39"
            },
            width: 300,
            height: 100,
            lineColor: "black",
            backColor: "white",
            color: "black",
            showText: true,
            fontSize: 30,
            fontFamily: "sans-serif"                    
        }
    });

   dataviz.ui.plugin(Barcode);
})(window.kendo.jQuery);

               