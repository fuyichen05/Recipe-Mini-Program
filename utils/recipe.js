// utils/recipe.js —— 云数据库 recipes 集合的数据访问层
//
// ⚠️ 前置配置（必读）：
// recipes 集合必须在云开发控制台 → 数据库 → recipes → 权限设置 →
// 「自定义安全规则」中配置：
//   { "read": true, "write": true }
// 即"所有用户可读、所有用户可写"，家人共用一份数据、可互相编辑删除。
// 使用基础权限选项无法达到这个效果。
const db = wx.cloud.database()
const recipes = db.collection('recipes')

// 预设分类（固定五个，勿改：历史数据按名称关联）
const CATEGORIES = ['早餐', '正餐', '甜点', '汤', '其他']

const BATCH_SIZE = 100 // 云数据库客户端单次查询上限 100 条

// 规范化记录：保证 isFavorite 是布尔值、note 是字符串
function normalize(record) {
  return Object.assign({}, record, {
    isFavorite: !!record.isFavorite,
    note: record.note || ''
  })
}

// 排序：收藏的在前，其余按菜名拼音/字母升序
function sortRecipes(list) {
  return list.sort(function (a, b) {
    if (a.isFavorite !== b.isFavorite) return b.isFavorite - a.isFavorite
    return a.name.localeCompare(b.name, 'zh')
  })
}

// 拉取全部菜品（超过 100 条时自动分批），返回已排序的数组
async function fetchAllRecipes() {
  const countRes = await recipes.count()
  const total = countRes.total || 0
  if (total === 0) return []
  const tasks = []
  for (let skip = 0; skip < total; skip += BATCH_SIZE) {
    tasks.push(
      recipes.orderBy('createdAt', 'desc').skip(skip).limit(BATCH_SIZE).get()
    )
  }
  const results = await Promise.all(tasks)
  const list = results.reduce(function (acc, res) {
    return acc.concat(res.data || [])
  }, [])
  return sortRecipes(list.map(normalize))
}

// 按 id 查询单条详情
function getRecipeById(id) {
  return recipes.doc(id).get().then(function (res) {
    return normalize(res.data)
  })
}

// 新增菜品
function addRecipe(data) {
  const now = db.serverDate()
  return recipes.add({
    data: {
      name: data.name,
      category: data.category,
      coverImageFileID: data.coverImageFileID,
      recipeContent: data.recipeContent,
      note: data.note || '',
      isFavorite: !!data.isFavorite,
      createdAt: now,
      updatedAt: now
    }
  })
}

// 编辑保存（全量更新业务字段）
function updateRecipe(id, data) {
  return recipes.doc(id).update({
    data: {
      name: data.name,
      category: data.category,
      coverImageFileID: data.coverImageFileID,
      recipeContent: data.recipeContent,
      note: data.note || '',
      isFavorite: !!data.isFavorite,
      updatedAt: db.serverDate()
    }
  })
}

// 收藏 / 取消收藏
function toggleFavorite(id, next) {
  return recipes.doc(id).update({
    data: { isFavorite: !!next, updatedAt: db.serverDate() }
  })
}

// 删除菜品，并尽力清理云存储中的封面图文件
async function deleteRecipe(id, coverImageFileID) {
  await recipes.doc(id).remove()
  if (coverImageFileID) {
    try {
      await wx.cloud.deleteFile({ fileList: [coverImageFileID] })
    } catch (e) {
      // 封面删除失败不影响菜品删除，存储里偶尔残留一张孤儿图无碍
      console.warn('封面图删除失败（可忽略）：', e)
    }
  }
}

module.exports = {
  CATEGORIES: CATEGORIES,
  sortRecipes: sortRecipes,
  fetchAllRecipes: fetchAllRecipes,
  getRecipeById: getRecipeById,
  addRecipe: addRecipe,
  updateRecipe: updateRecipe,
  toggleFavorite: toggleFavorite,
  deleteRecipe: deleteRecipe
}
