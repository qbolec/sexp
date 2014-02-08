   delete Function.prototype.bind;

    Function.implement({

        /*<!ES5-bind>*/
        bind: function(that){
            var self = this,
                args = arguments.length > 1 ? Array.slice(arguments, 1) : null,
                F = function(){};

            var bound = function(){
                var context = that, length = arguments.length;
                if (this instanceof bound){
                    F.prototype = self.prototype;
                    context = new F;
                }
                var result = (!args && !length)
                    ? self.call(context)
                    : self.apply(context, args && length ? args.concat(Array.slice(arguments)) : args || arguments);
                return context == that ? result : context;
            };
            return bound;
        },
        /*</!ES5-bind>*/
    });

    var editor = ace.edit("source");
    var Range = ace.require('ace/range').Range;
    editor.setTheme("ace/theme/monokai");
    editor.getSession().setMode("ace/mode/sexp");
    editor.setOption("showPrintMargin", false);
    editor.focus();
    editor.gotoLine(5,4);
var last_marker = null;
function result(task){

  $('error_info').setStyle('display','none');
  $('output_info').setStyle('display','block');
  $$('#resultTeX .question')[0].set('text',task.question);
  $$('#resultHTML .question')[0].set('text',task.question);
  _.each(['A','B','C','D'],function(letter){
    $$('#resultTeX .answers .' + letter)[0].set('text',task.answers[letter]);
    $$('#resultHTML .answers .' + letter)[0].set('text',task.answers[letter]);
  });
  MathJax.Hub.Queue(["Typeset",MathJax.Hub,$('resultHTML')]);
}
function error(e){
  $('error_info').setStyle('display','block');
  $('output_info').setStyle('display','none');
  $('error_info').set('text',e.toString());
}
function run(){
  var UserDefinedException = function(message){
     this.message = message;
  }
  UserDefinedException.prototype.name = "UserDefinedException";
  UserDefinedException.prototype.toString = function(){return this.name + ": "+ this.message};
  try{
    editor.getSession().clearAnnotations();
    if(last_marker)
      editor.getSession().removeMarker(last_marker);
    console.log("Building ast");
    var ast = sexp.parse(editor.getValue());
    console.log("Compiling");
    var foo = sexp.compile(ast);
    try{
      console.log("Evaluating");
      var task =  sexp.evaluate(foo, $('args').value.split(',').map(function(x){return +x}), {
        'TeX' : Tex,
        'min' : function(a){return function(b){return Math.min(a,b);}},
        'max' : function(a){return function(b){return Math.max(a,b);}},
        'raise' : function(text){throw new UserDefinedException(text);}
      });
     _.each(['A','B','C','D'],function(letter1){
       _.each(['A','B','C','D'],function(letter2){
        if(letter1!=letter2 && task.answers[letter1]==task.answers[letter2]){
          throw new UserDefinedException("Odpowiedź " + letter1 + " i odpowiedź " + letter2 + " są takie same");
        }
      });
    });
     //console.log(text,last_text);
        //last_text = text;
        //console.log(foo.toString());
      result(task);
    }catch(e){
      error(e);
    }
  }catch(e){
    editor.getSession().setAnnotations([{column:e.column,row:e.line-1,raw:'woot',text:e.toString(),type:'error'}]);

    var range = new Range(e.line-1, e.column-1, e.line-1, e.column);
    last_marker = editor.getSession().addMarker(range,"sexp_error","text");
    error(e);
  }
  console.log("Done");
}

var lazy_run = _.debounce(run,500);
lazy_run();
$('args').addEvent('input',lazy_run);
editor.getSession().on('change',lazy_run);

$('randomize').addEvent('click',function(){
  $('args').value=$('args').value.split(',').map(function(x){return +Math.floor(Math.random()*20-10)}).join(' , ')
  lazy_run();
});
