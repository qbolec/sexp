var Tex = (function(){
  function float(x,withPlus){
    return (withPlus &&  x>=0 ? '+' : '') + x;
  }
  function integer(x,withPlus){
    return float(Math.round(x),withPlus);
  }

  function isInteger(x){
    return Math.abs(Math.round(x)-x) < 1e-6;
  }

  function fraction(x,withPlus,range){
    range = range || 1000;
    if(isInteger(x)){
      return integer(x,withPlus);
    }
    for(var div=1;div<=range;++div){
      if(isInteger(x*div)){
        return (x<0 ? '-' : (withPlus ? '+' : ''))  + '{\\frac {' + integer(Math.abs(x*div)) + '}{' + div + '}}';
      }
    }
    return float(x,withPlus);
  }

  return {
    float:float,
    integer:integer,
    fraction:fraction,
    floatP:function(x){return float(x,true)},
    integerP:function(x){return integer(x,true)},
    fractionP:function(x){return fraction(x,true)},
  }

})();

