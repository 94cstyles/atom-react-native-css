# atom-react-native-css package
React-native-css turns valid CSS/SASS into the Facebook subset of CSS. <br/> Source:([https://github.com/sabeurthabti/react-native-css](https://github.com/sabeurthabti/react-native-css))

## Install
Using `apm`:

```
apm install atom-react-native-css
```

Or search for `atom-react-native-css` in Atom settings view.

## Options
- #### Input files
    Enter the file path or directory. Please read [minimatch](https://github.com/isaacs/minimatch) matching rules

    *Default:* `**/*.@(css|scss|sass)`


- #### Output file
    File output directory. Relative to the path of the input file

    *Default:* `./`

## Example
Given the following CSS:

```css
/* styles.css */
.description {
    flex: 1;
    margin: 2 3 4;
    font-size: 18;
    text-align: center;
    color: #656656;
}

.container {
    padding: 30;
    margin-top: 65;
    align-items: center;
}
```

CSS will generate the following:

```javascript
// styles.js
module.exports = require('react-native').StyleSheet.create({
    "description": {
        "flex": 1,
        "marginTop": 2,
        "marginRight": 3,
        "marginBottom": 4,
        "marginLeft": 3,
        "fontSize": 18,
        "textAlign": "center",
        "color": "#656656"
    },
    "container": {
        "paddingTop": 30,
        "paddingRight": 30,
        "paddingBottom": 30,
        "paddingLeft": 30,
        "marginTop": 65,
        "alignItems": "center"
    }
});
```

## Usage

```js
// require the generated style file
var React = require('react-native'),
	{View,Text} = React;

var styles = require('./styles.js')

var Component = React.createClass({
    render: function() {
        return (
            <View style={styles.container}>
              <Text style={styles.description}>
              yes or no
              </Text>
            </View>
        );
    }
})
```
