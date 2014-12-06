// An eample of the server configuration object.
// This can be overridden on a production server with server.config.js
// port is the port the server will listen on
// db is the
var config = {
	// @property port The port for the server to listen on
	port: 8000,
	// @property db The mongo database for the server to use
	db: 'mongodb://localhost/canapi',
	// @property APIs a list of the API configurations for canapi
	// Each API must contain:
		// raml: the API's raml file location
		// localPath: the subpath Canapi will proxy the API under
	// Optional parameters:
		// loginRequired: true if you want users to login with Canapi before using the API
		// access_token: your access token to the API, without it OAuth protected endpoints will not be proxied
		// logRequests: true if you want to log all requests sent through the proxy
	APIS: [
		{
			name: 'Github',
			raml: 'github.raml',
			localPath: '/api-github-com',
			// loginRequired: 'true',
			access_token: 'asdf',
			logRequests: 'true'
		},
		// {
		// 	name: 'Instagram',
		// 	raml: 'instagram.raml',
		// 	localPath: '/api-instagram-com'
		// }
	]
}

module.exports = config;