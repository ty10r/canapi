var config = {
	port: 8000,
	db: 'mongodb://localhost/ghateway',
	APIS: [
		{
			name: 'Github',
			raml: 'github.raml',
			localPath: '/api-github-com'
		},
		{
			name: 'Instagram',
			raml: 'instagram.raml',
			localPath: '/api-instagram-com'
		}
	]


}

module.exports = config;