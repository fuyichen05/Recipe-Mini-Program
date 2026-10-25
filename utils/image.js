// utils/image.js —— 封面图选择 / 压缩 / 上传云存储
const MAX_SIDE = 1200 // 压缩后最长边不超过 1200px

// 从相册或拍照选择一张图片，成功返回临时文件路径
// 用户主动取消不算错误，reject({ canceled: true })
function chooseImage() {
  return new Promise(function (resolve, reject) {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: function (res) {
        resolve(res.tempFiles[0].tempFilePath)
      },
      fail: function (err) {
        if (err && /cancel/i.test(err.errMsg || '')) {
          reject({ canceled: true })
          return
        }
        reject(err)
      }
    })
  })
}

// 压缩：最长边超过 1200px 时等比缩小，并降低质量（wx.compressImage 的
// compressedWidth 字段需基础库 2.26.0+，低版本设备会忽略并走 quality 压缩；
// 压缩失败时回退用原图上传，保证流程不中断）
function compressImage(tempFilePath) {
  return new Promise(function (resolve) {
    wx.getImageInfo({
      src: tempFilePath,
      success: function (info) {
        let compressedWidth
        if (info.width >= info.height && info.width > MAX_SIDE) {
          compressedWidth = MAX_SIDE
        } else if (info.height > info.width && info.height > MAX_SIDE) {
          compressedWidth = Math.round((info.width * MAX_SIDE) / info.height)
        }
        wx.compressImage({
          src: tempFilePath,
          quality: 80,
          compressedWidth: compressedWidth,
          success: function (res) {
            resolve(res.tempFilePath)
          },
          fail: function () {
            resolve(tempFilePath) // 压缩失败用原图
          }
        })
      },
      fail: function () {
        resolve(tempFilePath) // 读取尺寸失败用原图
      }
    })
  })
}

// 上传封面到云存储 covers/ 目录，返回 { fileID, statusCode }
// 云文件 ID 可直接绑定到 <image> 组件的 src
function uploadCover(tempFilePath) {
  const match = /\.(\w+)$/.exec(tempFilePath)
  const ext = match ? '.' + match[1] : '.jpg'
  const cloudPath =
    'covers/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext
  return wx.cloud.uploadFile({
    cloudPath: cloudPath,
    filePath: tempFilePath
  })
}

// 删除云存储文件（尽力而为，失败只打日志不抛错）
async function deleteCloudFile(fileID) {
  if (!fileID) return
  try {
    await wx.cloud.deleteFile({ fileList: [fileID] })
  } catch (e) {
    console.warn('云文件删除失败（可忽略）：', e)
  }
}

module.exports = {
  chooseImage: chooseImage,
  compressImage: compressImage,
  uploadCover: uploadCover,
  deleteCloudFile: deleteCloudFile
}
