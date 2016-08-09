"use strict";

var path = require('path'),
    fs = require('fs'),
    css = require('css'),
    camel = require('to-camel-case'),
    childProcess = require('child_process'),
    consistentPath = require('consistent-path'),
    pathToGlobalSCSS;

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
    parseCSS: function(filePath, outputFile, errorFunc) {
        compile.doParse(fs.readFileSync(filePath, 'utf-8'), filePath, outputFile, errorFunc);
    },
    parseSCSSLocally: function(filePath, outputFile, errorFunc) {
        var css = require('node-sass').renderSync({
            file: filePath,
            outputStyle: 'compressed'
        }).css.toString();

        compile.doParse(css,  filePath, outputFile, errorFunc);
    },
    parseSCSSGlobally: function(filePath, outputFile, errorFunc) {
        var css,
          isWin = process.platform == 'win32',
          cmd = 'npm',
          npmPrefix,
          envObj,
          cmdConvert,
          partialPath = ['node_modules', 'node-sass'];

        // Determine the globally installed node-sass binary path
        if (!pathToGlobalSCSS) {
            // Clone the current environment
            envObj = {};
            Object.keys(process.env).forEach(function (k) {
                envObj[k] = process.env[k];
            });

            // Make sure the path is valid on OS X
            envObj.PATH = consistentPath();

            if (isWin) {
                cmd = 'npm.cmd';
            } else {
                // *NIX based systems keep global node modules under NPM_PREFIX/lib/...
                partialPath.unshift('lib');
            }

            // Get globally installed packages npm root
            try {
                npmPrefix = childProcess.spawnSync(cmd, ['get', 'prefix'], {
                  env: envObj
                }).output[1].toString().trim()
            } catch (e) {
                // Notify the user of the error, maybe he will install it!
                throw new Error('Node-SASS is not installed globally! Please make sure to install node-sass before using the global option.');
            }

            // Add NPM prefix to the partial path
            partialPath.unshift(npmPrefix);

            // Cache the obtained path to the global SASS installation
            pathToGlobalSCSS = path.join.apply(null, partialPath);
        }

        cmdConvert = path.join(pathToGlobalSCSS, 'bin', 'node-sass') + ' --output-style compressed ' + filePath;

        // Forward to the globally installed node-sass module and wait for return
        css = childProcess.execSync(cmdConvert, {
            env: envObj
        }).toString();

        compile.doParse(css,  filePath, outputFile, errorFunc);
    },
    doParse: function (contents, filePath, outputFile, errorFunc) {
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

module.exports = {
  parseCSS: compile.parseCSS,
  parseSCSSLocally: compile.parseSCSSLocally,
  parseSCSSGlobally: compile.parseSCSSGlobally
};
