const handler = (req, res) => {
  const url = req.url.split('?')[0]
  const params = req.url.split('?')[1]

  res.setHeader('Content-Type', 'application/json');

  switch (url) {
    default:
      return res.end(JSON.stringify({}));
  }
}

// const app = express();
// const io = require('socket.io')(app);
// const bodyParser = require('body-parser');

// app.use(bodyParser.json()); // support json encoded bodies
// app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

// // Put all API endpoints under '/api'
// app.use('/api/*', handler);

// // Serve static files from the React frontend app
// app.use(express.static(path.join(__dirname, 'build')))



const express = require('express');
const path = require('path');

const server = express()
  .use(express.static(path.join(__dirname, 'build')))
  .get('*', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendFile(path.join(__dirname + '/build/index.html'))
  })
  .listen(process.env.PORT || 3000, () => console.log(`Listening on ${process.env.PORT || 3000}`))

const io = require('socket.io')(server);

const nbCard = 13
const nbSign = ['A', 'B', 'C', 'D']

const rand = (max, min) => {
  return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

const ready = {}
const games = {}

const deal = () => {
  const game = []

  for (let i = 1; i <= nbCard; i++) {
    for (let s of nbSign) {
      game.push(i + '/' + s)
    }
  }

  return game
}

const draw = (client) => {
  const gameId = client.gameId
  const game = games[gameId].game
  const card = game[rand(game.length)]

  games[gameId].game = game.filter(c => c !== card)

  return card
}

io.on('connection', client => {

  client.emit('ping', client.id)

  client.on('ready', () => {
    if (Object.values(ready).length > 0) {
      const p2 = Object.values(ready)[0]
      delete ready[p2.id]

      const p1 = client
      const gameId = Date.now() + rand(1000)

      p1.gameId = gameId
      p2.gameId = gameId

      games[gameId] = {
        players: [
          0,
          p1,
          p2,
        ],
        game: deal(),
        turn: 1,
        discard: null,
      }

      games[gameId].players.forEach(p => p && p.emit('go', gameId))

      setTimeout(() => {
        games[gameId].players.forEach(p => p && p.emit('hide'))
        games[gameId].players[1].emit('turn')
      }, 1000 * 5);
    }
    else {
      ready[client.id] = client
    }
  })

  client.on('drawHand', () => {
    const hand = []
    for (let i = 0; i < 4; i++) { hand.push(draw(client)) }
    client.emit('hand', hand)
  })

  client.on('drawCard', () => {
    client.emit('card', draw(client))
  })

  client.on('takeDiscard', () => {
    const gameId = client.gameId
    games[gameId].players.forEach(p => p && p.emit('emptyDiscard'))
  })

  client.on('endTurn', ({ discard, points }) => {
    const gameId = client.gameId
    const game = games[gameId]
    let turn = game.turn

    game.players[turn].points = points

    if (++turn > 2) {
      turn = 1
    }

    game.turn = turn
    game.players[turn].emit('turn')

    if (discard) {
      game.players.forEach(p => p && p.emit('discard', discard))
    }
    else {
      game.players.forEach(p => p && p.emit('cobo'))
    }
  })

  client.on('endGame', () => {
    let winner = 0
    let minPoints = null

    const gameId = client.gameId
    const players = games[gameId].players

    players.forEach((p, i) => {
      winner = !minPoints || p.points < minPoints ? i : winner
    })

    players.forEach(p => p && p.emit('winner', players[winner].points))
  })

  client.on('disconnect', () => {
    delete ready[client.id]
  })
})