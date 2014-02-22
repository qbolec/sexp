declare module sexp{

  interface AST {
    type:string;
    start:number;
    end:number;
  }

  interface JSSource {}

  interface Type {}



  function parse(source:string) : AST;
  function compile(ast:AST) : JSSource;
  function link(js_source:JSSource,any) : Function;
  function infereType(ast:AST, lib: {[varName:string]: Type;}) : Type;

  export class TuppleType implements Type {
    constructor(fields:{[varName:string]: Type;});
  }
  export class BottomType implements Type {

  }
  export class BaseType implements Type {
    constructor(typeName:string);
  }
  export class FunctionType implements Type {
    constructor(from:Type,to:Type);
  }

}


