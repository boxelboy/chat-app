import path from "path"
import { fileURLToPath } from 'url'
import http from "http"
import express from 'express'
import { Server } from "socket.io"
import {Filter} from 'bad-words';

import {generateMessage} from './utils/messages.js';
import {addUser, removeUser, getUser, getUsersInRoom} from './utils/users.js'

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const publicDirectoryPath = path.join(__dirname, "../public");

app.use(express.static(publicDirectoryPath));

io.on('connection', (socket) => {
    console.log('new websocket io')

    socket.on('join', ({username, room}, callback) => {
        const {error, user} = addUser({id: socket.id, username, room})

        if (error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage(user.username,'Welcome!'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    socket.on('sendMessage', (data, callback) => {
        const user = getUser(socket.id)
        const filter = new Filter()

        if (filter.isProfane(data)) {
            return callback('no swearing young man!')
        }

        io.to(user.room).emit('sendMessage', generateMessage(user.username, data))
        callback()
    })

    socket.on('sendLocation', (data, callback) => {
        const user = getUser(socket.id)
        console.log(user)
        io.to(user.room).emit('locationMessage', generateMessage(user.username,`https://www.google.com/maps?q=${data.lat},${data.long}`))

        callback(true)
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }


    })
})



server.listen(port, () => {
    console.log(`Server running on port ${port}`);
})