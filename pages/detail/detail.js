// pages/detail/detail.js —— 菜品详情
const recipeService = require('../../utils/recipe')

Page({
  data: {
    recipe: null,
    loading: true,
    createdAtText: ''
  },

  onLoad(options) {
    this.recipeId = options.id
  },

  onShow() {
    // 每次展示都重新拉取，保证看到最新内容
    this.loadDetail()
  },

  async loadDetail() {
    if (!this.recipeId) {
      wx.showToast({ title: '缺少菜品 ID', icon: 'none' })
      setTimeout(() => this.leavePage(), 800)
      return
    }
    this.setData({ loading: true })
    try {
      const recipe = await recipeService.getRecipeById(this.recipeId)
      this.setData({
        recipe: recipe,
        loading: false,
        createdAtText: this.formatDate(recipe.createdAt)
      })
    } catch (err) {
      // 可能已被家人删除
      this.setData({ loading: false, recipe: null })
      console.error('加载详情失败：', err)
      wx.showToast({ title: '菜品不存在或已被删除', icon: 'none' })
      setTimeout(() => this.leavePage(), 900)
    }
  },

  formatDate(value) {
    if (!value) return ''
    const d = new Date(value)
    if (isNaN(d.getTime())) return ''
    const p = function (n) { return n < 10 ? '0' + n : '' + n }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
  },

  leavePage() {
    wx.navigateBack({
      fail: function () {
        wx.switchTab({ url: '/pages/all/all' })
      }
    })
  },

  previewCover() {
    const recipe = this.data.recipe
    if (recipe && recipe.coverImageFileID) {
      wx.previewImage({ urls: [recipe.coverImageFileID] })
    }
  },

  // 收藏/取消收藏：先改本地再写库，失败回滚
  async onToggleFav() {
    const recipe = this.data.recipe
    if (!recipe) return
    const next = !recipe.isFavorite
    this.setData({ 'recipe.isFavorite': next })
    try {
      await recipeService.toggleFavorite(recipe._id, next)
    } catch (err) {
      console.error('收藏状态更新失败：', err)
      this.setData({ 'recipe.isFavorite': !next })
      wx.showToast({ title: '操作失败，请重试', icon: 'none' })
    }
  },

  onEdit() {
    // 编辑页是 tabBar 页，无法 URL 传参，通过 globalData 传递
    getApp().globalData.editingRecipe = this.data.recipe
    wx.switchTab({ url: '/pages/add/add' })
  },

  onDelete() {
    const recipe = this.data.recipe
    if (!recipe) return
    wx.showModal({
      title: '删除菜品',
      content: '确定删除「' + recipe.name + '」吗？删除后不可恢复。',
      confirmText: '删除',
      confirmColor: '#EE5A24',
      success: (res) => {
        if (res.confirm) this.doDelete()
      }
    })
  },

  async doDelete() {
    const recipe = this.data.recipe
    wx.showLoading({ title: '删除中…', mask: true })
    try {
      // 同时删除数据库记录和云存储封面图
      await recipeService.deleteRecipe(recipe._id, recipe.coverImageFileID)
      wx.hideLoading()
      wx.showToast({ title: '已删除', icon: 'success' })
      setTimeout(() => this.leavePage(), 600)
    } catch (err) {
      wx.hideLoading()
      console.error('删除失败：', err)
      wx.showToast({ title: '删除失败，请重试', icon: 'none' })
    }
  },

  onShareAppMessage() {
    const recipe = this.data.recipe
    if (!recipe) {
      return { title: '家庭菜谱', path: '/pages/all/all' }
    }
    return {
      title: '家的味道：「' + recipe.name + '」',
      path: '/pages/detail/detail?id=' + recipe._id
    }
  }
})
