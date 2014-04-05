function server(port) {
    var WebSocketServer = require('websocket').server;
    var http = require('http');

    var conPoll = {};
    var maxHistoryMsgLength = 500;

    process.stdin.on('data', function(data){
        if (data === '\u0003')
            process.exit();
    });

    var server = http.createServer(function(request, response) {
        console.log((new Date()) + ' Received request for ' + request.url);
        response.writeHead(404);
        response.end();
    });
    server.listen(port, function() {
        console.log((new Date()) + ' Server is listening on port ' + port);
    });

    wsServer = new WebSocketServer({
        httpServer: server,
        autoAcceptConnections: false
    });

    wsServer.on('request', function(request) {
        var reqPath = request.resourceURL.path.split('/');
        var token = reqPath[reqPath.length - 1];
        var type = reqPath[reqPath.length - 2];
        var from = reqPath[reqPath.length -3];
        if (type === 'meta') {
            var metaCon = request.accept('etherpty-protocol', request.origin);
            console.log((new Date()) +  ' ' + from + ' process accepted: '+ request.socket.remoteAddress + ':' + request.socket.remotePort);
            if (from === 'master') {
                metaCon.on('close', function(){
                    console.log((new Date()) +  ' master process exit.');
                    var con = conPoll[token]['meta']['client'] || [];
                    for (var i = 0; i < con.length; i++) {
                        con[i].sendUTF(JSON.stringify({"type":"exit", "token":token}));
                    }
                    delete conPoll[token];
                    metaCon.close();
                });
            } else {
                metaCon.on('close', function(){
                    console.log((new Date()) + ' client process exit.');
                    metaCon.close();
                })
            }
            metaCon.on('message', function(message){
                if (message.type === 'utf8'){
                    var msg = message.utf8Data;
                    var msgType = getConType(msg);

                    if (msgType === 'share') {
                        token = generateUIUD();
                        metaCon.sendUTF(JSON.stringify({"type":"share", "token":token}));
                        conPoll[token] = {};
                        conPoll[token]['meta'] = conPoll[token]['meta'] || {};
                        conPoll[token]['meta']['master'] = (metaCon);
                        conPoll[token]['historyMsg'] = '';
                    } else if (msgType === 'join') {
                        //No coresponding master exit.
                        if (!conPoll[token]) {
                            metaCon.send(JSON.stringify({"type": "error", "message": "No Such Shared Terminal."}));
                            metaCon.close();
                        } else {
                            conPoll[token]['meta'] = conPoll[token]['meta'] || {};
                            conPoll[token]['meta']['client'] = conPoll[token]['meta']['client'] || [];
                            conPoll[token]['meta']['client'].push(metaCon);
                            metaCon.sendUTF(JSON.stringify({"type":"share", "token":token}));
                            //Fisrt client join into the master terminal.
                            if (!conPoll[token]['isStarted']) {
                                conPoll[token]['meta']['master'].sendUTF(JSON.stringify({"type":"start", "token":token}));
                                conPoll[token]['isStarted'] = true;
                            }
                        }
                    } else if (msgType === 'exit') {
                        metaCon.close(); //master exit.
                    }
                }
            });
        } else if (type === 'io') {
            var ioCon = request.accept('etherpty-protocol', request.origin);
            if (from === 'master') {
                conPoll[token]['io'] = conPoll[token]['io'] || {};
                conPoll[token]['io']['master'] = ioCon;
                ioCon.on('message', function(message) {
                    if (message.type === 'utf8') {
                        conPoll[token]['historyMsg'] += message.utf8Data;
                        var historyMsg = conPoll[token]['historyMsg'];
                        if (conPoll[token]['historyMsg'].length > maxHistoryMsgLength) {
                            conPoll[token]['historyMsg'] = historyMsg.substr(historyMsg.length - maxHistoryMsgLength, maxHistoryMsgLength);
                        }
                        var con = conPoll[token]['io']['client'];
                        for (var i = 0; i < con.length; i++) {
                            if (con[i] !== ioCon){
                                //process.stdout.write(message.utf8Data);
                                con[i].send(message.utf8Data);
                            }
                        }
                    }
                });
            } else {//from client
                ioCon.on('message', function(message){
                    if (message.type === 'utf8') {
                        conPoll[token]['io']['master'].send(message.utf8Data);
                    }
                });
                conPoll[token]['io'] = conPoll[token]['io'] || {};
                conPoll[token]['io']['client'] = conPoll[token]['io']['client']  || [];
                conPoll[token]['io']['client'].push(ioCon);
                ioCon.send(conPoll[token]['historyMsg']);
            }
        }
    });
}

function getToken(msg) {
    var JSONStream = require('JSONStream');
    var parser = JSONStream.parse('token');
    var token = '';
    parser.on('data', function(data) {
        token = data;
    });
    parser.write(msg);
    return token;
}

function getConType(msg) {
    var JSONStream = require('JSONStream');
    var parser = JSONStream.parse('type');
    var type = '';
    parser.on('data', function(data) {
        type = data;
    });
    parser.write(msg);
    return type;
}

function generateUIUD() {
    return  'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
    });
}

module.exports = server;
