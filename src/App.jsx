import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import './App.css'

// Hooks
import useSpeechRecognition from './hooks/useSpeechRecognition'
import useMembership from './hooks/useMembership'

// Components
import { Button } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Input } from './components/ui/input'
import { Label } from './components/ui/label'
import { Badge } from './components/ui/badge'
import { Alert, AlertDescription } from './components/ui/alert'
import { Switch } from './components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { Progress } from './components/ui/progress'
import { FileCard } from './components/FileCard';

// Icons
import { 
  Mic, 
  MicOff, 
  Upload, 
  Play, 
  Trash2, 
  Settings, 
  Globe, 
  Crown,
  FileText,
  Image,
  Presentation,
  AlertCircle,
  CheckCircle,
  Volume2,
  VolumeX
} from 'lucide-react'

// Utils
import { 
  processVoiceCommand, 
  validateFile, 
  generateFileId, 
  formatFileSize, 
  getFileIcon,
  saveFilesToStorage,
  loadFilesFromStorage,
  cleanupFileUrls
} from './utils/fileManager'

function App() {
  const { t, i18n } = useTranslation()
  const {
    isListening,
    transcript,
    error: speechError,
    isSupported,
    isContinuous,
    recentCommands,
    startListening,
    stopListening,
    toggleContinuous,
    clearError,
    clearTranscript
  } = useSpeechRecognition()

  const {
    currentPlan,
    canAddFiles,
    getRemainingFiles,
    getPlanInfo,
    upgradePlan,
    hasFeature,
    needsUpgrade,
    MEMBERSHIP_PLANS
  } = useMembership()

  // State
  const [files, setFiles] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [executionResult, setExecutionResult] = useState('')
  const [activeTab, setActiveTab] = useState('dashboard')

  // 加载保存的文件
  useEffect(() => {
    const savedFiles = loadFilesFromStorage()
    if (savedFiles.length > 0) {
      setFiles(savedFiles)
    }
  }, [])

  // 保存文件到localStorage
  useEffect(() => {
    if (files.length > 0) {
      saveFilesToStorage(files)
    }
  }, [files])

  // 处理语音识别结果
  useEffect(() => {
    if (transcript && transcript.trim()) {
      const result = processVoiceCommand(transcript, files, i18n.language)
      setExecutionResult(result.message)
      
      if (result.success && result.selectedFile) {
        setSelectedFile(result.selectedFile)
        // 自动打开文件，使用文件ID作为窗口名
        if (result.selectedFile.url) {
          window.open(result.selectedFile.url, result.selectedFile.id)
        }
      }
      
      // 清除转录，准备下一次识别
      setTimeout(() => {
        clearTranscript()
      }, 3000)
    }
  }, [transcript, files, i18n.language, clearTranscript])

  // 文件上传处理
  const handleFileUpload = useCallback((event) => {
    const uploadedFiles = Array.from(event.target.files)
    
    if (!canAddFiles(files.length + uploadedFiles.length)) {
      setExecutionResult(t('messages.fileLimit', { 
        limit: getPlanInfo().limits.maxFiles 
      }))
      return
    }

    const newFiles = []
    
    uploadedFiles.forEach(file => {
      try {
        validateFile(file)
        
        const fileData = {
          id: generateFileId(),
          name: file.name,
          type: file.type,
          size: file.size,
          url: URL.createObjectURL(file),
          keywords: '',
          uploadTime: Date.now()
        }
        
        newFiles.push(fileData)
      } catch (error) {
        setExecutionResult(`${file.name}: ${error.message}`)
      }
    })
    
    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles])
      setExecutionResult(t('messages.uploadSuccess'))
    }
    
    // 重置input
    event.target.value = ''
  }, [files.length, canAddFiles, getPlanInfo, t])

  // 删除文件
  const handleDeleteFile = useCallback((fileId) => {
    setFiles(prev => {
      const fileToDelete = prev.find(f => f.id === fileId)
      if (fileToDelete && fileToDelete.url) {
        URL.revokeObjectURL(fileToDelete.url)
      }
      return prev.filter(f => f.id !== fileId)
    })
    setExecutionResult(t('messages.deleteSuccess'))
  }, [t])

  // 更新文件关键词
  const handleUpdateKeywords = useCallback((fileId, keywords) => {
    setFiles(prev => prev.map(file => 
      file.id === fileId ? { ...file, keywords } : file
    ))
  }, [])

  // 预览文件 - 现在只处理手动点击事件
  const handlePreviewFile = useCallback((file) => {
    setSelectedFile(file);
    // 手动点击预览时，也使用文件ID作为窗口名
    if (file.url) {
      window.open(file.url, file.id);
    }
  }, []);

  // 切换语言
  const handleLanguageChange = useCallback((language) => {
    i18n.changeLanguage(language)
  }, [i18n])

  // 语音控制按钮
  const VoiceControlButton = () => (
    <div className="flex flex-col items-center space-y-4">
      <Button
        onClick={isListening ? stopListening : startListening}
        disabled={!isSupported}
        size="lg"
        className={`w-20 h-20 rounded-full ${
          isListening 
            ? 'voice-listening text-white' 
            : 'bg-primary hover:bg-primary/90'
        } ${isListening ? 'voice-pulse' : ''}`}
      >
        {isListening ? (
          <Volume2 className="w-8 h-8" />
        ) : (
          <Mic className="w-8 h-8" />
        )}
      </Button>
      
      <div className="flex items-center space-x-2">
        <Switch
          checked={isContinuous}
          onCheckedChange={toggleContinuous}
          disabled={!isSupported || needsUpgrade('continuous_listening')}
        />
        <Label className="text-sm">
          {t('voice.continuousMode')}
          {needsUpgrade('continuous_listening') && (
            <Crown className="w-4 h-4 inline ml-1 text-yellow-500" />
          )}
        </Label>
      </div>
    </div>
  )

  // 会员计划卡片
  const MembershipCard = ({ planKey }) => {
    const planInfo = getPlanInfo(planKey)
    const isCurrentPlan = planKey === currentPlan
    
    return (
      <Card className={`membership-card ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <span>{t(`membership.${planKey}.name`)}</span>
              {isCurrentPlan && <Crown className="w-5 h-5 text-yellow-500" />}
            </CardTitle>
            <Badge variant={isCurrentPlan ? 'default' : 'secondary'}>
              {t(`membership.${planKey}.price`)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 mb-4">
            {t(`membership.${planKey}.features`, { returnObjects: true }).map((feature, index) => (
              <li key={index} className="flex items-center space-x-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          {!isCurrentPlan && (
            <Button 
              onClick={() => upgradePlan(planKey)}
              className="w-full"
            >
              {t('membership.upgrade')}
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  if (!isSupported) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t('voice.browserNotSupported')}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{t('app.title')}</h1>
              <p className="text-muted-foreground">{t('app.subtitle')}</p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* 语言切换 */}
              <Select value={i18n.language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-32">
                  <Globe className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="zh">中文</SelectItem>
                </SelectContent>
              </Select>
              
              {/* 当前计划显示 */}
              <Badge variant="outline" className="flex items-center space-x-1">
                <Crown className="w-4 h-4" />
                <span>{t(`membership.${currentPlan}.name`)}</span>
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">{t('navigation.dashboard')}</TabsTrigger>
            <TabsTrigger value="files">{t('navigation.files')}</TabsTrigger>
            <TabsTrigger value="settings">{t('navigation.settings')}</TabsTrigger>
            <TabsTrigger value="upgrade">{t('navigation.upgrade')}</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 语音控制面板 */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('voice.title')}</CardTitle>
                  <CardDescription>{t('voice.description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <VoiceControlButton />
                  
                  {/* 状态显示 */}
                  <div className="space-y-2">
                    {isListening && (
                      <Alert>
                        <Volume2 className="h-4 w-4" />
                        <AlertDescription>
                          {isContinuous ? t('voice.listening') : t('voice.processing')}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {speechError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {t('voice.error')} {speechError}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {transcript && (
                      <Alert>
                        <AlertDescription>
                          <strong>{t('voice.result')}</strong> {transcript}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {executionResult && (
                      <Alert>
                        <AlertDescription>
                          <strong>{t('voice.execution')}</strong> {executionResult}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 使用说明 */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('usage.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium">{t('usage.step1.title')}</h4>
                      <p className="text-sm text-muted-foreground">{t('usage.step1.description')}</p>
                    </div>
                    <div>
                      <h4 className="font-medium">{t('usage.step2.title')}</h4>
                      <p className="text-sm text-muted-foreground">{t('usage.step2.description')}</p>
                    </div>
                    <div>
                      <h4 className="font-medium">{t('usage.step3.title')}</h4>
                      <p className="text-sm text-muted-foreground">{t('usage.step3.description')}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">{t('usage.commands.title')}</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {t('usage.commands.examples', { returnObjects: true }).map((example, index) => (
                        <li key={index}>• {example}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 最近命令 */}
            {recentCommands.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('voice.recentCommands')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {recentCommands.map((command, index) => (
                      <Badge key={index} variant="secondary">
                        {command}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{t('files.title')}</CardTitle>
                    <CardDescription>{t('files.description')}</CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {t('files.fileCount', { count: files.length })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getRemainingFiles(files.length) === Infinity 
                        ? '∞' 
                        : getRemainingFiles(files.length)
                      } remaining
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 文件上传 */}
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.ppt,.pptx"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium">{t('files.upload')}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('files.supportedFormats')}
                      </p>
                    </label>
                  </div>

                  {/* 文件列表 */}
                  {files.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">{t('files.noFiles')}</p>
                      <p className="text-sm text-muted-foreground">{t('files.uploadPrompt')}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {files.map(file => (
                        <FileCard 
                          key={file.id} 
                          file={file}
                          allFiles={files}
                          onUpdateKeywords={handleUpdateKeywords}
                          onDeleteFile={handleDeleteFile}
                          onPreviewFile={handlePreviewFile}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label>{t('settings.language')}</Label>
                    <Select value={i18n.language} onValueChange={handleLanguageChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="zh">中文</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>{t('settings.recognition.title')}</Label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">{t('settings.recognition.continuous')}</Label>
                        <Switch
                          checked={isContinuous}
                          onCheckedChange={toggleContinuous}
                          disabled={needsUpgrade('continuous_listening')}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Upgrade Tab */}
          <TabsContent value="upgrade" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MembershipCard planKey={MEMBERSHIP_PLANS.FREE} />
              <MembershipCard planKey={MEMBERSHIP_PLANS.PLUS} />
              <MembershipCard planKey={MEMBERSHIP_PLANS.PRO} />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

export default App
