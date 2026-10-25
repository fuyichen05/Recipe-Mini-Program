// components/recipe-card —— 菜品卡片（全部页 / 分类页共用）
// 对外事件：
//   open      —— 点击卡片主体，detail: { id }
//   togglefav —— 点击收藏星标，detail: { id, next }
Component({
  properties: {
    // 由列表页传入的菜品记录
    recipe: {
      type: Object,
      value: {}
    }
  },

  methods: {
    onOpen() {
      const recipe = this.data.recipe
      if (!recipe || !recipe._id) return
      this.triggerEvent('open', { id: recipe._id })
    },
    onToggleFav() {
      const recipe = this.data.recipe
      if (!recipe || !recipe._id) return
      this.triggerEvent('togglefav', {
        id: recipe._id,
        next: !recipe.isFavorite
      })
    }
  }
})
