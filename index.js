var path = require('path'),
    fs = require('fs'),
    minimatch = require('minimatch'),
    css = require('css'),
    camel = require('to-camel-case'),
    sass = require('node-sass');

var packageName = 'atom-react-native-css';

module.exports = {
    config: {
        input: {
            title: 'Input files',
            description: 'Enter the file path or directory. Please read minimatch matching rules',
            type: 'string',
            "default": '**/*.@(css|scss|sass)',
            order: 10
        },
        output: {
            title: 'Output file',
            description: 'File output directory. Relative to the path of the input file',
            type: 'string',
            "default": './',
            order: 11
        }
    },
    activate: function() {
        var _this = this;
        atom.workspace.observeTextEditors(function(editor) {
            if (!editor || editor.getURI() === undefined) return;
            var filePath = editor.getURI(),
                file = path.parse(filePath),
                mm = path.resolve(atom.project.getPaths()[0], atom.config.get(packageName + '.input')).replace(/\\/g, '/');

            //规则内的文件进行监听
            if (minimatch(filePath, mm) && file.ext.match(/^(.css|.sass|.scss)$/)) {
                editor.onDidSave(function() {
                    var outputFile = path.resolve(file.dir, atom.config.get(packageName + '.output'), path.parse(filePath).name + '.js');
                    setTimeout(function() {
                        _this.parseJSS(filePath, outputFile, file.ext);
                    }, 0);
                });
            }
        });
        return this;
        //安装关联包
        require('atom-package-deps').install('atom-react-native-css');
    },
    deactivate: function() {
        return this;
    },
    serialize: function() {
        return {};
    },
    parseNumber: function(value) {
        if (typeof(value) == 'string') {
            value = value.replace(/px|rem|em/g, '');
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
    parseJSS: function(filePath, outputFile, ext) {
        var _this = this;
        var contents = ext == '.css' ? fs.readFileSync(filePath, 'utf-8') : sass.renderSync({
            file: filePath,
            outputStyle: 'compressed'
        }).css.toString();

        try {
            var cssJSON = {};
            contents = css.parse(contents.replace(/\r?\n|\r/g, ''));
            contents.stylesheet.rules.forEach(function(rule) {
                if (rule.type !== 'rule') return;

                rule.selectors.forEach(function(selector) {
                    selector = selector.replace(/\.|#/g, '');
                    cssJSON[selector] = cssJSON[selector] || {};

                    rule.declarations.forEach(function(declaration) {
                        if (declaration.type !== 'declaration') return;
                        _this.formatJSS(cssJSON[selector], declaration.property, declaration.value);
                    });
                });
            });
            //输出文件
            var wstream = fs.createWriteStream(outputFile);
            wstream.write("module.exports = require('react-native').StyleSheet.create(" + JSON.stringify(cssJSON, null, 4) + ");");
            wstream.end();
        } catch (e) {
            //捕获css文件内容错误 sass文件错误编译时就回报错
            atom.notifications.addError('CSS Error', {
                detail: filePath + '\n \n' + e,
                dismissable: false
            });
        }
    }
};
