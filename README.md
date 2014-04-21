# Prezip for [DocPad](http://docpad.org/)

Prezip automatically gzips your files at build time for easier serving.

## Install

	docpad install prezip

## Config

The values listed here are the defaults.

```coffee
plugins:
	prezip:
		# Files with compression ratios below this value are not kept.
		ratio: 0.95
		
		# Files that don't match a pattern in this list aren't compressed.
		# 
		# The elements can be either a string or a RegExp.  Strings are
		# considered suffixes that must match.
		whitelist: [/./],
		
		# Files that match a pattern in this list aren't compressed.
		blacklist: [],
		
		# A builtin blacklist of known uncompressible formats.
		# 
		# This is broken out from blacklist so that blacklist can be easily
		# modified without overwriting these values.  If you do not want to use
		# these values set it to [].
		blacklistBuiltin: [/* See the source for the list. */],
		
		# Gzip Compression Settings.
		#
		# See: http://zlib.net/manual.html#Advanced
		#
		# The defaults are for maximum compression and secondly compression speed.
		gzip: {
			level: 9,
			windowBits: 15,
			memLevel: 8,
		},
```


