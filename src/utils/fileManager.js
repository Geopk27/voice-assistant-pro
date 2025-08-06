import { useTranslation } from 'react-i18next'

// 文件匹配算法
export const findMatchingFiles = (files, command, language = 'en') => {
  if (!command || !files.length) return []

  const normalizedCommand = command.toLowerCase().trim()
  
  // 根据语言获取动作词和文件类型词汇
  const actionWords = language === 'zh' ? 
    ['打开', '显示', '展示', '查看', '播放', '关闭'] :
    ['open', 'show', 'display', 'view', 'play', 'close']
  
  const fileTypeWords = language === 'zh' ? {
    image: ['照片', '图片', '图像'],
    pdf: ['文档', '资料', 'PDF'],
    presentation: ['演示', '幻灯片', 'PPT']
  } : {
    image: ['photo', 'image', 'picture'],
    pdf: ['document', 'pdf', 'file'],
    presentation: ['presentation', 'slides', 'ppt']
  }

  // 移除动作词，提取目标文件描述
  let targetDescription = normalizedCommand
  actionWords.forEach(action => {
    const actionPattern = new RegExp(`^${action}\\s+`, 'i')
    targetDescription = targetDescription.replace(actionPattern, '')
  })

  const matches = []

  files.forEach(file => {
    let score = 0
    const fileName = file.name.toLowerCase()
    const keywords = (file.keywords || '').toLowerCase()
    const fileType = getFileType(file.type)

    // 1. 精确匹配文件名
    if (fileName.includes(targetDescription)) {
      score += 100
    }

    // 2. 精确匹配关键词
    if (keywords.includes(targetDescription)) {
      score += 90
    }

    // 3. 部分匹配文件名
    const targetWords = targetDescription.split(/\s+/)
    targetWords.forEach(word => {
      if (word.length > 1 && fileName.includes(word)) {
        score += 30
      }
    })

    // 4. 部分匹配关键词
    targetWords.forEach(word => {
      if (word.length > 1 && keywords.includes(word)) {
        score += 25
      }
    })

    // 5. 文件类型匹配
    const typeWords = fileTypeWords[fileType] || []
    typeWords.forEach(typeWord => {
      if (targetDescription.includes(typeWord.toLowerCase())) {
        score += 20
      }
    })

    // 6. 模糊匹配（编辑距离）
    const fileNameSimilarity = calculateSimilarity(targetDescription, fileName)
    const keywordsSimilarity = calculateSimilarity(targetDescription, keywords)
    
    if (fileNameSimilarity > 0.6) {
      score += fileNameSimilarity * 15
    }
    
    if (keywordsSimilarity > 0.6) {
      score += keywordsSimilarity * 10
    }

    if (score > 0) {
      matches.push({
        ...file,
        matchScore: score,
        matchReason: getMatchReason(score)
      })
    }
  })

  // 按匹配分数排序
  return matches.sort((a, b) => b.matchScore - a.matchScore)
}

// 获取文件类型
export const getFileType = (mimeType) => {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.includes('pdf')) return 'pdf'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation'
  return 'other'
}

// 计算字符串相似度（简化版Levenshtein距离）
const calculateSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0
  
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  
  if (longer.length === 0) return 1.0
  
  const editDistance = levenshteinDistance(longer, shorter)
  return (longer.length - editDistance) / longer.length
}

// Levenshtein距离算法
const levenshteinDistance = (str1, str2) => {
  const matrix = []
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  
  return matrix[str2.length][str1.length]
}

// 获取匹配原因
const getMatchReason = (score) => {
  if (score >= 90) return 'exact'
  if (score >= 50) return 'high'
  if (score >= 20) return 'medium'
  return 'low'
}

// 文件验证
export const validateFile = (file) => {
  const maxSize = 50 * 1024 * 1024 // 50MB
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]

  if (file.size > maxSize) {
    throw new Error('File size exceeds 50MB limit')
  }

  if (!allowedTypes.includes(file.type)) {
    throw new Error('Unsupported file type')
  }

  return true
}

// 生成文件ID
export const generateFileId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// 格式化文件大小
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 获取文件图标
export const getFileIcon = (mimeType) => {
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType.includes('pdf')) return '📄'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📊'
  return '📁'
}

// 处理语音命令
export const processVoiceCommand = (command, files, language = 'en') => {
  const matches = findMatchingFiles(files, command, language)
  
  if (matches.length === 0) {
    return {
      success: false,
      message: language === 'zh' ? 
        `未找到匹配的文件："${command}"` : 
        `No matching file found: "${command}"`,
      matches: []
    }
  }

  const bestMatch = matches[0]
  
  return {
    success: true,
    message: language === 'zh' ? 
      `已打开文件：${bestMatch.name}` : 
      `Opened file: ${bestMatch.name}`,
    matches,
    selectedFile: bestMatch
  }
}

// 保存文件到localStorage
export const saveFilesToStorage = (files) => {
  try {
    const fileData = files.map(file => ({
      id: file.id,
      name: file.name,
      type: file.type,
      size: file.size,
      keywords: file.keywords,
      uploadTime: file.uploadTime
      // 注意：不保存URL，因为它们会过期
    }))
    localStorage.setItem('voiceAssistantFiles', JSON.stringify(fileData))
  } catch (error) {
    console.error('Failed to save files to storage:', error)
  }
}

// 从localStorage加载文件
export const loadFilesFromStorage = () => {
  try {
    const saved = localStorage.getItem('voiceAssistantFiles')
    return saved ? JSON.parse(saved) : []
  } catch (error) {
    console.error('Failed to load files from storage:', error)
    return []
  }
}

// 清理过期的URL对象
export const cleanupFileUrls = (files) => {
  files.forEach(file => {
    if (file.url) {
      URL.revokeObjectURL(file.url)
    }
  })
}
