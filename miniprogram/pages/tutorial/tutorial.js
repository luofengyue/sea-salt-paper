const { playSound } = require('../../utils/soundManager')

Page({
  goHome() {
    playSound('click')
    wx.reLaunch({
      url: '/pages/home/home'
    })
  }
})
