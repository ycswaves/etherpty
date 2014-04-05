#!/usr/bin/env node
var server = require('../lib/server/server.js');
var argv = require('minimist')(process.argv.slice(2));
var port = argv.p || argv.port || 8080;
server(port);
