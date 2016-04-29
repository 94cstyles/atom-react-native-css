"use strict";

var fs = require("fs"),
    path = require("path"),
    glob = require("glob"),
    parseImport = require("parse-import"),
    exec = require("child_process").exec;

var detector = {
    /**
     * 查找sass的关系链 不支持.sass和.scss混合
     * @param  {[type]}   startDir [description]
     * @param  {[type]}   filePath [description]
     * @param  {Function} callback [description]
     * @return {[type]}            [description]
     */
    getFilesByImprot: function(startDir, filePath, callback) {
        this.find(startDir, path.parse(filePath).ext, function(fileMap, errorMessage) {
            if (fileMap === null || !fileMap[filePath]) {
                callback(null, errorMessage || filePath + " Could not find the file"); //错误处理
            } else if (fileMap[filePath].importedBy.length === 0) {
                callback([filePath], null); //单独文件 没有被引用
            } else {
                //遍历关系链 找到受连锁反应的文件
                var filePaths = [];
                var multipleNested = function(key, importedBy) {
                    for (var i = 0; i < importedBy.length; i++) {
                        if (fileMap[importedBy[i]].importedBy.length === 0 && filePaths.indexOf(importedBy[i]) === -1) {
                            filePaths.push(importedBy[i]);
                        } else {
                            multipleNested(importedBy[i], fileMap[importedBy[i]].importedBy);
                        }
                    }
                };
                multipleNested(filePath, fileMap[filePath].importedBy);
                callback(filePaths, null);
            }
        });
    },
    cache: {},
    cacheModify: function(filePath) {
        var time = new Date();
        //缓存有效期120秒
        if (this.cache[filePath] && this.cache[filePath].time - time > 120000) {
            delete this.cache[filePath];
        }
        this.cache[filePath] = this.cache[filePath] || {
            exist: fs.existsSync(filePath),
            time: time
        }
        if (this.cache[filePath].exist) {
            if (typeof(this.cache[filePath].file) === 'undefined') {
                this.cache[filePath].file = fs.lstatSync(filePath).isFile();
            }
            return this.cache[filePath].file;
        } else {
            delete this.cache[filePath];
            return false;
        }
    },
    getFilePath: function(filePath, fileExt) {
        var newFilePath = filePath;
        //如果当前文件路径没有扩展名 就默认添加扩展名
        if (path.extname(newFilePath) === '') newFilePath = filePath + fileExt;
        if (this.cacheModify(newFilePath)) {
            return newFilePath;
        } else {
            return false;
        }
    },
    addFile: function(fileMap, filePath, parent) {
        if (this.cacheModify(filePath)) {
            fileMap[filePath] = fileMap[filePath] || {
                imports: [],
                importedBy: []
            };
            if (typeof(parent) == 'undefined') {
                var file = path.parse(filePath);
                var improts = parseImport(fs.readFileSync(filePath, 'utf-8'));
                for (var i = 0; i < improts.length; i++) {
                    var improtFilePath = this.getFilePath(path.resolve(file.dir, improts[i].path).replace(/\\/g, '/'), file.ext);
                    if (improtFilePath) {
                        fileMap[filePath].imports.push(improtFilePath);
                        this.addFile(fileMap, improtFilePath, filePath);
                    }
                }
            } else {
                fileMap[filePath].importedBy.push(parent);
            }
        }
    },
    traversal: function(files, callback) {
        if (files.length === 0 || (files.length === 1 && files[0].trim() === "")) {
            callback(null, null);
        } else {
            var fileMap = {};
            files.forEach((file) => {
                this.addFile(fileMap, file);
            });
            callback(fileMap, null);
        }
    },
    find: function(startDir, ext, callback) {
        if (/^win/.test(process.platform)) {
            glob(startDir + '/**/*' + ext + '', {
                cwd: startDir,
                nosort: true
            }, (err, files) => {
                if (err) {
                    callback(null, err);
                } else {
                    this.traversal(files, callback);
                }
            });
        } else {
            var command = 'find ' + startDir + ' -type f -name *' + ext;
            exec(command, (err, stdout, stderr) => {
                if (err) {
                    callback(null, err);
                } else {
                    var files = stdout.replace(/\r/g, "").split("\n");
                    files.splice(-1, 1);
                    this.traversal(files, callback);
                }
            });
        }
    }
};

module.exports = detector;
