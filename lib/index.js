"use strict";

var path = require('path'),
    minimatch = require('minimatch'),
    compile = require('./compile.js');

var packageName = 'atom-react-native-css';

module.exports = {
    config: {
        autocomplete: {
            title: 'Enable autocomplete React Style',
            type: 'boolean',
            "default": true,
            order: 10
        },
        compileCSS: {
            title: 'Enable compile React Style',
            type: 'boolean',
            "default": true,
            order: 11
        },
        input: {
            title: 'Input files',
            description: 'Enter the file path or directory. Please read minimatch matching rules',
            type: 'string',
            "default": '**/*.@(css|scss|sass)',
            order: 12
        },
        output: {
            title: 'Output file',
            description: 'File output directory. Relative to the path of the input file',
            type: 'string',
            "default": './',
            order: 13
        }
    },
    activate: function() {
        atom.workspace.observeTextEditors(function(editor) {
            if (!editor || editor.getURI() === undefined) return;
            var filePath = editor.getURI(),
                file = path.parse(filePath),
                mm = path.resolve(atom.project.getPaths()[0], atom.config.get(packageName + '.input')).replace(/\\/g, '/');

            //规则内的文件进行监听
            if (minimatch(filePath, mm) && file.ext.match(/^(.css|.sass|.scss)$/)) {
                editor.onDidSave(function() {
                    if (atom.config.get(packageName + '.compileCSS')) {
                        var outputFile = path.resolve(file.dir, atom.config.get(packageName + '.output'), path.parse(filePath).name + '.js').replace(/\\/g, '/');
                        setTimeout(function() {
                            compile(filePath, outputFile, file.ext, function(message) {
                                atom.notifications.addError('CSS Error', {
                                    detail: message,
                                    dismissable: false
                                });
                            });
                        }, 0);
                    }
                });
            }
        });

        //安装关联包
        require('atom-package-deps').install('atom-react-native-css');
    },
    deactivate: function() {
        return this;
    },
    serialize: function() {
        return {};
    },
    getProvider: function() {
        return require('./provider.js');
    }
};
