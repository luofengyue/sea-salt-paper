const { cards } = require('../../utils/cardData')
const { playSound } = require('../../utils/soundManager')

Page({
  data: {
    cards
  },

  goHome() {
    playSound('click')
    wx.reLaunch({
      url: '/pages/home/home'
    })
  }
})
