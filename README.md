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
[To download the missing file](https://github.com/sass/node-sass/releases),
If you follow the above solutions still wrong, then I am sorry only use css files.

## Alternative to local node-sass installation
If using a local `node-sass` package fails for you, you can install `node-sass` globally and enable the **useGlobalSass** option to be able to use .sass files once again.

Take into consideration that this approach will use the same `node-sass` version for all your projects.

To install `node-sass` globally follow this step:

```bash
$ npm install -g node-sass
```

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

- #### useGlobalSass
    Enables Sass file parsing using a **globally** installed **node-sass** package

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
    padding: 0 0.1vmax;
    margin: 0 0.2vmin;
    align-items: center;
}
.description {
    width: "-.5vw";
    height: 50vh;
    font-size: 18;
    font-family: ProximaNova-Semibold;
    text-align: center;
    color: $colour-base;
    writing-direction: auto;
    text-shadow-offset: "JS({width: 0, height: 0})";
    letter-spacing: .7px;
    margin-top: -20px;
    font-weight: "700";
}
.img {
    margin: 0 1px 2rem 3em;
    resize-mode: "JS(React.Image.resizeMode.cover)";
}
```

CSS will generate the following:

```js
// styles.js
import React, {StyleSheet, Dimensions, PixelRatio} from "react-native";
const {width, height, scale} = Dimensions.get("window"),
    vw = width / 100,
    vh = height / 100,
    vmin = Math.min(vw, vh),
    vmax = Math.max(vw, vh);

export default StyleSheet.create({
    "container": {
        "flex": 1,
        "paddingTop": 0,
        "paddingRight": 0.1 * vmax,
        "paddingBottom": 0,
        "paddingLeft": 0.1 * vmax,
        "marginTop": 0,
        "marginRight": 0.2 * vmin,
        "marginBottom": 0,
        "marginLeft": 0.2 * vmin,
        "alignItems": "center"
    },
    "description": {
        "width": -.5 * vw,
        "height": 50 * vh,
        "fontSize": 18,
        "fontFamily": "ProximaNova-Semibold",
        "textAlign": "center",
        "color": "#656656",
        "writingDirection": "auto",
        "textShadowOffset": {width: 0, height: 0},
        "letterSpacing": 0.7,
        "marginTop": -20,
        "fontWeight": "700"
    },
    "img": {
        "marginTop": 0,
        "marginRight": 1,
        "marginBottom": 2,
        "marginLeft": 3,
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
