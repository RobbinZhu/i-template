'use strict';
var fs = require('fs'),
    fs_readFileSync = fs.readFileSync,
    fs_existsSync = fs.existsSync,
    path = require('path'),
    path_relative = path.relative,
    path_extname = path.extname,
    path_join = path.join,
    toString = Object.prototype.toString,
    cache = {},
    clean_reg = /([\\\"\n\t\r\b\f])/gm,
    clean_map = {
        "\"": "\\\"",
        "\n": "\\n",
        "\t": "\\t",
        "\r": "\\r",
        "\b": "\\b",
        "\f": "\\f",
        "\\": "\\\\"
    },
    UNDEFINED;

function doc(options) {
    return {
        layout: UNDEFINED,
        sections: {},
        parse: parse,
        compile: compile,
        render: render,
        options: options,
        close: options._close === UNDEFINED ? doc._close : options._close,
        open: options._open === UNDEFINED ? doc._open : options._open,
        _cache: options._cache === UNDEFINED ? doc._cache : options._cache,
        _release: !(options._debug === UNDEFINED ? doc._debug : options._debug),
        _nowith: options._nowith === UNDEFINED ? doc._nowith : options._nowith,
        fn: UNDEFINED,
        exception: UNDEFINED
    };
}

function literalize(match, token) {
    return clean_map[token];
}

function clean(text) {
    return text.replace(clean_reg, literalize);
}

function parse(obj, not_str) {
    if (this._cache && this.options._key && cache[this.options._key]) {
        return this;
    }
    var buf = parseby(not_str ? read(obj, this.options) : obj, this);
    if (this.layout === UNDEFINED) {
        this.layout = {
            sec: 'body',
            param: ''
        };
    }
    if (this.sections.body === UNDEFINED) {
        this.sections.body = {
            text: buf,
            param: ''
        };
    }
    return this;
}

function compile() {
    if (this._cache && this.options._key && (this.fn = cache[this.options._key])) {
        return this;
    }
    try {
        this.fn = fn(this);
    } catch (e) {
        this.exception = e;
    }
    if (this.fn && this._cache && this.options._key) {
        cache[this.options._key] = this.fn;
    }
    return this;
}

function render(options, callback) {
    var exception = this.exception,
        rtn = '';
    if (!exception) {
        try {
            rtn = this.fn(options);
        } catch (e) {
            exception = e;
        }
    }
    callback ? callback(exception, rtn) : (exception || rtn);
}

function stringify(doc, obj) {
    var root = obj === UNDEFINED,
        section,
        str = "";
    if (root) {
        obj = doc.layout;
        str = (doc._nowith ? '"use strict";' : '') + "var _r = '';" + (doc._nowith ? "" : "with(locals||{}){");
    }
    switch (toString.call(obj)) {
        case '[object Array]':
            obj.forEach(function(item) {
                str += stringify(doc, item);
            });
            break;
        case '[object Object]':
            section = doc.sections[obj.sec];
            str += "_r += (function(" + (section ? section.param : '') + "){var _r = '';" + (section ? stringify(doc, section.text) : '') + 'return _r;})(' + obj.param + ');';
            break;
        case '[object String]':
            str += obj;
            break;
        default:
            break;
    }
    if (root) {
        str += (doc._nowith ? '' : '}') + "return _r;";
    }
    return str;
}

function parseby(text, doc) {
    var open = doc.open,
        close = doc.close,
        from = 0,
        to = 0,
        str,
        buf = [],
        check,
        colon,
        info,
        name,
        param;
    while (from >= 0) {
        from = text.indexOf(open, from);
        if (from > to || from < 0) {
            buf.push('_r += "', clean(text.slice(to, from < 0 ? text.length : from)), '";');
        }
        if (from < 0) {
            break;
        }
        check = text[from + open.length];
        if (!(check === '#' || check === '$')) {
            check = '';
        }
        to = text.indexOf(check + close, from + open.length);
        if (to < 0) {
            str = '$' + text.slice(from);
        } else {
            str = text.slice(from + open.length, to);
            to += close.length + check.length;
        }
        from = to;
        switch (str[0]) {
            case '+':
                //include
                buf.push(parseby(read(str.slice(1), doc.options), doc));
                break;
            case '-':
                //layout
                doc.layout = parseby(read(str.slice(1), doc.options), doc);
                break;
            case '*':
                //section placeholder
                param = str.indexOf('(');
                if (param >= 0) {
                    name = str.slice(1, param);
                    param = str.slice(param + 1, str.indexOf(')'));
                } else {
                    name = str.slice(1);
                    param = "";
                }
                buf.push({
                    sec: name.trim(),
                    param: param
                });
                break;
            case '#':
                //section define
                colon = str.indexOf(':');
                info = str.slice(1, colon).trim();
                param = info.indexOf('(');
                if (param >= 0) {
                    name = info.slice(0, param);
                    param = info.slice(param + 1, info.indexOf(')'));
                } else {
                    name = info;
                    param = "";
                }
                doc.sections[name] = {
                    text: parseby(str.slice(colon + 1), doc),
                    param: param
                };
                break;
            case '=':
                //execute
                buf.push('_r += ', str.slice(1), ';');
                break;
            case '$':
                //pre
                buf.push('_r += "', clean(str.slice(1)), '";');
                break;
            default:
                //normal js
                buf.push(str);
                break;
        }
    }
    return buf;
}

function fn(host) {
    return new Function('locals', stringify(doc.apply_cache(host)));
}

function readPath(file_path) {
    return fs_existsSync(file_path) ? fs_readFileSync(file_path, 'utf8') : "";
}

function read(file_path, options) {
    return readPath(path_join(options._base || '', file_path.trim()) + (options._ext || ''));
}

doc._open = '<%';
doc._close = '%>';
doc._cache = doc._nowith = doc._debug = false;
doc._parseby = parseby;
doc._clean_map = clean_map;
doc.cached_sections = [];
doc.apply_cache = function(doc) {
    this.cached_sections.forEach(function(cache) {
        this[cache.key] = cache.value;
    }, doc.sections);
    return doc;
};
doc.__express = function(file_path, options, fn) {
    options._key = file_path;
    options._ext = path_extname(file_path);
    options._base = options.settings && options.settings.views;
    return doc(options).parse(file_path.slice(options._base.length + 1, -options._ext.length), true).compile().render(options, fn);
};
doc.render = function(str, options, fn) {
    return doc(options).parse(str, false).compile().render(options, fn);
};
module.exports = doc;