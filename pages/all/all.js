// pages/all/all.js —— 全部菜品列表
const recipeService = require('../../utils/recipe')

Page({
  data: {
    list: [],
    loading: true
  },

  onShow() {
    // 每次进入页面都拉取最新数据，家人增删改后切回本页即可看到
    this.loadList()
  },

  onPullDownRefresh() {
    this.loadList()
      .then(() => wx.stopPullDownRefresh())
      .catch(() => wx.stopPullDownRefresh())
  },

  async loadList() {
    this.setData({ loading: true })
    try {
      const list = await recipeService.fetchAllRecipes()
      this.setData({ list: list, loading: false })
    } catch (err) {
      this.setData({ loading: false })
      console.error('拉取菜品列表失败：', err)
      wx.showToast({ title: '加载失败，请下拉重试', icon: 'none' })
    }
  },

  onOpenCard(e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.detail.id })
  },

  // 收藏/取消收藏：先改本地（星标立即变化、卡片实时归位排序），再写库；失败回滚
  async onToggleFav(e) {
    const { id, next } = e.detail
    this.applyFavLocal(id, next)
    try {
      await recipeService.toggleFavorite(id, next)
    } catch (err) {
      console.error('收藏状态更新失败：', err)
      this.applyFavLocal(id, !next)
      wx.showToast({ title: '操作失败，请重试', icon: 'none' })
    }
  },

  applyFavLocal(id, next) {
    const list = this.data.list.slice()
    const i = list.findIndex(function (r) { return r._id === id })
    if (i < 0) return
    list[i] = Object.assign({}, list[i], { isFavorite: next })
    this.setData({ list: recipeService.sortRecipes(list) })
  }
})
