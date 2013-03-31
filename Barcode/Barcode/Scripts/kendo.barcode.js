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
        Box2D = dataviz.Box2D,
        RATIO = "ratio",
        START = "start";
        QUIET_ZONE = "quietZone",
        CHARACTER_MAP = "characterMap";

    var Encoding  = kendo.Class.extend({
        init: function (view, options) {
            this.view = view;
            this.options = $.extend(this.options, options);
            this.setOptions(this.options);
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
            this.baseUnit = this.options.baseUnit;   
            this.height = this.options.height;
            this.width = this.options.width;
        },
        prepareValues: function (value) {
            this.position = 0;
        },
        addQuietZone: function () { 
            
        },
        addStart: function () {
            
        },
        addCheck: function (value) {
            this.position-= this._interCharacterGap();
        },
        addData: function (value) {
            for (var i = 0; i < value.length; i++) {
                this.position = this._addPatternElements(this._getCharacterPattern(value[i]), this.position) +  
                    this._interCharacterGap();                            
            }
        },
        addStop: function () {
            
        },
        addText: function (value) {    
            //which element to use in order to be able to center the text at baseline                  
            this.view.children.push(this.view.createText(value, {
                baseline: 30, x: this.width / 2 - this.baseUnit * 10, y: this.height, color: this.options.color,
                font: "30px sans-serif"
            }));
        },
        _addPatternElements: function (pattern, position, forceSpace) {
            var step,
                multiple;

            for (var i = 0; i < pattern.length; i++) {                               
                multiple = isNaN(pattern[i][1]) ?  this[pattern[i][1]] : pattern[i][1];
                step = multiple * this.baseUnit;       
                if(pattern[i][0] === 1){
                     this.view.children.push(this.view.createRect(new Box2D(position, 0, position + step, this.height), 
                        { fill: this.options.lineColor}));  
                }
                else if(forceSpace && pattern[i][0] === 0){
                    this.view.children.push(this.view.createRect(new Box2D(position, 0, position + step, this.height), 
                        { fill: this.options.backColor}));
                }

                position+= step;                
            }
            return position;
        },
        _interCharacterGap: function () {
            return this.baseUnit;
        },
        _getCharacterPattern: function(character){
            return this[CHARACTER_MAP][character].pattern;
        },
        _findCharacterByIndex: function(index){
            var i = 0;
            for (var character in this.characterMap) {
                if(i === index){
                    return character;
                }
                i++;
            }
        }
    });

    var encodings = {
        code39: Encoding.extend({
            init: function (view, options) {            
                Encoding.prototype.init.call(this, view, $.extend(this.options, options));  
                this[RATIO] = this.options[RATIO];    
            },
            addQuietZone: function () {         
               this.position = this._addPatternElements(this._getCharacterPattern(QUIET_ZONE), this.position, true);
            },
            addStart: function () {
                this.position = this._addPatternElements(this._getCharacterPattern(START), this.position);
                this.position+= this._interCharacterGap();
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
                   character = this._findCharacterByIndex(remainder);

                   this.position = this._addPatternElements(character, this.position);
                }
            },
            addStop: function () {
                this.addStart();
            }, 
            characterMap: {
                K: { pattern: [[1, RATIO], [0, 1], [1, 1], [0, 1], [1, 1], [0, 1], [1, 1], [0, RATIO], [1, RATIO]], value: 20 },             
                R: { pattern: [[1, RATIO], [0, 1], [1, 1], [0, 1], [1, 1], [0, 1], [1, RATIO], [0, RATIO], [1, 1]], value: 27 },             
                U: { pattern: [[1, RATIO], [0, RATIO], [1, 1], [0, 1], [1, 1], [0, 1], [1, 1], [0, 1], [1, RATIO]], value: 30 },             
                start: { pattern: [[1, 1], [0, RATIO], [1, 1], [0, 1], [1, RATIO], [0, 1], [1, RATIO], [0, 1], [1, 1]]},
                quietZone: {pattern: [[0, 10]]}
            },
            options: {
                baseUnit: 3,
                ratio: 3,
                minRatio: 1.8,
                maxRatio: 3.4,
                addCheck: false
            }
        }),
        code128: Encoding.extend({
            init: function (view, options) {            
                Encoding.prototype.init.call(this, view, $.extend(this.options, options));     
            },
            addQuietZone: function () {         

            },
            addStart: function () {

            },
            addCheck: function (value) {

            },
            addStop: function () {

            }, 
            options: {
                baseUnit: 3,
                characterMap: {
                    K: { pattern: [[1, 1], [0, 1], [1, 2], [0, 3], [1, 3], [0, 1]], value: 43 },
                    R: { pattern: [[1, 2], [0, 3], [1, 1], [0, 1], [1, 3] , [0, 1]], value: 50 },
                    U: { pattern: [ [1, 2], [0, 1], [1, 3], [0, 1], [1, 3], [0, 1]], value: 53 },
                    startA: { pattern: [ [1, 2], [0, 1], [1, 1], [0, 4], [1, 1], [0, 2]], value: 50 }            
                }
            }
        })
    };

    var Barcode = ChartElement.extend({
        init: function (element, options) {                                     
             ChartElement.fn.init.call(element, options);
             this.element = element;            
             this.view = new (dataviz.ui.defaultView())();   
             this.setOptions(options);                                
        },
        setOptions: function (options) {
            this.options = $.extend(this.options, options);
            this.encoding = new encodings[this.options.type.toLowerCase()]
                (this.view, $.extend(this.options, options, {baseUnit: this.options.width / 100}));
             this.value(this.options.value);
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
            backColor: "white",
            color: "black",
            showText: true          
        }
    });

   dataviz.ui.plugin(Barcode);
})(window.kendo.jQuery);

               