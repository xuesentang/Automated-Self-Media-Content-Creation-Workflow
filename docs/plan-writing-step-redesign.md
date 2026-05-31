# WritingStep 核心写作页面重设计实施计划

> **目标：** 将核心写作页面从左右分栏改为三栏对称布局，中间区域最大化

**架构：** 左侧创作流程导航(w-72) + 中间核心写作(w-[900px]) + 右侧辅助面板(w-72)，gap-8对称间距

**技术栈：** React + TypeScript + Tailwind CSS + Ant Design

---

## 文件结构

| 文件 | 操作 | 说明 |
|------|------|------|
| `frontend/src/components/workflow/WritingStep.tsx` | 修改 | 核心：重写布局为三栏结构 |
| `frontend/src/App.tsx` | 修改 | 调整整体布局容器宽度 |
| `frontend/src/index.css` | 修改 | 添加骨架折叠动画样式 |

---

## Task 1: 修改 WritingStep.tsx - 重写为三栏布局

**文件：** `frontend/src/components/workflow/WritingStep.tsx`

### 步骤 1: 重写整体布局结构

将当前的左右分栏（左侧骨架 + 右侧编辑器）改为三栏布局：

```tsx
// 外层容器
<div className="max-w-[1800px] mx-auto px-6 py-8 flex gap-8">
  {/* 左侧：创作流程导航 */}
  <aside className="w-72 flex-shrink-0">...</aside>
  
  {/* 中间：核心写作区域 */}
  <main className="w-[900px] flex-shrink-0">...</main>
  
  {/* 右侧：辅助面板 */}
  <aside className="w-72 flex-shrink-0">...</aside>
</div>
```

### 步骤 2: 提取左侧创作流程为独立组件

创建 `WritingStepSidebar` 组件：
- 显示6个步骤
- 当前步骤高亮（蓝色圆形）
- 已完成步骤绿色勾选
- 未开始步骤灰色圆形
- space-y-8 拉长间距

### 步骤 3: 重构中间核心写作区域

包含两个模块：
1. **文章骨架** - 可折叠的紧凑面板
   - 点击章节展开/收起引导问题
   - "全部展开"按钮
   - 每个章节：序号圆点 + 标题 + 展开图标

2. **写作编辑器** - 最大化
   - 标题栏：编辑器图标 + "写作编辑器" + 自动保存状态
   - textarea：w-full, min-h-[500px], 无边框
   - 底部：字数统计 + 操作按钮（返回修改骨架、提交初稿）

### 步骤 4: 提取右侧辅助面板为独立组件

创建 `WritingStepRightPanel` 组件：
- 创作技巧卡片（3条提示）
- 当前状态卡片（写作中/已保存）
- 快捷操作卡片（打开知识库K、保存文章Ctrl+S）

---

## Task 2: 修改 App.tsx - 调整布局容器

**文件：** `frontend/src/App.tsx`

### 步骤 1: 调整主内容区域样式

确保工作流页面内容区域足够宽：
```tsx
// Content 区域
<div className="flex-1 overflow-auto bg-slate-50">
  <div className="h-full">
    <Routes>...</Routes>
  </div>
</div>
```

---

## Task 3: 修改 index.css - 添加动画样式

**文件：** `frontend/src/index.css`

### 步骤 1: 添加骨架折叠动画

```css
.guide-content { 
  max-height: 0; 
  overflow: hidden; 
  transition: max-height 0.4s ease, opacity 0.3s ease;
  opacity: 0;
}
.expanded .guide-content { 
  max-height: 500px; 
  opacity: 1;
}
.expand-icon { 
  transition: transform 0.3s ease; 
}
.expanded .expand-icon { 
  transform: rotate(180deg); 
}
```

---

## 验证步骤

1. TypeScript 编译：`npx tsc --noEmit`
2. 启动前端：`npm run dev`
3. 浏览器访问：`http://localhost:5175`
4. 进入"核心写作"步骤验证布局
