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
guard the execution, however the current approach is to convert the code to pure javascript and perform single `eval()` call on the output to construct a javascript function equivalent to the user provided script.
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
Thanks to Didier Rémy, the author of [Type Inference for Records in a Natural Extension of ML](https://www.cs.cmu.edu/~aldrich/courses/819/row.pdf), which inspired the current version of type inference.

Syntax
------
I hope I do not have to elaborate more than:

    EXP = 
      STRING | #currently there are no escape sequences so there is no way to express character "
      NUMBER | #currently only integers and floats writen in fixed point notation
      TUPPLE | 
      IDENTIFIER |
      EXP OPERATOR EXP | #operators include <,<=,=,=>,>,and,or,+,-,/,%,*,| (as concatenation), mod, div
      UNARY_OPERATOR EXP | #unary operators are ~ (as unary minus), not (as boolean negation)
      EXP EXP | #application does not require ()
      IDENTIFIER -> EXP | #function definition
      if EXP then EXP else EXP | 
      IDENTIFIER = EXP ; EXP | #this is a polymorphic, non-recursive "let" 
      EXP . IDENTIFIER  #this is field extraction
      
    TUPPLE = { FIELD* }
    FIELD = IDENTIFIER : EXP ,  #the last comma is optional

You can write comments using #. You can add round brackets to enforce operator precedence.
For details of syntax refer to [syntax.pegjs](https://github.com/qbolec/sexp/blob/master/integration/syntax.pegjs).

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
You need json2.js (or any other JSON.stringfiy).

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
      'raise' : new sexp.QuantifiedType('any', new sexp.FunctionType(new sexp.BaseType('string'),new VariableType('any'))),
    }));

As you can see, sexp.BaseType, sexp.FunctionType and sexp.TuppleType are used to build types inside libTypes.
The special sexp.QuantifiedType and sexp.VariableType can be used to build polymorphic types.
Please note, that a field of a tupple CAN NOT be a polymorphic function, but a type of the whole tupple can be polymorphic.
In the above example the symbol 'raise' is defined to have the type '\forall any . string -> any', which makes it possible to use this function in many different contexts.

The returned `type` is also built of the same components: BaseType, FunctionType, and TuppleType, and it can ocassionally contain QuantifiedType and VariableType if the expression has a polymorphic type.
All types have a `toString` method implemented so you can easily debug the type.
All types have a `type` field which is either `"base"`,`"->"`,`"tupple"`, `"quantified"`,or `"variable"`.

The inference algorithm used is a variation of Algorithm W, as suggested in [Type Inference for Records in a Natural Extension of ML](https://www.cs.cmu.edu/~aldrich/courses/819/row.pdf) by Didier Rémy.
It traverses the abstract syntax tree of the parsed expression stating assertions about type equalities, extending the environment (a mapping of symbol names to their types) and building the resulting type term.
Equalities between two types decomposed into equalities between type variables and handled using union-find.
The only non-standard thing inspired by the algorithm of Didier Rémy is to extend the meaning of equality for tupples so that the order of fields is commutative - this small change makes it easier to treat tupples as (openended) list's of fields which is suitable for matching.

If equalities can not be satisfied (for example due to recursion) a TypeException is thrown, and it contains information about particular location in code which caused the violation (this can be useful for syntax highlighting).
The algorithm can also throw Exception if some other problem occured.

The `x=y;b` syntax defines `x` to be equal `y` in expression `b`, and is treated as a polymorphic declaration.
In particular `compare = p1 -> p2 -> if p1.x=p2.x then p1 else p2; ...` can be used both for 2-D points and 3-D points in the same expression. This example also shows how row polymorphism can help achieve similar results to subtyping - the function accepts any records which have field `x` which is comparable (so it can be `number` or `string` or `boolean`).
The `=` operator is polymorphic and accpepts any BaseType arguments, as long as both of them have the same type.
This can lead to some cryptic error messages in cases where the exact type of arguments can not be further narrowed down, as the algorithm can correctly infere that both arguments must be `base(alpha)` but has no way of expressing it as a Type. 
This is perhaps a bad design of the API..sorry.
You can work around it by writing code which inposes more restrictions on variables - for example to force both compared operands to be `number` you can add `or a=0 and a=1` somewhere.

Another way to overcome this, if you know what will be the types of arguments passed to the program you can "augment" the ast tree by adding extra `{type:"apply",foo:...,arg:..}` nodes on top of the root before calling `sexp.infereType(ast,..)`, as to simulate application of these arguments and only then run the type inference. Alternatively you can wrap the `source` with `"("+source+") 1 "bla" 2"` before runining `sexp.parse`.

