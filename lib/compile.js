"use strict";

var path = require('path'),
    fs = require('fs'),
    css = require('css'),
    camel = require('to-camel-case');

var injectScript = `import React, {StyleSheet, Dimensions, PixelRatio} from "react-native";
const {width, height, scale} = Dimensions.get("window"),
    vw = width / 100,
    vh = height / 100,
    vmin = Math.min(vw, vh),
    vmax = Math.max(vw, vh);
`;

var compile = {
    /**
     * 处理字符串去除\"\"
     * @param  {[type]} valueOld
     * @return {[type]} valueNew
     */
    parseString: function(value) {
        if (typeof(value) == 'string') {
            if (value.match(/^"([\s\S]*?)"$/)) {
                value = value.match(/^"([\s\S]*?)"$/)[1];
            }
        }
        return value;
    },
    /**
     * 去除px rem em单位 并 转换为数值
     * @param  {[type]} value [description]
     * @return {[type]}       [description]
     */
    parseNumber: function(value) {
        if (typeof(value) == 'string') {
            if (value.match(/^[(-?\d+\.\d+)|(-?\d+)|(-?\.\d+)]+(px|rem|em)$/)) {
                value = value.replace(/(px|rem|em)/g, '');
            }
            if (!isNaN(value) && value.trim() != '') {
                value = parseFloat(value);
            }
        }
        return value;
    },
    /**
     * 处理vw vh vmin vmax单位
     * @param  {[type]} valueOld
     * @return {[type]} valueNew
     */
    parseUnit: function(value) {
        if (typeof(value) == 'string') {
            if (value.match(/^[(-?\d+\.\d+)|(-?\d+)|(-?\.\d+)]+(vw|vh|vmin|vmax)$/)) {
                value = "JS(" + (value.replace(/(vw|vh|vmin|vmax)$/, ' * ' + value.match(/(vw|vh|vmin|vmax)$/)[1])) + ")";
            }
        }
        return value;
    },
    formatJSS: function(obj, property, value) {
        property = camel(property.toLowerCase());

        //处理margin和padding
        if (/^(padding|margin)$/.test(property)) {
            var values = value.replace(/\s{2,20}/g, ' ').split(' ');
            values = values.length == 1 ? [values[0], values[0], values[0], values[0]] : values;
            values = values.length == 2 ? [values[0], values[1], values[0], values[1]] : values;
            values = values.length == 3 ? [values[0], values[1], values[2], values[1]] : values;
            ['Top', 'Right', 'Bottom', 'Left'].forEach(function(prop, index) {
                obj[property + prop] = compile.parseNumber(values[index]);
                obj[property + prop] = compile.parseUnit(obj[property + prop]);
            }.bind(this));
        } else if (/fontWeight/.test(property)) {
            if (/^(normal|bold|[1-9]00)$/.test(value)) {
                obj[property] = '"' + value + '"';
            } else if (/^['|"](normal|bold|[1-9]00)['|"]$/.test(value)) {
                obj[property] = value;
            } else {
                throw new Error('fontWeight value in ["normal", "bold", "100", "200", "300", "400", "500", "600", "700", "800", "900"]');
            }
        } else {
            obj[property] = compile.parseNumber(value);
        }
        obj[property] = compile.parseString(obj[property]);
        obj[property] = compile.parseUnit(obj[property]);
    },
    parseJSS: function(filePath, outputFile, ext, errorFunc) {
        var contents = ext == '.css' ? fs.readFileSync(filePath, 'utf-8') : require('node-sass').renderSync({
            file: filePath,
            outputStyle: 'compressed'
        }).css.toString();

        try {
            contents = css.parse(contents.replace(/\r?\n|\r/g, ''));
        } catch (e) {
            //捕获css文件内容错误 sass文件错误编译时就回报错
            contents = null;
            errorFunc(filePath + '\n \n' + e);
        } finally {
            var cssJSON = {};
            if (contents) {
                contents.stylesheet.rules.forEach(function(rule) {
                    if (rule.type !== 'rule') return;

                    rule.selectors.forEach(function(selector) {
                        selector = selector.replace(/\.|#/g, '');
                        cssJSON[selector] = cssJSON[selector] || {};

                        rule.declarations.forEach(function(declaration) {
                            if (declaration.type !== 'declaration') return;
                            compile.formatJSS(cssJSON[selector], declaration.property, declaration.value);
                        });
                    });
                });
            }

            //输出文件
            var text = JSON.stringify(cssJSON, null, 4);

            //处理js代码
            var codes = text.match(/"JS\(([\s\S]*?)\)"/g);
            if (codes) {
                for (var i = 0; i < codes.length; i++) {
                    text = text.replace(codes[i], codes[i].match(/"JS\(([\s\S]*?)\)"/)[1]);
                }
            }

            var wstream = fs.createWriteStream(outputFile);
            wstream.write(injectScript + "\nexport default StyleSheet.create(" + text + ");");
            wstream.end();
        }
    }
};

module.exports = compile.parseJSS;
