var config = {
	port: 8000,
	db: 'mongodb://localhost/canapi',
	APIS: [
		{
			name: 'Github',
			raml: 'github.raml',
			localPath: '/api-github-com',
			loginRequired: 'true',
			access_token: 'asdf'
		},
		{
			name: 'Instagram',
			raml: 'instagram.raml',
			localPath: '/api-instagram-com'
			// loginRequired: 'true',
			// access_token: 'asdf'
		}
	]


}

module.exports = config;