import React, {StyleSheet, Dimensions, PixelRatio} from "react-native";
const {width, height, scale} = Dimensions.get("window"),
    vw = width / 100,
    vh = height / 100,
    vmin = Math.min(vw, vh),
    vmax = Math.max(vw, vh);

export default StyleSheet.create({
    "child": {
        "width": 5 * vw
    },
    "container": {
        "flex": 1,
        "paddingTop": 0,
        "paddingRight": 0.1 * vmax,
        "paddingBottom": 0,
        "paddingLeft": 0.1 * vmax,
        "marginTop": -20,
        "marginRight": 0.2 * vmin,
        "marginBottom": 0,
        "marginLeft": 0.2 * vmin,
        "alignItems": "center",
        "fontWeight": "300"
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