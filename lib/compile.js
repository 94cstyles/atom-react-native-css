"use strict";

var path = require('path'),
    fs = require('fs'),
    css = require('css'),
    camel = require('to-camel-case');

var injectScript = `import React, {StyleSheet, Dimensions} from "react-native";
const {width, height, scale} = Dimensions.get("window"),
    vw = width / 100,
    vh = height / 100,
    vmin = Math.min(vw, vh),
    vmax = Math.max(vw, vh);
`;

var compile = {
    parseNumber: function(value) {
        if (typeof(value) == 'string') {
            if (value.match(/^(\d{1,})+(px|rem|em)$/g)) {
                value = value.replace(/(px|rem|em)/g, '');
            }
            if (!isNaN(value) && value.trim() != '') {
                value = parseFloat(value);
            }
        }
        return value;
    },
    formatJSS: function(obj, property, value) {
        if (property.match(/-/)) {
            property = camel(property.toLowerCase());
        }
        //处理margin和padding
        if (property.toLowerCase().match(/^(margin|padding)$/)) {
            property = property.toLowerCase();
            var values = value.replace(/\s{2,20}/g, ' ').split(' ');
            values = values.length == 1 ? [values[0], values[0], values[0], values[0]] : values;
            values = values.length == 2 ? [values[0], values[1], values[0], values[1]] : values;
            values = values.length == 3 ? [values[0], values[1], values[2], values[1]] : values;
            ['Top', 'Right', 'Bottom', 'Left'].forEach(function(prop, index) {
                obj[property + prop] = this.parseNumber(values[index]);
            }.bind(this));
        } else {
            obj[property] = this.parseNumber(value);
        }
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
            var text = JSON.stringify(cssJSON, null, 4),
                val = '',
                match = text.match(/\"[0-9]+([.]{1}[0-9]+){0,1}(vw|vh|vmin|vmax)\"/g);

            //处理vw vh vmin vmax单位计数值
            if (match) {
                for (var i = 0; i < match.length; i++) {
                    val = match[i].replace(/\"/g, '');
                    val = val.replace(/(vw|vh|vmin|vmax)$/, ' * ' + val.match(/(vw|vh|vmin|vmax)$/)[1]);
                    text = text.replace(match[i], val);
                }
            }

            //处理js代码
            match = text.match(/"(\\"|\')JS\(([\s\S]*?)\)(\\"|\')"/g);
            if (match) {
                for (var i = 0; i < match.length; i++) {
                    val = match[i].match(/JS\(([\s\S]*?)\)/)[1];
                    text = text.replace(match[i], val);
                }
            }

            var wstream = fs.createWriteStream(outputFile);
            wstream.write(injectScript + "\nexport default StyleSheet.create(" + text + ");");
            wstream.end();
        }
    }
};

module.exports = compile.parseJSS;
