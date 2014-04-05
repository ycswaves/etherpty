function etherpty_share(url, editable) {
    var metaSocket = makeMetaSocket();
    var token = '';
    var ioSocket = makeIoSocket();
    editable = editable ||true;
    url = (url[url.length - 1]) !== '/' ?  url + '/' : url;
    process.stdin.setRawMode(true);
    process.stdin.setEncoding('utf8');
    process.stdin.resume();
    //Prees ctrl+C to exit.
    process.stdin.on('data', function(data){
        if (data === '\u0003')
            process.exit();
    });
    metaSocket.on('connect', metaConnection(url, editable, ioSocket));
    metaSocket.connect(url+'pty/master/meta/', 'etherpty-protocol');
}

function metaConnection(url, editable, ioSocket) {
    return function(metaCon) {
        var doubleExit = 0;
        metaCon.on('error', function(error) {
            console.log("Connection Error: " + error.toString());
            process.exit();
        });
        metaCon.on('close', function() {
            console.log('>> Etherpty Connection Closed.');
            process.exit();
        });
        metaCon.send(JSON.stringify({'type':'share', 'token':''}));
        metaCon.on('message', function(message) {
            if (message.type === 'utf8') {
                var msg = message.utf8Data;
                var msgType = getConType(msg);

                //Get token.
                if (msgType === 'share') {
                    token = getToken(msg);
                    console.log("Your shell is shared at: " + url + token);
                } else
                if (msgType === 'start') {
                    if (metaCon.connected) {
                        metaCon.send(JSON.stringify({'type':'spawn', 'cols':80, 'rows':30}));
                    }
                    //Build the IO websocket connection.
                    ioSocket.connect(url + 'pty/master/io/' + token, 'etherpty-protocol');
                    //console.dir(ioSocket);
                    console.log('>> Client Connecting ...');
                    ioSocket.on('connect', function(ioCon){
                        //Make a new ptty
                        var term = makeTerm();
                        term.on('data',function(chunk){
                            if (ioCon.connected)
                                ioCon.send(chunk);
                            process.stdout.write(chunk);
                        });
                        //Double prees ctrl+C to exit.
                        process.stdin.removeAllListeners('data');
                        process.stdin.on('data', function(data){
                            if (data === '\u0003' && doubleExit === 1) {
                                metaCon.send(JSON.stringify({'type':'exit', 'token':token}));
                                //metaCon.close();
                                process.exit();
                                return;
                            } else if (data === '\u0003') {
                                doubleExit ++;
                            } else {
                                doubleExit = 0;
                            }
                            term.write(data);
                        });
                        //If the master is editable, pipe the stdin to the local pty.
                        if (editable)
                            process.stdin.pipe(term.socket);
                        else
                            process.stdin.pause();
                        //Recieve the IO data from the client and output to local pty.
                        ioCon.on('message', function(message) {
                            if (message.type === 'utf8') {
                                var data = message.utf8Data;
                                term.write(data);
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
        console.log('>> Connection ' + error.toString());
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

module.exports = etherpty_share;
