import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

const useSpeechRecognition = () => {
  const { i18n } = useTranslation()
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState('')
  const [isSupported, setIsSupported] = useState(false)
  const [isContinuous, setIsContinuous] = useState(false)
  const [recentCommands, setRecentCommands] = useState([])
  
  const recognitionRef = useRef(null)
  const restartTimeoutRef = useRef(null)

  useEffect(() => {
    // 检查浏览器支持
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      setIsSupported(true)
      recognitionRef.current = new SpeechRecognition()
      
      const recognition = recognitionRef.current
      
      // 配置语音识别
      recognition.continuous = true  // 持续识别
      recognition.interimResults = true  // 显示中间结果
      recognition.maxAlternatives = 1
      
      // 根据当前语言设置识别语言
      recognition.lang = i18n.language === 'zh' ? 'zh-CN' : 'en-US'
      
      // 识别结果处理
      recognition.onresult = (event) => {
        let finalTranscript = ''
        let interimTranscript = ''
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }
        
        if (finalTranscript) {
          setTranscript(finalTranscript.trim())
          // 添加到最近命令列表
          setRecentCommands(prev => {
            const newCommands = [finalTranscript.trim(), ...prev.slice(0, 4)]
            return newCommands
          })
        } else {
          setTranscript(interimTranscript.trim())
        }
      }
      
      // 开始识别
      recognition.onstart = () => {
        setIsListening(true)
        setError('')
      }
      
      // 识别结束
      recognition.onend = () => {
        setIsListening(false)
        
        // 如果是持续模式且没有错误，自动重启
        if (isContinuous && !error) {
          restartTimeoutRef.current = setTimeout(() => {
            if (recognitionRef.current && isContinuous) {
              try {
                recognitionRef.current.start()
              } catch (err) {
                console.log('Recognition restart failed:', err)
              }
            }
          }, 100)
        }
      }
      
      // 错误处理
      recognition.onerror = (event) => {
        setError(event.error)
        setIsListening(false)
        
        // 如果是权限错误，不要重启
        if (event.error === 'not-allowed') {
          setIsContinuous(false)
        }
      }
      
      // 无语音输入
      recognition.onnomatch = () => {
        setError('No speech was recognized')
      }
      
      // 语音开始
      recognition.onspeechstart = () => {
        setError('')
      }
      
      // 语音结束
      recognition.onspeechend = () => {
        // 在持续模式下不做任何操作，让onend处理重启
      }
    }
    
    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current)
      }
    }
  }, [i18n.language, isContinuous, error])

  // 开始监听
  const startListening = useCallback(() => {
    if (!recognitionRef.current) return
    
    try {
      setError('')
      setTranscript('')
      recognitionRef.current.start()
    } catch (err) {
      setError(err.message)
    }
  }, [])

  // 停止监听
  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return
    
    setIsContinuous(false)
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current)
    }
    
    try {
      recognitionRef.current.stop()
    } catch (err) {
      console.log('Stop recognition error:', err)
    }
  }, [])

  // 切换持续模式
  const toggleContinuous = useCallback(() => {
    setIsContinuous(prev => !prev)
  }, [])

  // 清除错误
  const clearError = useCallback(() => {
    setError('')
  }, [])

  // 清除转录
  const clearTranscript = useCallback(() => {
    setTranscript('')
  }, [])

  // 清除最近命令
  const clearRecentCommands = useCallback(() => {
    setRecentCommands([])
  }, [])

  return {
    isListening,
    transcript,
    error,
    isSupported,
    isContinuous,
    recentCommands,
    startListening,
    stopListening,
    toggleContinuous,
    clearError,
    clearTranscript,
    clearRecentCommands
  }
}

export default useSpeechRecognition
