# Canapi
========

[![Join the chat at https://gitter.im/ty10r/canapi](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/ty10r/canapi?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
Canapi is an API Management Gateway built on Express.js. Build API management proxies based on a simple configuration file and a [RAML] (https://github.com/raml-org/raml-spec) file.

### Functions
Current management tools available to API management proxies are:
- Request URI and query parameter validation
- Password protection
- OAuth authorization with access tokens
- Request logging in database


### Setup Instructions
- Install Node.js and npm
- [Install mongodb] (http://docs.mongodb.org/manual/installation/)
- Make a clone of Canapi
- From cananpi/server run npm install
- Copy any wanted raml files into canapi/server/
- Edit the canapi configuration file to include settings for all desired api proxies (See Server Configuration)
- Run the command "node server.js" from canapi/server
- Check Known Issues section if there is a problem

### Server configuration
Follow the example shown in the server/default-config.js file. If you are including any access_tokens in your configuration, create a server.config.js file to override the default-config.js file. This will keep your tokens from being committed.

## Design Decisions
I decided to use Node.js, Express.js, and Mongodb because I have previous experience with this stack. I like to think of the overall concept of API gateways as including middleware functionalities to an API. Express allows me to code my solution to reflect that model. Adding new management functionality can be done by implementing a new middleware and simply adding it to the desired router.

My priority with this project was to enable the creation of an API gateway with request validation through the use of RAML. To do this, I used the [RAML Javascript Parser] (https://github.com/raml-org/raml-js-parser) to get a tree structure of the resources of an API. With this resource tree, I am able to build custom validation middleware for each resource endpoint in the API. Once API gateways were building from raml files, adding new gateway management functionality became a simple task.

Based on server configuration, an API endpoint is made accessible at the canapi server/api-local-path/resource-endpoint

### API Gateway configuration design
For the scope of this 2 week side-project, API Gateway details and configuration are all done on the server before starting up. Going forward, it would be easy to add Canapi specific endpoints to allow admins or white-listed IPs to send new API Gateway configurations to a Canapi server for API gateway addition.

### OAuth configuration design
For the scope of this 2 week side-project, OAuth compliance is done in the most simple form. If a Canapi creator wishes to enable the management of an OAuth protected API, they must include an access_token to that api in the server configuration. For the time being, only OAuth 2.0 is supported.

### User login design
For the scope of this 2 week side-project, requiring user login is solely for the purpose of logging which users make a request. In the future, a authorization layer could be added to give users privileges to use APIs and endpoints.
The user client must have the ability to save a cookie which is sent to them after using the /register or /authorize Canapi endpoint. The user client must save authtoken included in the cookie response from these endpoints and include it in the cookies they send to User login protected APIs.

### Request logging design
For the scope of this 2 week side-project, I wasn't able to get around to creating the API for this resource. For now, when request logging is enabled, Canapi will simply save all request data to the mongo db associated with Canapi. In the future, a REST API for this resource would be simple to create.



## Known Issues
You can check the github issues section to see some of the known issues with this code. Some notable ones are:
- Only json api's supported currently
- Post parameters are not validated due to a raml-parser problem. See this [RAML-Parser Issue] (https://github.com/raml-org/raml-js-parser/issues/115)
- URI Parameters which act as a generic variable rather than a URI segment variable are broken. Notable examples are the 1) version string included in most API RAMLs. Fix this by appending the version string to the baseURI of a raml file. 2) Media types at the end of a url. eg. Twitter's API allowing each endpoint to end in '.json' or not.


## Future
My future plans for this are to more fully support the RAML Specification for server configuration. Once that is complete, adding new management functionality is as simple as adding middlewares and creating rest APIs for collected data.
