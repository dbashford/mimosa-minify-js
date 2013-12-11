"use strict";

exports.defaults = function() {
  return {
    minifyJS: {
      exclude:[/\.min\./]
    }
  };
};


exports.placeholder = function () {
  var ph = "\n\n  # minifyJS:                     # Configuration for minifying/cleaning js using the\n" +
     "                                  # --minify flag\n" +
     "    # exclude:[/\\.min\\./]         # List of string paths and regexes to match files to exclude\n" +
     "                                  # when running minification. Any path with \".min.\" in its name,\n" +
     "                                  # is assumed to already be minified and is ignored by default.\n" +
     "                                  # Paths can be relative to the watch.compiledDir, or absolute. \n" +
     "                                  # Paths are to compiled files,  so '.js' rather than '.coffee'\n\n";

  return ph;
};

exports.validate = function( config, validators )  {
  var errors = [];
  if ( validators.ifExistsIsObject( errors, "minifyCSS config", config.minifyJS ) ) {
    validators.ifExistsFileExcludeWithRegexAndString( errors, "minifyJS.exclude", config.minifyJS, config.watch.compiledDir );
  }
  return errors;
};