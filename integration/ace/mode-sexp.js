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
    var supportFunctions = "integerP|integer|floatP|float|fractionP|fraction|min|max|TeX|raise";

    var keywordMapper = this.createKeywordMapper({
        "keyword.control": keywordControl,
        "keyword.operator": keywordOperator,
        "support.function": supportFunctions
    }, "identifier", true);

    this.$rules =
        {
    "start": [
        {
            token : "comment",
            regex : "#.*$"
        },
        {
            token : "constant.numeric",
            regex : "[+-]?\\d+\\b"
        },
        {
            token : "constant.language.boolean",
            regex : "(true|false)\\b"
        },
        {
            token : "keyword.operator",
            regex : "(<=|>=|->|[-+;/%*<>=().])"
        },
        {
                token : keywordMapper,
                regex : "[a-zA-Z_$][a-zA-Z0-9_$]*\\b"
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
