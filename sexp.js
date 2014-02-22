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
    //TODO
    this.type = 'quantified';
    this.id = -1; //XXX
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
      me.fields['F_' + f] = t;
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
    return ('F_' + k) in this.fields;
  };
  TuppleType.prototype.getField = function(k){
    return this.fields['F_'+k];
  };
  TuppleType.prototype.forTypeField = function(f){
    forKeyVal(this.fields,function(t,k){
      f(t,k.substr(2));
    });
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
    this.assignment = {};
    this.freeVariableId = 0;
  }
  Equations.prototype.addConstraint=function(c){
    this.constraints.push(c);
  }
  Equations.prototype.getFreeQuantifiedType = function() {
    return new QuantifiedType(this.freeVariableId++);
  };
  Equations.prototype.applyTo = function(e){
    var me=this;
    switch(e.type){
      case '->':
        return new FunctionType(this.applyTo(e.from), this.applyTo(e.to));
      case 'tupple':
        var fields={};
        e.forTypeField(function(t,f){
          fields[f] = me.applyTo(t);
        });
        return new TuppleType(fields);
      case 'quantified':
        return (e.id in this.assignment) ? this.applyTo(this.assignment[e.id]) : e;
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

            throw new TypeError('Failed to infere type : ' + (t1) + ' vs. ' + (t2) );
          }
          return t1;
        default:
          throw new Error('wtf unhandled type kind ' + t1.type);
      }
    }else{
      if(t1.type == 'quantified'){
        return t2;
      }else if(t2.type == 'quantified'){
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
          if(t1.name != t2.name){
            throw new TypeError('Failed to infere type : ' + (t1) + ' vs. ' + (t2) );
          }
          return t1;
        default:
          throw new Error('wtf unhandled type kind ' + t1.type);
      }
    }else{
      if(t1.type == 'quantified'){
        return t2;
      }else if(t2.type == 'quantified'){
        return t1;
      }else{
        throw new TypeError('Failed to infere type : ' + (t1) + ' vs. ' + (t2) );
      }
    }
  }
  Equations.prototype.bumpVariable = function(id,e){
    if(id in this.assignment){
      var new_type = this.smallestTypeLargerThan(this.assignment[id],e);
      if(new_type.toString() != this.assignment[id].toString()){ //I am so lazy...
        this.assignment[id] = new_type;
        return true;
      }else{
        return false;
      }
    }else{
      this.assignment[id] = e;
      return true;
    }
  };
  Equations.prototype.contains = function(id,e){
    var me = this;
    switch(e.type){
      case '->':
        return this.contains(id,e.from) || this.contains(id,e.to);
      case 'tupple':
        var contains = false;
        e.forTypeField(function(t,f){
          contains |= me.contains(id,t);
        });
        return !!contains;
      case 'quantified':
        //TODO :  should I recurse into this.applyTo(e)?
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
    var lowerBoundOfNarrower = equations.applyTo(this.narrower);
    var lowerBoundOfWider = equations.applyTo(this.wider);
    var me = this;
    if(lowerBoundOfNarrower.type == this.wider.type){
      switch(lowerBoundOfNarrower.type){
        case 'quantified':
          return false;
        case 'tupple':
          me.wider.forTypeField(function(t,f){
            if(!lowerBoundOfNarrower.hasField(f)){
              me.fail(', which requires ' + lowerBoundOfNarrower + ' <= ' + me.wider + '. Missing field ' + f + '.');
            }
          });
          var c=false;
          me.wider.forTypeField(function(t,f){
            c|= (new Inequality(lowerBoundOfNarrower.getField(f),t,this.source)).satisfy(equations);
          });
          return !!c;
        case '->':
          //  narrower  <= wider              I can use narrower in place of wider ...
          //  narrower.to <= wider.to         as long as it won't return unexpected result ...
          //  wider.from  <= narrower.from    and accepts all reasonable inputs.
          var c = (me.narrower.type == '->' ? (new Inequality(lowerBoundOfWider.from,me.narrower.from,this.source)).satisfy(equations) : false);
              c|= (new Inequality(lowerBoundOfNarrower.to,me.wider.to,this.source)).satisfy(equations);
          return !!c;
        case 'base':
          if(equations.smallestTypeLargerThan(lowerBoundOfNarrower,this.wider).name != this.wider.name){
            this.fail(', which requires ' + lowerBoundOfNarrower + ' <= ' + me.wider + '.');
          }
          return false;
        default:
          throw new Error('wtf unhandled type kind ' + e.type);
      }
    }else{
      var changed = false;
      //functions are contra-/co-variant which introduces some difficulties in handling them properly
      if(lowerBoundOfWider.type == '->' && this.narrower.type == '->'){
        changed = (new Inequality(lowerBoundOfWider.from,me.narrower.from,this.source)).satisfy(equations);
      }
      switch(me.wider.type){
        case 'quantified':
          if(equations.contains(me.wider.id,lowerBoundOfNarrower)){
            this.fail(', which requires recursive type as ' +  me.wider + ' occurs inside ' + lowerBoundOfNarrower + '.');
          }
          try{
            return equations.bumpVariable(me.wider.id,lowerBoundOfNarrower) || changed;
          }catch(e){
            this.fail(', as forcing ' + me.wider + ' to be >= ' + lowerBoundOfNarrower + ' from previous ' + lowerBoundOfWider +' leads to ' + e.toString() + '.');
          }
        case '->':
        case 'base':
        case 'tupple':
          if(lowerBoundOfNarrower.type!='quantified'){
            this.fail(', which requires ' + lowerBoundOfNarrower + ' <= ' + me.wider + ' which are incompatible types.');
          }
          return changed;
        default:
          throw new Error('wtf unhandled type kind ' + e.type);
      }
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
    return equations.applyTo(t);
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
        var functionalTypeShape = new FunctionType( fromType,  toType );
        equations.addConstraint(new Inequality(argType, fromType,ast));
        equations.addConstraint(new Inequality(functionalTypeShape, fooType,ast));
        equations.addConstraint(new Inequality(fooType,functionalTypeShape,ast));
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
        return (ast.op == 'div' ? 'Math.floor(' : '(' ) + compile(ast.args[0])  + (binary_operators.hasOwnProperty(ast.op) ? binary_operators[ast.op]  : ast.op)  + compile(ast.args[1]) + ')';
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
