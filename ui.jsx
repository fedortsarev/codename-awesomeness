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
  literal("+"),
  number(2),
  number(3)
]);

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
