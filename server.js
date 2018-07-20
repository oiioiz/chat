var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get("/", function(req, res){
    res.sendfile('client.html');
});

app.get("/roomList", function(req, res){
    res.json(getRoomList());
});

var rooms = [];
var count = 1;

io.on('connection', function(socket){
    console.log('user connected: ', socket.id);

    var name = "user" + count++;

    io.to(socket.id).emit('change name', name);

    socket.on('disconnect', function(){
        console.log('user disconnected: ', socket.id);

        for(var i=0; i<rooms.length; i++){
            for(var j=0; j<rooms[i].members.length; j++){
                if(rooms[i].members[j] == socket.id){
                    rooms[i].members.splice(j, 1);
                    if(!rooms[i].members.length){
                        rooms.splice(i, 1);
                    }

                    break;
                }
            }
        }

        io.emit('roomList', getRoomList());
    });

    socket.on('send message', function(roomNo, name, text){
        var msg = name + ' : ' + text;

        io.to(roomNo).emit('receive message', msg);
    });

    socket.on('makeRoom', function(){
        var conflictRoomNo = true;

        var roomNo = '';
        var totalRoomCnt = 1000;

        if(rooms.length >= totalRoomCnt){
            io.to(socket.id).emit('sysMsg', "개설 가능한 방 갯수를 초과하였습니다.");
        }else{
            while(conflictRoomNo){
                roomNo = Math.floor((Math.random() * totalRoomCnt));
                var cnt = 0;
    
                for(var i=0; i<rooms.length; i++){
                    if(Number(rooms[i]._id) === roomNo){
                        cnt++;
                    }
                }
                console.log(roomNo + " : " + rooms.length);
                if(cnt === 0){
                    conflictRoomNo = false;
                }
            }
    
            socket.join(roomNo);
    
            rooms.push({"_id": roomNo, "members": [socket.id]});
    
            console.log(rooms);
    
            io.to(socket.id).emit('makeRoom', roomNo);
            io.emit('roomList', getRoomList());
        }
    });

    socket.on('leaveRoom', function(roomNo){
        socket.leave(roomNo);

        for(var i=0; i<rooms.length; i++){
            if(rooms[i]._id == roomNo){
                rooms[i].members.splice(rooms[i].members.indexOf(socket.id), 1);
                if(!rooms[i].members.length){
                    rooms.splice(i, 1);
                }
                io.to(socket.id).emit('leaveRoom', {"success":true, "message":"leave room", "roomNo":roomNo});
                io.emit('roomList', getRoomList());
                break;
            }
        }
    });

    socket.on('joinRoom', function(roomNo){
        var cnt = 0;

        for(var i=0; i<rooms.length; i++){
            if(rooms[i]._id == roomNo){
                cnt++;

                if(rooms[i].members.length < 2){

                    socket.join(roomNo);
                    rooms[i].members.push(socket.id);
                    
                    console.log(rooms);

                    io.to(socket.id).emit('joinRoom', {success:true, message:roomNo + " 번 방에 입장하셨습니다.", roomNo:roomNo});
                    socket.broadcast.to(roomNo).emit('sysMsg', socket.id + '님이 입장 하셨습니다.');
                    break;
                }else{
                    io.to(socket.id).emit('joinRoom', {success:false, message:roomNo + " 번 방이 가득 찼습니다.", roomNo:roomNo});

                    break;
                }
            }
        }

        if(cnt === 0) io.to(socket.id).emit('joinRoom', {"success":false, "message":roomNo + " 번 방을 찾을 수 없습니다.", "roomNo":roomNo});
    });
});

function getRoomList(){
    var roomList = [];

    rooms.forEach(function(v){
        roomList.push({"roomNo": v._id});
    });

    return roomList;
};

http.listen('3000', function(){
    console.log("Sever on!");
});