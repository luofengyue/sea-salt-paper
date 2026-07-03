Page({
  openSeaSaltPaper() {
    wx.navigateTo({
      url: '/pages/home/home'
    })
  },

  showComingSoon() {
    wx.showToast({
      title: '这个桌游位置先留着',
      icon: 'none'
    })
  }
})
