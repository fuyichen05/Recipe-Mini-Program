// pages/category/category.js —— 分类页：左侧分类列表 + 右侧对应菜品
const recipeService = require('../../utils/recipe')

Page({
  data: {
    categories: [], // [{ name, count }]
    activeIndex: 0,
    currentList: [], // 当前分类下的菜品
    loading: true
  },

  onShow() {
    this.loadAll()
  },

  onPullDownRefresh() {
    this.loadAll()
      .then(() => wx.stopPullDownRefresh())
      .catch(() => wx.stopPullDownRefresh())
  },

  async loadAll() {
    this.setData({ loading: true })
    try {
      const list = await recipeService.fetchAllRecipes()
      this.allList = list
      const categories = recipeService.CATEGORIES.map(function (name) {
        return { name: name, count: 0 }
      })
      list.forEach(function (r) {
        const i = recipeService.CATEGORIES.indexOf(r.category)
        if (i >= 0) categories[i].count++
      })
      this.setData({ categories: categories, loading: false })
      this.applyFilter()
    } catch (err) {
      this.setData({ loading: false })
      console.error('拉取菜品失败：', err)
      wx.showToast({ title: '加载失败，请下拉重试', icon: 'none' })
    }
  },

  applyFilter() {
    const name = recipeService.CATEGORIES[this.data.activeIndex]
    const currentList = this.allList.filter(function (r) {
      return r.category === name
    })
    this.setData({ currentList: currentList })
  },

  onSelectCategory(e) {
    const index = Number(e.currentTarget.dataset.index)
    if (index === this.data.activeIndex) return
    this.setData({ activeIndex: index })
    this.applyFilter()
  },

  onOpenCard(e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.detail.id })
  },

  // 收藏/取消收藏：先改本地再写库，失败回滚
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
    const i = this.allList.findIndex(function (r) { return r._id === id })
    if (i < 0) return
    const prev = this.allList[i]
    this.allList[i] = Object.assign({}, prev, { isFavorite: next })
    this.allList = recipeService.sortRecipes(this.allList)
    this.applyFilter()
    return prev
  }
})
