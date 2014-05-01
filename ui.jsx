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
    if (internalNodes.length === 0) {
      var innerContent = null;
      if (this.state.editing) {
        innerContent = <input value={this.state.text} onChange={this.handleChange} onKeyUp={this.handleKeyUp}/>;
      } else {
        innerContent = <a href="#" onClick={this.handleClick}>+</a>;
      }
      return <li>({innerContent})</li>
    } else if (internalNodes.length === 1) {
      var singleNode = createNodeElement(internalNodes[0]);
      return <li>({singleNode})</li>;
    } else {
      var firstNode = createNodeElement(internalNodes[0]);
      var restNodes = [];
      for (var i = 1; i < internalNodes.length; ++i) {
        restNodes.push(createNodeElement(internalNodes[i]));
      }
      if (this.state.editing) {
        restNodes.push(
          <input value={this.state.text} onChange={this.handleChange} onKeyUp={this.handleKeyUp}/>
        );
      } else {
        restNodes.push(<a href="#" onClick={this.handleClick}>+</a>);
      }
      // TODO: think about how show closing bracket on the same line
      return <li>({firstNode}<ul>{restNodes}</ul>)</li>;
    }
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
    return <li>{this.props.data.value}</li>;
  }
});

var Number = React.createClass({
  render: function() {
    return <li className="number">{this.props.data.value}</li>;
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
