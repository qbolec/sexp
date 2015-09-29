var sexp = (function(){
  function forKeyVal(o,f){
    for(var k in o)if(o.hasOwnProperty(k)){
      f(o[k],k);
    }
  }
  function QuantifiedType(id){//actually this is not a quantified type in current implementation. It's more like "variable" type.
    this.type = 'quantified';
    this.id = id;
  }
  QuantifiedType.prototype.toString = function(){
    return 'a' + this.id;
  }
  function BottomType(){
    this.type = 'bottom';
  }
  BottomType.prototype.toString = function(){
    return '_bottom_';
  }
  function BaseType(name){
    this.type = 'base';
    this.name = name;
  }
  BaseType.prototype.toString = function(){
    return this.name;
  }
  function FunctionType(from,to){
    this.type = '->';
    this.from = from;
    this.to = to;
  }
  FunctionType.prototype.toString = function(){
    return '(' + this.from.toString() + '->' + this.to.toString() + ')';
  }
  function TuppleType(fieldToType){
    var me = this;
    this.type = 'tupple';
    me.fields = {};
    forKeyVal(fieldToType,function(t,f){
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
    s += "}";
    return s;
  }
  TuppleType.prototype.hasField = function(k){
    return this.fields.hasOwnProperty(k);
  };
  TuppleType.prototype.getField = function(k){
    return this.fields[k];
  };
  TuppleType.prototype.forTypeField = function(f){
    forKeyVal(this.fields,f);
  };

  function Env(){

  }
  Env.prototype.contains = function(name){
    return ('V_' + name) in this;
  };
  Env.prototype.getFreshClone = function(name){
    return this['V_' + name];
  };
  Env.prototype.set = function(name,type) {
    this['V_' + name] = type;
  }
  Env.prototype.extend = function(name,type) {
    var TMP = function(){};
    TMP.prototype = this;
    var newEnv = new TMP();
    newEnv.set(name,type);
    return newEnv;
  };

  function Equations(){
    this.constraints = [];
    this.variableLowerBound = {};
    this.variableUpperBound = {};

    this.freeVariableId = 0;
  }
  Equations.prototype.addConstraint=function(c){
    this.constraints.push(c);
  }
  Equations.prototype.getFreeQuantifiedType = function() {
    return new QuantifiedType(this.freeVariableId++);
  };
  Equations.prototype.getLowerBound = function(e){
    var me=this;
    switch(e.type){
      case 'bottom':
        return e;
      case '->':
        return new FunctionType(this.getUpperBound(e.from), this.getLowerBound(e.to));
      case 'tupple':
        var fields={};
        e.forTypeField(function(t,f){
          fields[f] = me.getLowerBound(t);
        });
        return new TuppleType(fields);
      case 'quantified':
        return (e.id in this.variableLowerBound) ? this.getLowerBound(this.variableLowerBound[e.id]) : e;
      case 'base':
        return e;
      default:
        throw new Error('wtf unhandled type kind ' + e.type);
    }
  };
  Equations.prototype.getUpperBound = function(e){
    var me=this;
    switch(e.type){
      case 'bottom':
        return e;
      case '->':
        return new FunctionType(this.getLowerBound(e.from), this.getUpperBound(e.to));
      case 'tupple':
        var fields={};
        e.forTypeField(function(t,f){
          fields[f] = me.getUpperBound(t);
        });
        return new TuppleType(fields);
      case 'quantified':
        return (e.id in this.variableUpperBound) ? this.getUpperBound(this.variableUpperBound[e.id]) : e;
      case 'base':
        return e;
      default:
        throw new Error('wtf unhandled type kind ' + e.type);
    }
  };

  Equations.prototype.smallestTypeLargerThan = function(t1,t2){
    var me=this;
    if(t1.type == t2.type){
      switch(t1.type){
        case 'bottom':
          return t1;
        case '->':
          // smallestTypeLargerThan === minimal among (larger than t1 and larger than t2)
          // "larger than t1" means that "to" is larger than "t1.to"
          //                          and "from" is smaller than "t1.from"
          return new FunctionType(this.largestTypeSmallerThan(t1.from,t2.from) , this.smallestTypeLargerThan(t1.to,t2.to));
        case 'tupple':
          var fields={};
          //the tupple needs to have only common fields of t1 and t2
          //and each common field must be larger than original field
          t1.forTypeField(function(t,f){
            if(t2.hasField(f)){
              fields[f] = me.smallestTypeLargerThan(t,t2.getField(f));
            }
          });
          return new TuppleType(fields);
        case 'quantified':
          //well... I don't know what to say here :/
          //perhaps I should create new variable and two new inequalities?
          return t1;
        case 'base':
          if(t1.name != t2.name){
            return new BaseType('scalar');
          }
          return t1;
        default:
          throw new Error('wtf unhandled type kind ' + t1.type);
      }
    }else{
      if(t1.type == 'quantified' || t1.type == 'bottom'){
        return t2;
      }else if(t2.type == 'quantified' || t2.type == 'bottom'){
        return t1;
      }else{
        throw new TypeError('Failed to infere type : ' + (t1) + ' vs. ' + (t2) );
      }
    }
  }
  Equations.prototype.largestTypeSmallerThan = function(t1,t2){
    var me=this;
    if(t1.type == t2.type){
      switch(t1.type){
        case 'bottom':
          return t1;
        case '->':
          // largestTypeSmallerThan === maximal among (smaller than t1 and smaller than t2)
          // "smaller than t1" means that "to" is smaller than "t1.to"
          //                          and "from" is larger than "t1.from"
          return new FunctionType(this.smallestTypeLargerThan(t1.from,t2.from) , this.largestTypeSmallerThan(t1.to,t2.to));
        case 'tupple':
          var fields={};
          //the tupple needs to have every field of t1 and every field of t2
          //and each common field must be smaller than original field
          t1.forTypeField(function(t,f){
            fields[f] = t;
          });
          t2.forTypeField(function(t,f){
            if(fields.hasOwnProperty(f)){
              fields[f] = me.largestTypeSmallerThan(fields[f],t);
            }else{
              fields[f] = t;
            }
          });
          return new TuppleType(fields);
        case 'quantified':
          //well... I don't know what to say here :/
          //perhaps I should create new variable and two new inequalities?
          return t1;
        case 'base':
          if(t1.name == 'scalar'){
            return t2;
          }else if(t2.name == 'scalar'){
            return t1;
          }else if(t1.name != t2.name){
            throw new TypeError('Failed to infere type : ' + (t1) + ' vs. ' + (t2) );
          }
          return t1;
        default:
          throw new Error('wtf unhandled type kind ' + t1.type);
      }
    }else{
      if(t1.type == 'bottom'){
        return t1;
      }else if(t2.type == 'bottom'){
        return t2;
      }else if(t1.type == 'quantified'){
        return t2;
      }else if(t2.type == 'quantified'){
        return t1;
      }else{
        throw new TypeError('Failed to infere type : ' + (t1) + ' vs. ' + (t2) );
      }
    }
  }
  Equations.prototype.bumpVariable = function(id,e){
    if(id in this.variableLowerBound){
      var new_type = this.smallestTypeLargerThan(this.variableLowerBound[id],e);
      if(new_type.toString() != this.variableLowerBound[id].toString()){ //I am so lazy...
        this.variableLowerBound[id] = new_type;
        return true;
      }else{
        return false;
      }
    }else{
      this.variableLowerBound[id] = e;
      return true;
    }
  };
  Equations.prototype.limitVariable = function(id,e){
    if(id in this.variableUpperBound){
      var new_type = this.largestTypeSmallerThan(this.variableUpperBound[id],e);
      if(new_type.toString() != this.variableUpperBound[id].toString()){ //I am so lazy...
        this.variableUpperBound[id] = new_type;
        return true;
      }else{
        return false;
      }
    }else{
      this.variableUpperBound[id] = e;
      return true;
    }
  };
  Equations.prototype.contains = function(id,e){
    var me = this;
    switch(e.type){
      case 'bottom':
        return false;
      case '->':
        return this.contains(id,e.from) || this.contains(id,e.to);
      case 'tupple':
        var contains = false;
        e.forTypeField(function(t,f){
          contains |= me.contains(id,t);
        });
        return !!contains;
      case 'quantified':
        //TODO :  should I recurse into this.getLowerBound(e)?
        return e.id == id;
      case 'base':
        return false;
      default:
        throw new Error('wtf unhandled type kind ' + e.type);
    }
  };
  Inequality = function(narrower,wider, source){
    this.narrower = narrower;
    this.wider = wider;
    this.source = source;
  }
  Inequality.prototype.toString = function(){
    return this.narrower.toString() + ' <= ' + this.wider.toString();
  }
  Inequality.prototype.fail = function(text){
    var err = new TypeError('Failed to satisfy type inequality ' + this + text);
    err.source = this.source;
    throw err;
  }
  Inequality.prototype.satisfy = function(equations){
    var lowerBoundOfNarrower = equations.getLowerBound(this.narrower);
    var upperBoundOfWider = equations.getUpperBound(this.wider);
    var me = this;
    var changed = false;
    if(me.narrower.type === 'quantified'){
      if(upperBoundOfWider.type !== 'quantified'){
        if(equations.contains(me.narrower.id,upperBoundOfWider)){
          me.fail(', which requires recursive type as ' + me.narrower + ' occurs inside ' + upperBoundOfWider + '.');
        }
        try{
          changed |= equations.limitVariable(me.narrower.id,upperBoundOfWider);
        }catch(e){
          me.fail(', as forcing ' + me.narrower + ' to be <= ' + upperBoundOfWider + ' leads to ' + e.toString() + '.');
        }
      }
      if(lowerBoundOfNarrower.toString()!=me.narrower.toString()){
        changed|= (new Inequality(lowerBoundOfNarrower,me.wider,me.source)).satisfy(equations);
      }
    }
    if(me.wider.type === 'quantified'){
      if(lowerBoundOfNarrower.type !== 'quantified'){
        if(equations.contains(me.wider.id,lowerBoundOfNarrower)){
          me.fail(', which requires recursive type as ' + me.wider + ' occurs inside ' + lowerBoundOfNarrower + '.');
        }
        try{
          changed |= equations.bumpVariable(me.wider.id,lowerBoundOfNarrower);
        }catch(e){
          me.fail(', as forcing ' + me.wider + ' to be >= ' + lowerBoundOfNarrower + ' leads to ' + e.toString() + '.');
        }
      }
      if(upperBoundOfWider.toString()!=me.wider.toString()){
        changed|= (new Inequality(me.narrower,upperBoundOfWider,me.source)).satisfy(equations);
      }
    }
    if(me.narrower.type == me.wider.type){
      switch(me.narrower.type){
        case 'bottom':
          return changed;
        case 'quantified':
          return changed;
        case 'tupple':
          me.wider.forTypeField(function(t,f){
            if(!me.narrower.hasField(f)){
              me.fail(', which requires ' + me.narrower + ' <= ' + me.wider + '. Missing field ' + f + '.');
            }
          });
          me.wider.forTypeField(function(t,f){
            changed|= (new Inequality(me.narrower.getField(f),t,me.source)).satisfy(equations);
          });
          return !!changed;
        case '->':
          //  narrower  <= wider              I can use narrower in place of wider ...
          //  narrower.to <= wider.to         as long as it won't return unexpected result ...
          //  wider.from  <= narrower.from    and accepts all reasonable inputs.
          changed|= (new Inequality(me.narrower.to,me.wider.to,me.source)).satisfy(equations);
          changed|= (new Inequality(me.wider.from,me.narrower.from,me.source)).satisfy(equations);
          return !!changed;
        case 'base':
          if(equations.smallestTypeLargerThan(me.narrower,me.wider).name != me.wider.name){
            me.fail(', which requires ' + me.narrower + ' <= ' + me.wider + '.');
          }
          return changed;
        default:
          throw new Error('wtf unhandled type kind ' + e.type);
      }
    }else{
      if(me.wider.type !== 'quantified' && me.narrower.type !== 'quantified' && me.narrower.type !== 'bottom'){
        //tupple, ->, base   <= bottom, tupple, ->, base
        me.fail(', which requires ' + me.narrower + ' <= ' + me.wider + ' which are incompatible types.');
      }
      return changed;
    }
  }
  Equations.prototype.solve = function(){
    for(var changed=true;changed;){
      changed = false;
      for(var i=0;i<this.constraints.length;++i){
        changed|=this.constraints[i].satisfy(this);
      }
    }
  }
  function infereType(ast, libTypes){
    libTypes = libTypes || {};
    var env = new Env();
    for(var o in libTypes)if(libTypes.hasOwnProperty(o)){
      env.set(o,libTypes[o]);
    }
    var booleanType = new BaseType('boolean');
    var booleanUnaryOperator = new FunctionType(booleanType,booleanType);
    var booleanBinaryOperator = new FunctionType(booleanType, booleanUnaryOperator);
    var numericUnaryOperator = new FunctionType(new BaseType('number'), new BaseType('number') );
    var numericBinaryOperator = new FunctionType(new BaseType('number'), numericUnaryOperator );
    var numericComparisonOperator = new FunctionType(new BaseType('number'), new FunctionType(new BaseType('number'), booleanType));
    var stringBinaryOperator = new FunctionType(new BaseType('string'), new FunctionType(new BaseType('string'), new BaseType('string') ));
    env.set('Operators',new TuppleType({
      'not' : booleanUnaryOperator,
      'and' : booleanBinaryOperator,
      'or' : booleanBinaryOperator,
      '<' : numericComparisonOperator,
      '>' : numericComparisonOperator,
      '=' : numericComparisonOperator,
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
    }));

    var equations = new Equations();
    var t = getType(ast,env,equations);
    equations.solve();
    return equations.getLowerBound(t);
  }
  function getType(ast, env, equations){
    switch(ast.type){

      case 'tupple':
        var fields = {};
        for(var i=0;i<ast.fields.length;++i){
          fields[ast.fields[i].key] = getType(ast.fields[i].value,env,equations);
        }
        return new TuppleType(fields);
      case 'select':
        var fieldType = equations.getFreeQuantifiedType();
        var fields = {};
        fields[ast.field] = fieldType;
        var tuppleShape = new TuppleType(fields);
        var ownerType = getType(ast.owner, env, equations);
        equations.addConstraint(new Inequality(ownerType,tuppleShape, ast));
        return fieldType;
      case '->':
        var argType = equations.getFreeQuantifiedType();
        var newEnv = env.extend(ast.arg , argType);
        var bodyType = getType( ast.body, newEnv, equations);
        return new FunctionType(argType, bodyType);

      case '=':
        // x=y;b  is equivalent to  (x=>b)(y)
        return getType({type: 'apply', foo : {type:'->', arg:ast.name, body:ast.body, start:ast.body.start, end:ast.body.end} , arg : ast.value, start: ast.start, end:ast.end } , env, equations );
      case 'operator':
        if(ast.op == '='){
          //equality is the only operator right now for which we allow polymorphism by a simple hack: both sides have to have the same type
          var leftType = getType(ast.args[0],env,equations);
          var rightType = getType(ast.args[1],env,equations);
          equations.addConstraint(new Inequality(leftType, rightType,ast));
          equations.addConstraint(new Inequality(rightType,leftType,ast));
          //and the type of both sides can not be larger than "scalar" -- perhaps we could extend that to tupples without functional (sub)fields some day
          equations.addConstraint(new Inequality(rightType,new BaseType("scalar"),ast));
          return new BaseType('boolean');
        }
        //let's pretend that  a+b is  (Operators.+)(a)(b)
        var fakeTerm = { type : 'select', owner : {type:'var', name: 'Operators'}, field: ast.op, start:ast.start, end:ast.end};
        for(var i=0;i<ast.args.length;++i){
          fakeTerm = {type:'apply', foo: fakeTerm, arg:ast.args[i], start: ast.start, end:ast.end};
        }
        return getType(fakeTerm , env, equations );

      case 'apply':
        var fooType = getType(ast.foo,env,equations);
        var argType = getType(ast.arg,env,equations);
        var toType = equations.getFreeQuantifiedType();
        var fromType = equations.getFreeQuantifiedType();
        var functionalTypeShape = new FunctionType(fromType,toType);
        equations.addConstraint(new Inequality(argType,fromType,ast));
        equations.addConstraint(new Inequality(fooType,functionalTypeShape,ast));
        equations.addConstraint(new Inequality(functionalTypeShape,fooType,ast));
        return toType;
      case 'var':
        if(!env.contains(ast.name)){
          throw new Error('Undefined variable ' + ast.name);
        }
        return env.getFreshClone(ast.name);
      case 'literal':
        return new BaseType(typeof(ast.value));
      case 'if':
        var ifType = equations.getFreeQuantifiedType();
        equations.addConstraint(new Inequality(getType(ast.yes,env,equations),ifType,ast.yes));
        equations.addConstraint(new Inequality(getType(ast.no,env,equations),ifType,ast.no));
        equations.addConstraint(new Inequality(getType(ast.condition,env,equations),new BaseType('boolean'),ast.condition));
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
    BottomType : BottomType
  };

})();
