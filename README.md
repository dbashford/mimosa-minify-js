mimosa-minify-js
===========

This is a JavaScript minification module for the Mimosa build tool. This tool utilizes [uglify](https://github.com/mishoo/UglifyJS2) to perform the minification of JavaScript assets.

For more information regarding Mimosa, see http://mimosa.io.

# Usage

Add `'minify-js'` to your list of modules.  That's all!  Mimosa will install the module for you when you start `mimosa watch` or `mimosa build`.

# Functionality

When `mimosa watch` or `mimosa build` are executed with the `--optimize` or `--minify` flag, this module will minify any files identified as `.js` right before the output is written.  This includes plain `.js` files but also any files compiled by any of the Mimosa JavaScript compilers.

If minifying a file that has an external sourceMap the minifier will use the source map and use it to create a new map. So, for example, CoffeeScript compiled to JavaScript and then minified will have source maps that map the minified code back to the CoffeeScript source if external (not inline) source maps are used.

## Source Maps

Source maps will be generated when running `mimosa watch`.  This module will also check if an existing source map is in place and if it is, will attempt to read it in and use is to get multi-step source maps. This way you can have a source map that goes from minified JavaScript => JavaScript => CoffeeScript.

As of `v2.0.0` of this module, this module no longer writes `.map` files, instead it embeds all source map information inline via a base64 encoded string.

Source maps will not be generated if running `mimosa build`.


# Default Config

```javascript
minifyJS: {
  exclude:[/\.min\./],
  mangleNames:true
}
```

#### `minifyJS.exclude` array of strings/regex
Matches paths to exclude from minification. String paths can be either relative to the `watch.compiledDir` or absolute. String paths must include the file name. Any file possessing ".min." in its name, like `jquery.min.js`, is assumed to already be minified so it will be ignored by default.

#### `minifyJS.mangleNames` boolean
When set to `false` variable names will not be altered when JavaScript code is minified.

# Release Notes

### 2.0
* Source maps are only provided inline. No longer will source maps be provided as separate files. If for some reason you need separate files, then pre-2.0 releases of this module will be needed.
* Module will detect any existing inline source maps, pull them out and include them as `orig` maps in the uglify.  This way you get maps back to anything that may already be compiled.  i.e. coffeescript -> javascript -> minified javascript.
* Many eslint errors fixed.