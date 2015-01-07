"use strict";

var uglify
  , logger
  , convertSourceMap
  , sourceMapComment;

var _performJSMinify = function ( config, file ) {
  var source = file.outputFileText
    , inFileName = file.inputFileName
    , outFileName = file.outputFileName
    , createSourceMap = !config.isBuild && file.inputFileName
    , stream
    , sourceMap;

  if ( !uglify ) {
    uglify = require( "uglify-js" );
  }

  try {
    if ( createSourceMap ) {
      var mapSettings = {
        file: outFileName,
        root: inFileName
      };

      if ( file.sourceMap ) {
        mapSettings.orig = JSON.parse( file.sourceMap );
      } else {
        // attempt to find inline source map

        if ( !convertSourceMap ) {
          // using both source-map-url and convert-source-map
          // because convert-source-map does not support
          // charset, https://github.com/thlorenz/convert-source-map/issues/9
          sourceMapComment = require( "source-map-url");
          convertSourceMap = require( "convert-source-map");
        }

        var comment = sourceMapComment.getFrom( source );

        // source have existing source map comment?
        if ( comment ) {
          var converter = convertSourceMap.fromComment( "//# sourceMappingURL=" + comment );
          if ( converter ) {
            // set original map and remove existing map comment
            mapSettings.orig = converter.toObject();
            source = sourceMapComment.removeFrom( source );
          }
        }
      }

      sourceMap = uglify.SourceMap( mapSettings );
      stream = uglify.OutputStream( { source_map: sourceMap } );
    } else {
      stream = uglify.OutputStream();
    }

    var toplevelAst = uglify.parse( source, { filename: outFileName } );
    toplevelAst.figure_out_scope();
    var compressor = uglify.Compressor( { warnings: false } );
    var compressedAst = toplevelAst.transform( compressor );
    compressedAst.figure_out_scope();
    compressedAst.compute_char_frequency();
    if( config.minifyJS.mangleNames ){
      compressedAst.mangle_names( { except: [ "require", "requirejs", "define", "exports", "module" ] } );
    }

    compressedAst.print( stream );
    var code = stream + "";

    if ( createSourceMap ) {
      var sourceMapJSON = JSON.parse( sourceMap.toString() );
      sourceMapJSON.sources[0] = inFileName;
      sourceMapJSON.sourcesContent = [file.inputFileText];
      sourceMapJSON.file = outFileName;

      var base64SourceMap = new Buffer( JSON.stringify( sourceMapJSON ) ).toString( "base64" );
      var datauri = "data:application/json;base64," + base64SourceMap;
      code += "\n//# sourceMappingURL=" + datauri + "\n";
    }

    return code;
  } catch ( err ) {
    logger.warn( "Minification failed on [[ " + outFileName + " ]], writing unminified source\n" + err );
    return source;
  }
};

var _minifyJS = function( config, options, next ) {
  var hasFiles = options.files && options.files.length > 0;
  if ( !hasFiles ) {
    return next();
  }

  options.files.forEach( function( file, i ) {
    if ( file.outputFileName && file.outputFileText ) {
      var m = config.minifyJS;
      if ( m.excludeRegex && file.outputFileName.match( m.excludeRegex ) ) {
        logger.debug( "Not going to minify [[ " + file.outputFileName + " ]], it has been excluded with a regex." );
      } else if ( m.exclude.indexOf( file.outputFileName ) > -1 ) {
        logger.debug( "Not going to minify [[ " + file.outputFileName + " ]], it has been excluded with a string path." );
      } else {
        if ( logger.isDebug() ) {
          logger.debug( "Running minification on [[ " + file.outputFileName + " ]]" );
        }
        file.outputFileText = _performJSMinify( config, file );
      }
    }

    if ( i === options.files.length - 1 ) {
      next();
    }
  });
};

exports.registration = function ( config, register ) {
  if ( config.isMinify ) {
    logger = config.log;
    var e = config.extensions;

    register(
      ["add", "update", "buildFile"],
      "beforeWrite",
      _minifyJS,
      e.javascript );

    register(
      ["add", "update", "buildExtension"],
      "beforeWrite",
      _minifyJS,
      e.template );
  }
};
