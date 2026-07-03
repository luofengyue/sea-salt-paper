Page({
  goToLobby() {
    wx.navigateBack({
      delta: 1,
      fail() {
        wx.reLaunch({
          url: '/pages/lobby/lobby'
        })
      }
    })
  },

  goToGame() {
    wx.navigateTo({
      url: '/pages/game/game'
    })
  },

  goToRoom() {
    wx.navigateTo({
      url: '/pages/room/room'
    })
  },

  showJoinRoomTip() {
    wx.showToast({
      title: '加入房间功能后续开发',
      icon: 'none'
    })
  },

  goToTutorial() {
    wx.navigateTo({
      url: '/pages/tutorial/tutorial'
    })
  },

  goToCards() {
    wx.navigateTo({
      url: '/pages/cards/cards'
    })
  }
})
