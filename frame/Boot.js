/**
 * Created by kk on 2015/10/10.
 */
var hey3d = hey3d || {};

hey3d.ENGINEVERSION = "HEY3DJS v2.0";

var d = d || {};

hey3d.log = function(){
    return console.log.apply(console, arguments);
};

hey3d.newElement = function (x) {
    return document.createElement(x);
};

hey3d._addEventListener = function (element, type, listener, useCapture) {
    element.addEventListener(type, listener, useCapture);
};

//is nodejs ? Used to support node-webkit.
hey3d._isNodeJs = typeof require !== 'undefined' && require("fs");

/**
 * Iterate over an object or an array, executing a function for each matched element.
 * @param {object|array} obj
 * @param {function} iterator
 * @param {object} [context]
 */
hey3d.each = function (obj, iterator, context) {
    if (!obj)
        return;
    if (obj instanceof Array) {
        for (var i = 0, li = obj.length; i < li; i++) {
            if (iterator.call(context, obj[i], i) === false)
                return;
        }
    } else {
        for (var key in obj) {
            if (iterator.call(context, obj[key], key) === false)
                return;
        }
    }
};

/**
 * Copy all of the properties in source objects to target object and return the target object.
 * @param {object} target
 * @param {object} *sources
 * @returns {object}
 */
hey3d.extend = function(target) {
    var sources = arguments.length >= 2 ? Array.prototype.slice.call(arguments, 1) : [];

    hey3d.each(sources, function(src) {
        for(var key in src) {
            if (src.hasOwnProperty(key)) {
                target[key] = src[key];
            }
        }
    });
    return target;
};

/**
 * Check the obj whether is function or not
 * @param {*} obj
 * @returns {boolean}
 */
hey3d.isFunction = function(obj) {
    return typeof obj === 'function';
};

/**
 * Check the obj whether is number or not
 * @param {*} obj
 * @returns {boolean}
 */
hey3d.isNumber = function(obj) {
    return typeof obj === 'number' || Object.prototype.toString.call(obj) === '[object Number]';
};

/**
 * Check the obj whether is string or not
 * @param {*} obj
 * @returns {boolean}
 */
hey3d.isString = function(obj) {
    return typeof obj === 'string' || Object.prototype.toString.call(obj) === '[object String]';
};

/**
 * Check the obj whether is array or not
 * @param {*} obj
 * @returns {boolean}
 */
hey3d.isArray = function(obj) {
    return Array.isArray(obj) ||
        (typeof obj === 'object' && Object.prototype.toString.call(obj) === '[object Array]');
};

/**
 * Check the obj whether is undefined or not
 * @param {*} obj
 * @returns {boolean}
 */
hey3d.isUndefined = function(obj) {
    return typeof obj === 'undefined';
};

/**
 * Check the obj whether is object or not
 * @param {*} obj
 * @returns {boolean}
 */
hey3d.isObject = function(obj) {
    return typeof obj === "object" && Object.prototype.toString.call(obj) === '[object Object]';
};

/**
 * Check the url whether cross origin
 * @param {String} url
 * @returns {boolean}
 */
hey3d.isCrossOrigin = function (url) {
    if (!url) {
        hey3d.log("invalid URL");
        return false;
    }
    var startIndex = url.indexOf("://");
    if (startIndex === -1)
        return false;

    var endIndex = url.indexOf("/", startIndex + 3);
    var urlOrigin = (endIndex === -1) ? url : url.substring(0, endIndex);
    return urlOrigin !== location.origin;
};

/**
 * Async Pool class, a helper of cc.async
 * @param {Object|Array} srcObj
 * @param {Number} limit the limit of parallel number
 * @param {function} iterator
 * @param {function} onEnd
 * @param {object} target
 * @constructor
 */
hey3d.AsyncPool = function(srcObj, limit, iterator, onEnd, target){
    var self = this;
    self._srcObj = srcObj;
    self._limit = limit;
    self._pool = [];
    self._iterator = iterator;
    self._iteratorTarget = target;
    self._onEnd = onEnd;
    self._onEndTarget = target;
    self._results = srcObj instanceof Array ? [] : {};
    self._isErr = false;

    hey3d.each(srcObj, function(value, index){
        self._pool.push({index : index, value : value});
    });

    self.size = self._pool.length;
    self.finishedSize = 0;
    self._workingSize = 0;

    self._limit = self._limit || self.size;

    self.onIterator = function(iterator, target){
        self._iterator = iterator;
        self._iteratorTarget = target;
    };

    self.onEnd = function(endCb, endCbTarget){
        self._onEnd = endCb;
        self._onEndTarget = endCbTarget;
    };

    self._handleItem = function(){
        var self = this;
        if(self._pool.length === 0 || self._workingSize >= self._limit)
            return;                                                         //return directly if the array's length = 0 or the working size great equal limit number

        var item = self._pool.shift();
        var value = item.value, index = item.index;
        self._workingSize++;
        self._iterator.call(self._iteratorTarget, value, index,
            function(err) {
                if (self._isErr)
                    return;

                self.finishedSize++;
                self._workingSize--;
                if (err) {
                    self._isErr = true;
                    if (self._onEnd)
                        self._onEnd.call(self._onEndTarget, err);
                    return;
                }

                var arr = Array.prototype.slice.call(arguments, 1);
                self._results[this.index] = arr[0];
                if (self.finishedSize === self.size) {
                    if (self._onEnd)
                        self._onEnd.call(self._onEndTarget, null, self._results);
                    return;
                }
                self._handleItem();
            }.bind(item),
            self);
    };

    self.flow = function(){
        var self = this;
        if(self._pool.length === 0) {
            if(self._onEnd)
                self._onEnd.call(self._onEndTarget, null, []);
            return;
        }
        for(var i = 0; i < self._limit; i++)
            self._handleItem();
    }
};

hey3d.async = {
    /**
     * Do tasks series.
     * @param {Array|Object} tasks
     * @param {function} [cb] callback
     * @param {Object} [target]
     * @return {hey3d.AsyncPool}
     */
    series : function(tasks, cb, target){
        var asyncPool = new hey3d.AsyncPool(tasks, 1, function(func, index, cb1){
            func.call(target, cb1);
        }, cb, target);
        asyncPool.flow();
        return asyncPool;
    },

    /**
     * Do tasks parallel.
     * @param {Array|Object} tasks
     * @param {function} cb callback
     * @param {Object} [target]
     * @return {hey3d.AsyncPool}
     */
    parallel : function(tasks, cb, target){
        var asyncPool = new hey3d.AsyncPool(tasks, 0, function(func, index, cb1){
            func.call(target, cb1);
        }, cb, target);
        asyncPool.flow();
        return asyncPool;
    },

    /**
     * Do tasks waterfall.
     * @param {Array|Object} tasks
     * @param {function} cb callback
     * @param {Object} [target]
     * @return {hey3d.AsyncPool}
     */
    waterfall : function(tasks, cb, target){
        var args = [];
        var lastResults = [null];//the array to store the last results
        var asyncPool = new hey3d.AsyncPool(tasks, 1,
            function (func, index, cb1) {
                args.push(function (err) {
                    args = Array.prototype.slice.call(arguments, 1);
                    if(tasks.length - 1 === index) lastResults = lastResults.concat(args);//while the last task
                    cb1.apply(null, arguments);
                });
                func.apply(target, args);
            }, function (err) {
                if (!cb)
                    return;
                if (err)
                    return cb.call(target, err);
                cb.apply(target, lastResults);
            });
        asyncPool.flow();
        return asyncPool;
    },

    /**
     * Do tasks by iterator.
     * @param {Array|Object} tasks
     * @param {function|Object} iterator
     * @param {function} [callback]
     * @param {Object} [target]
     * @return {hey3d.AsyncPool}
     */
    map : function(tasks, iterator, callback, target){
        var locIterator = iterator;
        if(typeof(iterator) === "object"){
            callback = iterator.cb;
            target = iterator.iteratorTarget;
            locIterator = iterator.iterator;
        }
        var asyncPool = new hey3d.AsyncPool(tasks, 0, locIterator, callback, target);
        asyncPool.flow();
        return asyncPool;
    },

    /**
     * Do tasks by iterator limit.
     * @param {Array|Object} tasks
     * @param {Number} limit
     * @param {function} iterator
     * @param {function} cb callback
     * @param {Object} [target]
     */
    mapLimit : function(tasks, limit, iterator, cb, target){
        var asyncPool = new hey3d.AsyncPool(tasks, limit, iterator, cb, target);
        asyncPool.flow();
        return asyncPool;
    }
};

hey3d.path = {
    /**
     * Join strings to be a path.
     * @example
     cc.path.join("a", "b.png");//-->"a/b.png"
     cc.path.join("a", "b", "c.png");//-->"a/b/c.png"
     cc.path.join("a", "b");//-->"a/b"
     cc.path.join("a", "b", "/");//-->"a/b/"
     cc.path.join("a", "b/", "/");//-->"a/b/"
     * @returns {string}
     */
    join: function () {
        var l = arguments.length;
        var result = "";
        for (var i = 0; i < l; i++) {
            result = (result + (result === "" ? "" : "/") + arguments[i]).replace(/(\/|\\\\)$/, "");
        }
        return result;
    },

    /**
     * Get the ext name of a path.
     * @example
     cc.path.extname("a/b.png");//-->".png"
     cc.path.extname("a/b.png?a=1&b=2");//-->".png"
     cc.path.extname("a/b");//-->null
     cc.path.extname("a/b?a=1&b=2");//-->null
     * @param {string} pathStr
     * @returns {*}
     */
    extname: function (pathStr) {
        var temp = /(\.[^\.\/\?\\]*)(\?.*)?$/.exec(pathStr);
        return temp ? temp[1] : null;
    },

    /**
     * Get the main name of a file name
     * @param {string} fileName
     * @returns {string}
     */
    mainFileName: function(fileName){
        if(fileName){
            var idx = fileName.lastIndexOf(".");
            if(idx !== -1)
                return fileName.substring(0,idx);
        }
        return fileName;
    },

    /**
     * Get the file name of a file path.
     * @example
     cc.path.basename("a/b.png");//-->"b.png"
     cc.path.basename("a/b.png?a=1&b=2");//-->"b.png"
     cc.path.basename("a/b.png", ".png");//-->"b"
     cc.path.basename("a/b.png?a=1&b=2", ".png");//-->"b"
     cc.path.basename("a/b.png", ".txt");//-->"b.png"
     * @param {string} pathStr
     * @param {string} [extname]
     * @returns {*}
     */
    basename: function (pathStr, extname) {
        var index = pathStr.indexOf("?");
        if (index > 0) pathStr = pathStr.substring(0, index);
        var reg = /(\/|\\\\)([^(\/|\\\\)]+)$/g;
        var result = reg.exec(pathStr.replace(/(\/|\\\\)$/, ""));
        if (!result) return null;
        var baseName = result[2];
        if (extname && pathStr.substring(pathStr.length - extname.length).toLowerCase() === extname.toLowerCase())
            return baseName.substring(0, baseName.length - extname.length);
        return baseName;
    },

    /**
     * Get dirname of a file path.
     * @example
     * unix
     cc.path.driname("a/b/c.png");//-->"a/b"
     cc.path.driname("a/b/c.png?a=1&b=2");//-->"a/b"
     cc.path.dirname("a/b/");//-->"a/b"
     cc.path.dirname("c.png");//-->""
     * windows
     cc.path.driname("a\\b\\c.png");//-->"a\b"
     cc.path.driname("a\\b\\c.png?a=1&b=2");//-->"a\b"
     * @param {string} pathStr
     * @returns {*}
     */
    dirname: function (pathStr) {
        return pathStr.replace(/((.*)(\/|\\|\\\\))?(.*?\..*$)?/, '$2');
    },

    /**
     * Change extname of a file path.
     * @example
     cc.path.changeExtname("a/b.png", ".plist");//-->"a/b.plist"
     cc.path.changeExtname("a/b.png?a=1&b=2", ".plist");//-->"a/b.plist?a=1&b=2"
     * @param {string} pathStr
     * @param {string} [extname]
     * @returns {string}
     */
    changeExtname: function (pathStr, extname) {
        extname = extname || "";
        var index = pathStr.indexOf("?");
        var tempStr = "";
        if (index > 0) {
            tempStr = pathStr.substring(index);
            pathStr = pathStr.substring(0, index);
        }
        index = pathStr.lastIndexOf(".");
        if (index < 0) return pathStr + extname + tempStr;
        return pathStr.substring(0, index) + extname + tempStr;
    },
    /**
     * Change file name of a file path.
     * @example
     cc.path.changeBasename("a/b/c.plist", "b.plist");//-->"a/b/b.plist"
     cc.path.changeBasename("a/b/c.plist?a=1&b=2", "b.plist");//-->"a/b/b.plist?a=1&b=2"
     cc.path.changeBasename("a/b/c.plist", ".png");//-->"a/b/c.png"
     cc.path.changeBasename("a/b/c.plist", "b");//-->"a/b/b"
     cc.path.changeBasename("a/b/c.plist", "b", true);//-->"a/b/b.plist"
     * @param {String} pathStr
     * @param {String} basename
     * @param {Boolean} [isSameExt]
     * @returns {string}
     */
    changeBasename: function (pathStr, basename, isSameExt) {
        if (basename.indexOf(".") === 0) return this.changeExtname(pathStr, basename);
        var index = pathStr.indexOf("?");
        var tempStr = "";
        var ext = isSameExt ? this.extname(pathStr) : "";
        if (index > 0) {
            tempStr = pathStr.substring(index);
            pathStr = pathStr.substring(0, index);
        }
        index = pathStr.lastIndexOf("/");
        index = index <= 0 ? 0 : index + 1;
        return pathStr.substring(0, index) + basename + ext + tempStr;
    }
};

hey3d.loader = {
    _jsCache: {},//cache for js
    _register: {},//register of loaders
    _langPathCache: {},//cache for lang path
    _aliases: {},//aliases for res url

    resPath: "",//root path of resource
    audioPath: "",//root path of audio
    cache: {},//cache for data loaded

    /**
     * Get XMLHttpRequest.
     * @returns {XMLHttpRequest}
     */
    getXMLHttpRequest: function () {
        return window.XMLHttpRequest ? new window.XMLHttpRequest() : new ActiveXObject("MSXML2.XMLHTTP");
    },

    //@MODE_BEGIN DEV

    _getArgs4Js: function (args) {
        var a0 = args[0], a1 = args[1], a2 = args[2], results = ["", null, null];

        if (args.length === 1) {
            results[1] = a0 instanceof Array ? a0 : [a0];
        } else if (args.length === 2) {
            if (typeof a1 === "function") {
                results[1] = a0 instanceof Array ? a0 : [a0];
                results[2] = a1;
            } else {
                results[0] = a0 || "";
                results[1] = a1 instanceof Array ? a1 : [a1];
            }
        } else if (args.length === 3) {
            results[0] = a0 || "";
            results[1] = a1 instanceof Array ? a1 : [a1];
            results[2] = a2;
        } else throw "arguments error to load js!";
        return results;
    },

    /**
     * Load js files.
     * If the third parameter doesn't exist, then the baseDir turns to be "".
     *
     * @param {string} [baseDir]   The pre path for jsList or the list of js path.
     * @param {array} jsList    List of js path.
     * @param {function} [cb]  Callback function
     * @returns {*}
     */
    loadJs: function (baseDir, jsList, cb) {
        var self = this, localJsCache = self._jsCache,
            args = self._getArgs4Js(arguments);

        var preDir = args[0], list = args[1], callback = args[2];
        if (navigator.userAgent.indexOf("Trident/5") > -1) {
            self._load4Dependency(self._createScript.bing(self), preDir, list, 0, callback);
        } else {
            hey3d.async.map(list, function (item, index, cb1) {
                var jsPath = hey3d.path.join(preDir, item);
                if (localJsCache[jsPath]&&jsPath.indexOf("shaders/ShaderLib.js")<0) return cb1(null);
                self._createScript(jsPath, false, cb1);
            }, callback);
        }
    },
    /**
     * Load js width loading image.
     *
     * @param {string} [baseDir]
     * @param {array} jsList
     * @param {function} [cb]
     */
    loadJsWithImg: function (baseDir, jsList, cb) {
        var self = this;
        //var jsLoadingImg = self._loadJsImg();
        var args = self._getArgs4Js(arguments);
        this.loadJs(args[0], args[1], function (err) {
            if (err) throw err;
            //jsLoadingImg.parentNode.removeChild(jsLoadingImg);//remove loading gif
            if (args[2]) args[2]();
        });
    },
    _createScript: function (jsPath, isAsync, cb) {
        var d = document, self = this, s = hey3d.newElement('script');
        s.async = isAsync;
        self._jsCache[jsPath] = true;
        if(hey3d.game.config["noCache"] && typeof jsPath === "string"){
            if(self._noCacheRex.test(jsPath))
                s.src = jsPath + "&_t=" + (new Date() - 0);
            else
                s.src = jsPath + "?_t=" + (new Date() - 0);
        }else{
            s.src = jsPath;
        }
        hey3d._addEventListener(s, 'load', function () {
            s.parentNode.removeChild(s);
            this.removeEventListener('load', arguments.callee, false);
            cb();
        }, false);
        hey3d._addEventListener(s, 'error', function () {
            s.parentNode.removeChild(s);
            cb("Load " + jsPath + " failed!");
        }, false);
        d.body.appendChild(s);
    },
    _load4Dependency: function (func, baseDir, list, index, cb) {
        if (index >= list.length) {
            if (cb) cb();
            return;
        }
        var self = this;
        func(hey3d.path.join(baseDir, list[index]), function (err) {
            if (err) return cb(err);
            self._load4Dependency(func.bind(this), baseDir, list, index + 1, cb);
        });
    },
    _loadJsImg: function () {
        var d = document, jsLoadingImg = d.getElementById("cocos2d_loadJsImg");
        if (!jsLoadingImg) {
            jsLoadingImg = hey3d.newElement('img');

            if (hey3d._loadingImage)
                jsLoadingImg.src = hey3d._loadingImage;

            var canvasNode = d.getElementById(hey3d.game.config["id"]);
            canvasNode.style.backgroundColor = "black";
            canvasNode.parentNode.appendChild(jsLoadingImg);

            var canvasStyle = getComputedStyle ? getComputedStyle(canvasNode) : canvasNode.currentStyle;
            if (!canvasStyle)
                canvasStyle = {width: canvasNode.width, height: canvasNode.height};
            jsLoadingImg.style.left = canvasNode.offsetLeft + (parseFloat(canvasStyle.width) - jsLoadingImg.width) / 2 + "px";
            jsLoadingImg.style.top = canvasNode.offsetTop + (parseFloat(canvasStyle.height) - jsLoadingImg.height) / 2 + "px";
            jsLoadingImg.style.position = "absolute";
        }
        return jsLoadingImg;
    },
    // load workers...
    loadWorker: function(baseDir, list, cb){
        this.workText = "";
        var self = this,
            args = self._getArgs4Js(arguments);

        var finishLoadWorker = function(){
            var s = hey3d.newElement('script');
            s.innerHTML = "BABYLON.CollisionWorker = " + JSON.stringify(self.workText) + ";";
            document.body.appendChild(s);
            self.workText = null;
            callback();
        }
        var preDir = args[0], list = args[1], callback = args[2];
        if(navigator.userAgent.indexOf("Trident/5") > -1){
            self._load4Dependency(self._createScriptForWorker.bind(self), preDir, list, 0, callback);
        } else{
            hey3d.async.map(list, function(item, index, cb1){
                var jsPath = hey3d.path.join(preDir, item);
                self._createScriptForWorker(jsPath, cb1);
            }, finishLoadWorker);
        }
    },
    _createScriptForWorker: function(jsPath, cb) {
        var self = this;
        this.loadTxt(jsPath, function (err, txt) {
            if (err) {
                cb(err);
            }
            else{
                self.workText += txt;
                cb();
            }
        });
    },
    // load .fx shader files...
    loadShaders: function (baseDir, shaderList, cb) {
        this.includeShaders = {};
        this.shaders = {};
        var self = this,
            args = self._getArgs4Js(arguments);

        var finishLoadShaders = function(){
            //var s = hey3d.newElement('script');
            //s.innerHTML = "BABYLON.Effect.IncludesShadersStore = " + JSON.stringify(self.includeShaders) + ";"
            //        + "BABYLON.Effect.ShadersStore = " + JSON.stringify(self.shaders) + ";";
            //document.body.appendChild(s);
            //self.includeShaders = null;
            //self.shaders = null;
            callback();
        }
        var preDir = args[0], list = args[1], callback = args[2];
        if (navigator.userAgent.indexOf("Trident/5") > -1) {
            self._load4Dependency(self._createScriptForShader.bind(self), preDir, list, 0, callback);
        } else {
            hey3d.async.map(list, function (item, index, cb1) {
                var jsPath = hey3d.path.join(preDir, item);
                self._createScriptForShader(jsPath, cb1);
            }, finishLoadShaders);
        }
    },
    _createScriptForShader: function(jsPath, cb) {
        var self = this;
        this.loadTxt(jsPath, function (err, txt) {
            if (err) {
                cb(err);
            }
            else{
                var baseName = hey3d.path.basename(jsPath);
                if(baseName.indexOf(".glsl") > -1)
                    baseName = baseName.replace(".glsl", "");
                THREE.ShaderChunk[baseName] = txt;
                cb();
            }
        });
    },
    //@MODE_END DEV

    /**
     * Load a single resource as txt.
     * @param {string} url
     * @param {function} [cb] arguments are : err, txt
     */
    loadTxt: function (url, cb) {
        if (!hey3d._isNodeJs) {
            var xhr = this.getXMLHttpRequest(),
                errInfo = "load " + url + " failed!";
            xhr.open("GET", url, true);
            if (/msie/i.test(navigator.userAgent) && !/opera/i.test(navigator.userAgent)) {
                // IE-specific logic here
                xhr.setRequestHeader("Accept-Charset", "utf-8");
                xhr.onreadystatechange = function () {
                    if(xhr.readyState === 4)
                        xhr.status === 200 ? cb(null, xhr.responseText) : cb(errInfo);
                };
            } else {
                if (xhr.overrideMimeType) xhr.overrideMimeType("text\/plain; charset=utf-8");
                xhr.onload = function () {
                    if(xhr.readyState === 4)
                        xhr.status === 200 ? cb(null, xhr.responseText) : cb(errInfo);
                };
            }
            xhr.send(null);
        } else {
            var fs = require("fs");
            fs.readFile(url, function (err, data) {
                err ? cb(err) : cb(null, data.toString());
            });
        }
    },
    _loadTxtSync: function (url) {
        if (!hey3d._isNodeJs) {
            var xhr = this.getXMLHttpRequest();
            xhr.open("GET", url, false);
            if (/msie/i.test(navigator.userAgent) && !/opera/i.test(navigator.userAgent)) {
                // IE-specific logic here
                xhr.setRequestHeader("Accept-Charset", "utf-8");
            } else {
                if (xhr.overrideMimeType) xhr.overrideMimeType("text\/plain; charset=utf-8");
            }
            xhr.send(null);
            if (!xhr.readyState === 4 || xhr.status !== 200) {
                return null;
            }
            return xhr.responseText;
        } else {
            var fs = require("fs");
            return fs.readFileSync(url).toString();
        }
    },

    loadCsb: function(url, cb){
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.responseType = "arraybuffer";

        xhr.onload = function () {
            var arrayBuffer = xhr.response; // Note: not oReq.responseText
            if (arrayBuffer) {
                window.msg = arrayBuffer;
            }
            if(xhr.readyState === 4)
                xhr.status === 200 ? cb(null, xhr.response) : cb("load " + url + " failed!");
        };

        xhr.send(null);
    },

    /**
     * Load a single resource as json.
     * @param {string} url
     * @param {function} [cb] arguments are : err, json
     */
    loadJson: function (url, cb) {
        this.loadTxt(url, function (err, txt) {
            if (err) {
                cb(err);
            }
            else {
                try {
                    var result = JSON.parse(txt);
                }
                catch (e) {
                    throw "parse json [" + url + "] failed : " + e;
                    return;
                }
                cb(null, result);
            }
        });
    },

    _checkIsImageURL: function (url) {
        var ext = /(\.png)|(\.jpg)|(\.bmp)|(\.jpeg)|(\.gif)/.exec(url);
        return (ext != null);
    },
    /**
     * Load a single image.
     * @param {!string} url
     * @param {object} [option]
     * @param {function} callback
     * @returns {Image}
     */
    loadImg: function (url, option, callback) {
        var opt = {
            isCrossOrigin: true
        };
        if (callback !== undefined)
            opt.isCrossOrigin = option.isCrossOrigin === null ? opt.isCrossOrigin : option.isCrossOrigin;
        else if (option !== undefined)
            callback = option;

        var img = this.getRes(url);
        if (img) {
            callback && callback(null, img);
            return img;
        }

        img = new Image();
        if (opt.isCrossOrigin && location.origin !== "file://")
            img.crossOrigin = "Anonymous";

        var loadCallback = function () {
            this.removeEventListener('load', loadCallback, false);
            this.removeEventListener('error', errorCallback, false);

            hey3d.loader.cache[url] = img;
            if (callback)
                callback(null, img);
        };

        var self = this;
        var errorCallback = function () {
            this.removeEventListener('error', errorCallback, false);

            if(img.crossOrigin && img.crossOrigin.toLowerCase() === "anonymous"){
                opt.isCrossOrigin = false;
                self.release(url);
                hey3d.loader.loadImg(url, opt, callback);
            }else{
                typeof callback === "function" && callback("load image failed");
            }
        };

        hey3d._addEventListener(img, "load", loadCallback);
        hey3d._addEventListener(img, "error", errorCallback);
        img.src = url;
        return img;
    },

    /**
     * Iterator function to load res
     * @param {object} item
     * @param {number} index
     * @param {function} [cb]
     * @returns {*}
     * @private
     */
    _loadResIterator: function (item, index, cb) {
        var self = this, url = null;
        var type = item.type;
        if (type) {
            type = "." + type.toLowerCase();
            url = item.src ? item.src : item.name + type;
        } else {
            url = item;
            type = hey3d.path.extname(url);
        }

        var obj = self.getRes(url);
        if (obj)
            return cb(null, obj);
        var loader = null;
        if (type) {
            loader = self._register[type.toLowerCase()];
        }
        if (!loader) {
            hey3d.log("loader for [" + type + "] not exists!");
            return cb();
        }
        var basePath = loader.getBasePath ? loader.getBasePath() : self.resPath;
        var realUrl = self.getUrl(basePath, url);
        if(hey3d.game.config["noCache"] && typeof realUrl === "string"){
            if(self._noCacheRex.test(realUrl))
                realUrl += "&_t=" + (new Date() - 0);
            else
                realUrl += "?_t=" + (new Date() - 0);
        }
        loader.load(realUrl, url, item, function (err, data) {
            if (err) {
                hey3d.log(err);
                self.cache[url] = null;
                delete self.cache[url];
                cb();
            } else {
                self.cache[url] = data;
                cb(null, data);
            }
        });
    },
    _noCacheRex: /\?/,

    /**
     * Get url with basePath.
     * @param {string} basePath
     * @param {string} [url]
     * @returns {*}
     */
    getUrl: function (basePath, url) {
        var self = this, langPathCache = self._langPathCache, path = hey3d.path;
        if (basePath !== undefined && url === undefined) {
            url = basePath;
            var type = path.extname(url);
            type = type ? type.toLowerCase() : "";
            var loader = self._register[type];
            if (!loader)
                basePath = self.resPath;
            else
                basePath = loader.getBasePath ? loader.getBasePath() : self.resPath;
        }
        url = hey3d.path.join(basePath || "", url);
        if (url.match(/[\/(\\\\)]lang[\/(\\\\)]/i)) {
            if (langPathCache[url])
                return langPathCache[url];
            var extname = path.extname(url) || "";
            url = langPathCache[url] = url.substring(0, url.length - extname.length) + "_" + cc.sys.language + extname;
        }
        return url;
    },

    /**
     * Load resources then call the callback.
     * @param {string} resources
     * @param {function} [option] callback or trigger
     * @param {function|Object} [loadCallback]
     * @return {hey3d.AsyncPool}
     */
    load : function(resources, option, loadCallback){
        var self = this;
        var len = arguments.length;
        if(len === 0)
            throw "arguments error!";

        if(len === 3){
            if(typeof option === "function"){
                if(typeof loadCallback === "function")
                    option = {trigger : option, cb : loadCallback };
                else
                    option = { cb : option, cbTarget : loadCallback};
            }
        }else if(len === 2){
            if(typeof option === "function")
                option = {cb : option};
        }else if(len === 1){
            option = {};
        }

        if(!(resources instanceof Array))
            resources = [resources];
        var asyncPool = new hey3d.AsyncPool(
            resources, 0,
            function (value, index, AsyncPoolCallback, aPool) {
                self._loadResIterator(value, index, function (err) {
                    if (err)
                        return AsyncPoolCallback(err);
                    var arr = Array.prototype.slice.call(arguments, 1);
                    if (option.trigger)
                        option.trigger.call(option.triggerTarget, arr[0], aPool.size, aPool.finishedSize);   //call trigger
                    AsyncPoolCallback(null, arr[0]);
                });
            },
            option.cb, option.cbTarget);
        asyncPool.flow();
        return asyncPool;
    },

    _handleAliases: function (fileNames, cb) {
        var self = this, aliases = self._aliases;
        var resList = [];
        for (var key in fileNames) {
            var value = fileNames[key];
            aliases[key] = value;
            resList.push(value);
        }
        this.load(resList, cb);
    },

    /**
     * <p>
     *     Loads alias map from the contents of a filename.                                        <br/>
     *                                                                                                                 <br/>
     *     @note The plist file name should follow the format below:                                                   <br/>
     *     <?xml version="1.0" encoding="UTF-8"?>                                                                      <br/>
     *         <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">  <br/>
     *             <plist version="1.0">                                                                               <br/>
     *                 <dict>                                                                                          <br/>
     *                     <key>filenames</key>                                                                        <br/>
     *                     <dict>                                                                                      <br/>
     *                         <key>sounds/click.wav</key>                                                             <br/>
     *                         <string>sounds/click.caf</string>                                                       <br/>
     *                         <key>sounds/endgame.wav</key>                                                           <br/>
     *                         <string>sounds/endgame.caf</string>                                                     <br/>
     *                         <key>sounds/gem-0.wav</key>                                                             <br/>
     *                         <string>sounds/gem-0.caf</string>                                                       <br/>
     *                     </dict>                                                                                     <br/>
     *                     <key>metadata</key>                                                                         <br/>
     *                     <dict>                                                                                      <br/>
     *                         <key>version</key>                                                                      <br/>
     *                         <integer>1</integer>                                                                    <br/>
     *                     </dict>                                                                                     <br/>
     *                 </dict>                                                                                         <br/>
     *              </plist>                                                                                           <br/>
     * </p>
     * @param {String} url  The plist file name.
     * @param {Function} [callback]
     */
    loadAliases: function (url, callback) {
        var self = this, dict = self.getRes(url);
        if (!dict) {
            self.load(url, function (err, results) {
                self._handleAliases(results[0]["filenames"], callback);
            });
        } else
            self._handleAliases(dict["filenames"], callback);
    },

    /**
     * Register a resource loader into loader.
     * @param {string} extNames
     * @param {function} loader
     */
    register: function (extNames, loader) {
        if (!extNames || !loader) return;
        var self = this;
        if (typeof extNames === "string")
            return this._register[extNames.trim().toLowerCase()] = loader;
        for (var i = 0, li = extNames.length; i < li; i++) {
            self._register["." + extNames[i].trim().toLowerCase()] = loader;
        }
    },

    /**
     * Get resource data by url.
     * @param url
     * @returns {*}
     */
    getRes: function (url) {
        return this.cache[url] || this.cache[this._aliases[url]];
    },

    /**
     * Release the cache of resource by url.
     * @param url
     */
    release: function (url) {
        var cache = this.cache, aliases = this._aliases;
        delete cache[url];
        delete cache[aliases[url]];
        delete aliases[url];
    },

    /**
     * Resource cache of all resources.
     */
    releaseAll: function () {
        var locCache = this.cache, aliases = this._aliases;
        for (var key in locCache)
            delete locCache[key];
        for (var key in aliases)
            delete aliases[key];
    }
};

//+++++++++++++++++++++++++something about window events begin+++++++++++++++++++++++++++
(function () {
    var win = window, hidden, visibilityChange, _undef = "undefined";
    if (!hey3d.isUndefined(document.hidden)) {
        hidden = "hidden";
        visibilityChange = "visibilitychange";
    } else if (!hey3d.isUndefined(document.mozHidden)) {
        hidden = "mozHidden";
        visibilityChange = "mozvisibilitychange";
    } else if (!hey3d.isUndefined(document.msHidden)) {
        hidden = "msHidden";
        visibilityChange = "msvisibilitychange";
    } else if (!hey3d.isUndefined(document.webkitHidden)) {
        hidden = "webkitHidden";
        visibilityChange = "webkitvisibilitychange";
    }

    var onHidden = function () {
        if (hey3d.eventManager && hey3d.game._eventHide)
            hey3d.eventManager.dispatchEvent(hey3d.game._eventHide);
    };
    var onShow = function () {
        if (hey3d.eventManager && hey3d.game._eventShow)
            hey3d.eventManager.dispatchEvent(hey3d.game._eventShow);

        if(hey3d.game._intervalId){
            window.cancelAnimationFrame(hey3d.game._intervalId);

            hey3d.game._mainLoop();
        }
    };

    if (hidden) {
        hey3d._addEventListener(document, visibilityChange, function () {
            if (document[hidden]) onHidden();
            else onShow();
        }, false);
    } else {
        hey3d._addEventListener(win, "blur", onHidden, false);
        hey3d._addEventListener(win, "focus", onShow, false);
    }

    if(navigator.userAgent.indexOf("MicroMessenger") > -1){
        win.onfocus = function(){ onShow() };
    }

    if ("onpageshow" in window && "onpagehide" in window) {
        hey3d._addEventListener(win, "pagehide", onHidden, false);
        hey3d._addEventListener(win, "pageshow", onShow, false);
    }
    win = null;
    visibilityChange = null;
})();

//+++++++++++++++++++++++++something about sys begin+++++++++++++++++++++++++++++
hey3d._initSys = function () {
    /**
     * System variables
     * @namespace
     * @name cc.sys
     */
    hey3d.sys = {};
    var sys = hey3d.sys;

    /**
     * @memberof cc.sys
     * @name OS_IOS
     * @constant
     * @type {string}
     */
    sys.OS_IOS = "iOS";
    /**
     * @memberof cc.sys
     * @name OS_ANDROID
     * @constant
     * @type {string}
     */
    sys.OS_ANDROID = "Android";
    /**
     * @memberof cc.sys
     * @name OS_WINDOWS
     * @constant
     * @type {string}
     */
    sys.OS_WINDOWS = "Windows";
    /**
     * @memberof cc.sys
     * @name OS_MARMALADE
     * @constant
     * @type {string}
     */
    sys.OS_MARMALADE = "Marmalade";
    /**
     * @memberof cc.sys
     * @name OS_LINUX
     * @constant
     * @type {string}
     */
    sys.OS_LINUX = "Linux";
    /**
     * @memberof cc.sys
     * @name OS_BADA
     * @constant
     * @type {string}
     */
    sys.OS_BADA = "Bada";
    /**
     * @memberof cc.sys
     * @name OS_BLACKBERRY
     * @constant
     * @type {string}
     */
    sys.OS_BLACKBERRY = "Blackberry";
    /**
     * @memberof cc.sys
     * @name OS_OSX
     * @constant
     * @type {string}
     */
    sys.OS_OSX = "OS X";
    /**
     * @memberof cc.sys
     * @name OS_WP8
     * @constant
     * @type {string}
     */
    sys.OS_WP8 = "WP8";
    /**
     * @memberof cc.sys
     * @name OS_WINRT
     * @constant
     * @type {string}
     */
    sys.OS_WINRT = "WINRT";
    /**
     * @memberof cc.sys
     * @name OS_UNKNOWN
     * @constant
     * @type {string}
     */
    sys.OS_UNKNOWN = "Unknown";

    /**
     * @memberof cc.sys
     * @name UNKNOWN
     * @constant
     * @default
     * @type {Number}
     */
    sys.UNKNOWN = 0;
    /**
     * @memberof cc.sys
     * @name IOS
     * @constant
     * @default
     * @type {Number}
     */
    sys.IOS = 1;
    /**
     * @memberof cc.sys
     * @name ANDROID
     * @constant
     * @default
     * @type {Number}
     */
    sys.ANDROID = 2;
    /**
     * @memberof cc.sys
     * @name WIN32
     * @constant
     * @default
     * @type {Number}
     */
    sys.WIN32 = 3;
    /**
     * @memberof cc.sys
     * @name MARMALADE
     * @constant
     * @default
     * @type {Number}
     */
    sys.MARMALADE = 4;
    /**
     * @memberof cc.sys
     * @name LINUX
     * @constant
     * @default
     * @type {Number}
     */
    sys.LINUX = 5;
    /**
     * @memberof cc.sys
     * @name BADA
     * @constant
     * @default
     * @type {Number}
     */
    sys.BADA = 6;
    /**
     * @memberof cc.sys
     * @name BLACKBERRY
     * @constant
     * @default
     * @type {Number}
     */
    sys.BLACKBERRY = 7;
    /**
     * @memberof cc.sys
     * @name MACOS
     * @constant
     * @default
     * @type {Number}
     */
    sys.MACOS = 8;
    /**
     * @memberof cc.sys
     * @name NACL
     * @constant
     * @default
     * @type {Number}
     */
    sys.NACL = 9;
    /**
     * @memberof cc.sys
     * @name EMSCRIPTEN
     * @constant
     * @default
     * @type {Number}
     */
    sys.EMSCRIPTEN = 10;
    /**
     * @memberof cc.sys
     * @name TIZEN
     * @constant
     * @default
     * @type {Number}
     */
    sys.TIZEN = 11;
    /**
     * @memberof cc.sys
     * @name QT5
     * @constant
     * @default
     * @type {Number}
     */
    sys.QT5 = 12;
    /**
     * @memberof cc.sys
     * @name WP8
     * @constant
     * @default
     * @type {Number}
     */
    sys.WP8 = 13;
    /**
     * @memberof cc.sys
     * @name WINRT
     * @constant
     * @default
     * @type {Number}
     */
    sys.WINRT = 14;
    /**
     * @memberof cc.sys
     * @name MOBILE_BROWSER
     * @constant
     * @default
     * @type {Number}
     */
    sys.MOBILE_BROWSER = 100;
    /**
     * @memberof cc.sys
     * @name DESKTOP_BROWSER
     * @constant
     * @default
     * @type {Number}
     */
    sys.DESKTOP_BROWSER = 101;

    sys.BROWSER_TYPE_WECHAT = "wechat";
    sys.BROWSER_TYPE_ANDROID = "androidbrowser";
    sys.BROWSER_TYPE_IE = "ie";
    sys.BROWSER_TYPE_QQ = "qqbrowser";
    sys.BROWSER_TYPE_MOBILE_QQ = "mqqbrowser";
    sys.BROWSER_TYPE_UC = "ucbrowser";
    sys.BROWSER_TYPE_360 = "360browser";
    sys.BROWSER_TYPE_BAIDU_APP = "baiduboxapp";
    sys.BROWSER_TYPE_BAIDU = "baidubrowser";
    sys.BROWSER_TYPE_MAXTHON = "maxthon";
    sys.BROWSER_TYPE_OPERA = "opera";
    sys.BROWSER_TYPE_OUPENG = "oupeng";
    sys.BROWSER_TYPE_MIUI = "miuibrowser";
    sys.BROWSER_TYPE_FIREFOX = "firefox";
    sys.BROWSER_TYPE_SAFARI = "safari";
    sys.BROWSER_TYPE_CHROME = "chrome";
    sys.BROWSER_TYPE_LIEBAO = "liebao";
    sys.BROWSER_TYPE_QZONE = "qzone";
    sys.BROWSER_TYPE_SOUGOU = "sogou";
    sys.BROWSER_TYPE_UNKNOWN = "unknown";

    /**
     * Is native ? This is set to be true in jsb auto.
     * @memberof cc.sys
     * @name isNative
     * @type {Boolean}
     */
    sys.isNative = false;

    var browserSupportWebGL = [sys.BROWSER_TYPE_BAIDU, sys.BROWSER_TYPE_OPERA, sys.BROWSER_TYPE_FIREFOX, sys.BROWSER_TYPE_CHROME, sys.BROWSER_TYPE_SAFARI];
    var osSupportWebGL = [sys.OS_IOS, sys.OS_WINDOWS, sys.OS_OSX, sys.OS_LINUX];
    var multipleAudioWhiteList = [
        sys.BROWSER_TYPE_BAIDU, sys.BROWSER_TYPE_OPERA, sys.BROWSER_TYPE_FIREFOX, sys.BROWSER_TYPE_CHROME, sys.BROWSER_TYPE_BAIDU_APP,
        sys.BROWSER_TYPE_SAFARI, sys.BROWSER_TYPE_UC, sys.BROWSER_TYPE_QQ, sys.BROWSER_TYPE_MOBILE_QQ, sys.BROWSER_TYPE_IE
    ];

    var win = window, nav = win.navigator, doc = document, docEle = doc.documentElement;
    var ua = nav.userAgent.toLowerCase();

    /**
     * Indicate whether system is mobile system
     * @memberof cc.sys
     * @name isMobile
     * @type {Boolean}
     */
    sys.isMobile = ua.indexOf('mobile') !== -1 || ua.indexOf('android') !== -1;

    /**
     * Indicate the running platform
     * @memberof cc.sys
     * @name platform
     * @type {Number}
     */
    sys.platform = sys.isMobile ? sys.MOBILE_BROWSER : sys.DESKTOP_BROWSER;

    var browserType = sys.BROWSER_TYPE_UNKNOWN;
    var browserTypes = ua.match(/sogou|qzone|liebao|micromessenger|qqbrowser|ucbrowser|360 aphone|360browser|baiduboxapp|baidubrowser|maxthon|trident|oupeng|opera|miuibrowser|firefox/i)
        || ua.match(/chrome|safari/i);
    if (browserTypes && browserTypes.length > 0) {
        browserType = browserTypes[0];
        if (browserType === 'micromessenger') {
            browserType = sys.BROWSER_TYPE_WECHAT;
        } else if (browserType === "safari" && (ua.match(/android.*applewebkit/)))
            browserType = sys.BROWSER_TYPE_ANDROID;
        else if (browserType === "trident") browserType = sys.BROWSER_TYPE_IE;
        else if (browserType === "360 aphone") browserType = sys.BROWSER_TYPE_360;
    }else if(ua.indexOf("iphone") && ua.indexOf("mobile")){
        browserType = "safari";
    }
    /**
     * Indicate the running browser type
     * @memberof cc.sys
     * @name browserType
     * @type {String}
     */
    sys.browserType = browserType;

    // Get the os of system
    var iOS = ( ua.match(/(iPad|iPhone|iPod)/i) ? true : false );
    var isAndroid = ua.match(/android/i) || nav.platform.match(/android/i) ? true : false;
    var osName = sys.OS_UNKNOWN;
    if (nav.appVersion.indexOf("Win") !== -1) osName = sys.OS_WINDOWS;
    else if (iOS) osName = sys.OS_IOS;
    else if (nav.appVersion.indexOf("Mac") !== -1) osName = sys.OS_OSX;
    else if (nav.appVersion.indexOf("X11") !== -1 && nav.appVersion.indexOf("Linux") === -1) osName = sys.OS_UNIX;
    else if (isAndroid) osName = sys.OS_ANDROID;
    else if (nav.appVersion.indexOf("Linux") !== -1) osName = sys.OS_LINUX;

    /**
     * Indicate the running os name
     * @memberof cc.sys
     * @name os
     * @type {String}
     */
    sys.os = osName;

    /**
     * cc.sys.localStorage is a local storage component.
     * @memberof cc.sys
     * @name localStorage
     * @type {Object}
     */
    try {
        var localStorage = sys.localStorage = win.localStorage;
        localStorage.setItem("storage", "");
        localStorage.removeItem("storage");
        localStorage = null;
    } catch (e) {
        if (e.name === "SECURITY_ERR" || e.name === "QuotaExceededError") {
            hey3d.log("Warning: localStorage isn't enabled. Please confirm browser cookie or privacy option");
        }
        sys.localStorage = function () {
        };
    }

    var capabilities = sys.capabilities = {"canvas": true};
    if (docEle['ontouchstart'] !== undefined || doc['ontouchstart'] !== undefined || nav.msPointerEnabled)
        capabilities["touches"] = true;
    if (docEle['onmouseup'] !== undefined)
        capabilities["mouse"] = true;
    if (docEle['onkeyup'] !== undefined)
        capabilities["keyboard"] = true;
    if (win.DeviceMotionEvent || win.DeviceOrientationEvent)
        capabilities["accelerometer"] = true;

    /**
     * Dump system informations
     * @memberof cc.sys
     * @name dump
     * @function
     */
    sys.dump = function () {
        var self = this;
        var str = "";
        str += "isMobile : " + self.isMobile + "\r\n";
        str += "browserType : " + self.browserType + "\r\n";
        str += "capabilities : " + JSON.stringify(self.capabilities) + "\r\n";
        str += "os : " + self.os + "\r\n";
        str += "platform : " + self.platform + "\r\n";
        hey3d.log(str);
    }

    /**
     * Open a url in browser
     * @memberof cc.sys
     * @name openURL
     * @param {String} url
     */
    sys.openURL = function(url){
        window.open(url);
    }
};
//+++++++++++++++++++++++++something about sys end+++++++++++++++++++++++++++++

hey3d.designSize = {};
hey3d.sizeScale = 1;
hey3d._setSizeCalled = false;
hey3d.setDesignResolutionSize = function(width, height, parent){
    if (hey3d._setSizeCalled) return;
    else hey3d._setSizeCalled = true;
    hey3d._setupCanvasDiv(parent);
    hey3d.designSize.w = width;
    hey3d.designSize.h = height;
    hey3d.onResizeDesign();
    window.addEventListener("resize", hey3d.onResizeDesign);
}

hey3d.onResizeDesign = function(){
    var rect = hey3d._gameDivParent.getBoundingClientRect();
    if(rect.width/rect.height > hey3d.designSize.w/hey3d.designSize.h){
        hey3d.sizeScale = rect.height/hey3d.designSize.h;
    }else{
        hey3d.sizeScale = rect.width/hey3d.designSize.w;
    }

    hey3d._gameDiv.style.position = "absolute";
    hey3d._gameDiv.style.left = "50%";
    hey3d._gameDiv.style.top = "50%";
    hey3d._gameDiv.style.width = hey3d.designSize.w*hey3d.sizeScale+"px";
    hey3d._gameDiv.style.height = hey3d.designSize.h*hey3d.sizeScale+"px";
    hey3d._gameDiv.style.marginLeft = -hey3d.designSize.w/2*hey3d.sizeScale+"px";
    hey3d._gameDiv.style.marginTop = -hey3d.designSize.h/2*hey3d.sizeScale+"px";
}

hey3d._setupCanvasDiv = function(parentDiv){
    var localCanvas = hey3d._canvas;
    var localContainer, localConStyle;
    //it is already a canvas, we wrap it around with a div
    localContainer = hey3d.container = hey3d.newElement("div");
    localCanvas.parentNode.insertBefore(localContainer, localCanvas);
    localContainer.appendChild(localCanvas);
    localContainer.setAttribute('id', 'container');

    localConStyle = localContainer.style;
    localConStyle.margin = "0 auto";
    localConStyle.overflow = 'hidden';
    hey3d._gameDiv = localContainer;
    hey3d._gameDivParent = parentDiv || document.body;
}

hey3d._setupCalled = false;
hey3d._setup = function (el, width, height) {
    var element = document.getElementById(el);
    // Avoid setup to be called twice.
    if (hey3d._setupCalled) return;
    else hey3d._setupCalled = true;

    hey3d.log(hey3d.ENGINEVERSION);

    hey3d.game._setAnimFrame();

    hey3d._canvas = element;
    hey3d._canvas.oncontextmenu = function () {
        return false;
    };

    if (hey3d.sys.isMobile) {
        var fontStyle = hey3d.newElement("style");
        fontStyle.type = "text/css";
        document.body.appendChild(fontStyle);

        fontStyle.textContent = "body,canvas,div{ -moz-user-select: none;-webkit-user-select: none;-ms-user-select: none;-khtml-user-select: none;"
            + "-webkit-tap-highlight-color:rgba(0,0,0,0);}";
    }
    hey3d.director = hey3d.Director._getInstance();
};

hey3d.game = {
    EVENT_HIDE: "game_on_hide",
    EVENT_SHOW: "game_on_show",
    _eventHide: null,
    _eventShow: null,
    CONFIG_KEY: {
        engineDir : "engineDir",
        showFPS: "showFPS",
        id: "id",
        jsList: "jsList",
        classReleaseMode: "classReleaseMode"
    },
    _prepareCalled: false,//whether the prepare function has been called
    _prepared: false,//whether the engine has prepared
    _paused: true,//whether the game is paused
    _intervalId: null,//interval target of main
    config:null,
    run: function (id) {
        var self = this;
        var _run = function () {
            if (id) {
                self.config[self.CONFIG_KEY.id] = id;
            }
            if (!self._prepareCalled) {
                self.prepare(function () {
                    self._prepared = true;
                });
            }
            self._checkPrepare = setInterval(function () {
                if (self._prepared) {
                    //hey3d._setup(self.config[self.CONFIG_KEY.id]);
                    //self._mainLoop();
                    /*self._eventHide = self._eventHide || new hey3d.EventCustom(self.EVENT_HIDE);
                    self._eventHide.setUserData(self);
                    self._eventShow = self._eventShow || new hey3d.EventCustom(self.EVENT_SHOW);
                    self._eventShow.setUserData(self);*/
                    self.onStart();
                    clearInterval(self._checkPrepare);
                }
            }, 10);
        };
        document.body ?
            _run() :
            hey3d._addEventListener(window, 'load', function () {
                this.removeEventListener('load', arguments.callee, false);
                _run();
            }, false);
    },
    _setAnimFrame: function () {
        this._lastTime = new Date();
        this._frameTime = 1000 / 60;
        if((hey3d.sys.os === hey3d.sys.OS_IOS && hey3d.sys.browserType === hey3d.sys.BROWSER_TYPE_WECHAT)) {
            window.requestAnimFrame = this._stTime;
            window.cancelAnimationFrame = this._ctTime;
        }
        else {
            window.requestAnimFrame = window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            this._stTime;
            window.cancelAnimationFrame = window.cancelAnimationFrame ||
            window.cancelRequestAnimationFrame ||
            window.msCancelRequestAnimationFrame ||
            window.mozCancelRequestAnimationFrame ||
            window.oCancelRequestAnimationFrame ||
            window.webkitCancelRequestAnimationFrame ||
            window.msCancelAnimationFrame ||
            window.mozCancelAnimationFrame ||
            window.webkitCancelAnimationFrame ||
            window.oCancelAnimationFrame ||
            this._ctTime;
        }
    },
    _stTime: function(callback){
        var currTime = new Date().getTime();
        var timeToCall = Math.max(0, hey3d.game._frameTime - (currTime - hey3d.game._lastTime));
        var id = window.setTimeout(function() { callback(); },
            timeToCall);
        hey3d.game._lastTime = currTime + timeToCall;
        return id;
    },
    _ctTime: function(id){
        window.clearTimeout(id);
    },
    _mainLoop:function () {
        var self = this;
        var callback = function () {
            if (!self._paused) {
                hey3d.director.mainLoop();
                if(self._intervalId)
                    window.cancelAnimationFrame(self._intervalId);
                self._intervalId = window.requestAnimFrame(callback);
            }
        };
        window.requestAnimFrame(callback);
        self._paused = false;
    },
    _initConfig: function () {
        var self = this, CONFIG_KEY = self.CONFIG_KEY;
        var _init = function (cfg) {
            cfg[CONFIG_KEY.engineDir] = cfg[CONFIG_KEY.engineDir] || "frame";
            cfg[CONFIG_KEY.id] = cfg[CONFIG_KEY.id] || "renderCanvas";
            return cfg;
        };
        if (document["ccConfig"]) {
            self.config = _init(document["ccConfig"]);
        } else {
            try {
                var cocos_script = document.getElementsByTagName('script');
                for(var i=0;i<cocos_script.length;i++){
                    var _t = cocos_script[i].getAttribute('hey3d');
                    hey3d.log(cocos_script[i].src);
                    if(_t === '' || _t){break;}
                }
                var _src, txt, _resPath;
                if(i < cocos_script.length){
                    _src = cocos_script[i].src;
                    if(_src){
                        _resPath = /(.*)\//.exec(_src)[0];
                        hey3d.loader.resPath = _resPath;
                        _src = hey3d.path.join(_resPath, 'project.json');
                    }
                    txt = hey3d.loader._loadTxtSync(_src);
                }
                if(!txt){
                    txt = hey3d.loader._loadTxtSync("project.json");
                }
                var data = JSON.parse(txt);
                self.config = _init(data || {});
            } catch (e) {
                hey3d.log("Failed to read or parse project.json");
                self.config = _init({});
            }
        }
        hey3d._initSys();
    },
    //cache for js and module that has added into jsList to be loaded.
    _jsAddedCache: {},
    _getJsListOfModule: function (moduleMap, moduleName, dir) {
        var jsAddedCache = this._jsAddedCache;
        if (jsAddedCache[moduleName]) return null;
        dir = dir || "";
        var jsList = [];
        var tempList = moduleMap[moduleName];
        if (!tempList) throw "can not find module [" + moduleName + "]";
        var ccPath = hey3d.path;
        for (var i = 0, li = tempList.length; i < li; i++) {
            var item = tempList[i];
            if (jsAddedCache[item]) continue;
            var extname = ccPath.extname(item);
            if (!extname) {
                var arr = this._getJsListOfModule(moduleMap, item, dir);
                if (arr) jsList = jsList.concat(arr);
            } 
            else// if (extname.toLowerCase() === ".js")
                jsList.push(ccPath.join(dir, item));
            jsAddedCache[item] = 1;
        }
        return jsList;
    },
    prepare: function (cb) {
        var self = this;
        var config = self.config, CONFIG_KEY = self.CONFIG_KEY, engineDir = config[CONFIG_KEY.engineDir], loader = hey3d.loader;
        self._prepareCalled = true;

        var jsList = config[CONFIG_KEY.jsList] || [];
        if (typeof(THREE) != "undefined") {//is single file
            //load user's jsList only
            loader.loadJsWithImg("", jsList, function (err) {
                if (err) throw err;
                self._prepared = true;
                if (cb) cb();
            });
        } else {
            //load cc's jsList first
            var ccModulesPath = hey3d.path.join(engineDir, "moduleConfig.json");
            loader.loadJson(ccModulesPath, function (err, modulesJson) {
                if (err) throw err;
                var modules = config["modules"] || [];
                var moduleMap = modulesJson["module"];
                var moduleJsList = [];
                for (var i = 0, li = modules.length; i < li; i++) {
                    var arr = self._getJsListOfModule(moduleMap, modules[i], engineDir);
                    if (arr) moduleJsList = moduleJsList.concat(arr);
                }

                moduleJsList = moduleJsList.concat(jsList);
                var newJsList = [];
                var shaderList = []
                for(var i = 0; i < moduleJsList.length; i++){
                    if(hey3d.path.extname(moduleJsList[i]) === ".glsl")
                        shaderList.push(moduleJsList[i]);
                    else
                        newJsList.push(moduleJsList[i]);
                }
                hey3d.loader.loadJsWithImg(newJsList, function (err) {
                    if (err) throw err;
                    self._prepared = true;
                    if (cb) cb();
                    // hey3d.loader.loadShaders(shaderList, function (err) {
                    //     if (err) throw err;
                    //     //self._prepared = true;
                    //     //if (cb) cb();
                    //     hey3d.loader.loadJsWithImg(["frame/src/renderers/shaders/ShaderLib.js"],function(err){
                    //         if (err) throw err;
                    //         self._prepared = true;
                    //         if (cb) cb();
                    //     });
                    // });
                });
            });
        }
    }
}

hey3d.game._initConfig();