// src/components/FileCard.jsx

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// 组件和图标的导入保持不变
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Play, Trash2 } from 'lucide-react';
import { formatFileSize, getFileIcon } from '../utils/fileManager';

// cn 工具函数保持不变
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function FileCard({ file, allFiles, onUpdateKeywords, onDeleteFile, onPreviewFile }) {
  const { t } = useTranslation();
  
  // 内部状态，用于管理输入框的当前值
  const [currentKeyword, setCurrentKeyword] = useState(file.keywords || '');
  // 内部状态，用于管理视觉状态：'default', 'success' (永久蓝), 'error' (瞬时红)
  const [visualState, setVisualState] = useState('default');

  // 初始化时，如果文件已经有关键词，则直接设置为成功状态
  useEffect(() => {
    if (file.keywords && file.keywords.trim() !== '') {
      setVisualState('success');
    }
  }, [file.keywords]);

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      const trimmedKeyword = currentKeyword.trim();

      // 如果关键词为空，则不处理
      if (trimmedKeyword === '') {
        onUpdateKeywords(file.id, ''); // 确保空状态也被保存
        setVisualState('default');
        return;
      }

      // 检查关键词是否在其他文件中重复
      const isDuplicate = allFiles.some(f => f.id !== file.id && f.keywords === trimmedKeyword);
      
      if (isDuplicate) {
        // 如果重复，显示瞬时红色错误
        setVisualState('error');
        setTimeout(() => {
          setVisualState('default');
        }, 2000);
      } else {
        // 如果不重复，设置为永久蓝色成功状态，并通知父组件更新
        setVisualState('success');
        onUpdateKeywords(file.id, trimmedKeyword);
      }
    }
  };

  const handleInputChange = (e) => {
    // 当用户开始输入时，立刻重置视觉状态为默认
    setVisualState('default');

    setCurrentKeyword(e.target.value);
  };

  const getBorderColorClass = () => {
    switch (visualState) {
      case 'success':
        return 'border-blue-500 ring-2 ring-blue-200'; // 成功状态：蓝色边框
      case 'error':
        return 'border-red-500 ring-2 ring-red-200';   // 错误状态：红色边框
      default:
        return 'border-border'; // 默认状态
    }
  };

  return (
    <Card className="file-card-hover">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{getFileIcon(file.type)}</span>
            <div>
              <CardTitle className="text-sm truncate max-w-[150px]">
                {file.name}
              </CardTitle>
              <CardDescription className="text-xs">
                {formatFileSize(file.size)}
              </CardDescription>
            </div>
          </div>
          <div className="flex space-x-1">
            <Button size="sm" variant="ghost" onClick={() => onPreviewFile(file)}>
              <Play className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onDeleteFile(file.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label className="text-xs">{t('files.keywords')}</Label>
          <Input
            placeholder={t('files.keywordsPlaceholder')}
            value={currentKeyword}
            onChange={handleInputChange} // 使用新的 handleInputChange
            onKeyDown={handleKeyDown}
            className={cn("text-xs transition-all duration-300", getBorderColorClass())}
          />
        </div>
      </CardContent>
    </Card>
  );
}
