start
  = _ expression:expression _ {return expression }

expression
  = if
  / function
  / declaration
  / alternative

tupple
  = "{" _ "}" { return {type:"tupple", fields:[] } }
  / "{" _ field:tupple_field fields:( _ "," _ tupple_field ) * ( _ "," ) ?  _ "}" {
         var all = [field];
         for(var i=0;i<fields.length;++i){
           all.push(fields[i][3]);
         }
        return {type:"tupple", fields: all }
  }

tupple_field
  = id:identifier _ ":" _  value:expression {return { key: id , value:value } }



if
  = "if" _ condition:expression _ "then" _ yes:expression _ "else" _ no:expression { return {type:"if",condition:condition,yes:yes,no:no}}

declaration
  = name:identifier _ "=" _ value:expression _ ";" _ body:expression { return {type: '=' , name: name, value:value , body: body }; }


function
  = arg:identifier _ "->" _ body:expression { return {type: '->' , arg: arg, body: body }; }

alternative
  = first:conjunction others:(_ alternative_op _ conjunction)* {
    var res = first;
    for(var i=0;i<others.length;++i){
      res = {type:"operator", op:others[i][1] ,args : [ res , others[i][3]]};
    }
    return res;
  }

conjunction
  = first:atom others:(_ conjunctive_op _ atom)* {
    var res = first;
    for(var i=0;i<others.length;++i){
      res = {type:"operator", op:others[i][1] ,args : [ res , others[i][3]]};
    }
    return res;
  }

atom
  = op:negation_op _ arg:atom {return {type:"operator", op:op, args:[arg] }}
  / left:sum _ op:comparison_op _ right:sum { return {type:"operator", op:op ,args : [ left , right]}; }
  / sum

sum
  = first:product others:(_ additive_op _ product)* {
    var res = first;
    for(var i=0;i<others.length;++i){
      res = {type:"operator", op:others[i][1] ,args : [ res , others[i][3]]};
    }
    return res;
  }


product
  = first:factor others:(_ multiplicative_op _ factor)* {
   var res = first;
   for(var i=0;i<others.length;++i){
     res = {type:"operator", op:others[i][1] ,args : [ res , others[i][3]]};
   }
   return res;
  }




factor
  = chain:(non_call_factor _ )+ {var res=chain[0][0];for(var i=1;i<chain.length;i++){res= {type: "apply", foo: res, arg:chain[i][0]}};return res;}


non_call_factor
  = value:integer { return {type:'literal', value: value }; }
  / value:string { return {type:'literal', value:value }; }
  / owner:field_owner fields_chain:( "." identifier)* {
        var res=owner;
       for(var i=0;i<fields_chain.length;++i){
          res = {type:"select", owner:res, field: fields_chain[i][1]};
       }
       return res;
  }

field_owner
  = name:identifier { return {type:'var', name: name }; }
  / "(" _ expression:expression _ ")" { return expression; }
  / tupple



comparison_op
  = "<="/">="/"<"/">"/"="

negation_op
  = "not"

alternative_op
  = "or"

conjunctive_op
  = "and"


multiplicative_op
  = [*/]

additive_op
  = [-+|]

string
  = str:(["][^"]*["]) {return str[1].join("");}

integer "integer"
  = digits:[0-9]+ { return parseInt(digits.join(""), 10); }

identifier
  = !keyword chars:([_a-zA-Z][a-zA-Z0-9_]*) { return chars[0]+chars[1].join("") ;}

keyword
  = "if"/"then"/"else"/"and"/"or"/"not"


_
  = (([#][^\n]*)*[ \n\r\t])*

