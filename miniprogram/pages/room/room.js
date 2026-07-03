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
    wx.showToast({
      title: '邀请功能后续开发',
      icon: 'none'
    })
  },

  startGame() {
    wx.navigateTo({
      url: '/pages/game/game'
    })
  },

  goHome() {
    wx.reLaunch({
      url: '/pages/home/home'
    })
  }
})
