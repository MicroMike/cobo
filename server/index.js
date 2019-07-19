const handler = (req, res) => {
  const url = req.url.split('?')[0]
  const params = req.url.split('?')[1]

  res.setHeader('Content-Type', 'application/json');

  switch (url) {
    default:
      return res.end(JSON.stringify({}));
  }
}
const app = require('http').createServer(handler)
const io = require('socket.io')(app);

const nbCard = 13
const nbSign = ['A', 'B', 'C', 'D']

const rand = (max, min) => {
  return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

const ready = {}
const games = {}
const players = {}

const deal = () => {
  const game = []

  for (let i = 1; i <= nbCard; i++) {
    for (let s of nbSign) {
      game.push(i + '/' + s)
    }
  }

  return game
}

const draw = (gameId) => {
  const game = games[gameId].game
  const card = game[rand(game.length)]

  games[gameId].game = game.filter(c => c !== card)

  return card
}

io.on('connection', client => {
  console.log('connected')
  client.emit('ping', client.id)
  client.on('ready', () => {
    if (Object.values(ready).length > 0) {
      const p1 = client
      const p2 = Object.values(ready)[0]
      delete ready[p2.id]
      const gameId = p1.id

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

      p1.emit('turn')
    }
    else {
      ready[client.id] = client
    }
  })

  client.on('drawHand', gameId => {
    const hand = []
    for (let i = 0; i < 4; i++) { hand.push(draw(gameId)) }
    client.emit('hand', hand)
  })

  client.on('drawCard', gameId => {
    client.emit('card', draw(gameId))
    console.log(games[gameId].game.length)
  })

  client.on('endTurn', ({ gameId, discard }) => {
    let turn = games[gameId].turn + 1
    if (turn > 2) {
      turn = 1
    }
    const game = games[gameId]
    game.turn = turn
    game.players[turn].emit('turn')
    games[gameId].players.forEach(p => p && p.emit('discard', discard))
  })

  client.on('disconnect', () => {
    delete ready[client.id]
  })
})

app.listen(5000);
