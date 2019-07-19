import React, { Component } from 'react';
import './App.css';
import socket from 'socket.io-client'

class App extends Component {
  constructor(props) {
    super(props)

    this.state = {
      hand: [],
      hide: false,
      currentCard: null,
      discard: null,
      draw: false,
      selected: {},
      start: true,
      loading: false,
      turn: false,
      end: false,
      result: null,
    }

    this.ss = async (params) => {
      return new Promise(r => {
        this.setState(params, r())
      })
    }
  }

  async componentDidMount() {
    const client = socket();

    client.on('ping', id => {
      this.clientId = id
    })

    client.on('go', id => {
      this.gameId = id
      client.emit('drawHand')
      this.ss({ loading: false })
    })

    client.on('card', currentCard => {
      this.ss({ currentCard })
    })

    client.on('hand', hand => {
      this.ss({ hand })
    })

    client.on('turn', () => {
      if (this.state.end) {
        this.client.emit('endGame')
      }
      else {
        this.ss({ turn: true })
      }
    })

    client.on('discard', discard => {
      this.ss({ discard })
    })

    client.on('hide', () => {
      this.ss({ hide: true })
    })

    client.on('emptyDiscard', () => {
      this.ss({ discard: null })
    })

    client.on('winner', points => {
      if (this.countPoints() > points) {
        this.ss({ result: 'LOSE' })
      }
      else {
        this.ss({ result: 'WIN' })
      }
    })

    this.client = client
  }

  start() {
    this.client.emit('ready')
    this.ss({ start: false, loading: true })
  }

  async draw() {
    this.ss({ draw: true })
    this.client.emit('drawCard')
  }

  countPoints() {
    return this.state.hand.reduce((count, c) => Number(c.split('/')[0]), 0)
  }

  async endTurn(discard) {
    await this.ss({
      draw: false,
      turn: false
    })

    this.client.emit('endTurn', {
      discard,
      points: this.countPoints(),
    })
  }

  async throw() {
    if (!this.state.turn) { return }
    this.endTurn(this.state.currentCard)
  }

  async onCardClick(card, index) {
    if (this.state.draw) {
      const hand = [...this.state.hand]
      hand[index] = this.state.currentCard

      this.ss({
        hand,
      })

      this.endTurn(card)
    }
    else {
      const selected = { ...this.state.selected }

      if (selected[index]) {
        delete selected[index]
      }
      else {
        selected[index] = card
      }

      this.ss({ selected })
    }
  }

  clickDiscard() {
    if (!this.state.discard) { return }

    if (this.state.turn && Object.values(this.state.selected).length === 0) {
      this.ss({
        draw: true,
        currentCard: this.state.discard,
      })

      this.client.emit('takeDiscard')
    }
    else {
      this.match()
    }
  }

  match() {
    let count = 0
    let hand = [...this.state.hand]
    const matchNumber = Number(this.state.discard.split('/')[0])

    Object.keys(this.state.selected).forEach(id => {
      const card = this.state.selected[id]
      const cardValue = Number(card.split('/')[0])

      count += cardValue
      hand = hand.filter(c => c !== card)
    })

    if (count === matchNumber) {
      this.ss({ hand, selected: {} })
    }
  }

  end() {
    this.ss({ end: true })
    this.endTurn()
  }

  renderDiscard() {
    if (this.state.draw) {
      return <button onClick={() => this.throw()}>THROW</button>
    }
    return <div className="card" onClick={() => this.clickDiscard()}>{this.state.discard}</div>
  }

  render = () => (
    <div className="App" >
      {this.state.start &&
        <button onClick={() => { this.start() }}>Start</button>
      }
      {this.state.loading &&
        <div>LOADING</div>
      }
      {this.state.turn &&
        <h1>Your Turn !</h1>
      }
      {this.state.result &&
        <h1>{this.state.result}</h1>
      }
      {!this.state.start && !this.state.loading &&
        <div className="game">
          <div className="game_actions">
            <button disabled={!this.state.turn} onClick={() => this.end()}>COBO</button>
            <button disabled={this.state.draw || !this.state.turn} onClick={() => this.draw()}>DRAW</button>
            {this.renderDiscard()}
          </div>
          <div className="player_game">
            {this.state.hand.map((c, i) =>
              <div className={`card ${i < 2 || this.state.hide ? 'hide' : ''} ${this.state.selected[i] ? 'selected' : ''}`} key={i} onClick={() => this.onCardClick(c, i)}><div>{c}</div></div>)}
          </div>
          {this.state.draw &&
            <div className="card drawnCard">{this.state.currentCard}</div>
          }
        </div>
      }
    </div >
  );
}

export default App;
