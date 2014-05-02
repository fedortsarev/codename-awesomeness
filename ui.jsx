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

var string = function(str) {
  return {
    type: "string",
    value: str
  };
};

var stubTree;
if (localStorage) {
  stubTree = JSON.parse(localStorage.getItem("program"));
}

if (!stubTree) {
  stubTree = compound([
    literal("animate"),
    literal("time")
    /*
    literal("juxtapose"),
    compound([
      literal("colorize"),
      compound([
        literal("rectangle"),
        number(100),
        number(10),
        number(110)
      ])
    ]),
    compound([
      literal("circle"),
      number(100),
      number(10),
      number(10)
    ])
    */
  ]);
}

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

var strValue = function(str) {
  return {
    type: "value",
    valType: "string",
    value: str
  };
};

var funValue = function(fun) {
  return {
    type: "value",
    valType: "function",
    apply: fun
  };
};

var animateValue = function(timeName, expr, env) {
  return {
    type: "value",
    valType: "animation",
    timeName: timeName,
    expr: expr,
    env: env
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

var colorize = function(args) {
  if (args.length !== 2) {
    throw "Wrong number of arguments to 'colorize' function";
  }
  var pic = args[0];
  var color = args[1];

  if (!isPicture(pic) || !isString(color)) {
    throw "Wrong type of arguments to 'colorize' function";
  }

  return picValue(function(ctx) {
    var prevStyle = ctx.fillStyle;
    ctx.fillStyle = color.value;
    pic.draw(ctx);
    ctx.fillStyle = prevStyle;
  });
};

var isPicture = function(value) {
  return value.valType === "picture";
};

var isString = function(value) {
  return value.valType === "string";
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

var extendEnvironment = function(env, key, value) {
  var table = $().extend({}, env.content);
  table[key] = value;
  return createEnvironment(table);
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
  "colorize": funValue(colorize),
  "circle": wrapNumericFunction(circle, 3),
  "rectangle": wrapNumericFunction(rectangle, 4),
  "sin": wrapNumericFunction(function(x) {
    return numValue(Math.sin(x))
  }, 1),
  "cos": wrapNumericFunction(function(x) {
    return numValue(Math.cos(x))
  }, 1),
  "pi": numValue(Math.PI)
});

var evaluateTree = function(expr, env) {
  switch (expr.type) {
    case "number":
      return numValue(expr.value);
    case "literal":
      return env.lookup(expr.value);
    case "string":
      return strValue(expr.value);
    case "compound":
      var firstChild = safeNth(expr.child, 0);

      if (isLiteral(firstChild)) {
        switch (firstChild.value) {
          case "animate":
            if (expr.child.length != 3) {
              throw "Wrong number of sub-expressions in animate";
            }
            var secondChild = expr.child[1];
            if (!isLiteral(secondChild)) {
              throw "Second argument to 'animate' should be a literal";
            }
            return animateValue(secondChild.value, expr.child[2], env);
        }
      }

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
    case "string":
      return <String data={tree}/>;
  }
};

var parseInput = function(input) {
  if (input.startsWith('(')) {
    return compound([]);
  } else if (input.startsWith('"') && input.endsWith('"') && input.length > 1) {
    return string(input.substring(1, input.length - 1));
  } else {
    var num = parseFloat(input);
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
        <span><input value={this.state.text} ref="textInput" onChange={this.handleChange} onKeyUp={this.handleKeyUp}/>{")"}</span>
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
    this.setState({editing: true}, function() {
      this.refs.textInput.getDOMNode().focus();
    });
    return false;
  },
  handleKeyUp: function(e) {
    if (e.keyCode !== 13) {
      return true;
    }

    var children = this.props.data.child;
    children.push(parseInput(e.target.value));
    if (localStorage) {
      localStorage.setItem("program", JSON.stringify(stubTree));
    }
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

var String = React.createClass({
  render: function() {
    return <span className="string">"{this.props.data.value}"</span>;
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

var render = function() {
  React.renderComponent(
    <ExpressionTree data={[stubTree]}/>,
    document.getElementById('content')
  );
};

render();

var drawInterval = null;

var setupDrawing = function(canvas, ctx, animation) {
  time = 0;
  if (drawInterval) {
    clearInterval(drawInterval);
    drawInterval = null;
  }

  intervalLength = 25;
  drawInterval = setInterval(function() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var env = extendEnvironment(animation.env, animation.timeName, numValue(time));

    var value = evaluateTree(animation.expr, env);
    if (isPicture(value)) {
      value.draw(ctx);
    } else if (isNumValue(value)) {
      console.log(value.value);
      ctx.fillText("" + value.value, 10, 10);
    }
    time += intervalLength / 1000;
  }, intervalLength);
};

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
  var canvas = document.getElementById("mainCanvas");
  var ctx = canvas.getContext("2d");
  if (result.valType === "number") {
    alert(result.value);
  } else if (result.valType === "picture") {
    result.draw(ctx);
  } else if (result.valType == "animation") {
    setupDrawing(canvas, ctx, result);
  } else {
    alert(result);
  }
});

document.getElementById('eraseButton').addEventListener('click', function(e) {
  stubTree = compound([]);
  render();
});
