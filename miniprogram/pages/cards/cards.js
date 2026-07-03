const { cards } = require('../../utils/cardData')

Page({
  data: {
    cards
  },

  goHome() {
    wx.reLaunch({
      url: '/pages/home/home'
    })
  }
})
