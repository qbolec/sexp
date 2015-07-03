start
  = _ expression:expression _ {return expression }

expression
  = if
  / function
  / declaration
  / alternative

tupple
  = "{" _ "}" {
    return {
      type:"tupple",
      fields:[] ,
      start: offset(),
      end: offset()+text().length
    }
  }
  / "{" _ field:tupple_field fields:( _ "," _ tupple_field ) * ( _ "," ) ?  _ "}" {
    var all = [field];
    for(var i=0;i<fields.length;++i){
      all.push(fields[i][3]);
    }
    return {
      type:"tupple",
      fields: all,
      start: offset(),
      end: offset()+text().length
    }
  }

tupple_field
  = id:identifier _ ":" _  value:expression {return { key: id.name , value:value } }



if
  = "if" _ condition:expression _ "then" _ yes:expression _ "else" _ no:expression {
    return {
      type:"if",
      condition:condition,
      yes:yes,
      no:no,
      start: offset(),
      end: offset()+text().length
    }
  }

declaration
  = name:identifier _ "=" _ value:expression _ ";" _ body:expression {
    return {
      type: '=' ,
      name: name.name,
      value:value ,
      body: body,
      start: offset(),
      end: offset()+text().length
    }
  }


function
  = arg:identifier _ "->" _ body:expression {
    return {
      type: '->' ,
      arg: arg.name,
      body: body,
      start: offset(),
      end: offset()+text().length
    }
  }

alternative
  = first:conjunction others:(_ alternative_op _ conjunction)* {
    var res = first;
    for(var i=0;i<others.length;++i){
      res = {
        type:"operator",
        op:others[i][1],
        args : [ res , others[i][3]],
        start : res.start,
        end : others[i][3].end
      };
    }
    return res;
  }

conjunction
  = first:atom others:(_ conjunctive_op _ atom)* {
    var res = first;
    for(var i=0;i<others.length;++i){
      res = {
        type:"operator",
        op:others[i][1],
        args : [ res , others[i][3]],
        start : res.start,
        end : others[i][3].end
      };
    }
    return res;
  }

atom
  = op:negation_op _ arg:atom {
    return {
      type:"operator",
      op:op,
      args:[arg],
      start: offset(),
      end: offset()+text().length
    }
  }
  / left:infix_calls _ op:comparison_op _ right:infix_calls {
    return {
      type:"operator",
      op:op,
      args : [ left , right],
      start: offset(),
      end: offset()+text().length
    };
  }
  / infix_calls

infix_calls
  = first:sum others:(_ infix_function _ sum)* {
    var res = first;
    for(var i=0;i<others.length;++i){
      res = {
        type:"apply",
        foo: {
          type:"apply",
          foo:others[i][1],
          arg : res,
          start : res.start,
          end : others[i][1].end
        },
        arg : others[i][3],
        start : res.start,
        end : others[i][3].end
      };

    }
    return res;
  }

sum
  = first:product others:(_ additive_op _ product)* {
    var res = first;
    for(var i=0;i<others.length;++i){
      res = {
        type:"operator",
        op:others[i][1],
        args : [ res , others[i][3]],
        start : res.start,
        end : others[i][3].end
      };
    }
    return res;
  }


product
  = first:factor others:(_ multiplicative_op _ factor)* {
    var res = first;
    for(var i=0;i<others.length;++i){
      res = {
        type:"operator",
        op:others[i][1],
        args : [ res , others[i][3]],
        start : res.start,
        end : others[i][3].end
      };
    }
    return res;
  }




factor
  = first:non_call_factor others:(_ non_call_factor)* {
    var res=first;
    for(var i=0;i<others.length;++i){
      res = {
        type: "apply",
        foo: res,
        arg:others[i][1],
        start : res.start,
        end : others[i][1].end
      }
    };
    return res;
  }

literal
  = float
  / integer
  / string
  / boolean

non_call_factor
  = value:literal {
    return {
      type:'literal',
      value: value,
      start: offset(),
      end: offset()+text().length
    }
  }
  / owner:field_owner fields_chain:( "." identifier)* {
    var res=owner;
    for(var i=0;i<fields_chain.length;++i){
      res = {
        type:"select",
        owner:res,
        field: fields_chain[i][1].name,
        start : res.start,
        end : fields_chain[i][1].end
      };
    }
    return res;
  }
  / op:unary_op _ arg:non_call_factor {
    return {
      type:"operator",
      op:op,
      args:[arg],
      start: offset(),
      end: offset()+text().length
    }
  }

field_owner
  = name:identifier {
    return {
      type:'var',
      name: name.name,
      start: offset(),
      end: offset()+text().length
    };
  }
  / "(" _ expression:expression _ ")" {
    expression.start = offset();
    expression.end= offset()+text().length;
    return expression;
  }
  / tupple



comparison_op
  = "<="/">="/"<"/">"/"="

negation_op
  = "not"

alternative_op
  = "or"

conjunctive_op
  = "and"

unary_op
  = "~"

multiplicative_op
  = [*/]
  / "mod"
  / "div"

additive_op
  = [-+|]

infix_function
  = "`" foo:factor "`" {return foo;}
  

boolean
  = "true" {return true;}
  / "false"{return false;}


string
  = str:(["][^"]*["]) {return str[1].join("");}

float
  = digits:([0-9]+[.][0-9]+)  { return parseFloat(digits[0].join("")+'.'+digits[2].join(""), 10); }
integer "integer"
  = digits:[0-9]+ { return parseInt(digits.join(""), 10); }

identifier
  = !(keyword (!. / [^a-zA-Z0-9_])) chars:([_a-zA-Z][a-zA-Z0-9_]*) {
    return {
      name: chars[0]+chars[1].join(""),
      start: offset(),
      end: offset()+text().length
    }
  }

keyword
  = "if"/"then"/"else"/"and"/"or"/"not"/"mod"/"div"


_
  = skipable*

skipable
  = [#][^\n]*
  / [ \n\t\r]
