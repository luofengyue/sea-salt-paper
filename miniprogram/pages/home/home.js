const { isSoundEnabled, setSoundEnabled, playSound } = require('../../utils/soundManager')

Page({
  data: {
    soundEnabled: true
  },

  onShow() {
    this.setData({
      soundEnabled: isSoundEnabled()
    })
  },

  toggleSound(event) {
    const enabled = event.detail.value
    setSoundEnabled(enabled)
    this.setData({ soundEnabled: enabled })
    if (enabled) playSound('click')
  },

  goToLobby() {
    playSound('click')
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
    playSound('click')
    wx.navigateTo({
      url: '/pages/game/game'
    })
  },

  goToRoom() {
    playSound('click')
    wx.navigateTo({
      url: '/pages/room/room'
    })
  },

  showJoinRoomTip() {
    playSound('fail')
    wx.showToast({
      title: '加入房间功能后续开发',
      icon: 'none'
    })
  },

  goToTutorial() {
    playSound('click')
    wx.navigateTo({
      url: '/pages/tutorial/tutorial'
    })
  },

  goToCards() {
    playSound('click')
    wx.navigateTo({
      url: '/pages/cards/cards'
    })
  }
})
