#!/usr/bin/env node
var argv = require('minimist')(process.argv.slice(2));
var etherpty = require('etherpty');
etherpty(argv);


