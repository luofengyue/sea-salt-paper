const { cards } = require('../../utils/cardData')
const {
  createDeck,
  shuffleDeck,
  drawCards,
  getAllScoringCards,
  calculateCardScore,
  calculateCallColorBonus,
  findPlayablePair,
  getPairType
} = require('../../utils/gameUtils')

const TARGET_SCORE = 40
const CALL_SCORE = 7

Page({
  data: {
    gameState: null,
    phaseText: '',
    playerScorePreview: 0,
    aiScorePreview: 0,
    discardPileATop: null,
    discardPileBTop: null,
    discardPileATopName: '空',
    discardPileBTopName: '空',
    recentLogs: [],
    canDraw: false,
    canTakeDiscard: false,
    canTakeDiscardA: false,
    canTakeDiscardB: false,
    canChooseDiscardPile: false,
    canAct: false,
    canPlayPair: false,
    canCall: false,
    canChooseCrabPile: false,
    endTurnCountdown: 0,
    isEndTurnCountdownActive: false,
    crabSelectedPile: '',
    crabSelectedPileCards: []
  },

  endTurnTimer: null,
  endTurnCountdownTimer: null,

  onLoad(options) {
    if (options && options.reset === '1') {
      wx.removeStorageSync('totalScores')
    }
    this.initGame()
  },

  onUnload() {
    this.clearEndTurnCountdown()
  },

  initGame(openingLog = '') {
    const totalScores = wx.getStorageSync('totalScores') || { player: 0, ai: 0 }
    const deck = shuffleDeck(createDeck(cards))
    const discardPileA = [deck.shift()]
    const discardPileB = [deck.shift()]
    const phase = 'draw'
    const gameState = {
      deck,
      discardPileA,
      discardPileB,
      tempDrawCards: [],
      pendingDiscardCard: null,
      selectedHandIndexes: [],
      players: [
        {
          id: 'player',
          name: '你',
          hand: [],
          playedPairs: [],
          score: 0,
          callColorBonus: 0,
          totalScore: totalScores.player || 0
        },
        {
          id: 'ai',
          name: 'AI',
          hand: [],
          playedPairs: [],
          score: 0,
          callColorBonus: 0,
          totalScore: totalScores.ai || 0
        }
      ],
      currentPlayerIndex: 0,
      phase,
      isLastChanceFinalTurn: false,
      roundEndReason: '',
      scoringMode: '',
      crabSelectedPile: '',
      logs: openingLog ? [openingLog, '新一轮开始，翻开两个弃牌堆。'] : ['新一轮开始，翻开两个弃牌堆。']
    }

    this.updateScores(gameState)
    this.updateGameState(gameState)
  },

  getPhaseText(phase) {
    const phaseTextMap = {
      draw: '拿 1 张牌：从牌堆摸 2 选 1，或从弃牌堆拿顶牌。',
      choose: '请选择保留哪一张牌。',
      discard: '请选择把待弃牌放到弃牌堆 A 或 B。',
      action: '可打出组合，或在达到 7 分后立即停止 / 最后机会。',
      crabChoice: '螃蟹效果：从一个弃牌堆拿 1 张牌。',
      lastChanceAi: '你宣布最后机会，AI 正在进行最后一回合。',
      lastChancePlayer: 'AI 宣布最后机会，这是你的最后一回合。',
      ai: 'AI 正在行动。',
      settlement: '本轮已结束，进入结算。',
      gameover: '游戏结束。'
    }

    return phaseTextMap[phase] || '等待操作。'
  },

  updateScores(gameState) {
    gameState.players.forEach((player) => {
      player.score = calculateCardScore(player)
      player.callColorBonus = calculateCallColorBonus(player)
    })
  },

  updateGameState(gameState) {
    this.updateScores(gameState)
    const phase = gameState.phase
    const player = gameState.players[0]
    const ai = gameState.players[1]
    if (phase !== 'action') {
      this.clearPlayerSelection(gameState)
    }
    if (phase !== 'crabChoice') {
      gameState.crabSelectedPile = ''
    }
    const discardPileATop = gameState.discardPileA[gameState.discardPileA.length - 1] || null
    const discardPileBTop = gameState.discardPileB[gameState.discardPileB.length - 1] || null
    const selectedPairType = this.getSelectedPairType(gameState)
    const crabSelectedPile = phase === 'crabChoice' ? (gameState.crabSelectedPile || '') : ''
    const crabSelectedPileCards = crabSelectedPile === 'A'
      ? gameState.discardPileA
      : crabSelectedPile === 'B'
        ? gameState.discardPileB
        : []

    this.setData({
      gameState,
      phaseText: gameState.isLastChanceFinalTurn ? this.getPhaseText('lastChancePlayer') : this.getPhaseText(phase),
      playerScorePreview: player.score,
      aiScorePreview: ai.score,
      discardPileATop,
      discardPileBTop,
      discardPileATopName: discardPileATop ? discardPileATop.name : '空',
      discardPileBTopName: discardPileBTop ? discardPileBTop.name : '空',
      recentLogs: (gameState.logs || []).slice(0, 5),
      canDraw: phase === 'draw',
      canTakeDiscard: phase === 'draw',
      canTakeDiscardA: phase === 'draw' && !!gameState.discardPileA.length,
      canTakeDiscardB: phase === 'draw' && !!gameState.discardPileB.length,
      canChooseDiscardPile: phase === 'discard',
      canAct: phase === 'action',
      canPlayPair: phase === 'action' && !!selectedPairType,
      canCall: phase === 'action' && player.score >= CALL_SCORE && !gameState.isLastChanceFinalTurn,
      canChooseCrabPile: phase === 'crabChoice',
      crabSelectedPile,
      crabSelectedPileCards
    })

    if (phase === 'action') {
      this.startEndTurnCountdown()
    } else {
      this.clearEndTurnCountdown()
    }
  },

  startEndTurnCountdown(forceRestart = false) {
    if (this.endTurnTimer && !forceRestart) return

    this.clearEndTurnCountdown()
    let remaining = 4
    this.setData({
      endTurnCountdown: remaining,
      isEndTurnCountdownActive: true
    })

    this.endTurnCountdownTimer = setInterval(() => {
      remaining -= 1
      if (remaining > 0) {
        this.setData({ endTurnCountdown: remaining })
      }
    }, 1000)

    this.endTurnTimer = setTimeout(() => {
      this.clearEndTurnCountdown()
      const gameState = this.data.gameState
      if (gameState && gameState.phase === 'action') {
        this.endTurn({ auto: true })
      }
    }, 4000)
  },

  clearEndTurnCountdown() {
    if (this.endTurnTimer) {
      clearTimeout(this.endTurnTimer)
      this.endTurnTimer = null
    }
    if (this.endTurnCountdownTimer) {
      clearInterval(this.endTurnCountdownTimer)
      this.endTurnCountdownTimer = null
    }
    if (this.data.isEndTurnCountdownActive || this.data.endTurnCountdown) {
      this.setData({
        endTurnCountdown: 0,
        isEndTurnCountdownActive: false
      })
    }
  },

  getSelectedPairType(gameState) {
    if (!gameState || !gameState.players || !gameState.players[0]) return ''
    const selected = (gameState.selectedHandIndexes || []).slice().sort((a, b) => a - b)
    if (selected.length !== 2) return ''
    const hand = gameState.players[0].hand || []
    return getPairType(hand[selected[0]], hand[selected[1]])
  },

  clearPlayerSelection(gameState) {
    const player = gameState && gameState.players && gameState.players[0]
    if (!player) return
    gameState.selectedHandIndexes = []
    player.hand = (player.hand || []).map((card) => ({
      ...card,
      selected: false
    }))
  },

  addLog(gameState, text) {
    gameState.logs = [text].concat(gameState.logs || []).slice(0, 30)
  },

  showToast(title) {
    wx.showToast({
      title,
      icon: 'none'
    })
  },

  handleDeckTap() {
    const gameState = this.data.gameState
    if (!gameState || gameState.phase !== 'draw') return
    this.handleDrawCards()
  },

  handleDiscardPileTap(event) {
    const gameState = this.data.gameState
    if (!gameState) return

    if (gameState.phase === 'draw') {
      this.takeDiscardCard(event)
      return
    }

    if (gameState.phase === 'discard') {
      const pile = event.currentTarget.dataset.pile
      this.discardCardToPile(gameState, pile)
    }
  },

  handleDrawCards() {
    const gameState = this.data.gameState
    if (!this.ensurePhase('draw', '当前不能摸牌')) return
    if (gameState.deck.length < 2) {
      this.finishRound(gameState, 'deckEmpty', '牌堆不足 2 张，本轮结束。')
      return
    }

    const drawResult = drawCards(gameState.deck, 2)
    gameState.deck = drawResult.deck
    gameState.tempDrawCards = drawResult.drawnCards
    gameState.phase = 'choose'
    this.addLog(gameState, '你从牌堆摸了 2 张，请选择保留 1 张。')
    this.updateGameState(gameState)
  },

  chooseTempCard(event) {
    const gameState = this.data.gameState
    if (!this.ensurePhase('choose', '当前不能选择保留牌')) return

    const keepIndex = Number(event.currentTarget.dataset.index)
    const keepCard = gameState.tempDrawCards[keepIndex]
    const discardCard = gameState.tempDrawCards.find((card, index) => index !== keepIndex)
    if (!keepCard || !discardCard) {
      this.showToast('请选择一张临时牌')
      return
    }

    gameState.players[0].hand.push(keepCard)
    if (this.checkMermaidWin(gameState)) return
    gameState.pendingDiscardCard = discardCard
    gameState.tempDrawCards = []
    this.addLog(gameState, `你保留了 ${keepCard.name}。`)
    this.moveToDiscardChoice(gameState)
  },

  moveToDiscardChoice(gameState) {
    const emptyPile = this.getEmptyDiscardPile(gameState)
    if (emptyPile) {
      this.discardCardToPile(gameState, emptyPile)
      return
    }

    gameState.phase = 'discard'
    this.updateGameState(gameState)
  },

  discardPendingCard(event) {
    const gameState = this.data.gameState
    if (!this.ensurePhase('discard', '当前不能弃牌')) return
    const pile = event.currentTarget.dataset.pile
    this.discardCardToPile(gameState, pile)
  },

  discardCardToPile(gameState, pile) {
    if (!gameState.pendingDiscardCard) {
      this.showToast('没有待弃的牌')
      return
    }

    const card = gameState.pendingDiscardCard
    if (pile === 'A') {
      gameState.discardPileA.push(card)
    } else {
      gameState.discardPileB.push(card)
    }
    gameState.pendingDiscardCard = null
    gameState.phase = 'action'
    this.addLog(gameState, `你把 ${card.name} 弃到了弃牌堆 ${pile}。`)
    this.updateGameState(gameState)
  },

  takeDiscardCard(event) {
    const gameState = this.data.gameState
    if (!this.ensurePhase('draw', '当前不能从弃牌堆拿牌')) return

    const pile = event.currentTarget.dataset.pile
    const cardIndex = Number(event.currentTarget.dataset.index)
    const discardPile = pile === 'A' ? gameState.discardPileA : gameState.discardPileB
    if (!discardPile.length) {
      this.showToast('弃牌堆为空')
      return
    }

    const takeIndex = Number.isNaN(cardIndex) ? discardPile.length - 1 : cardIndex
    const card = discardPile.splice(takeIndex, 1)[0]
    gameState.players[0].hand.push(card)
    if (this.checkMermaidWin(gameState)) return
    gameState.phase = 'action'
    this.addLog(gameState, `你从弃牌堆 ${pile} 拿了 ${card.name}。`)
    this.updateGameState(gameState)
  },

  toggleHandCard(event) {
    const gameState = this.data.gameState
    if (!gameState || gameState.phase !== 'action') {
      this.showToast('当前不能选牌')
      return
    }

    const index = Number(event.currentTarget.dataset.index)
    const selected = gameState.selectedHandIndexes.slice()
    const currentIndex = selected.indexOf(index)

    if (currentIndex >= 0) {
      selected.splice(currentIndex, 1)
    } else if (selected.length < 2) {
      if (selected.length === 1) {
        const firstCard = gameState.players[0].hand[selected[0]]
        const secondCard = gameState.players[0].hand[index]
        if (!getPairType(firstCard, secondCard)) {
          this.showToast('这两张牌不能组成组合')
          return
        }
      }
      selected.push(index)
    } else {
      this.showToast('最多选择 2 张牌')
      return
    }

    gameState.selectedHandIndexes = selected
    gameState.players[0].hand = gameState.players[0].hand.map((card, cardIndex) => ({
      ...card,
      selected: selected.indexOf(cardIndex) >= 0
    }))
    this.updateGameState(gameState)
    this.startEndTurnCountdown(true)
  },

  playPair() {
    const gameState = this.data.gameState
    if (!this.ensurePhase('action', '当前不能打出组合')) return
    const selected = gameState.selectedHandIndexes.slice().sort((a, b) => a - b)
    if (selected.length !== 2) {
      this.showToast('请先选择 2 张手牌')
      return
    }

    const player = gameState.players[0]
    const firstCard = player.hand[selected[0]]
    const secondCard = player.hand[selected[1]]
    const pairType = getPairType(firstCard, secondCard)
    if (!pairType) {
      this.showToast('这两张牌不能组成组合')
      return
    }

    this.clearEndTurnCountdown()
    player.hand.splice(selected[1], 1)
    player.hand.splice(selected[0], 1)
    player.hand = player.hand.map((card) => ({
      ...card,
      selected: false
    }))
    player.playedPairs.push({
      type: pairType,
      name: this.getPairName(pairType),
      cards: [firstCard, secondCard],
      score: 1,
      effect: this.getPairEffectText(pairType)
    })
    gameState.selectedHandIndexes = []
    this.addLog(gameState, `你打出了 ${this.getPairName(pairType)}组合。`)
    this.applyPlayerPairEffect(gameState, pairType)
  },

  applyPlayerPairEffect(gameState, pairType) {
    const player = gameState.players[0]
    if (pairType === 'fish') {
      if (gameState.deck.length) {
        const drawResult = drawCards(gameState.deck, 1)
        gameState.deck = drawResult.deck
        player.hand.push(drawResult.drawnCards[0])
        if (this.checkMermaidWin(gameState)) return
        this.addLog(gameState, '鱼组合效果：你从牌堆摸了 1 张。')
      } else {
        this.addLog(gameState, '鱼组合效果无法触发：牌堆为空。')
      }
      gameState.phase = 'action'
      this.updateGameState(gameState)
      return
    }

    if (pairType === 'boat') {
      gameState.phase = 'draw'
      this.addLog(gameState, '船组合效果：你获得一个额外回合。')
      this.updateGameState(gameState)
      return
    }

    if (pairType === 'crab') {
      if (!gameState.discardPileA.length && !gameState.discardPileB.length) {
        this.addLog(gameState, '螃蟹组合效果无法触发：弃牌堆为空。')
        gameState.phase = 'action'
      } else {
        gameState.crabSelectedPile = ''
        gameState.phase = 'crabChoice'
      }
      this.updateGameState(gameState)
      return
    }

    if (pairType === 'sharkSwimmer') {
      const ai = gameState.players[1]
      if (ai.hand.length) {
        const stealIndex = Math.floor(Math.random() * ai.hand.length)
        const stolenCard = ai.hand.splice(stealIndex, 1)[0]
        player.hand.push(stolenCard)
        if (this.checkMermaidWin(gameState)) return
        this.addLog(gameState, '鲨鱼 + 游泳者效果：你随机偷取了 AI 1 张手牌。')
      } else {
        this.addLog(gameState, '鲨鱼 + 游泳者效果无法触发：AI 没有手牌。')
      }
      gameState.phase = 'action'
      this.updateGameState(gameState)
    }
  },

  selectCrabPile(event) {
    const gameState = this.data.gameState
    if (!this.ensurePhase('crabChoice', '当前不能选择螃蟹效果')) return

    const pile = event.currentTarget.dataset.pile
    const discardPile = pile === 'A' ? gameState.discardPileA : gameState.discardPileB
    if (!discardPile.length) {
      this.showToast('这个弃牌堆为空')
      return
    }

    gameState.crabSelectedPile = pile
    this.addLog(gameState, `螃蟹效果：你选择了弃牌堆 ${pile}。`)
    this.updateGameState(gameState)
  },

  resetCrabPileSelection() {
    const gameState = this.data.gameState
    if (!this.ensurePhase('crabChoice', '当前不能选择螃蟹效果')) return
    gameState.crabSelectedPile = ''
    this.updateGameState(gameState)
  },

  takeCrabEffectCard(event) {
    const gameState = this.data.gameState
    if (!this.ensurePhase('crabChoice', '当前不能选择螃蟹效果')) return

    const pile = gameState.crabSelectedPile
    if (!pile) {
      this.showToast('请先选择一个弃牌堆')
      return
    }
    const cardIndex = Number(event.currentTarget.dataset.index)
    const discardPile = pile === 'A' ? gameState.discardPileA : gameState.discardPileB
    if (!discardPile.length) {
      this.showToast('弃牌堆为空')
      return
    }

    if (Number.isNaN(cardIndex) || cardIndex < 0 || cardIndex >= discardPile.length) {
      this.showToast('这张牌不能选择')
      return
    }

    const card = discardPile.splice(cardIndex, 1)[0]
    gameState.players[0].hand.push(card)
    if (this.checkMermaidWin(gameState)) return
    gameState.phase = 'action'
    this.addLog(gameState, `螃蟹效果：你从弃牌堆 ${pile} 拿了 ${card.name}。`)
    this.updateGameState(gameState)
  },

  stopRound() {
    const gameState = this.data.gameState
    if (!this.canPlayerCall()) return
    this.clearEndTurnCountdown()
    gameState.roundEndReason = 'playerStop'
    this.finishRound(gameState, 'stop', '你选择立即停止，本轮进入正常结算。')
  },

  callLastChance() {
    const gameState = this.data.gameState
    if (!this.canPlayerCall()) return
    this.clearEndTurnCountdown()
    gameState.phase = 'lastChanceAi'
    gameState.roundEndReason = 'playerLastChance'
    this.addLog(gameState, '你宣布最后机会，AI 将进行最后一回合。')
    this.updateGameState(gameState)

    setTimeout(() => {
      this.runAiTurn(true)
    }, 500)
  },

  endTurn(options = {}) {
    const gameState = this.data.gameState
    if (!this.ensurePhase('action', '当前不能结束回合')) return
    this.clearEndTurnCountdown()
    if (gameState.isLastChanceFinalTurn) {
      gameState.isLastChanceFinalTurn = false
      this.finishRound(gameState, 'lastChance', '你完成最后一回合，进入最后机会结算。')
      return
    }
    gameState.currentPlayerIndex = 1
    gameState.phase = 'ai'
    this.clearPlayerSelection(gameState)
    this.addLog(gameState, options.auto ? '倒计时结束，自动结束回合，轮到 AI。' : '你结束了回合，轮到 AI。')
    this.updateGameState(gameState)

    setTimeout(() => {
      this.runAiTurn(false)
    }, 500)
  },

  runAiTurn(isLastChanceTurn) {
    const gameState = this.data.gameState
    if (!gameState || (gameState.phase !== 'ai' && gameState.phase !== 'lastChanceAi')) return
    if (this.aiTakeCard(gameState)) return
    if (this.tryAiPlayPair(gameState)) return

    if (isLastChanceTurn) {
      this.finishRound(gameState, 'lastChance', 'AI 完成最后一回合，进入最后机会结算。')
      return
    }

    if (gameState.deck.length < 2) {
      this.finishRound(gameState, 'deckEmpty', '牌堆不足 2 张，本轮结束。')
      return
    }

    const ai = gameState.players[1]
    if (ai.score >= CALL_SCORE && Math.random() < 0.25) {
      gameState.roundEndReason = 'aiStop'
      this.finishRound(gameState, 'stop', 'AI 选择立即停止，本轮进入正常结算。')
      return
    }

    if (ai.score >= CALL_SCORE && Math.random() < 0.2) {
      gameState.roundEndReason = 'aiLastChance'
      gameState.currentPlayerIndex = 0
      gameState.phase = 'draw'
      gameState.isLastChanceFinalTurn = true
      this.addLog(gameState, 'AI 宣布最后机会，这是你的最后一回合。')
      this.updateGameState(gameState)
      return
    }

    gameState.currentPlayerIndex = 0
    gameState.phase = 'draw'
    this.addLog(gameState, 'AI 行动结束，轮到你。')
    this.updateGameState(gameState)
  },

  aiTakeCard(gameState) {
    const ai = gameState.players[1]
    const canTakeDiscard = gameState.discardPileA.length || gameState.discardPileB.length
    const shouldTakeDiscard = canTakeDiscard && Math.random() < 0.45

    if (shouldTakeDiscard) {
      const availablePiles = []
      if (gameState.discardPileA.length) availablePiles.push('A')
      if (gameState.discardPileB.length) availablePiles.push('B')
      const pile = availablePiles[Math.floor(Math.random() * availablePiles.length)]
      const card = pile === 'A' ? gameState.discardPileA.pop() : gameState.discardPileB.pop()
      ai.hand.push(card)
      if (this.checkMermaidWin(gameState)) return true
      this.addLog(gameState, `AI 从弃牌堆 ${pile} 拿了一张牌。`)
      this.updateScores(gameState)
      return false
    }

    if (gameState.deck.length >= 2) {
      const drawResult = drawCards(gameState.deck, 2)
      const keepIndex = Math.floor(Math.random() * drawResult.drawnCards.length)
      const keepCard = drawResult.drawnCards[keepIndex]
      const discardCard = drawResult.drawnCards.find((card, index) => index !== keepIndex)
      gameState.deck = drawResult.deck
      ai.hand.push(keepCard)
      if (this.checkMermaidWin(gameState)) return true
      gameState.pendingDiscardCard = discardCard
      const emptyPile = this.getEmptyDiscardPile(gameState)
      const pile = emptyPile || (Math.random() < 0.5 ? 'A' : 'B')
      if (pile === 'A') {
        gameState.discardPileA.push(discardCard)
      } else {
        gameState.discardPileB.push(discardCard)
      }
      gameState.pendingDiscardCard = null
      this.addLog(gameState, `AI 从牌堆摸牌，并弃到弃牌堆 ${pile}。`)
      this.updateScores(gameState)
    } else {
      this.addLog(gameState, 'AI 无法摸牌，跳过了行动。')
    }

    return false
  },

  tryAiPlayPair(gameState) {
    const ai = gameState.players[1]
    const pairIndexes = findPlayablePair(ai.hand)
    if (!pairIndexes || Math.random() >= 0.6) return false

    const selected = pairIndexes.slice().sort((a, b) => a - b)
    const firstCard = ai.hand[selected[0]]
    const secondCard = ai.hand[selected[1]]
    const pairType = getPairType(firstCard, secondCard)
    ai.hand.splice(selected[1], 1)
    ai.hand.splice(selected[0], 1)
    ai.playedPairs.push({
      type: pairType,
      name: this.getPairName(pairType),
      cards: [firstCard, secondCard],
      score: 1,
      effect: this.getPairEffectText(pairType)
    })
    this.addLog(gameState, `AI 打出了 ${this.getPairName(pairType)}组合。`)
    if (this.applyAiPairEffect(gameState, pairType)) return true
    this.updateScores(gameState)
    return false
  },

  applyAiPairEffect(gameState, pairType) {
    const ai = gameState.players[1]
    if (pairType === 'fish' && gameState.deck.length) {
      const drawResult = drawCards(gameState.deck, 1)
      gameState.deck = drawResult.deck
      ai.hand.push(drawResult.drawnCards[0])
      if (this.checkMermaidWin(gameState)) return true
      this.addLog(gameState, 'AI 触发鱼组合，摸了 1 张牌。')
    }

    if (pairType === 'boat') {
      if (this.aiTakeCard(gameState)) return true
      this.addLog(gameState, 'AI 触发船组合，额外行动了一次。')
    }

    if (pairType === 'crab') {
      const availablePiles = []
      if (gameState.discardPileA.length) availablePiles.push('A')
      if (gameState.discardPileB.length) availablePiles.push('B')
      if (availablePiles.length) {
        const pile = availablePiles[Math.floor(Math.random() * availablePiles.length)]
        const card = pile === 'A' ? gameState.discardPileA.pop() : gameState.discardPileB.pop()
        ai.hand.push(card)
        if (this.checkMermaidWin(gameState)) return true
        this.addLog(gameState, `AI 触发螃蟹组合，从弃牌堆 ${pile} 拿牌。`)
      }
    }

    if (pairType === 'sharkSwimmer') {
      const player = gameState.players[0]
      if (player.hand.length) {
        const stealIndex = Math.floor(Math.random() * player.hand.length)
        const stolenCard = player.hand.splice(stealIndex, 1)[0]
        ai.hand.push(stolenCard)
        if (this.checkMermaidWin(gameState)) return true
        this.addLog(gameState, 'AI 触发鲨鱼 + 游泳者组合，偷走你 1 张手牌。')
      }
    }

    return false
  },

  finishRound(gameState, scoringMode, logText) {
    this.clearEndTurnCountdown()
    this.updateScores(gameState)
    const player = gameState.players[0]
    const ai = gameState.players[1]
    const playerBaseScore = player.score
    const aiBaseScore = ai.score
    player.callColorBonus = calculateCallColorBonus(player)
    ai.callColorBonus = calculateCallColorBonus(ai)
    gameState.scoringMode = scoringMode

    if (scoringMode === 'lastChance') {
      const caller = gameState.roundEndReason === 'aiLastChance' ? ai : player
      const opponent = gameState.roundEndReason === 'aiLastChance' ? player : ai
      if (caller.score > opponent.score) {
        caller.score = caller.score + caller.callColorBonus
        opponent.score = opponent.callColorBonus
      } else {
        caller.score = caller.callColorBonus
        opponent.score = opponent.score + opponent.callColorBonus
      }
    } else if (scoringMode === 'deckEmpty') {
      player.score = 0
      ai.score = 0
    }

    player.totalScore += player.score
    ai.totalScore += ai.score
    gameState.baseScores = {
      player: playerBaseScore,
      ai: aiBaseScore
    }
    gameState.phase = player.totalScore >= TARGET_SCORE || ai.totalScore >= TARGET_SCORE ? 'gameover' : 'settlement'
    this.addLog(gameState, logText)

    const totalScores = {
      player: player.totalScore,
      ai: ai.totalScore
    }
    wx.setStorageSync('totalScores', totalScores)

    if (gameState.phase === 'gameover') {
      wx.setStorageSync('lastGameState', gameState)
      wx.navigateTo({
        url: '/pages/result/result'
      })
      return
    }

    wx.removeStorageSync('lastGameState')
    this.updateGameState(gameState)
    wx.showToast({
      title: `本轮 ${player.score}:${ai.score}，总分 ${player.totalScore}:${ai.totalScore}`,
      icon: 'none',
      duration: 1200
    })

    setTimeout(() => {
      this.initGame(`上一轮结束：你 ${player.score} 分，AI ${ai.score} 分。总分 ${totalScores.player}:${totalScores.ai}。`)
    }, 1200)
  },

  checkMermaidWin(gameState) {
    const winnerIndex = gameState.players.findIndex((player) => {
      return getAllScoringCards(player).filter((card) => card.id === 'mermaid').length >= 4
    })

    if (winnerIndex < 0) return false

    const winner = gameState.players[winnerIndex]
    winner.totalScore = Math.max(winner.totalScore, TARGET_SCORE)
    gameState.roundEndReason = winnerIndex === 0 ? 'playerMermaid' : 'aiMermaid'
    gameState.scoringMode = 'mermaidWin'
    gameState.phase = 'gameover'
    this.addLog(gameState, `${winner.name} 集齐 4 张美人鱼，立即获胜。`)
    wx.setStorageSync('totalScores', {
      player: gameState.players[0].totalScore,
      ai: gameState.players[1].totalScore
    })
    wx.setStorageSync('lastGameState', gameState)
    wx.navigateTo({
      url: '/pages/result/result'
    })
    return true
  },

  canPlayerCall() {
    if (!this.ensurePhase('action', '当前不能喊停')) return false
    if (this.data.gameState.players[0].score < CALL_SCORE) {
      this.showToast('至少 7 分才能喊停')
      return false
    }
    return true
  },

  ensurePhase(expectedPhase, message) {
    if (!this.data.gameState || this.data.gameState.phase !== expectedPhase) {
      this.showToast(message)
      return false
    }

    return true
  },

  getEmptyDiscardPile(gameState) {
    if (!gameState.discardPileA.length) return 'A'
    if (!gameState.discardPileB.length) return 'B'
    return ''
  },

  getPairName(pairType) {
    const pairNames = {
      crab: '螃蟹',
      boat: '船',
      fish: '鱼',
      sharkSwimmer: '鲨鱼 + 游泳者'
    }
    return pairNames[pairType] || '组合'
  },

  getPairEffectText(pairType) {
    const effectTexts = {
      crab: '从弃牌堆拿 1 张牌',
      boat: '立刻再进行一个回合',
      fish: '从牌堆摸 1 张牌',
      sharkSwimmer: '随机偷取对手 1 张手牌'
    }
    return effectTexts[pairType] || ''
  }
})
