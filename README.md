sexp
====
Simple Expressions is a javascript library which aims to allow to execution untrusted code in a safe way.
Safty guarantees will include restricted access to environment (for example browser cookies), 
guaranteed success of computation (for example no possiblity of null pointer exception),
and guaranteed O(1) execution time (no recursion allowed).

Warning
----------
This is still work in progress and none of above claims currently holds because currently there is 
no type inference algorithm implemented, and all above guarantees rely on it.

However the language itself (as a set of gramar rules and semantics) is designed to support all above statements.

Some of these statements could also be made true by writing run time evaluator of this language, which would
guard the execution, however the current approach is to convert the code to pure java script and performing eval.
Frankly, for performance reasons (utilizing JIT capabilities of javascript engines) this is quite cool way of doing things,
and it will be quite safe, too once the type inference step will be performed before execution.

Motiviting Example
------------------
A motivating example can be found at http://vanisoft.pl/~lopuszanski/public/sexp/editor.html -- 
a Teacher can write a small script which generates a LaTeX source of assignment for students based on random seed.
This example uses an awsome library http://ace.c9.io/ as an editor and www.mathjax.org to render LaTeX.
This way everything (editing,parsing,executing,rendering) is done client side in a very responsive way.

Syntax
------
EXP = 
  STRING | #currently slashes there are no escape sequences so there is no way to type "
  NUMBER | #currently only integers
  TUPPLE | 
  IDENTIFIER |
  EXP OPERATOR EXP | #operators include <,<=,=,=>,>,and,or,not,+,-,/,%,*,|
  EXP EXP | #application does not require ()
  IDENTIFIER -> EXP | #function definition
  if EXP then EXP else EXP | 
  IDENTIFIER = EXP ; EXP | #this is "let" and currently is translated to imeddiate application
  EXP . IDENTIFIER  #this is field extraction
  
TUPPLE = { FIELD* }
FIELD = IDENTIFIER : EXP ,  #the last comma is optional

External Bindings
-----------------
It is often useful to let the script use some "library".
Currently type inference is not implemented so this is risky, but in next version you will specify
the type of all functions in provided library so that it is possible to statically determine if the code
use them in a sane way.
See integration/example/run.js to see how one can provide library to the script.

Multiary Functions
------------------
The language definition requires all functions to acept (and return) single value.
You can use named tupples if you need more data, or chain functions together for exampel

    max = x -> y ->  if x > y then x else y

This might get a bit tideous when providing external library to the execturor, as you have to 
uncurry functions by hand curently:

     sexp.evaluate('a->b->c->d->max (min a b) (min c d) ', [1,2,3,4], {
        'min' : function(a){return function(b){return Math.min(a,b);}},
        'max' : function(a){return function(b){return Math.max(a,b);}},
     });

Signaling Errors
----------------
There is no built in "raise"/"try catch" nor "call/cc" stuff.
There is no Maybe monad, nor variants.
This might change in the future.
But you can provide extensions (with side effects) to the evaluator yourself:

     sexp.evaluate('a->b->if b=0 then raise "division by zero" else a/b ', [1,0], {
        'raise' : function(msg){throw msg},
     });

Be creative, perhaps you could even implemnt try/catch this way!:)
