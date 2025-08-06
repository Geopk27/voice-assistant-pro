import { useState, useEffect } from 'react'

const MEMBERSHIP_PLANS = {
  FREE: 'free',
  PLUS: 'plus',
  PRO: 'pro'
}

const PLAN_LIMITS = {
  [MEMBERSHIP_PLANS.FREE]: {
    maxFiles: 10,
    features: ['basic_voice', 'standard_support']
  },
  [MEMBERSHIP_PLANS.PLUS]: {
    maxFiles: 100,
    features: ['advanced_voice', 'continuous_listening', 'priority_support', 'custom_keywords']
  },
  [MEMBERSHIP_PLANS.PRO]: {
    maxFiles: Infinity,
    features: ['ai_recognition', 'team_collaboration', 'advanced_analytics', 'api_access', '24_7_support']
  }
}

const useMembership = () => {
  const [currentPlan, setCurrentPlan] = useState(MEMBERSHIP_PLANS.FREE)
  const [planExpiry, setPlanExpiry] = useState(null)

  useEffect(() => {
    // 从localStorage加载会员信息
    const savedPlan = localStorage.getItem('membershipPlan')
    const savedExpiry = localStorage.getItem('membershipExpiry')
    
    if (savedPlan && savedExpiry) {
      const expiryDate = new Date(savedExpiry)
      if (expiryDate > new Date()) {
        setCurrentPlan(savedPlan)
        setPlanExpiry(expiryDate)
      } else {
        // 过期了，重置为免费版
        setCurrentPlan(MEMBERSHIP_PLANS.FREE)
        setPlanExpiry(null)
        localStorage.removeItem('membershipPlan')
        localStorage.removeItem('membershipExpiry')
      }
    }
  }, [])

  // 升级会员
  const upgradePlan = (plan) => {
    setCurrentPlan(plan)
    
    // 设置过期时间（30天后）
    const expiry = new Date()
    expiry.setDate(expiry.getDate() + 30)
    setPlanExpiry(expiry)
    
    // 保存到localStorage
    localStorage.setItem('membershipPlan', plan)
    localStorage.setItem('membershipExpiry', expiry.toISOString())
  }

  // 检查功能是否可用
  const hasFeature = (feature) => {
    const planFeatures = PLAN_LIMITS[currentPlan]?.features || []
    return planFeatures.includes(feature)
  }

  // 检查文件数量限制
  const canAddFiles = (currentFileCount) => {
    const maxFiles = PLAN_LIMITS[currentPlan]?.maxFiles || 0
    return currentFileCount < maxFiles
  }

  // 获取剩余文件数量
  const getRemainingFiles = (currentFileCount) => {
    const maxFiles = PLAN_LIMITS[currentPlan]?.maxFiles || 0
    if (maxFiles === Infinity) return Infinity
    return Math.max(0, maxFiles - currentFileCount)
  }

  // 获取计划信息
  const getPlanInfo = (plan = currentPlan) => {
    return {
      plan,
      limits: PLAN_LIMITS[plan],
      isActive: plan === currentPlan,
      expiry: planExpiry
    }
  }

  // 检查是否需要升级
  const needsUpgrade = (requiredFeature) => {
    return !hasFeature(requiredFeature)
  }

  return {
    currentPlan,
    planExpiry,
    MEMBERSHIP_PLANS,
    PLAN_LIMITS,
    upgradePlan,
    hasFeature,
    canAddFiles,
    getRemainingFiles,
    getPlanInfo,
    needsUpgrade
  }
}

export default useMembership
