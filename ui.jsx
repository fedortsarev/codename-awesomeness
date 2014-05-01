/** @jsx React.DOM */

var literal = function(str) {
  return {
    type: "literal",
    value: str
  };
};

var number = function(num) {
  return {
    type: "number",
    value: num
  };
};

var compound = function(child) {
  return {
    type: "compound",
    child: child
  };
};

var stubTree = compound([
  literal("juxtapose"),
  compound([
    literal("rectangle"),
    number(100),
    number(10),
    number(110),
    number(50)
  ]),
  compound([
    literal("circle"),
    number(100),
    number(10),
    number(10)
  ])
]);


var numValue = function(num) {
  return {
    type: "value",
    valType: "number",
    value: num
  };
};

var picValue = function(draw) {
  return {
    type: "value",
    valType: "picture",
    draw: draw
  };
};

var circle = function(x, y, r) {
  return picValue(function(ctx) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI, false);
    ctx.fill();
  });
};

var rectangle = function(x, y, w, h) {
  return picValue(function(ctx) {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.fill();
  });
};

var juxtapose = function(childPics) {
  return picValue(function(ctx) {
    for (var i = 0; i < childPics.length; ++i) {
      console.log(i);
      childPics[i].draw(ctx);
    }
  });
};

var colorize = function(pic, color) {
  return picValue(function(ctx) {
    var prevSyle = ctx.fillStyle;
    ctx.fillStyle = color;
    pic.draw(ctx);
    ctx.fillStyle = prevStyle;
  });
};

var isPicture = function(value) {
  return value.valType === "picture";
};

var wrapPictorialFunc = function(fun, argCount) {
  return {
    valType: "function",
    apply: function(args) {
      if (argCount && args.length !== argCount) {
        throw "Wrong number of parameter passed to function";
      }
      for (var i = 0; i < args.length; i++) {
        if (!isPicture(args[i])) {
          console.log(args[i]);
          throw "Trying to apply picture-combining function to non-picture";
        }
      }
      // wat, undefined as a first argument in apply
      // this is JavaScript, whatever
      if (argCount) {
        return fun.apply(undefined, args);
      } else {
        // workaround for variadic functions like juxtapose
        return fun(args);
      }
    }
  };
};

var isNumValue = function(expr) {
  return expr.valType === "number";
};

var isLiteral = function(expr) {
  return expr.type === "literal";
};

var safeNth = function(arr, i) {
  if (i < 0) {
    throw "Index is less than zero";
  } else if (i > arr.length) {
    throw "Index is too large";
  } else {
    return arr[i];
  }
};

var createEnvironment = function(table) {
  return {
    content: table,
    lookup: function(key) {
      return this.content[key]
    }
  };
};

var wrapNumericFunction = function(fun, argCount) {
  return {
    valType: "function",
    apply: function(args) {
      if (args.length !== argCount) {
        throw "Wrong number of arguments";
      }
      var realArgs = [];
      for (var i = 0; i < argCount; i++) {
        if (!isNumValue(args[i])) {
          throw "Unable to apply numeric function to non-numeric arguments";
        }
        realArgs.push(args[i].value);
      }
      return fun.apply(undefined, realArgs);
    }
  };
};

var defaultEnvironment = createEnvironment({
  "+": wrapNumericFunction(function(arg1, arg2) {
    return numValue(arg1 + arg2);
  }, 2),
  "*": wrapNumericFunction(function(arg1, arg2) {
    return numValue(arg1 * arg2);
  }, 2),
  "juxtapose": wrapPictorialFunc(juxtapose),
  "colorize": wrapPictorialFunc(colorize, 1),
  "circle": wrapNumericFunction(circle, 3),
  "rectangle": wrapNumericFunction(rectangle, 4)
});

var evaluateTree = function(expr, env) {
  switch (expr.type) {
    case "number":
      return numValue(expr.value);
    case "literal":
      return env.lookup(expr.value);
    case "compound":
      if (expr.child.length === 0) {
        throw "Malformed compound exception";
      }
      var firstChild = expr.child[0];
      var funValue = evaluateTree(firstChild, env);
      if (funValue.valType !== "function") {
        throw "Trying to apply non-function to argument";
      }
      return funValue.apply(expr.child.slice(1).map(function (elem) {
        return evaluateTree(elem, env);
      }));
    default:
      throw "Unexpected type of value!";
  }
};

var createNodeElement = function(tree, prefix, suffix) {
  switch (tree.type) {
    case "literal":
      return <Literal data={tree}/>;
    case "number":
      return <Number data={tree}/>;
    case "compound":
      return <Compound data={tree}/>;
  }
};

var parseInput = function(input) {
  if (input.startsWith('(')) {
    return compound([]);
  } else {
    var num = parseInt(input);
    if (!isNaN(num)) {
      return number(num);
    } else {
      return literal(input);
    }
  }
};

var Compound = React.createClass({
  getInitialState: function() {
    return {text: "", editing: false};
  },
  render: function() {
    var internalNodes = this.props.data.child;
    var firstNode = null;
    if (internalNodes.length > 0) {
      firstNode = createNodeElement(internalNodes[0]);
    }
    var restNodes = [];
    for (var i = 1; i < internalNodes.length; ++i) {
      restNodes.push(createNodeElement(internalNodes[i]));
    }
    if (this.state.editing) {
      restNodes.push(
        <span><input value={this.state.text} onChange={this.handleChange} onKeyUp={this.handleKeyUp}/>{")"}</span>
      );
    } else {
      restNodes.push(<span><a href="#" onClick={this.handleClick}>+</a>{")"}</span>);
    }
    if (firstNode === null) {
      // restNodes.length > 0 always here as for now
      firstNode = restNodes[0];
      restNodes = restNodes.slice(1);
    }
    var secondNode = "";
    if (restNodes.length > 0) {
      var transformedNodes = restNodes.map(function (elem) {
        return <li>{elem}</li>;
      });
      secondNode = <ul>{transformedNodes}</ul>;
    }
    return <span>({firstNode}{secondNode}</span>;
  },
  handleClick: function(e) {
    this.setState({editing: true});
    return false;
  },
  handleKeyUp: function(e) {
    if (e.keyCode !== 13) {
      return true;
    }

    var children = this.props.data.child;
    children.push(parseInput(e.target.value));
    this.setState({text: "", editing: false});
    return false;
  },
  handleChange: function(e) {
    this.setState({text: e.target.value});
    return false;
  }
});

var Literal = React.createClass({
  render: function() {
    return <span>{this.props.data.value}</span>;
  }
});

var Number = React.createClass({
  render: function() {
    return <span className="number">{this.props.data.value}</span>;
  }
});

var ExpressionTree = React.createClass({
  render: function() {
    var internalNodes = this.props.data.map(createNodeElement);
    return (
      <ul>{internalNodes}</ul>
    );
  }
});

React.renderComponent(
  <ExpressionTree data={[stubTree]}/>,
  document.getElementById('content')
);

document.getElementById('evalButton').addEventListener('click', function(e) {
  var result;
  try {
    result = evaluateTree(stubTree, defaultEnvironment);
  } catch (e) {
    alert(e);
    return;
  }
  // TODO: need more sensible usage of computed results
  // and error messages too, by the way
  console.log(result);
  if (result.valType === "number") {
    alert(result.value);
  } else if (result.valType === "literal") {
    alert(result.value);
  } else if (result.valType === "picture") {
    var canvas = document.getElementById("mainCanvas");
    console.log(canvas);
    var ctx = canvas.getContext("2d");
    console.log(ctx);
    result.draw(ctx);
  } else {
    alert(result);
  }
});
