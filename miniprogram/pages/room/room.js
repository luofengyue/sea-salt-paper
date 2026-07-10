const { playSound } = require('../../utils/soundManager')

Page({
  data: {
    roomNumber: '8392',
    players: [
      { seat: '玩家1', name: '你', status: '已准备', active: true },
      { seat: '玩家2', name: '等待中', status: '', active: false },
      { seat: '玩家3', name: '空位', status: '', active: false },
      { seat: '玩家4', name: '空位', status: '', active: false }
    ]
  },

  showInviteTip() {
    playSound('click')
    wx.showToast({
      title: '邀请功能后续开发',
      icon: 'none'
    })
  },

  startGame() {
    playSound('click')
    wx.navigateTo({
      url: '/pages/game/game'
    })
  },

  goHome() {
    playSound('click')
    wx.reLaunch({
      url: '/pages/home/home'
    })
  }
})
