var socketIO = require('socket.io');
var mongoose = require("mongoose");
var express = require("express");
var http = require('http');
var app = express();
var server = http.createServer(app);
var port = 80 ;
console.log("express", __dirname);
app.use('/videos', express.static('videos/'));
mongoose.connect("mongodb://localhost:27017/Online");
server.listen(port, function () {
    console.log('Express server listening on port ' + port);
});
var io = socketIO.listen(server);
var ChatSchema = mongoose.Schema({
    name: String,
    id: String,
    isconnected: Boolean,
    // createdAt:{type:Date,expires:5}
}, {
        timestamps: true
    });
const cryptLib = require('@skavinvarnan/cryptlib');
var package = ["com.tech.rtcapp"];
var ChatModel = mongoose.model("Chat", ChatSchema);
var key = "com.tech.rtcapp";
const testFolder = './videos/';
const fs = require('fs');

app.get('/',function(req,res){
    res.end('hello world');
})

io.sockets.on('connection', function (client, details) {
    token = new Buffer(client.handshake.query.auth_token, 'base64').toString('ascii')
    console.log('details', token);
    package.push(" ");
    if (package.indexOf(token) > -1) {
        var newChat = new ChatModel({ name: client.id, id: client.id, isconnected: false })
        newChat.save().then(item => {
            ChatModel.find({ id: { $ne: client.id }, isconnected: false }).sort({ createdAt: -1 }).limit(1).then(data => {
                if (data.length > 0) {
                    console.log('createing offer' + JSON.stringify(data));
                    ChatModel.updateMany({ id: [client.id,data[0].id]}, { isconnected: true }, function (err, model) {
                        console.log(JSON.stringify(model));
                        io.to(data[0].id).emit('createoffer', { id: client.id });
                    })
                }
                else {
                    setTimeout(function () {
                        ChatModel.findOne({id:client.id,isconnected:false}).then(data=>{
                            console.log('after time out' + JSON.stringify(data));
                            if(data != null)
                            {
                                ChatModel.find({ id: { $ne: client.id }, isconnected: false }).sort({ createdAt: -1 }).limit(1).then(data => {
                                    if (data.length > 0) {
                                        console.log('createing offer' + JSON.stringify(data));
                                        ChatModel.updateMany({ id: client.id,id: data[0].id}, { isconnected: true }, function (err, model) {
                                            console.log(JSON.stringify(model));
                                            io.to(data[0].id).emit('createoffer', { id: client.id });
                                        })
                                    } else {
                                        ChatModel.update({ id: client.id }, { isconnected: true }, function (err, model) {
                                            var videos = fs.readdirSync(testFolder);
                                            var index = Math.floor(Math.random() * videos.length);
                                            console.log('createing offer no user found', index);
                                            console.log('createing offer no user found', videos[index]);
                                            client.emit("nouser", { url: videos[index] });                               
                                         })
                                    }
                                })
                            }                            
                        })
                    }, 5000);
                }
            })

        });

    } else {

        client.disconnect('unauthorized');
    }

    client.on('disconnect', function () {
        console.log('on disconnect client ' + client);
        ChatModel.find({ id: client.id }).then(data => {
            if (data != null) {
                console.log('data ' + JSON.stringify(data));
                user = data;
                data.forEach(element => {
                    ChatModel.findByIdAndRemove(element._id).then(item => console.log('new Disconnection: ' + item.id))
                });
            }
        })
    });



    client.on('offer', function (details) {
        console.log('To', details.To);
        details.from = client.id
       
        console.log('offer: ' + client.id);
        io.to(details.To).emit('offer', details);
        // client.broadcast.emit('offer',details);
    });

    client.on('answer', function (details) {
        details.from = client.id
       
        console.log('answer: ' + client.id);
        io.to(details.To).emit('answer', details);
        // client.broadcast.emit('answer',details)
    });

    client.on('candidate', function (details) {
        details.from = client.id;
        
        console.log('candidate: ' + client.id);
        io.to(details.To).emit('candidate', details);
        // client.broadcast.emit('candidate',details);
    });

    client.on('connected', function () {
        ChatModel.update({ id: client.id }, { isconnected: true }, function (err, model) {
            console.log(JSON.stringify(model));
        })
    });

    client.on('Leave', function (details) {
        console.log('on disconnect ' + client.id);
        console.log('on disconnect ' + details.To);
        details.from = client.id
        io.to(details.To).emit('Leave', details)
    });

    client.on('failedconnect',function(){
        var videos = fs.readdirSync(testFolder);
        var index = Math.floor(Math.random() * videos.length);
        console.log('createing offer no user found on timeout', index);
        console.log('createing offer no user found on timeout', videos[index]);
        client.emit("nouser", { url: videos[index] });   
    });

});


// console.log("me",io.sockets.connected[client.id]==undefined);
// console.log("you",io.sockets.connected[details.To]==undefined);
// if (io.sockets.connected[client.id]==undefined) { 
//     var videos = fs.readdirSync(testFolder);
//     var index = Math.floor(Math.random() * videos.length);
//     console.log('createing offer no user found', index);
//     console.log('createing offer no user found', videos[index]);
//     io.to(details.To).emit("nouser", { url: videos[index] });
//     return ;

// }else if(io.sockets.connected[details.To]==undefined)
// {
//     var videos = fs.readdirSync(testFolder);
//     var index = Math.floor(Math.random() * videos.length);
//     console.log('createing offer no user found', index);
//     console.log('createing offer no user found', videos[index]);
//     io.to(client.id).emit("nouser", { url: videos[index] });
//     return ;
// }

