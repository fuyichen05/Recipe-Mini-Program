// components/recipe-card —— 菜品卡片（全部页 / 分类页共用）
// 对外事件：
//   open      —— 点击卡片主体，detail: { id }
//   togglefav —— 点击收藏星标，detail: { id, next }
Component({
  methods: {
    onOpen() {
      this.triggerEvent('open', { id: this.data.recipe._id })
    },
    onToggleFav() {
      const recipe = this.data.recipe
      this.triggerEvent('togglefav', {
        id: recipe._id,
        next: !recipe.isFavorite
      })
    }
  }
})
