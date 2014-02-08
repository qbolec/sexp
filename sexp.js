var sexp = (function(){


  function parse(text){
    return sexp.parser.parse(text);
  }

  function compile(ast){
    switch(ast.type){
      case 'tupple':
        var s= "({";
        for(var i=0;i<ast.fields.length;++i){
          s+= (i?',"':'"') + ast.fields[i].key + '":' + compile(ast.fields[i].value);
        }
        s += "})";
        return s;
      case 'select':
        return '(' + compile(ast.owner) + '.' + ast.field + ')';
      case '->':
        return '(function (' + ast.arg + '){\nreturn ' + compile(ast.body) + ';})';
      case '=':
        // x=y;b  is equivalent to  (x=>b)(y)
        return compile({type: 'apply', foo : {type:'->', arg:ast.name, body:ast.body} , arg : ast.value } );
      case 'operator':
        var operators = {
          '=' : '==',
          'and' : '&&',
          'or' : '||',
          '|' : '+',
        };
        return '(' + compile(ast.args[0])  + (operators[ast.op] ? operators[ast.op]  : ast.op)  + compile(ast.args[1]) + ')';
      case 'apply':
        return '(' + compile(ast.foo) +  compile(ast.arg)  +')';
      case 'var':
        return '(' + ast.name + ')';
      case 'literal':
        return '(' + JSON.stringify(ast.value) + ')';
      case 'if':
        return '(' +  compile(ast.condition) + '?' + compile(ast.yes) + ':' + compile(ast.no)  +')';
      default:
        throw new Error("Unknown AST node type " + ast.type);
    }
  }

  function getType(ast, env){/*
    env = env || new Env({
      'Ops.-' : {type:"->", from: {type:"base",name:"number"}, to: {type:"->", from: {type:"base",name:"number"}, to: {type:"base",name:"number"} } },
    });
    switch(ast.type){
      case '->':
        var argType = {type:"quantified",name:"alfa"};
        var newEnv = env.set(ast.arg , argType);
        var bodyType = getType( ast.body, newEnv);
        return {type:'->', from: argType, to: bodyType};
      case '=':
        // x=y;b  is equivalent to  (x=>b)(y)
        return getType({type: 'apply', foo : {type:'->', arg:ast.name, body:ast.body} , arg : ast.value } , env );
      case 'operator':
        //let's pretend that  a+b is  (Ops.+)(a)(b)
        return getType({type: 'apply', foo : {type:'apply', foo: { type : 'variable', name: 'Ops.'+ast.op}, body:ast.args[0]} , arg : ast.args[1] } , env );
      case 'apply':
        var fooType = getType(ast.foo,env);
        var argType = getType(ast.arg,env);
        var functionalTypeShape = {type:"->", from: {type:"quantified",name:"FROM"}, to: {type:"quantified",name:"TO"} };
        var substitution = unify([ [fooType,functionalTypeShape], [argType,{type:"quantified",name:"FROM"}]  ] );
        return substitution['TO'];
      case 'var':
        if(!env.contains(ast.name)){
          throw new Error('Undefined variable ' + ast.name);
        }
        return env.get(ast.name);
      case 'literal':
        return  typeof(ast.value) === 'string' ? 'string' : 'number' ;
    }*/
  }


  function evaluate(js_source, args, lib){
    var libDefs = [];
    for(name in lib)if(lib.hasOwnProperty(name)){
      libDefs.push('var ' + name + ' = lib["' + name + '"];');
    }
    var wrapped = "(function(){" + libDefs.join('') + " return " + js_source + ";})()";
    var foo = eval(wrapped);
    var result = foo;
    for(var i=0;i<args.length;++i){
       result = result.call(null,args[i]);
    }
    return result;
  }

  function registerLibrary(){

  }

  return {
    parse : parse,
    compile : compile,
    evaluate : evaluate,
    getType : getType
  };

})();
