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

  openSeaSaltPaper() {
    playSound('click')
    wx.navigateTo({
      url: '/pages/home/home'
    })
  },

  showComingSoon() {
    playSound('fail')
    wx.showToast({
      title: '这个桌游位置先留着',
      icon: 'none'
    })
  }
})
