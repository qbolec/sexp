sexp
====
Simple Expressions is a javascript library which aims to allow to execution of untrusted code in a safe way.
Safty guarantees will include restricted access to environment (for example browser cookies), 
guaranteed success of computation (for example no possiblity of null pointer exception),
and guaranteed O(1) execution time (no recursion allowed).
The language is functional and looks like this:

    t ->  
      uo = users_online(t);
      if uo = 0 then 0
      else
        ca = comments_added(t);
        ca/uo

Which you can convert to folowing javascript using `foo=sexp.link(sexp.compile(sexp.parse(source)),{})` :

    (function (t){
      return ((function (uo){
        return (((uo)==(0))?(0):((function (ca){
          return ((ca)/(uo));
         })((comments_added)(t))));
      })((users_online)(t)));
    })
        
So you can then call it using `foo(t)`.


Warning
----------
This is still work in progress and none of above claims currently holds because currently type inference is not 100% reliable.

However the language itself (as a set of gramar rules and semantics) is designed to support all above statements.

Some of these statements could also be made true by writing runtime evaluator of this language, which would
guard the execution, however the current approach is to convert the code to pure javascript and perform single eval call on the output to construct a javascript function equivalent to the user provided script.
Frankly, for performance reasons (utilizing JIT capabilities of javascript engines) this is quite cool way of doing things,
and it will be quite safe, too once the type inference step will be performed before execution.
Also by using foo.toString() you can extract the javascript source code of compiled script which allows even further optimizations.

Motiviting Example
------------------
A motivating example can be found at http://vanisoft.pl/~lopuszanski/public/sexp/editor.html -- 
a Teacher can write a small script which generates a LaTeX source of assignment for students based on random seed.
This example uses an awsome library http://ace.c9.io/ as an editor and www.mathjax.org to render LaTeX.
This way everything (editing,parsing,executing,rendering) is done client side in a very responsive way.

Thanks
------
Big thanks to authors of http://pegjs.majda.cz/online as without their parser this project would not be possible.
In particular the file sexp_parser.js is generated using it.

Syntax
------
I hope I do not have to elaborate more than:

    EXP = 
      STRING | #currently slashes there are no escape sequences so there is no way to type "
      NUMBER | #currently only integers
      TUPPLE | 
      IDENTIFIER |
      EXP OPERATOR EXP | #operators include <,<=,=,=>,>,and,or,+,-,/,%,*,| (as concatenation), mod, div
      UNARY_OPERATOR EXP | #unary operators are ~ (as unary minus), not (as boolean negation)
      EXP EXP | #application does not require ()
      IDENTIFIER -> EXP | #function definition
      if EXP then EXP else EXP | 
      IDENTIFIER = EXP ; EXP | #this is "let" and currently is translated to imeddiate application
      EXP . IDENTIFIER  #this is field extraction
      
    TUPPLE = { FIELD* }
    FIELD = IDENTIFIER : EXP ,  #the last comma is optional

You can write comments using #. You can add round brackets to enforce operator precedence.

External Bindings
-----------------
It is often useful to let the script use some "library".
If you want to use type inference you have to provide types of all functions from the library so that it is possible to statically determine if the code
use them in a sane way.
TODO: See integration/example/run.js to see how one can provide library to the script.

Multiary Functions
------------------
The language definition requires all functions to acept (and return) single value.
You can use named tupples if you need more data, or chain functions together for example

    max = x -> y ->  if x > y then x else y

This might get a bit tideous when providing external library to the execturor, as you have to 
uncurry functions by hand curently:

     sexp.link(sexp.compile(sexp.parse('a->b->c->d->max (min a b) (min c d) ')),{
        'min' : function(a){return function(b){return Math.min(a,b);}},
        'max' : function(a){return function(b){return Math.max(a,b);}},
     })(1,2,3,4);

Signaling Errors
----------------
There is no built in "raise"/"try catch" nor "call/cc" stuff.
There is no Maybe monad, nor variants.
This might change in the future.
But you can provide extensions (with side effects) to the evaluator yourself:

     sexp.link(sexp.compile(sexp.parse('a->b->if b=0 then raise "division by zero" else a/b ')),{
        'raise' : function(msg){throw msg},
     })(1,0);

Be creative, perhaps you could even implemnt try/catch this way!:)

Installation
------------
You need json2.js (or any other JSON.stringfiy), underscore.js (or lodash.js), hm.. I think that's it.

If you need to extend the syntax of the language, you may find file syntax.pegjs helpful,
as with it and the super cool http://pegjs.majda.cz/online project you can generate better version of sexp_parser.js.

If you gonna use http://ace.c9.io/ you may need integration/ace/mode-sexp.js file to support basic syntax highlighting.
See integration/example/run.js to see how you can tie the editor and parser together to display compile errors etc.
You can add syntax extra highlighting rules to mode-sexp.js for you external library functions to aid users.


Usage
-----
There are several steps involved in executing your script.
This is to give you a chance to save intermediate results of transformations to optimize repetitive execution of the same script.
These steps are:

* sexp.parse(sexp_source) which returns abstract syntax tree 
* sexp.compile(ast) which returns javascript source equivalent to the original sexp source
* sexp.link(js_source, library) which makes functions defined in library visible to the script and returns a callable function. 
 
The function returned by sexp.link accepts arbitrary number of arguments and applies them one by one.

Type Inference
--------------
This is still work in progress. Type inference is performed by using

    sexp.infereType(ast, libTypes)
    
For example :

    var number = new sexp.BaseType('number');
    var numberToString = new sexp.FunctionType(number,new sexp.BaseType('string'));
    var numberToNumber = new sexp.FunctionType(number,number);
    var numberToNumberToNumber = new sexp.FunctionType(number,numberToNumber);
    var bottom = new sexp.BottomType();
    var type = ( sexp.infereType(sexp.parse('a -> b -> if a=0 then raise "log base is zero" else Math.log a b'),{
      'Math' : new sexp.TuppleType({
          'E' : number,
          'PI' : number,
          'ln' : numberToNumber,
          'log' : numberToNumberToNumber,
          'abs' : numberToNumber,
          'ceil' : numberToNumber,
          'floor' : numberToNumber,
          'round' : numberToNumber,
          'sgn' : numberToNumber,
          'cos' : numberToNumber,
          'acos' : numberToNumber,
          'sin' : numberToNumber,
          'sqrt' : numberToNumber,
          'asin' : numberToNumber,
          'tan' : numberToNumber,
          'atan' : numberToNumber,
          'pow' : numberToNumberToNumber,
          'atan2' : numberToNumberToNumber,
          'min' : numberToNumberToNumber,
          'max' : numberToNumberToNumber,
      }),
      'raise' : new sexp.FunctionType(new sexp.BaseType('string'),bottom),
    }));

As you can see, sexp.BaseType, sexp.FunctionType and sexp.TuppleType are used to build types inside libTypes.
The special sexp.BottomType type is used for `raise` raise return value, as `raise` never returns.
The returned `type` is also built of the same components: BaseType, FunctionType, TuppleType and BottomType, but it can ocassionally contain QuantifiedType if there is not much the algorithm can tell about a variable.
All types have `toString` method implemented so you can easily debug the type.
All types have `type` field which is either `"quantified"`,`"base"`,`"->"`,or `"tupple"`. (Currently bottom is just a quantified variable, sorry about that).

The inference algorithm used is quite simple: it builds a list of "type inequalities" and tries to find assignment of types to subexpressions which satisfies all these inequalities by starting from assigning BottomType to all of them and then gradually "bumping up" the types as to satisfy each unsatisied constraint.
Either a fixed point is found, or the algorithm throws `TypeError` with an error (which has a nice `toString` method and `source` field which points to the `ast` node which triggered the inequality which can not be satisifed).

Actually it is perhaps possible that the algorithm will stuck in an endless loop (I am not sure) in case of some nasty tupples inequalities. 

The types are monomorphic (currently), which means that the each subexpression (including user defined functions) will be assigned exactly one type, so function like `a -> b -> c if c then a else b` can not be used in a same program for numbers and for tupples. 
The only polymorphic thing right now is `=` operator which allows you to compare two strings, or two numbers.
And BottomType which can be "unified" with any other type which allows one to write things like `if c then raise "a" else 7`. 
In future I would love to add full fledged polymorphism, but it is to hard for me right now to combine it with type inequalities, and I need type inequalities for tupples, so that when you write `magnitude = p -> p.x*p.x +p.y*p.y` you can safely use that function for `magnitude {x:1,y:2}` but also for `magnitude {x:1,y:2,label:"green"}`.

The downside of using "fixedpoint algorithm" based on "lower bound inequalities" is that sometimes the algorithm can not tell anything interesting about the type of a function. For example the function `x -> x*x` "obviously requires x to be a number" but for my algorithm it merely "requires x to be at most a number", and since it reports the lowest possible fixed point it will report `"a0->number"` as the type of this function. However it will correctly report a type error once you try to actually pass something which is not a number to such a function, for example `(x -> x*x) "bla")` will throw TypeError as type of `"bla"`, which is `string` will become a lowerbound for the type of `x`, and will lead to unsatisfiable inequality `string<number`.

To overcome this, if you know what will be the types of arguments passed to the program you can "augment" the ast tree by adding extra `{type:"apply",foo:...,arg:..}` nodes on top of the root before calling `sexp.infereType(ast,..)`, as to simulate application of these arguments and only then run the type inference. Alternatively you can wrap the `source` with `"("+source+") 1 "bla" 2"` before runining `sexp.parse`.

