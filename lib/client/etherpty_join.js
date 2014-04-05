function etherpty_join(url) {
    var metaSocket = makeMetaSocket();
    var ioSocket = makeIoSocket();
    var urlSplit = url.split('/');
    var token = urlSplit.slice(-1)[0];
    var host = urlSplit[0] +  '//' + urlSplit[2];
    //console.log(token);
    process.stdin.setRawMode(true);
    process.stdin.setEncoding('utf8');
    process.stdin.resume();
    process.stdin.on('data', function(data){
        if (data === '\u0003')
            process.exit();
    });
    metaSocket.on('connect', metaConnection(host, token, ioSocket));
    metaSocket.connect(host +'/pty/client/meta/' + token, 'etherpty-protocol');
    console.log('Try to join ' + url);

}

function metaConnection(host, token, ioSocket) {
    return function(metaCon) {
        var doubleExit = 0;
        metaCon.on('error', function(error) {
            console.log(">> Connection Error: " + error.toString());
            process.exit();
        });
        metaCon.on('close', function() {
            console.log('>> Etherpty Connection Closed.');
            process.exit();
        });
        metaCon.send(JSON.stringify({'type':'join', 'token':token}));
        metaCon.on('message', function(message) {
            if (message.type === 'utf8') {
                var msg = message.utf8Data;
                var msgType = getConType(msg);
                if (msgType === 'exit') {
                    console.log('\n>> Remote Terminal Exited.')
                    metaCon.close();
                } else
                if (msgType === 'error') {
                    var message = getMsg(msg);
                    console.log('>> ' + message);
                    metaCon.close();
                    process.exit();
                } else
                if (msgType === 'share') {
                    //Build the IO websocket connection.
                    ioSocket.connect(host + '/pty/client/io/' + token, 'etherpty-protocol');
                    ioSocket.on('connect', function(ioCon){
                        //Double press ctrl+C to exit.
                        process.stdin.removeAllListeners('data');
                        process.stdin.on('data', function(data){
                            if (data === '\u0003' && doubleExit === 1) {
                                //metaCon.close();
                                process.exit();
                            } else if (data === '\u0003') {
                                doubleExit ++;
                            } else {
                                doubleExit = 0;
                            }
                            ioCon.send(data);
                        });

                        //Recieve the IO data from remote and output to local stdout.
                        ioCon.on('message', function(message){
                            if (message.type === 'utf8') {
                                process.stdout.write(message.utf8Data);
                            }
                        });
                    });
                }
            }
        });
    }
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

function getMsg(msg) {
    var JSONStream = require('JSONStream');
    var parser = JSONStream.parse('message');
    var message = '';
    parser.on('data', function(data) {
        message = data;
    });
    parser.write(msg);
    return message;
}


function makeTerm() {
    var pty = require('pty.js');
    var term = pty.spawn('bash', [], {
          name: 'xterm-color',
          cols: 80,
          rows: 30,
          cwd: process.env.HOME,
          env: process.env
    });
    return term;
}

function makeIoSocket() {
    var WebSocketClient = require('websocket').client;
    var ioSocket = new WebSocketClient();
    ioSocket.on('connectFailed', function(error) {
        console.log('>> Connection Error: ' + error.toString());
        process.exit();
    });
    return ioSocket;
}

function makeMetaSocket() {
    var WebSocketClient = require('websocket').client;
    var metaSocket = new WebSocketClient();
    metaSocket.on('connectFailed', function(error) {
        console.log('>> Connection ' + error.toString());
        process.exit();
    });
    return metaSocket;
}

module.exports = etherpty_join;
