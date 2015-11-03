var sexp = (function(){
  //
  // Utility functions which have nothing to do with the algorithm itself
  //
  function forEach(o,f){
    for(var k in o)if(o.hasOwnProperty(k)){
      f(o[k],k);
    }
  }
  function map(array,iteratee){
    //hard to believe, but these code from lodash.js is actually faster than native Array.map, and at the same time cross-browser, so ...
    var index = -1;
    var length = array.length;
    var result = Array(length);

    while (++index < length) {
      result[index] = iteratee(array[index], index, array);
    }
    return result;
  }
  function assert(condition, message) {
    if (!condition) {
      throw new Error(message||"Assertion failed");
    }
  }

  //
  // Defintion of Terms used internally to represent Types.
  // While the public API of this library exposes only Types, it is easier to express algorithms for Terms.
  // We use following definiton:
  //
  // Term ::=   Atom(string) | Foo(string,List<Term>) | Variable(string)
  //
  // While every Type can be translated into a Term, not every Term corresponds to a valid Type.
  // We try not to create such "malformed" Terms, but sometimes, due to the fancy rule for equality operator, we run into a situation,
  // where the Term can not be translated into a Type because it contains Variable in a place unexpected for a Type,
  // in particular the equality operator forces its arguments to be Foo("base",Variable("alpha")),
  // which looks like an unfinished BaseType... I'm sorry about that :/
  // You can avoid that by rewriting your code so as to make sure the more concrete type is found (i.e. by adding "or a=1 and a=0" which forces BaseType("number"))
  //

  function Atom(name){
    this.kind='atom';
    this.name=name;
  }
  Atom.prototype.toString=function(){
    return '"'+this.name+'"';
  }
  function Foo(name,children){
    this.kind = 'foo';
    this.name = name;
    this.children = children;
  }
  Foo.prototype.toString=function(){
    return this.name + '('+ this.children.join(',') + ')';
  }
  function Variable(id){
    this.kind = 'variable';
    this.id = id;
  }
  Variable.prototype.toString=function(){
    return 'a'+this.id;
  }
  //
  // Functions operating on Terms, which do not really depend on the algorithm details such as Env or Equations
  //
  free_variable_id = 0;
  function freshVariable(){
    return new Variable(++free_variable_id);
  }

  function preorderWalk(term,f){
    f(term);
    if(term.kind == 'foo'){
      for(var i=0;i<term.children.length;++i){
        preorderWalk(term.children[i],f);
      }
    }
  }
  function transform(term,f){
    if(term.kind == 'foo'){
      var children = [];
      var changed = false;
      for(var i=0;i<term.children.length;++i){
        var newChild = transform(term.children[i],f);
        children.push(newChild);
        changed = changed || (newChild!=term.children[i]);
      }
      return f(term,children,changed)
    }else{
      return f(term);
    }
  }
  function findAndReplaceVariable(term,soughtVariableId,replacement){
    return transform(term,function(term,children,changed){
      switch(term.kind){
        case 'atom':
          return term;
        case 'variable':
          return (term.id == soughtVariableId)?replacement:term;
        case 'foo':
          return changed ? new Foo(term.name,children): term;
      }
    })
  }

  function extractVariableIds(term){
    var seen={};
    var variableIds = [];
    preorderWalk(term,function(subterm){
      if(subterm.kind=='variable'){
        if(!(subterm.id in seen)){
          seen[subterm.id]=true;
          variableIds.push(subterm.id);
        }
      }
    })
    return variableIds;
  }

  function instantiate(term){
    if(term.kind === 'foo' && term.name == 'quantified'){
      assert(term.children.length == 2);
      assert(term.children[0].kind == 'variable');

      var body = instantiate(term.children[1]);
      var fresh = freshVariable();

      return findAndReplaceVariable(body,term.children[0].id,fresh);
    }else{
      return term;
    }
  }

  //
  // Definiton of various Types
  // Types are a public API of this library, and represent reasonable fragments of Terms
  // Unfortunatelly in current implementation Types are not Terms, but can be translated into a term using toTerm().
  //

  function VariableType(id){
    this.type = 'variable';
    this.id = id;
  }
  VariableType.prototype.toString = function(){
    return 'a' + this.id;
  }
  VariableType.prototype.toTerm = function(){
    return new Variable(this.id);
  }

  function QuantifiedType(id,quantified){
    this.type = 'quantified';
    this.id = id;
    this.quantified = quantified;
  }
  QuantifiedType.prototype.toString = function(){
    return '\\forall a' + this.id + '.' + this.quantified.toString() ;
  }
  QuantifiedType.prototype.toTerm = function(){
    return new Foo('quantified',[ new Variable(this.id)  ,this.quantified.toTerm() ]);
  }

  function BaseType(name){
    this.type = 'base';
    this.name = name;
  }
  BaseType.prototype.toString = function(){
    return this.name;
  }
  BaseType.prototype.toTerm = function(){
    return new Foo('base',[new Atom(this.name)]);
  }

  function FunctionType(from,to){
    this.type = '->';
    this.from = from;
    this.to = to;
  }
  FunctionType.prototype.toString = function(){
    return '(' + this.from.toString() + '->' + this.to.toString() + ')';
  }
  FunctionType.prototype.toTerm = function(){
    return new Foo('foo',[this.from.toTerm(),this.to.toTerm()]);
  }

  function TuppleType(fieldToType,rest){
    var me = this;
    this.type = 'tupple';
    me.fields = {};
    me.rest = rest||null;
    forEach(fieldToType,function(t,f){
      me.fields[f] = t;
    });
  }
  TuppleType.prototype.toString = function(){
    var s= "{";
    var sep = '';
    this.forTypeField(function(t,f){
      s+= sep + f + ':' + t.toString();
      sep = ',';
    });
    if(this.rest){
      s += sep + '...:' + this.rest.toString();
    }
    s += "}";
    return s;
  }
  TuppleType.prototype.toTerm = function(){
    var list = this.rest === null ? new Atom('nil') : this.rest.toTerm();
    this.forTypeField(function(t,f){
      list = new Foo('cons',[ new Foo('field',[new Atom(f),t.toTerm()]) ,list])
    });
    return new Foo('tupple',[list]);
  }
  TuppleType.prototype.hasField = function(k){
    return this.fields.hasOwnProperty(k);
  };
  TuppleType.prototype.getField = function(k){
    return this.fields[k];
  };
  TuppleType.prototype.forTypeField = function(f){
    forEach(this.fields,f);
  };
  // The TuppleType.prototype.toTerm produces a list of fields as a subterm.
  // We want to be able to reconstruct the hash of fields from such a list.
  // This list can end with Atom("nil") or with Variable(alpha), and we want to get this tail as well.
  // This function returns the `fields` hash, and the `other` (null or variable term)
  function normalizeTupple(term){
    switch(term.kind){
      case 'variable':
        return {other:term,fields:{}};
      case 'foo':
        assert(term.name == 'cons');
        assert(term.children.length == 2);
        var tupple=normalizeTupple(term.children[1]);
        assert(term.children[0].kind == 'foo');
        assert(term.children[0].name == 'field');
        assert(term.children[0].children.length == 2);
        assert(term.children[0].children[0].kind == 'atom');
        tupple.fields[term.children[0].children[0].name] = term.children[0].children[1];
        return tupple;
      case 'atom':
        assert(term.name == 'nil');
        return {other:null,fields:{}};
    }
  }

  //I need a backdoor to plug an "unfinished" Type subterm into a Type
  //to handle the type of equality operator, which is \forall alpha. base(alpha)->base(alpha)->bool,
  //where unfortunatelly base(alpha) is not a valid Type, while it is a valid Term.
  //By using TermType as an adapter I can plug any Term into a Type.
  function TermType(term){
    this.term = term;
  }
  TermType.prototype.toString = function(){
    return '<magic>';
  }
  TermType.prototype.toTerm = function(){
    return this.term;
  }

  // This function converts the internal Term representation into a public Type representation.
  // It is supposed to be dual to the Type.toTerm().
  function termToType(term){
    switch(term.kind){
      case 'variable':
        return new VariableType(term.id);
      case 'foo':
        switch(term.name){
          case 'quantified':
            return new QuantifiedType(term.children[0].id,termToType(term.children[1]));
          case 'foo':
            return new FunctionType(termToType(term.children[0]),termToType(term.children[1]))
          case 'base':
            if(term.children[0].kind == 'atom'){
              return new BaseType(term.children[0].name);
            }else{
              throw Error('term is not a type');
            }
          case 'tupple':
            var tupple = normalizeTupple(term.children[0]);
            var fieldToType={};
            forEach(tupple.fields,function(val,key){
              fieldToType[key]=termToType(val);
            });
            return new TuppleType(fieldToType,tupple.other?termToType(tupple.other):null);
          default:
            throw Error('term is not a type');
        }
      case 'atom':
      default:
        throw Error('term is not a type');
    }
  }


  //
  // Env represents our assumptions about symbols which were declared using "x=y;b" or "x->b".
  // The type inference algorithm performs a DFS trough the abstract syntax tree, and such declarations
  // intuitevly form "a stack" of meanings assigned to symbols by the programmer.
  // Symbols defined using "x=y;b" are assigned a polymorphic type infered from "y".
  // Symbols defined using "x->b" are assigned a variable type which is later refined by analyzing b.
  //

  function Env(){

  }
  // This is useful for "scope checking" during parsing/type inference to make sure that the symbol referenced by the programmer is defined in current scope
  Env.prototype.containsVariableName = function(name){
    return ('N_' + name) in this;
  };
  // When processing "x=y;b" declaration, after the type of "y" is found, and before we assign it to symbol "x",
  // we need to quantify all type variables which are local to the term y, that is which are not variables assigned to symbols in Env.
  // This function checks if any symbol on the stack is assigned to a variable with given id - that would mean that this particular symbol s
  // was declared using "s->b", and that this type variable represents the type of "s" and is thus not local to "y".
  Env.prototype.containsVariableId = function(id){
    return ('V_' + id) in this;
  }
  // Environment can retrive the meaning assigned to a symbol by using getFreshClone("x")
  // This name was supposed to remind that in case of polymorphic "x=y;b" declarations, we need to replace quantifed variables with fresh variables
  Env.prototype.getFreshClone = function(name){
    return instantiate(this['N_' + name]);
  };
  Env.prototype.set = function(name,term) {
    this['N_' + name] = term;
    if(term.kind=='variable'){
      this['V_'+term.id] = true;
    }
  }
  // Uses javascript prototype chaining to implement the scope chain.
  // The new environment uses the old one as a prototype which has the needed property that
  // symbols with conflicting names are resolved using the freshest definition.
  Env.prototype.extend = function(name,type) {
    var TMP = function(){};
    TMP.prototype = this;
    var newEnv = new TMP();
    newEnv.set(name,type);
    return newEnv;
  };

  //
  // The type inference algorithm uses a single Equations object to keep track of all equalities between terms.
  // This object is mutable, and accumulates all the knowledge as the type inference traverses the abstract syntax tree.
  // The equalities between terms are added using assertEqual(term1,term2) and are internally decomposed into equalities between two variables,
  // or a variable and non-variable.
  // These are stored in a union-find data structure, where each variable points either to a another variable or to a non-variable term.
  // As we do not allow recursive types a TypeError is reported if a variable is equated to a term which contains this variable.
  // As in usual union-find we perform some optimizations (path compresion).
  // The lvl arguments are used to make sure that we do not run into infinite loop and exceed stack limit.
  // Current implementation seems to handle correctly all test cases, but in the past this helped a lot in debugging,
  // as without such a help it is really difficult to catch and debug stack overflows (i.e. Chrome does not break on this particular exception :/).
  //

  function Equations(){
    //union find data structure
    this.variableIdToTerm = {};
  }
  //aka "find". It stops resolving as soon as a non-variable is found, or the variable is the representative of its equivalence class.
  Equations.prototype.resolveShallow=function(term,lvl){
    lvl|=0;
    assert(lvl<100,'loop');
    if(term.kind === 'variable' && term.id in this.variableIdToTerm){
      return this.variableIdToTerm[term.id]=this.resolveShallow(this.variableIdToTerm[term.id],lvl+1);
    }
    return term;
  }
  //These one does not stop as long as there is a variable which can be replaced. This always terminates as we do not allow recursive types.
  //It is usefull :
  // - before occurCheck (as occurences can be hidden "inside" variables)
  // - before presenting output to the user (as the API uses Types not Terms so we need to resolve the Term before it can be translated into a Type)
  // - after "x=y;b" polymorphic declaration, to learn the type of y, and know which variables need to be quantified
  Equations.prototype.resolveDeep=function(term,lvl){
    lvl|=0;
    term = this.resolveShallow(term);
    assert(lvl<100,'loop');
    var me = this;
    if(term.kind === 'foo'){
      return new Foo(term.name,map(term.children,function(child){
        return me.resolveDeep(child,lvl+1);
      }));
    }else{
      return term;
    }
  }
  //an optimized variant used for resolving the whole list of tupple fields
  //without resolving the items of the list themselves.
  //I've tested that this really improves performance of matching the two lists.
  //My guess is that this is faster because:
  // - we skip resultion of the boring Foo('field',[Atom('fieldname')... part
  // - all we do care about is to match the correspondig fields together. So if one tupple has x of type alpha, and the other has x of type beta,
  // it is faster to make alpha=beta than alpha=resolve(beta)...I guess. Not really sure about this one :)
  Equations.prototype.resolveTail=function(term,lvl){
    lvl|=0;
    term = this.resolveShallow(term);
    assert(lvl<100,'loop');
    if(term.kind === 'foo'){
      var lastChild = term.children[term.children.length-1];
      var resolvedLastChild = this.resolveTail(lastChild,lvl+1);
      if(resolvedLastChild===lastChild){
        return term;
      }else{
        var newChildren = term.children.slice(0);
        newChildren[newChildren.length-1]=resolvedLastChild;
        return new Foo(term.name,newChildren);
      }
    }else{
      return term;
    }
  }
  //Make sure that the variable with varId is not present in the term.
  //This assumes that term is already resolved.
  Equations.prototype.occurCheck=function(varId,term,fail){
    forEach(extractVariableIds(term),function(variableId){
      if(variableId==varId){
        fail('it contains the variable a' + varId);
      }
    });
  }
  //asserts that varTerm is equal to otherTerm
  Equations.prototype.merge=function(varTerm,otherTerm,fail){
    if(!(otherTerm.kind === 'variable' && varTerm.id == otherTerm.id)){
      var resolvedOtherTerm = this.resolveDeep(otherTerm);
      this.occurCheck(varTerm.id,resolvedOtherTerm,fail);
      this.variableIdToTerm[varTerm.id]=resolvedOtherTerm;
    }
  }
  //Asserts that two terms are equal (throws TypeError if they are not).
  //If any of them is a variable, we first have find it's representative in union-find (resolveShalow).
  //If after that at least one of them is a variable we can assign the other one as a its representative in the union-find.
  //It both are terms (Atom or Foo), we simply check if names and children match.
  //The only non-standard thing is that we give a special meaning to Foo('tupple',...).
  //For such terms we want to employ a different equality theory which has an axiom that the order of fields is commutative.
  Equations.prototype.assertEqual=function(term1,term2,source,lvl){
    lvl|=0;
    term1 = this.resolveShallow(term1);
    term2 = this.resolveShallow(term2);
    assert(lvl<100,'loop');

    function fail(text){
      try{
        var type1=termToType(term1);
        var type2=termToType(term2);
        var err = new TypeError('Failed to unify type ' +  type1 + ' with ' + type2 + ', because ' + text);
      }catch(ex){
        var err = new TypeError('Failed to unify term ' +  term1 + ' with ' + term2 + ', because ' + text);
      }
      err.source = source;
      throw err;
    }

    if(term1.kind === 'variable'){
      this.merge(term1,term2,fail);
    }else if(term2.kind === 'variable'){
      this.merge(term2,term1,fail);
    }else if(term1.kind != term2.kind){
      fail(term1.kind + ' is not ' + term2.kind);
    }else{//atom or foo
      var me = this;
      if(term1.name != term2.name){
        fail( term1.name + ' is not ' + term2.name);
      }
      if(term1.kind === 'foo'){
        try{
          if(term1.children.length != term2.children.length){
            //I don't really think this should ever happen
            fail('number of params does not match');
          }
          if(term1.name === 'tupple'){
            var tupple1 = normalizeTupple(this.resolveTail(term1.children[0]));
            var tupple2 = normalizeTupple(this.resolveTail(term2.children[0]));
            forEach(tupple1.fields,function(value,key){
              //common part :
              if(tupple2.fields.hasOwnProperty(key)){
                me.assertEqual(value,tupple2.fields[key],source, lvl+1);
              }else{//fields present in tupple1 but not in tupple2
                if(!tupple2.other){
                  fail('field ' + key + ' is missing from the later');
                }
                var new_tail = freshVariable();
                me.assertEqual(tupple2.other, new Foo('cons', [ new Foo('field',[new Atom(key),value]) , new_tail]),source, lvl+1);
                tupple2.other = new_tail;
              }
            })
            forEach(tupple2.fields,function(value,key){
              if(!tupple1.fields.hasOwnProperty(key)){//fields present in tupple2 but not in tupple1
                if(!tupple1.other){
                  fail('field ' + key + ' is missing from the former');
                }
                var new_tail = freshVariable();
                me.assertEqual(tupple1.other, new Foo('cons', [ new Foo('field',[new Atom(key),value]) , new_tail]),source, lvl+1);
                tupple1.other = new_tail;
              }
            })
            if(tupple1.other != tupple2.other){
              if(!tupple1.other){
                me.assertEqual(tupple2.other, new Atom('nil'), source, lvl+1);
              }else if(!tupple2.other){
                me.assertEqual(tupple1.other, new Atom('nil'), source, lvl+1);
              }else{
                me.assertEqual(tupple1.other, tupple2.other, source, lvl+1);
              }
            }
          }else{//a simple term without any equality theory
            forEach(term1.children,function(child,i){
              me.assertEqual(child,term2.children[i],source, lvl+1);
            })
          }
        }catch(e){
          fail(e.toString());
        }
      }
    }
  }


  function infereType(ast, libTypes){
    libTypes = libTypes || {};
    var env = new Env();
    for(var o in libTypes)if(libTypes.hasOwnProperty(o)){
      env.set(o,libTypes[o].toTerm());
    }
    var booleanType = new BaseType('boolean');
    var booleanUnaryOperator = new FunctionType(booleanType,booleanType);
    var booleanBinaryOperator = new FunctionType(booleanType, booleanUnaryOperator);
    var numericUnaryOperator = new FunctionType(new BaseType('number'), new BaseType('number') );
    var numericBinaryOperator = new FunctionType(new BaseType('number'), numericUnaryOperator );
    var numericComparisonOperator = new FunctionType(new BaseType('number'), new FunctionType(new BaseType('number'), booleanType));
    var stringBinaryOperator = new FunctionType(new BaseType('string'), new FunctionType(new BaseType('string'), new BaseType('string') ));
    //Our language has a polymorphic equality operator (good for any BaseType).
    //We handle this by observing that BaseType(name) is converted to base(name),
    //so the type of = operator is simply \forall alpha . base(alpha) -> base(alpha) -> base(boolean).
    //This unfortunately mixes Terms and Types so we need the trick with TermType adapter.
    var equalityMagicArgType = new TermType(new Foo('base',[new Variable('lol')]));
    env.set('Operators',new QuantifiedType('lol', new TuppleType({
      'not' : booleanUnaryOperator,
      'and' : booleanBinaryOperator,
      'or' : booleanBinaryOperator,
      '<' : numericComparisonOperator,
      '>' : numericComparisonOperator,
      '=' : new FunctionType(equalityMagicArgType, new FunctionType(equalityMagicArgType, booleanType)),
      '<=' : numericComparisonOperator,
      '>=' : numericComparisonOperator,
      '+' : numericBinaryOperator,
      '-' : numericBinaryOperator,
      '~' : numericUnaryOperator,
      '*' : numericBinaryOperator,
      '/' : numericBinaryOperator,
      'mod' : numericBinaryOperator,
      'div' : numericBinaryOperator,
      '|' : stringBinaryOperator
    })).toTerm());
    var equations = new Equations();
    var typeTerm = getTypeTerm(ast,env,equations);
    var resolvedTypeTerm = equations.resolveDeep(typeTerm);
    return termToType(resolvedTypeTerm);
  }

  function getTypeTerm(ast, env, equations){
    switch(ast.type){

      case 'tupple':
        var fields = new Atom('nil');
        for(var i=0;i<ast.fields.length;++i){
          fields = new Foo('cons', [new Foo('field',[new Atom(ast.fields[i].key), getTypeTerm(ast.fields[i].value,env,equations) ]),fields]);
        }
        return new Foo('tupple',[fields]);
      case 'select':
        var fieldType = freshVariable();
        var restType = freshVariable();
        var tuppleShape = new Foo('tupple',[new Foo('cons',[ new Foo('field' ,[new Atom(ast.field), fieldType ])  , restType ])])
        equations.assertEqual(tuppleShape, getTypeTerm(ast.owner, env, equations)  ,ast);
        return fieldType;
      case '->':
        var argType = freshVariable();
        var newEnv = env.extend(ast.arg , argType);
        var bodyType = getTypeTerm( ast.body, newEnv, equations);

        return new Foo('foo',[argType, bodyType]);

      case '=':
        //polymorphic verison:
        var valueTypeTerm = getTypeTerm(ast.value,env,equations);
        valueTypeTerm = equations.resolveDeep(valueTypeTerm);
        forEach(extractVariableIds(valueTypeTerm),function(variableId){
          if(!env.containsVariableId(variableId)){
            valueTypeTerm = new Foo('quantified',[new Variable(variableId), valueTypeTerm]);
          }
        });
        var newEnv = env.extend(ast.name,valueTypeTerm);
        return getTypeTerm(ast.body, newEnv, equations);
      case 'operator':
        //let's pretend that  a+b is  (Operators.+)(a)(b)
        var fakeTerm = { type : 'select', owner : {type:'var', name: 'Operators'}, field: ast.op, start:ast.start, end:ast.end};
        for(var i=0;i<ast.args.length;++i){
          fakeTerm = {type:'apply', foo: fakeTerm, arg:ast.args[i], start: ast.start, end:ast.end};
        }
        return getTypeTerm(fakeTerm , env, equations );

      case 'apply':
        var fooType = getTypeTerm(ast.foo,env,equations);
        var argType = getTypeTerm(ast.arg,env,equations);
        var toType = freshVariable();
        var fromType = freshVariable();
        var functionalTypeShape = new Foo('foo',[fromType,toType]);
        equations.assertEqual(argType,fromType,ast);
        equations.assertEqual(fooType,functionalTypeShape,ast);
        equations.assertEqual(functionalTypeShape,fooType,ast);
        return toType;
      case 'var':
        if(!env.containsVariableName(ast.name)){
          throw new Error('Undefined variable ' + ast.name);
        }
        return env.getFreshClone(ast.name);
      case 'literal':
        return new BaseType(typeof(ast.value)).toTerm();
      case 'if':
        var ifType = freshVariable();
        equations.assertEqual(getTypeTerm(ast.yes,env,equations),ifType,ast.yes);
        equations.assertEqual(getTypeTerm(ast.no,env,equations),ifType,ast.no);
        equations.assertEqual(getTypeTerm(ast.condition,env,equations),new BaseType('boolean').toTerm(),ast.condition);
        return ifType;
      default:
          throw new Error('wtf unhandled ast node type ' + ast.type);
    }
  }
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
        var unary_operators  = {
          'not' : '!',
          '~' : '-'
        };
        if(unary_operators.hasOwnProperty(ast.op)){
          return '(' + unary_operators[ast.op] + compile(ast.args[0]) + ')';
        }

        var binary_operators = {
          '=' : '==',
          'and' : '&&',
          'or' : '||',
          '|' : '+',
          'mod' : '%',
          'div' : '/'
        };
        var code= '(' + compile(ast.args[0])  + (binary_operators.hasOwnProperty(ast.op) ? binary_operators[ast.op]  : ast.op)  + compile(ast.args[1]) + ')';
        if (ast.op === 'div'){
          code = '(Math.floor' + code + ')';
        }
        return code;
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


  function link(js_source, lib){
    var libDefs = [];
    for(name in lib)if(lib.hasOwnProperty(name)){
      libDefs.push('var ' + name + ' = lib["' + name + '"];');
    }
    var wrapped = "(function(){" + libDefs.join('') + " return " + js_source + ";})()";

    var foo = eval(wrapped);
    return function(/*...*/){
      var result = foo;
      for(var i=0;i<arguments.length;++i){
         result = result.call(null,arguments[i]);
      }
      return result;
    }
  }

  return {
    parse : parse,
    compile : compile,
    link: link,
    infereType: infereType,
    BaseType : BaseType,
    TuppleType : TuppleType,
    FunctionType : FunctionType,
    QuantifiedType: QuantifiedType,
    VariableType: VariableType,
  };

})();
