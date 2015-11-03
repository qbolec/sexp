ace.define('ace/mode/sexp', ['require', 'exports', 'module' , 'ace/lib/oop', 'ace/mode/text', 'ace/tokenizer', 'ace/mode/sexp_highlight_rules'], function(require, exports, module) {


var oop = require("../lib/oop");
var TextMode = require("./text").Mode;
var Tokenizer = require("../tokenizer").Tokenizer;
var SexpHighlightRules = require("./sexp_highlight_rules").SexpHighlightRules;

var Mode = function() {
    this.HighlightRules = SexpHighlightRules;
};
oop.inherits(Mode, TextMode);

(function() {

    this.lineCommentStart = ";";

    this.$id = "ace/mode/sexp";
}).call(Mode.prototype);

exports.Mode = Mode;
});


ace.define('ace/mode/sexp_highlight_rules', ['require', 'exports', 'module' , 'ace/lib/oop', 'ace/mode/text_highlight_rules'], function(require, exports, module) {


var oop = require("../lib/oop");
var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;

var SexpHighlightRules = function() {
    var keywordControl = "if|else|then";
    var keywordOperator = "not|and|or|div|mod";
    /*
    _.flatten((new TaskTemplateExecutor()).plugins.map(function(plugin){
      var names=[];
      function extractNames(prefix,type){
          if(type.type=='->')names.push(prefix);
          else if(type.type=='tupple'){
            type.forTypeField(function(type,field){
              extractNames(prefix + "." + field ,type);
            })
          }
      }
      _.each(plugin.getTypes(),function(type,name){
          extractNames(name,type);
      });

      return names;
    })).join("|");
    */
    var supportFunctions =
        "Draw.frontView|Draw.axonometry|Draw.stroke|Draw.fill|Draw.under|Draw.axis|Draw.grid|Draw.angle|Draw.rightAngle|Draw.text|Geometry.vector|Geometry.trajectory|Geometry.point|Geometry.circle|Geometry.sphere|Geometry.segment|Geometry.triangle|Geometry.tetragon|Geometry.line|Geometry.arc|Geometry.plane|Geometry.atSegmentFraction|Geometry.atTrajectoryFraction|Geometry.lineOfSegment|Geometry.rotateX|Geometry.rotateY|Geometry.rotateZ|Geometry.degreesToRadians|Geometry.lineFromPoints|Geometry.normalizeVector|Geometry.scaleVector|Geometry.vectorLength|Geometry.setLengthOfVector|Geometry.flipVector|Geometry.pointFromVector|Geometry.vectorFromPoint|Geometry.vectorFromPoints|Geometry.bigCircleOfSphere|Geometry.circleToSphere|Geometry.addVectors|Geometry.addVectorToPoint|Geometry.vectorProduct|Geometry.scalarProduct|Geometry.planeOfCircle|Geometry.toPlaneCastPoint|Geometry.startOfArc|Geometry.endOfArc|Geometry.pointOnCircleInDirection|Geometry.pointOnSphereInDirection|Geometry.intersectionOfCircleAndLine|Geometry.intersectionOfSphereAndLine|Geometry.intersectionOfPlaneAndLine|Geometry.intersectionOfLines|Geometry.distance|Geometry.circleFromPoints|Geometry.intersectionOfCircles|Geometry.further|TeX.float|TeX.fraction|TeX.integer|TeX.root|TeX.mixedFraction|TeX.floatP|TeX.fractionP|TeX.integerP|TeX.rootP|TeX.mixedFractionP|ln|log|abs|ceil|floor|round|sgn|cos|acos|sin|sqrt|asin|tan|atan|pow|atan2|min|max|gcd|lcm|factorial|binomial|Polish.dopasujDoLiczebnika|raise|Text.part|Text.length";

    var keywordMapper = this.createKeywordMapper({
        "keyword.control": keywordControl,
        "keyword.operator": keywordOperator,
        "support.function": supportFunctions,
        "constant.language":
            "E|PI|"+
            "Geometry.UP|Geometry.RIGHT|Geometry.DOWN|Geometry.LEFT|Geometry.FORWARD|Geometry.BACK|Geometry.HERE|Geometry.ORIGIN|" +
            "Draw.BLACK|Draw.GRAY|Draw.WHITE|Draw.EMPTY|Draw.STRIPED|Draw.FULL|Draw.SOLID|Draw.DASHED|Draw.DOTTED" ,
    }, "identifier");

    this.$rules =
        {
    "start": [
        {
            token : "comment",
            regex : "#.*$"
        },
        {
            token : "constant.numeric",
            regex : "[~]?\\d+\\b"
        },
        {
            token : "constant.language.boolean",
            regex : "(true|false)\\b"
        },
        {
            token : "keyword.operator",
            regex : "(<=|>=|->|[-+;/%*<>=().~])"
        },
        {
                token : keywordMapper,
                regex : "[a-zA-Z_$][a-zA-Z0-9_$]*(?:\\.[a-zA-Z_$][a-zA-Z0-9_$]*)*\\b"
        },
        {
            token : "string",
            regex : '"(?=.)',
            next  : "qqstring"
        }
    ],
    "qqstring": [
        {
            token : "string",
            regex : '[^"]+'
        },
        {
            token : "string",
            regex : '"',
            next  : "start"
        }
    ]
}

};

oop.inherits(SexpHighlightRules, TextHighlightRules);

exports.SexpHighlightRules = SexpHighlightRules;
});
