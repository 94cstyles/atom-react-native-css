"use strict";

var path = require('path'),
    fs = require('fs'),
    exec = require('child_process').exec,
    execSync = require('child_process').execSync,
    minimatch = require('minimatch'),
    compile = require('./compile.js'),
    detector = require('./file-detector.js'),
    mutualExclusionInProgress = false;

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
        useGlobalSass: {
            title: 'Enable Sass file and use globally installed node-sass',
            description: 'This option is mutually exclusive with "Enable Sass file and install node-sass".',
            type: 'boolean',
            "default": false,
            order: 13,
            enabled: false
        },
        input: {
            title: 'Input files',
            description: 'Enter the file path or directory. Please read minimatch matching rules',
            type: 'string',
            "default": '**/*.@(css|scss|sass)',
            order: 14
        },
        output: {
            title: 'Output file',
            description: 'File output directory. Relative to the path of the input file',
            type: 'string',
            "default": './',
            order: 15
        }
    },
    installationDir: '',
    environment: null,
    nodeSassInstallState: -1, //node-sass安装状态 -1:未安装,0:已安装,1:正在安装
    activate: function() {
        this.hasInstallNodeSass();
        this.registerMutualExclusionOfNodeSassTypes();

        var self = this;
        atom.workspace.observeTextEditors(function(editor) {
            if (!editor || editor.getURI() === undefined) return;
            for (var v in atom.project.getPaths()) {
                var projectPath = atom.project.getPaths()[v];
                if (projectPath != "atom://config") {
                    var filePath = editor.getURI(),
                        file = path.parse(filePath),
                        mm = path.resolve(projectPath, atom.config.get(packageName + '.input')).replace(/\\/g, '/'),
                        startDir = path.parse(mm).dir.replace(/\/\*\*/g, '');

                    //规则内的文件进行监听
                    if (minimatch(filePath, mm) && file.ext.match(/^(.css|.sass|.scss)$/)) {
                        editor.onDidSave(function() {
                            if (atom.config.get(packageName + '.compileCSS')) {
                                if (/^(.sass|.scss)$/.test(file.ext)) {
                                    if (!atom.config.get(packageName + '.useGlobalSass') && (!atom.config.get(packageName + '.enableSass') || self.nodeSassInstallState != 0)) {
                                        atom.notifications.addError('Error', {
                                            detail: self.nodeSassInstallState != 0 ? 'node-sass is not installed' : 'disable the function of the node-sass files',
                                            dismissable: false
                                        });

                                        return;
                                    }

                                    //sass文件 进行关系链查询 编译import文件
                                    detector.getFilesByImprot(startDir, filePath, function(filePaths, errorMessage) {
                                        if (filePaths) {
                                            filePaths.forEach(function(filePath) {
                                                self.compileFile(filePath);
                                            });
                                        } else {
                                            atom.notifications.addError('Error', {
                                                detail: errorMessage,
                                                dismissable: false
                                            });
                                        }
                                    });
                                } else {
                                    self.compileFile(filePath);
                                }
                            }
                        });
                    }
                }
            }

        });
    },
    deactivate: function() {
        return this;
    },
    serialize: function() {
        return {};
    },
    compileFile: function(filePath) {
        var file = path.parse(filePath);
        var outputFile = path.resolve(file.dir, atom.config.get(packageName + '.output'), path.parse(filePath).name + '.js').replace(/\\/g, '/');

        if (file.ext == '.css') {
          // Normal CSS file conversion
          setTimeout(function() {
              compile.parseCSS(filePath, outputFile, function(message) {
                  atom.notifications.addError('Error', {
                      detail: message,
                      dismissable: false
                  });
              });
          }, 0);
        } else if (atom.config.get(packageName + '.useGlobalSass')) {
          // SASS/SCSS file conversion with global node-sass package
          compile.parseSCSSGlobally(filePath, outputFile, function(message) {
              atom.notifications.addError('Error', {
                  detail: message,
                  dismissable: false
              });
          });
        } else {
          // SASS/SCSS file conversion with locally installed node-sass package
          setTimeout(function() {
              compile.parseSCSSLocally(filePath, outputFile, function(message) {
                  atom.notifications.addError('Error', {
                      detail: message,
                      dismissable: false
                  });
              });
          }, 0);
        }
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
        if (fs.existsSync(path.resolve(__dirname, '../node_modules/node-sass'))) {
            this.nodeSassInstallState = 0;
        } else {
            this.registerEnableSass();
        }
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
                    detail: message,
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
                notification.error(error.hasOwnProperty('stack') ? error.stack : error);
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
    registerMutualExclusionOfNodeSassTypes: function () {
        [packageName + '.useGlobalSass', packageName + '.enableSass'].forEach((k) => {
            atom.config.onDidChange(k, (val) => {
                if (!mutualExclusionInProgress) {
                    mutualExclusionInProgress = true;
                    var isGlobal = k.indexOf('useGlobalSass') > -1;

                    this.mutuallyExcludeNodeSassTypes({
                        global: isGlobal ? val.newValue : false,
                        local: !isGlobal ? val.newValue : false
                    });
                }
            });
        });
    },
    mutuallyExcludeNodeSassTypes: function (o) {
        var localSass = packageName + '.enableSass',
          globalSass = packageName + '.useGlobalSass',
          unsetOption = function (o) {
              if (atom.config.get(o)) {
                  atom.config.set(o, false);
              }
          };

        // Remove the other option when one of them is selected
        if (o.global || o.local) {
            if (o.global) {
                unsetOption(localSass);
            } else {
                unsetOption(globalSass);
            }
        } else {
            // Make sure both are unset
            unsetOption(localSass);
            unsetOption(globalSass);
        }

        setTimeout(() => {
            mutualExclusionInProgress = false;
        }, 10);
    },
    getProvider: function() {
        return require('./provider.js');
    }
};
