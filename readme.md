#Etherpty
Etherpty is a real-time remote collaborative terminal. You can share your terminal to remote partners via a unique url link easily.

#Usage
On the server side, 

```
$ server [-p port]|[--port port]
```

If the listening port is not provided, the `etherpty` server will listening on port 8080.

On the master side(whose terminal want to be shared):

```
$ etherpty --share http://hostname:port
```
Replace the hostname and port by your own `etherpty` server. The server will return a unique sharing URL:

```
$ etherpty --share http://localhost:8080
$ Your shell is shared at: http://localhost:8080/511c2772886991908b5c96cbee362fce
```

You just need share the unique sharing URL to you partners.

To access a shared terminal by joining a URL

```
$ etherpty --join http://localhost:8080/511c2772886991908b5c96cbee362fce
```
You can fully control the remote shared terminal in real-time.

