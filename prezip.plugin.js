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
		
		generated: function PreZip_writeAfter(opt, next) {
			var self = this;
			var c = this.config;
			if (!Array.isArray(c.whitelist)) c.whitelist = c.whitelist ? [c.whitelist] : [];
			if (!Array.isArray(c.blacklist)) c.blacklist = c.blacklist ? [c.blacklist] : [];
			
			var root = this.docpad.config.outPath;
			var w = walk.walk(root, {followLinks: false});
			w.on("file", function(prefix, file, next) {
				var rel = prefix.slice(root.length)+"/"+file.name;
				var abs = prefix+"/"+file.name;
				handlePath(self, rel, abs, next);
			});
			w.on("end", next);
		},
	});
}

var fs    = require("fs");
var zlib  = require("zlib");
var async = require("async");
var walk  = require("walk");

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

function handlePath(self, rel, abs, next) {
	var cfg = self.config
	
	if (!cfg.whitelist.some(matches.bind(undefined, rel)))       return next();
	if (cfg.blacklist.some(matches.bind(undefined, rel)))        return next();
	if (cfg.blacklistBuiltin.some(matches.bind(undefined, rel))) return next();
	
	fs.readFile(abs, function(err, content){
		if (err) return next(err);
		
		generateCompressed(self, abs, content, next);
	});
}

function generateCompressed(self, path, data, next) {
	var cfg = self.config
	
	zlib.gzip(data, cfg.gzip, function(err, r){
		if (err) {
			self.docpad.log("error", "Error: prezip: ", err);
			return next(err);
		}
		
		var ratio = r.length/data.length;
		
		self.docpad.log("debug", "Prezipped "+path+" with compression ratio of "+ratio+".");
		
		if (ratio > self.config.ratio) {
			self.docpad.log("info", "Not storing "+path +".gz with ratio "+ratio+".");
			return next();
		}
		
		var out = fs.writeFile(path+".gz", r, function(){ return next() });
	});
}
