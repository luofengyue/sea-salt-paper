const TARGET_SCORE = 40

Page({
  data: {
    result: null
  },

  onLoad() {
    this.loadResult()
  },

  loadResult() {
    const gameState = wx.getStorageSync('lastGameState')
    if (!gameState || !gameState.players) {
      this.setData({
        result: null
      })
      return
    }

    if (gameState.phase !== 'gameover') {
      wx.removeStorageSync('lastGameState')
      this.setData({
        result: null
      })
      return
    }

    const player = gameState.players[0]
    const ai = gameState.players[1]
    const playerWin = player.totalScore >= TARGET_SCORE && player.totalScore >= ai.totalScore
    const aiWin = ai.totalScore >= TARGET_SCORE && ai.totalScore > player.totalScore
    const isGameOver = playerWin || aiWin
    const modeTextMap = {
      stop: '立即停止正常结算',
      lastChance: '最后机会结算',
      deckEmpty: '牌堆耗尽，本轮不计分',
      mermaidWin: '4 张美人鱼立即获胜'
    }

    this.setData({
      result: {
        player,
        ai,
        baseScores: gameState.baseScores || { player: player.score, ai: ai.score },
        targetScore: TARGET_SCORE,
        isGameOver,
        winnerText: playerWin ? '你获得胜利' : aiWin ? 'AI 获得胜利' : '游戏结束',
        roundEndReasonText: this.getRoundEndReasonText(gameState.roundEndReason),
        scoringModeText: modeTextMap[gameState.scoringMode] || '正常结算'
      }
    })
  },

  getRoundEndReasonText(roundEndReason) {
    const reasonTextMap = {
      playerStop: '你立即停止',
      aiStop: 'AI 立即停止',
      playerLastChance: '你最后机会',
      aiLastChance: 'AI 最后机会',
      playerMermaid: '你集齐美人鱼',
      aiMermaid: 'AI 集齐美人鱼'
    }

    return reasonTextMap[roundEndReason] || '本轮结束'
  },

  restartGame() {
    wx.removeStorageSync('totalScores')
    wx.removeStorageSync('lastGameState')
    wx.redirectTo({
      url: '/pages/game/game?reset=1'
    })
  },

  goHome() {
    wx.removeStorageSync('lastGameState')
    wx.reLaunch({
      url: '/pages/home/home'
    })
  }
})
