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
        ChartElement = dataviz.ChartElement,
        Box2D = dataviz.Box2D;
    

    var Encoding  = kendo.Class.extend({
        init: function (view, options) {
            this.view = view;
            this.options = $.extend(this.options, options);
            this.setOptions(this.options);
            this.initDrawingFunctions();
        },
        getType: function (type) {
            var lowerType = type.toLowerCase();
            if (lowerType == "code39") {
                return Code39;
            }
            else if(lowerType == "128") {
    
            }
        },
        addElements: function (value) {
            this.prepareValues(value);
            this.addQuietZone();
            this.addStart();
            this.addData(value);
            this.addCheck(value);
            this.addStop();
            this.addQuietZone();
            if (this.options.showText) {
                this.addText(value);
            }            
        },
        setOptions: function(options){           
            this.characterMap = this.options.characterMap;   
            this.baseUnit = this.options.baseUnit;   
            this.height = this.options.height;
            this.width = this.options.width;
        },
        initDrawingFunctions: function(){
            
        },
        prepareValues: function (value) {
            this.position = 0;
        },
        addQuietZone: function () { 
            
        },
        addStart: function () {
            
        },
        addCheck: function (value) {
    
        },
        addData: function (value) {
            for (var i = 0; i < value.length; i++) {
                this.position = this._addCharacter(value[i], this.position);
            }
        },
        _addCharacter: function (character, position) {
            var pattern = this.characterMap[character].pattern,
                position = this.position;
             for (var i = 0; i < pattern.length; i++) {
                position = this._drawingFunctions[pattern[i]].call(this,position);
            }
            
            return position + this.baseUnit; 
        },
        addStop: function () {
            
        },
        addText: function (value) {          
            this.view.children.push(this.view.createText(value, {
                baseline: 30, x: this.width / 2 - this.baseUnit * 10, y: this.height, color: "black",
                font: "30px sans-serif"
            }));
        },
        options: {
            characterMap: {},          
        },
        _drawingFunctions: {}
    });

    var Code39 = Encoding.extend({
        init: function (view, options) {            
            Encoding.prototype.init.call(this, view, $.extend(this.options, options));  

            this.ratio = this.options.ratio;    
        },
        initDrawingFunctions: function () {
           this._drawingFunctions = {
                W: function (position) {
                    return position  + this.baseUnit * this.ratio;
                },
                w: function (position) {
                    return position + this.baseUnit;
                },
                b: function (position) {                    
                    this.view.children.push(this.view.createRect(new Box2D(position, 0, position + this.baseUnit, this.height), 
                        { fill: "black"}));                      
                    return position +  this.baseUnit;
                },
                B: function (position) {
                    this.view.children.push(this.view.createRect(new Box2D(position, 0, position + this.baseUnit * this.ratio, this.height), 
                        { fill: "black"}));
                    return position + this.baseUnit * this.ratio;
                },
                Q: function (position) {
                    this.view.children.push(this.view.createRect(new Box2D(position, 0, position + this.baseUnit * 10, this.height), 
                        { fill: "white"}));                    
                    return position + this.baseUnit * 10;
                }
           };
           //use lines
//           this._drawingFunctions = {
//                W: function (position) {
//                    return position  + this.baseUnit * this.ratio;
//                },
//                w: function (position) {
//                    return position + this.baseUnit;
//                },
//                b: function (position) {    
//                    var x = position + this.baseUnit / 2;             
//                    this.view.children.push(this.view.createLine(x, 0, x, this.height, 
//                        { stroke: "black", strokeWidth: this.baseUnit, strokeLineCap: "butt"}));           
//                    return position +  this.baseUnit;
//                },
//                B: function (position) {
//                    var x = position + (this.baseUnit * this.ratio) / 2;              
//                    this.view.children.push(this.view.createLine(x, 0, x, this.height, 
//                        { stroke: "black", strokeWidth: (this.baseUnit * this.ratio), strokeLineCap: "butt"}));                 
//                    return position + this.baseUnit * this.ratio;
//                },
//                Q: function (position) {
//                    var x = position + (this.baseUnit * 10) / 2;              
//                    this.view.children.push(this.view.createLine(x, 0, x, this.height, 
//                        { stroke: "white", strokeWidth: this.baseUnit * 10, strokeLineCap: "butt"}));                 
//                    return position + this.baseUnit * 10;
//                }
//           };
        },
        addQuietZone: function () {         
           this.position += this._drawingFunctions["Q"].call(this, this.position);
        },
        addStart: function () {
            this.position = this._addCharacter("*", this.position);
        },
        addCheck: function (value) {
            if (this.options.addCheck) {
                var sum = 0,
                    remainder,
                    character,
                    index = 0;
               for (var i = 0; i < value.length; i++) {
                   sum+= this.characterMap[value[i]].value;
               }
               remainder= sum % 43;
               for (var char in this.characterMap) {
                    if(index === remainder){
                        character = char;
                        break;
                    }
                    index++;
               }
               this.position = this._addCharacter(character, this.position);
            }
        },
        addStop: function () {
            this.addStart();
        }, 
        options: {
            baseUnit: 3,
            ratio: 3,
            minRatio: 1.8,
            maxRatio: 3.4,
            addCheck: false,
            characterMap: {
                0: { pattern: "bwbWBwBwb", value: 0 },
                1: { pattern: "BwbWbwbwB", value: 1 },
                2: { pattern: "bwBWbwbwB", value: 2 },
                3: { pattern: "BwBWbwbwb", value: 3 },
                4: { pattern: "bwbWBwbwB", value: 4 },
                5: { pattern: "BwbWBwbwb", value: 5 },
                6: { pattern: "bwBWBwbwb", value: 6 },
                7: { pattern: "bwbWbwBwB", value: 7 },
                8: { pattern: "BwbWbwBwb", value: 8 },
                9: { pattern: "bwBWbwBwb", value: 9 },
                A: { pattern: "BwbwbWbwB", value: 10 },
                B: { pattern: "bwBwbWbwB", value: 11 },
                C: { pattern: "BwBwbWbwb", value: 12 },
                D: { pattern: "bwbwBWbwB", value: 13 },
                E: { pattern: "BwbwBWbwb", value: 14 },
                F: { pattern: "bwBwBWbwb", value: 15 },
                G: { pattern: "bwbwbWBwB", value: 16 },
                H: { pattern: "BwbwbWBwb", value: 17 },
                I: { pattern: "bwBwbWBwb", value: 18 },
                J: { pattern: "bwbwBWBwb", value: 19 },
                K: { pattern: "BwbwbwbWB", value: 20 },
                L: { pattern: "bwBwbwbWB", value: 21 },
                M: { pattern: "BwBwbwbWb", value: 22 },
                N: { pattern: "bwbwBwbWB", value: 23 },
                O: { pattern: "BwbwBwbWb", value: 24 },
                P: { pattern: "bwBwBwbWb", value: 25 },
                Q: { pattern: "bwbwbwBWB", value: 26 },
                R: { pattern: "BwbwbwBWb", value: 27 },
                S: { pattern: "bwBwbwBWb", value: 28 },
                T: { pattern: "bwbwBwBWb", value: 29 },
                U: { pattern: "BWbwbwbwB", value: 30 },
                V: { pattern: "bWBwbwbwB", value: 31 },
                W: { pattern: "BWBwbwbwb", value: 32 },
                X: { pattern: "bWbwBwbwB", value: 33 },
                Y: { pattern: "BWbwBwbwb", value: 34 },
                Z: { pattern: "bWBwBwbwb", value: 35 },
                "-": { pattern: "bWbwbwBwB", value: 36 },
                ".": { pattern: "BWbwbwBwb", value: 37 },
                " ": { pattern: "bWBwbwBwb", value: 38 },
                "$": { pattern: "bWbWbWbwb", value: 39 },
                "/": { pattern: "bWbWbwbWb", value: 40 },
                "+": { pattern: "bWbwbWbWb", value: 41 },
                "%": { pattern: "bwbWbWbWb", value: 42 },
                "*": { pattern: "bWbwBwBwb"}
            }
        }
    });

    var Barcode = ChartElement.extend({
        init: function (element, options) {                                     
             ChartElement.fn.init.call(element, options);
             this.element = element;            
             this.view = new (dataviz.ui.defaultView())();             
             this.encoding = new (Encoding.prototype.getType(this.options.type))
                (this.view, $.extend(this.options, options, {baseUnit: this.options.width / 100}));
             this.value(options.value);
        },
        setOptions: function (options) {
            this.options = $.extend(this.options, options);
            this.encoding = new (Encoding.prototype.getType(this.options.type))(this.view, $.extend(this.options, {baseUnit: this.options.width / 100}));
        },
        value: function(value){
            this.value = value;
            this.view.children = [];
            this.encoding.addElements(value);  
            this.view.renderTo(this.element);
        },
        options: {
            name: "Barcode",
            value: "",
            type: "Code39",
            width: 300,
            height: 100,
            lineColor: "black",
            showText: true          
        }
    });

   dataviz.ui.plugin(Barcode);
})(window.kendo.jQuery);

               