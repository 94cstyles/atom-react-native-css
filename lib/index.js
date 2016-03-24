"use strict";

var path = require('path'),
    exec = require('child_process').exec,
    execSync = require('child_process').execSync,
    minimatch = require('minimatch'),
    compile = require('./compile.js');

var packageName = 'atom-react-native-css';

module.exports = {
    config: {
        compileCSS: {
            title: 'Enable compile React Style',
            type: 'boolean',
            "default": true,
            order: 11
        },
        enableSass: {
            title: 'Enable Sass file and install node-sass',
            description: 'By default only supports css files, you need to use sass file Enable this',
            type: 'boolean',
            "default": false,
            order: 12,
        },
        input: {
            title: 'Input files',
            description: 'Enter the file path or directory. Please read minimatch matching rules',
            type: 'string',
            "default": '**/*.@(css|scss|sass)',
            order: 13
        },
        output: {
            title: 'Output file',
            description: 'File output directory. Relative to the path of the input file',
            type: 'string',
            "default": './',
            order: 14
        }
    },
    installationDir: '',
    environment: null,
    nodeSassInstallState: -1, //node-sass安装状态 -1:未安装,0:已安装,1:正在安装
    activate: function() {
        this.hasInstallNodeSass();

        var self = this;
        atom.workspace.observeTextEditors(function(editor) {
            if (!editor || editor.getURI() === undefined) return;
            var filePath = editor.getURI(),
                file = path.parse(filePath),
                mm = path.resolve(atom.project.getPaths()[0], atom.config.get(packageName + '.input')).replace(/\\/g, '/');

            //规则内的文件进行监听
            if (minimatch(filePath, mm) && file.ext.match(/^(.css|.sass|.scss)$/)) {
                editor.onDidSave(function() {
                    if (atom.config.get(packageName + '.compileCSS')) {
                        if (file.ext.match(/^(.sass|.scss)$/) && (!atom.config.get(packageName + '.enableSass') || self.nodeSassInstallState != 0)) return;
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
    },
    deactivate: function() {
        return this;
    },
    serialize: function() {
        return {};
    },
    hasInstallNodeSass: function() {
        //根据系统确认npm安装地址
        if (process.platform === 'win32') {
            this.installationDir = path.join(process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'], 'AppData\\Roaming\\npm').replace(/\\/g, '/');
        } else if (process.platform === 'linux' || process.platform === 'darwin') {
            this.installationDir = '/usr/local/bin';
        }

        //设置命令执行环境
        this.environment = Object.create(process.env);
        this.environment.PATH += ":" + this.installationDir;

        //通过命令验证node-sass是否安装
        exec((process.platform === 'win32' ? 'npm.cmd' : 'npm') + ' ls node-sass', {
            env: this.environment,
            encoding: 'utf8',
            cwd: path.resolve(__dirname, '../')
        }, (error, stdout, stderr) => {
            if (stdout.indexOf('(empty)') == -1) {
                this.nodeSassInstallState = 0;
            } else {
                this.registerEnableSass();
            }
        });
    },
    installNotification: function() {
        var notification = atom.notifications.addInfo('Installing atom-react-native-css dependencies', {
            detail: 'Installing node-sass',
            dismissable: true
        });
        setTimeout(() => {
            var notificationView = atom.views.getView(notification),
                content = notificationView.querySelector('.detail-content'),
                progress = document.createElement('progress');


            //设置进度条
            progress.max = 1;
            progress.style.width = "100%";

            //加入进度条
            if (content) content.appendChild(progress);
        }, 0);

        return {
            dismiss: function() {
                notification.dismiss();
            },
            error: function(message) {
                atom.notifications.addError('Error installing atom-react-native-css dependencies', {
                    detail: error.stack,
                    dismissable: true
                });
            },
            success: function(message) {
                atom.notifications.addSuccess('Installing atom-react-native-css dependencies', {
                    detail: message,
                    dismissable: false
                });
            }
        };
    },
    installNodeSass: function() {
        this.nodeSassInstallState = 1;
        var notification = this.installNotification();
        exec((process.platform === 'win32' ? 'npm.cmd' : 'npm') + ' install node-sass', {
            env: this.environment,
            encoding: 'utf8',
            cwd: path.resolve(__dirname, '../')
        }, (error, stdout, stderr) => {
            notification.dismiss();
            if (error !== null) {
                this.nodeSassInstallState = -1;
                notification.error(error);
            } else {
                this.nodeSassInstallState = 0;
                notification.success('node-sass install success，You can now use sass edit React Style。');
            }
        });
    },
    registerEnableSass: function() {
        //监听配置变化
        atom.config.observe(packageName + '.enableSass', (val) => {
            if (val && this.nodeSassInstallState == -1) {
                this.installNodeSass();
            }
        });
    },
    getProvider: function() {
        return require('./provider.js');
    }
};
