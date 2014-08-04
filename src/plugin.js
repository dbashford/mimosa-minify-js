/* eslint strict:0 */

var fs = require( "fs" )
  , path = require( "path" )
  , uglify = null
  , logger = null;

var _buildSourceMapMetadata = function ( config, file ) {
  var extName = path.extname( file.inputFileName );
  file.sourceMapName = file.inputFileName.replace(extName, ".js.map")
    .replace(config.watch.sourceDir, config.watch.compiledDir);
  file.sourceName = file.inputFileName.replace(config.watch.sourceDir, config.watch.compiledDir) + ".src";
};

var _cleanUpSourceMaps = function( config, options, next ) {
  var hasFiles = options.files && options.files.length > 0;
  if ( !hasFiles ) {
    return next();
  }

  options.files.forEach( function( file ) {
    _buildSourceMapMetadata( config, file );
    if ( fs.existsSync( file.sourceName ) ) {
      fs.unlinkSync( file.sourceName);
    }
  });

  next();
};

var _makeDirectory = function ( dir ) {
  if ( !fs.existsSync( dir ) ) {
    logger.debug("Making folder [[ " + dir + " ]]");
    var wrench = require( "wrench" );
    wrench.mkdirSyncRecursive(dir, 0777);
  }
};

var _writeOriginalSource = function( config, file ) {
  _buildSourceMapMetadata( config, file );
  _makeDirectory( path.dirname( file.sourceName ) );
  try {
    fs.writeFileSync( file.sourceName, file.inputFileText );
  } catch (err) {
    logger.error("Error writing source file [[ " + file.sourceName + " ]], " + err);
  }
};

var _performJSMinify = function (config, file) {
  var source = file.outputFileText
    , inFileName = file.inputFileName
    , outFileName = file.outputFileName
    , createSourceMap = !config.isBuild && file.inputFileName
    , stream, sourceMap, mapInfo;

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
      }

      sourceMap = uglify.SourceMap( mapSettings );
      stream = uglify.OutputStream( {source_map: sourceMap} );
    } else {
      stream = uglify.OutputStream();
    }

    var toplevelAst = uglify.parse( source, {filename:outFileName} );
    toplevelAst.figure_out_scope();
    var compressor = uglify.Compressor( {warnings:false} );
    var compressedAst = toplevelAst.transform( compressor );
    compressedAst.figure_out_scope();
    compressedAst.compute_char_frequency();
    if(config.minifyJS.mangleNames){
      compressedAst.mangle_names( {except:[ "require", "requirejs", "define", "exports", "module" ]} );
    }

    compressedAst.print( stream );
    var code = stream + "";

    if ( createSourceMap ) {
      var sourceMapJSON = JSON.parse( sourceMap.toString() );

      // source map not already created, so sourceMap metadata needs to be created
      // and source needs to be written
      if (!file.sourceMap) {
        _writeOriginalSource( config, file );
        sourceMapJSON.sources = [ path.basename( file.sourceName ) ];
      }

      // @ is deprecated but # not widely supported in current release browsers
      code += "\n/*\n//@ sourceMappingURL=" + path.basename( file.sourceMapName );
      code += "\n*/\n";

      var sourceMapRoot = inFileName.replace( path.basename( inFileName ), "" );
      sourceMapRoot = sourceMapRoot.replace( config.watch.sourceDir, "" );
      sourceMapRoot = sourceMapRoot.slice( 0, -1 );

      sourceMapJSON.sourceRoot = sourceMapRoot;

      mapInfo = {
        outputFileName: file.sourceMapName,
        outputFileText: JSON.stringify( sourceMapJSON )
      };
    }

    return {
      code: code,
      mapInfo: mapInfo
    };

  } catch ( err ) {
    logger.warn( "Minification failed on [[ " + outFileName + " ]], writing unminified source\n" + err );
    return {
      code: source
    };
  }
};

var _minifyJS = function( config, options, next ) {
  var hasFiles = options.files && options.files.length > 0;
  if ( !hasFiles ) {
    return next();
  }

  var maps = [];
  var done = function() {
    if ( maps.length > 0 ) {
      maps.forEach( function( mapInfo ) {
        options.files.push( mapInfo );
      });
    }
    next();
  };

  options.files.forEach( function( file, i ) {
    if (file.outputFileName && file.outputFileText) {
      var m = config.minifyJS;
      if ( m.excludeRegex && file.outputFileName.match( m.excludeRegex ) ) {
        logger.debug( "Not going to minify [[ " + file.outputFileName + " ]], it has been excluded with a regex." );
      } else if ( m.exclude.indexOf( file.outputFileName ) > -1 ) {
        logger.debug( "Not going to minify [[ " + file.outputFileName + " ]], it has been excluded with a string path." );
      } else {
        logger.debug( "Running minification on [[ " + file.outputFileName + " ]]" );
        var minified = _performJSMinify( config, file );
        file.outputFileText = minified.code;
        if ( minified.mapInfo ) {
          maps.push( minified.mapInfo );
        }
      }
    }

    if ( i === options.files.length - 1 ) {
      done();
    }
  });
};

exports.registration = function ( config, register ) {
  if ( config.isMinify ) {
    logger = config.log;
    var e = config.extensions;
    register( ["add","update","buildFile"],      "beforeWrite", _minifyJS, e.javascript );
    register( ["add","update","buildExtension"], "beforeWrite", _minifyJS, e.template );
    register( ["cleanFile"], "delete", _cleanUpSourceMaps, ["js"] );
  }
};
