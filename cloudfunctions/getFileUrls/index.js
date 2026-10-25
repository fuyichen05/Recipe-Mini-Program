// 云函数：getFileUrls —— 批量获取云存储文件的临时下载链接
//
// 为什么需要它：
// 免费云环境不允许修改云存储权限（默认「仅创建者可读写」，基础选项也会提示升级付费），
// 家庭成员直接用 fileID 加载别人上传的封面图会被拒绝。
// 云函数以管理员身份运行、不受存储安全规则限制，生成的临时链接对所有人有效。
//
// 入参：{ fileList: [fileID, ...] }（单次最多 50 个，客户端会自动分批）
// 返回：{ fileList: [{ fileID, tempFileURL, status, errMsg }] }
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  const fileList = (event.fileList || []).slice(0, 50)
  if (fileList.length === 0) {
    return { fileList: [] }
  }
  const res = await cloud.getTempFileURL({ fileList })
  return { fileList: res.fileList || [] }
}
