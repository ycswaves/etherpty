module.exports = etherpty = function(argv){
    if (argv.share) {
        var url = argv.share,
            editable = argv.editable || true,
            etherpty_share = require('./lib/client/etherpty_share');
            etherpty_share(url,editable);
    } else if (argv.join) {
        var url = argv.join,
            etherpty_join = require('./lib/client/etherpty_join');
            etherpty_join(url);
    } else {
        console.log('\n>> Usage: etherpty --share|--join url[:port] [--editable]\n');

    }
}
