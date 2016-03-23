# atom-react-native-css package
React-native-css turns valid CSS/SASS into the Facebook subset of CSS. <br/> Source:([https://github.com/sabeurthabti/react-native-css](https://github.com/sabeurthabti/react-native-css))

## Install
Using `apm`:

```
apm install atom-react-native-css
```

Or search for `atom-react-native-css` in Atom settings view.

## File support
Because `node-sass` installation errors often，Now the default does not support ` sass ` file。
If you use the `node-sass` this error:
```
At The `libsass` binding was not found in .... /node-sass/vendor/**/binding.node
```
[look here for details](http://stackoverflow.com/questions/34326516/task-sass-not-found-using-grunt-with-patternlab/34334221#34334221)

## Newly added
Can insert JS code: `JS()`<br />
New metering unit: `vw`, `vh`, `vmax`, `vmin`, `scale`<br />
**vw**: device width / 100<br />
**vh**: device height / 100<br />
**vmax**: Math.max(vw, vh)<br />
**vmin**: Math.min(vw, vh)

## Options
- #### compileCSS
    Enable compile React Style'

    *Default:* `true`

- #### enableSass
    Enable Sass file and install node-sass

    *Default:* `false`


- #### Input files
    Enter the file path or directory. Please read [minimatch](https://github.com/TOP-Chao/atom-file-watchers#minimatch) matching rules

    *Default:* `**/*.@(css|scss|sass)`


- #### Output file
    File output directory. Relative to the path of the input file

    *Default:* `./`

## Example
Given the following CSS:

```css
/* styles.scss */
$colour-base: #656656;
.container {
    flex: 1;
    padding: 0 0.1vmin;
    margin: 0.1vmax 0 0.2vmax;
    align-items: center;
    transform: "JS([{scaleX: 0}, {scaleY: 0}])";
    shadow-offset: "JS({width: 0, height: 0})";
}
.description {
    width: 50vw;
    height: 50vh;
    font-size: 18;
    text-align: center;
    color: $colour-base;
    writing-direction: auto;
    text-shadow-offset: "JS({width: 0, height: 0})";
}
.img {
    resize-mode: "JS(React.Image.resizeMode.cover)";
}
```

CSS will generate the following:

```js
// styles.js
import React, {StyleSheet, Dimensions} from "react-native";
const {width, height, scale} = Dimensions.get("window"),
    vw = width / 100,
    vh = height / 100,
    vmin = Math.min(vw, vh),
    vmax = Math.max(vw, vh);

export default StyleSheet.create({
    "container": {
        "flex": 1,
        "paddingTop": 0,
        "paddingRight": 0.1 * vmin,
        "paddingBottom": 0,
        "paddingLeft": 0.1 * vmin,
        "marginTop": 0.1 * vmax,
        "marginRight": 0,
        "marginBottom": 0.2 * vmax,
        "marginLeft": 0,
        "alignItems": "center",
        "transform": [{scaleX: 0}, {scaleY: 0}],
        "shadowOffset": {width: 0, height: 0}
    },
    "description": {
        "width": 50 * vw,
        "height": 50 * vh,
        "fontSize": 18,
        "textAlign": "center",
        "color": "#656656",
        "writingDirection": "auto",
        "textShadowOffset": {width: 0, height: 0}
    },
    "img": {
        "resizeMode": React.Image.resizeMode.cover
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
## Demo

![demo](http://7oxfk1.com1.z0.glb.clouddn.com/atom-react-native-css-demo.gif)
