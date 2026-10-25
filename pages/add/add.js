// pages/add/add.js —— 添加 / 编辑菜品（同一页面复用）
// 编辑模式说明：本页是 tabBar 页面，无法通过 URL 传参，
// 详情页点「编辑」时把待编辑数据放到 globalData.editingRecipe，
// 本页 onShow 时读取并进入编辑模式。
const recipeService = require('../../utils/recipe')
const imageUtil = require('../../utils/image')

Page({
  data: {
    categories: recipeService.CATEGORIES,
    isEdit: false,
    editingId: '',
    name: '',
    categoryIndex: -1, // -1 表示还没选择分类
    coverTempPath: '', // 新选的本地图片（待上传）
    coverFileID: '', // 已在云存储的封面（编辑模式原有封面）
    coverUrl: '', // 原封面的临时链接（仅编辑模式预览用）
    recipeContent: '',
    note: '',
    isFavorite: false,
    submitting: false
  },

  onShow() {
    const app = getApp()
    const editing = app.globalData.editingRecipe
    if (editing) {
      app.globalData.editingRecipe = null
      this._oldCoverFileID = editing.coverImageFileID
      this.setData({
        isEdit: true,
        editingId: editing._id,
        name: editing.name,
        categoryIndex: Math.max(0, this.data.categories.indexOf(editing.category)),
        coverTempPath: '',
        coverFileID: editing.coverImageFileID,
        coverUrl: editing.coverUrl || '',
        recipeContent: editing.recipeContent,
        note: editing.note || '',
        isFavorite: !!editing.isFavorite
      })
      wx.setNavigationBarTitle({ title: '编辑菜品' })
    }
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value })
  },

  onCategoryChange(e) {
    this.setData({ categoryIndex: Number(e.detail.value) })
  },

  onContentInput(e) {
    this.setData({ recipeContent: e.detail.value })
  },

  onNoteInput(e) {
    this.setData({ note: e.detail.value })
  },

  onFavChange(e) {
    this.setData({ isFavorite: e.detail.value })
  },

  async chooseCover() {
    try {
      const path = await imageUtil.chooseImage()
      this.setData({ coverTempPath: path })
    } catch (err) {
      if (err && err.canceled) return
      console.error('选择图片失败：', err)
      wx.showToast({ title: '选择图片失败，请重试', icon: 'none' })
    }
  },

  previewCover() {
    const src =
      this.data.coverTempPath || this.data.coverUrl || this.data.coverFileID
    if (src) wx.previewImage({ urls: [src] })
  },

  // 退出编辑模式，恢复为空白添加表单
  cancelEdit() {
    this.resetForm()
    wx.setNavigationBarTitle({ title: '添加菜品' })
  },

  resetForm() {
    this._oldCoverFileID = ''
    this.setData({
      isEdit: false,
      editingId: '',
      name: '',
      categoryIndex: -1,
      coverTempPath: '',
      coverFileID: '',
      coverUrl: '',
      recipeContent: '',
      note: '',
      isFavorite: false,
      submitting: false
    })
  },

  async onSave() {
    if (this.data.submitting) return // 防止重复点击

    const name = this.data.name.trim()
    const category =
      this.data.categoryIndex >= 0
        ? this.data.categories[this.data.categoryIndex]
        : ''
    const recipeContent = this.data.recipeContent.trim()

    if (!name) {
      wx.showToast({ title: '请填写菜名', icon: 'none' })
      return
    }
    if (!category) {
      wx.showToast({ title: '请选择分类', icon: 'none' })
      return
    }
    if (!this.data.coverTempPath && !this.data.coverFileID) {
      wx.showToast({ title: '请选择封面图', icon: 'none' })
      return
    }
    if (!recipeContent) {
      wx.showToast({ title: '请填写配方', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    wx.showLoading({ title: this.data.isEdit ? '保存中…' : '发布中…', mask: true })

    let uploadedFileID = '' // 记录本次新上传的文件，保存失败时用于清理
    try {
      // 选了新封面：先压缩再上传云存储
      let coverFileID = this.data.coverFileID
      if (this.data.coverTempPath) {
        const compressed = await imageUtil.compressImage(this.data.coverTempPath)
        const upRes = await imageUtil.uploadCover(compressed)
        uploadedFileID = upRes.fileID
        coverFileID = upRes.fileID
      }

      const payload = {
        name: name,
        category: category,
        coverImageFileID: coverFileID,
        recipeContent: recipeContent,
        note: this.data.note.trim(),
        isFavorite: this.data.isFavorite
      }

      if (this.data.isEdit) {
        await recipeService.updateRecipe(this.data.editingId, payload)
        // 封面更换成功后，清理旧封面文件，避免存储残留
        if (
          uploadedFileID &&
          this._oldCoverFileID &&
          this._oldCoverFileID !== uploadedFileID
        ) {
          await imageUtil.deleteCloudFile(this._oldCoverFileID)
        }
      } else {
        await recipeService.addRecipe(payload)
      }

      wx.hideLoading()
      wx.showToast({ title: '已保存', icon: 'success' })
      this.resetForm()
      wx.setNavigationBarTitle({ title: '添加菜品' })
      setTimeout(function () {
        wx.switchTab({ url: '/pages/all/all' })
      }, 600)
    } catch (err) {
      console.error('保存失败：', err)
      wx.hideLoading()
      // 数据库写入失败时清理刚上传的新封面，避免云存储残留孤儿文件
      if (uploadedFileID) {
        imageUtil.deleteCloudFile(uploadedFileID)
      }
      wx.showToast({ title: '保存失败，请重试', icon: 'none' })
      this.setData({ submitting: false })
    }
  }
})
