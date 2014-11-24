global.API_CORE = __dirname + '/lib/API.js';
global.UTILS_PATH = __dirname + '/lib/utils.js';

// Configuration switch which allows for uncommited deployment configs
try {
	global.CONFIG = require( './server.config.js' );
}
catch ( e ) {
	global.CONFIG = require( './default-config.js');
}