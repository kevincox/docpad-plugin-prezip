module.exports = function(BasePlugin) {
	return BasePlugin.extend({
		name: "prezip",
		config: {
			whitelist: [/./],
			blacklist: [],
			blacklistBuiltin: [
				".png", ".jpg", ".webp", ".gif",
				".mp3", ".ogg",
				".mp4", ".ogv", ".flv",
				".gz", ".7z",
			],
			
			gzip: {
				level: 9,
				windowBits: 15,
				memLevel: 8, // 9 messes up for some reason.
			},
			
			ratio: 0.95,
		},
		
		generateAfter: function PreZip_writeAfter(opt, next) {
			var c = this.config;
			if (!Array.isArray(c.whitelist)) c.whitelist = c.whitelist ? [c.whitelist] : [];
			if (!Array.isArray(c.blacklist)) c.blacklist = c.blacklist ? [c.blacklist] : [];
			
			async.each(opt.collection.models, generateCompressed.bind(this), next);
		},
	});
}

var fs    = require("fs");
var zlib  = require("zlib");
var async = require("async");

// Stolen from node 0.11.
function zlibBuffer(engine, buffer, callback) {
  var buffers = [];
  var nread = 0;

  engine.on('error', onError);
  engine.on('end', onEnd);

  engine.end(buffer);
  flow();

  function flow() {
    var chunk;
    while (null !== (chunk = engine.read())) {
      buffers.push(chunk);
      nread += chunk.length;
    }
    engine.once('readable', flow);
  }

  function onError(err) {
    engine.removeListener('end', onEnd);
    engine.removeListener('readable', flow);
    callback(err);
  }

  function onEnd() {
    var buf = Buffer.concat(buffers, nread);
    buffers = [];
    callback(null, buf);
    engine.close();
  }
}

zlib.gzip = function(buffer, opts, callback) {
  if (typeof opts == "function") {
    callback = opts;
    opts = {};
  }
  return zlibBuffer(new zlib.Gzip(opts), buffer, callback);
};
// end of backport.

function matches(path, pattern) {
	if (typeof pattern == "string") {
		return path.substr(-pattern.length) == pattern;
	} else {
		return pattern.test(path);
	}
}

function generateCompressed(model, next) {
	var self = this;
	var cfg  = this.config
	var attr = model.attributes;
	var path = attr.outPath;
	var data = model.getOutContent();
	
	if (attr.prezip === false) return next();
	
	if (!cfg.whitelist.some(matches.bind(undefined, path)))       return next();
	if (cfg.blacklist.some(matches.bind(undefined, path)))        return next();
	if (cfg.blacklistBuiltin.some(matches.bind(undefined, path))) return next();
	
	zlib.gzip(data, cfg.gzip, function(err, r){
		if (err) {
			docpad.log("error", "Error: prezip: ", err);
			return next(err);
		}
		
		var ratio = r.length/data.length;
		
		docpad.log("debug", "Prezipped "+path+" with compression ratio of "+ratio+".");
		
		if (ratio > self.config.ratio) {
			docpad.log("info", "Not storing "+path +".gz with ratio "+ratio+".");
			return next();
		}
		
		// var out = docpad.createFile(r, {
		// 	date: attr.date,
		// 	url: attr.url+".gz",
		// 	path: attr.path,
		// 	outPath: path+".gz",
		// 	encoding: "binary",
		// });
		// docpad.getDatabase().add(out);
		var out = fs.writeFile(path+".gz", r, function(){ return next() });
	});
}
