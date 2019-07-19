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
      turn: false
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
      client.emit('drawHand', id)
      this.ss({ loading: false })
    })

    client.on('card', currentCard => {
      this.ss({ currentCard })
    })

    client.on('hand', hand => {
      this.ss({ hand })
    })

    client.on('turn', () => {
      this.ss({ turn: true })
    })

    client.on('discard', discard => {
      this.ss({ discard })
    })

    client.on('hide', () => {
      this.ss({ hide: true })
    })

    this.client = client
  }

  start() {
    this.client.emit('ready')
    this.ss({ start: false, loading: true })
  }

  async draw() {
    if (!this.state.turn) { return }

    this.ss({ draw: true })
    this.client.emit('drawCard', this.gameId)
  }

  async throw() {
    if (!this.state.turn) { return }

    await this.ss({
      draw: false,
      turn: false
    })

    this.client.emit('endTurn', { gameId: this.gameId, discard: this.state.currentCard })
  }

  async onCardClick(card, index) {
    if (this.state.draw) {
      const hand = this.state.hand
      hand[index] = this.state.currentCard

      this.ss({
        draw: false,
        hand,
        turn: false,
      })

      this.client.emit('endTurn', { gameId: this.gameId, discard: card })
    }
    else {
      this.ss({ selected: this.state.selected.card === card ? {} : { index, card } })
    }
  }

  takeDiscard() {
    if (!this.state.turn || !this.state.discard) { return }

    this.ss({
      draw: true,
      currentCard: this.state.discard,
    })
  }

  renderDiscard() {
    if (this.state.draw) {
      return <button onClick={() => this.throw()}>THROW</button>
    }
    return <div className="card" onClick={() => this.takeDiscard()}>{this.state.discard}</div>
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
      {!this.state.start && !this.state.loading &&
        <div className="game">
          <div className="game_actions">
            <button disabled={this.state.draw} onClick={() => this.draw()}>DRAW</button>
            {this.renderDiscard()}
          </div>
          <div className="player_game">
            {this.state.hand.map((c, i) => <div className={`card ${this.state.hide ? 'hide' : ''} ${this.state.selected.card === c ? 'selected' : ''}`} key={i} onClick={() => this.onCardClick(c, i)}><div>{c}</div></div>)}
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
