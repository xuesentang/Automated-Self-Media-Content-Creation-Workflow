# Agent Skills：通用 AI 技能库
> 让 AI 快速学会新技能
你好，我是程序员鱼皮。
在前面的文章中，我们学习了如何用 AI 生成代码。但你可能会发现一些问题：
- AI 生成的界面总是千篇一律的蓝紫渐变色
- 每次都要输入一大段相同的提示词，太麻烦了
- AI 在某些特定任务上表现不够专业
有没有办法让 AI 快速学会新技能，变得更专业呢？
这篇文章，我会介绍 **Agent Skills**，Anthropic 推出的 AI 技能系统，可以让 AI 快速掌握各种专业技能。
⭐️ 推荐观看视频动画版，更通俗易懂：[https://bilibili.com/video/BV1T7zzBQEaA](https://www.bilibili.com/video/BV1T7zzBQEaA/)
## 一、没有 Agent Skills 之前
在了解 Agent Skills 之前，让我们先看看以前是怎么解决这些问题的。
假设你正在用 AI 开发网站，为了让 AI 生成的效果更好，你告诉 AI：
- 界面不要使用蓝紫渐变色
- 不要生成一大堆没用的文档
- 你要遵循公司的代码规范
阿巴阿巴，洋洋洒洒几百字。
之后每次开发网站时，你都要写这么一段又臭又长的提示词，太麻烦了！
于是聪明的你开始想办法。
先把常用的提示词保存到单独的文件（比如 `prompts.md`），每次手动投喂给 AI。
然后创建了资源文件夹，把公司的代码规范、设计素材都塞进去，告诉 AI 参考这些写。
接着你还写了一些脚本，让 AI 生成代码后自动执行格式化、运行测试、提交代码到 Git。
最后再写个 `AGENTS.md` 文件，把所有规范和工作流程都写进去，让 AI 自动读取。
你沾沾自喜：嘿嘿，俺这套工作流，堪称完美！
但很快，你发现了问题，随着规范越写越多，文档越来越臃肿，每次对话都要占用很多 AI 上下文空间，浪费 tokens。
这时候，Agent Skills 就该登场了！
## 二、什么是 Agent Skills？
[Agent Skills](https://claude.com/blog/skills) 是 Anthropic 推出的 [一套开放标准](https://platform.claude.com/docs/zh-CN/agents-and-tools/agent-skills/overview)，目的是让 AI 能够学习使用各种专业技能，而不用每次都重复输入提示词。
它定义了一种 **封装 AI 工作流** 的标准：开发者可以把复杂的任务指令、脚本和资源打包成一个 **技能（Skill）**；作为用户，你只需要安装这些技能，AI 就能立刻学会这项本事，不用重复造轮子。
简单来说，它就是给 AI 装备的 **技能包**。技能包里有精心设计的提示词、代码脚本、还有各种资源文件。
把 AI 想象成一个职场小白，给他装上 `文档处理技能`，它就立刻知道怎么生成 PPT、处理 Excel 表格；装上 `代码规范技能`，它就知道怎么按照公司标准写代码。
你可能会想：等等，这不就是把教 AI 做事的文档和 AI 要用到的文件打包成文件夹吗？
没错，差不多就是这个意思。但 Anthropic 把它做成了一个通用标准，而且在实现原理上有一些新花样。下面我们先来实战使用一下 Agent Skills，再揭秘其中的奥秘。
## 三、Agent Skills 入门实战
目前对 Agent Skills 支持最完善的工具是 Anthropic 官方的 [Claude Code](https://claude.com/product/claude-code)，我们就以此为例，安装并使用 Skills。
### 1、安装 Skills 技能
先打开 Claude Code 并输入命令，添加官方技能市场：
```plain
/plugin marketplace add anthropics/skills
```
这就像是在你的 AI 助手里开通了一个技能商店，接下来你就可以从商店中获取技能了。
在 Claude Code 中输入命令，安装官方提供的技能包：
```plain
/plugin install example-skills@anthropic-agent-skills
```
这个 example-skills 包含了一堆官方示例技能，包括前端设计、网页测试、动图制作等等。
装完之后，你就可以直接让 AI 使用这些技能了。
还有另外一种安装方式，也可以在 Claude Code 中输入一行命令来安装 [frontend-design](https://www.claudeskill.site/en/skills/anthropic-agent-skills:frontend-design) 技能。
```markdown
skill install anthropic-agent-skills:frontend-design
```
### 2、前端设计技能
比如你要做一个网站，以前没装技能的时候，AI 生成的代码又是那个熟悉的蓝紫渐变色，千篇一律的 AI 审美。
现在安装了 frontend-design 这个 **教 AI 生成专业设计感网站** 的技能后，你输入：“帮我开发个人作品集网站”。
AI 会主动问你：我发现你安装了前端设计技能，需要用它来生成更具设计感的页面吗？
确认之后，AI 会利用技能生成代码，告别蓝紫渐变，生成独特风格的精美页面。
我们不用每次都给 AI 输入一大堆相同的提示词，装一次技能就行了。
### 3、文档处理技能
除了代码相关的技能，官方还提供了文档处理技能包。
同样在 Claude Code 中输入一行命令安装：
```plain
/plugin install document-skills@anthropic-agent-skills
```
这个技能包里有 PPT 制作、Word 文档生成、Excel 数据分析、PDF 解析等技能。
接下来如果你让 AI 做个 PPT，它会自动调用 PPT 制作技能，直接生成排版好的 PPT 文件，帮你节省几个小时。
## 四、揭秘 Agent Skills 内部原理
你可能会好奇：为什么 Skills 能做到安装即用？技能包里面到底有啥？AI 又是怎么知道该用哪个技能的？
[技能](https://agentskills.io/what-are-skills) 其实就是一个包含 `SKILL.md` 技能说明文件的文件夹，还可以包含可执行脚本、资源和参考文档。
```markdown
my-skill/
├── SKILL.md          # 必需：指令和元数据
├── scripts/          # 可选：可执行脚本
├── references/       # 可选：参考文档
└── assets/           # 可选：模板和资源
```
由于每个技能的复杂度不同，结构也会存在区别。我们可以在本地目录中找到已安装的技能文件夹。
以官方的 PPT 制作技能为例，它的结构是这样的：
```plain
skills/pptx/
├── SKILL.md          # 技能说明书（必需）
├── ooxml/            # OOXML 相关资源
├── scripts/          # 处理脚本
├── html2pptx.md      # HTML 转 PPT 说明
├── ooxml.md          # OOXML 格式说明
└── LICENSE.txt       # 许可证
```
包含一个核心的技能说明文档 `SKILL.md`，还有脚本、参考文档和各种资源文件。
而 frontend-design 前端设计技能只有一个 `SKILL.md` 文件。
### SKILL.md 文件结构
`SKILL.md` 文件是每个技能的核心，它包含两个关键部分。
第一部分是 **元数据**，用 YAML 格式写在文件开头：
```yaml
---
name: frontend-design
description: 生成具有专业设计感的前端代码，避免千篇一律的 AI 审美
---
```
其中 `name` 是技能的名字。`description` 是技能的描述，告诉 AI 什么时候应该使用这个技能。描述写得越清晰，AI 就越容易在合适的时机调用它。
第二部分是 **指令内容**，就是一套经过精心设计的提示词，指导 AI 具体怎么做。
以 [frontend-design](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) 技能为例，它的指令内容包括：
- 设计思考：在写代码前，先分析产品目的、用户群体、技术约束，然后选择一个大胆的美学方向（极简、复古未来、工业风、有机自然、奢华精致等）
- 前端美学指南：包括字体选择（避免 Arial、Inter 等烂大街字体，选择有个性的组合）、配色主题（主色调配鲜明点缀色）、动效设计、空间构成、背景和视觉细节
- 避坑指南：明确禁止紫色渐变、系统字体、千篇一律的布局等 AI 审美陷阱
### 渐进式披露机制
如果有多个 Skills，AI 怎么知道该用哪个技能呢？如果把每个技能说明文档都塞给 AI，不是很占用上下文么？
这就要说到 **渐进式披露（Progressive Disclosure）** 这个核心机制了。
当你让 AI 执行任务时，它会先扫描技能目录，但不会把所有内容都加载到上下文中。而是只读取每个技能的元数据（名字和描述），发现描述和任务相关，就知道该用这个技能了。
然后才把完整的技能说明文档读进来，按照里面的指令执行：
并根据需要加载技能包中的其他资源：
**用到哪个查哪个**，既精准匹配又节省上下文，这就是渐进式披露的精髓。
所以 Agent Skills 的本质就是 **把专业知识打包成一个文件夹，让 AI 按需读取并使用**。
## 五、跨工具使用 Agent Skills
除了 Claude Code 之外，其他 AI 工具支持 Agent Skills 吗？
当然！[Agent Skills](https://agentskills.io/) 已经成为通用标准，Cursor、VS Code、Codex 等工具都支持。
Skills 的社区也非常活跃，你可以在 [Claude Skills Hub 市场](https://www.claudeskill.site/zh/skills)、开源的 [Awesome Claude Skills](https://github.com/ComposioHQ/awesome-claude-skills) 等地方找到很多现成的技能。
比如有个叫 [UI UX Pro MAX](https://ui-ux-pro-max-skill.nextlevelbuilder.io/) 的技能特别火，专门用于提升 AI 的设计能力。
### 在 Cursor 中使用 Agent Skills
用法很简单，首先按照 [开源仓库文档](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) 的指引，安装官方提供的命令行工具：
```bash
npm install -g uipro-cli
```
然后进入到你的项目目录下，根据使用的 AI 工具执行对应的命令。比如我这里用 Cursor：
```bash
uipro init --ai cursor
```
它会自动把技能安装到 Cursor 的配置目录里。
安装完成后，可以看到它的文件结构：
接下来，当你让 AI 开发一个网站时，可以使用斜杠命令手动触发技能，或者让 AI 自动识别技能。
AI 会根据你的需求识别出产品类型和需要的页面类型：
然后调用 `search.py` 搜索脚本，在 data 目录里进行多维度搜索，找到适合的配色、字体、布局风格：
综合搜索结果，生成完整的设计方案（主色调、字体组合、间距规范等）：
最后，再按照设计方案生成代码：
这样一来，生成的界面既专业又有设计感。
AI 不需要把所有规则都背下来，而是用到哪个查哪个，这就是 Agent Skills 的精髓。
## 六、技能仓库
目前 [Anthropic 官方技能仓库](https://github.com/anthropics/skills) 已经提供了丰富的技能集合，涵盖编程相关的前端设计、网页测试，还有办公相关的 PPT 制作、Excel 处理、Word 文档、PDF 生成等各个方面。
Skills 的社区也非常活跃，你可以在以下地方找到很多现成的技能：
- ⭐️ [鱼皮 AI 导航 - Skills 大全](https://ai.codefather.cn/skills)：持续更新优质技能，释放 AI 执行潜力
- [Claude Skills Hub 市场](https://www.claudeskill.site/zh/skills)：社区技能市场
- [Awesome Claude Skills](https://github.com/ComposioHQ/awesome-claude-skills)：开源技能列表
## 七、创建自己的 Agent Skills
用了很多别人的技能后，你可能会想：能不能把公司的周报格式封装成一个技能？以后推荐给新来的同事，还能卖个几块钱，嘿嘿嘿~
当然可以！创建自己的 Agent Skills 其实很简单。
### 方法 1、手动创建
你可以发挥程序员最擅长的事情 —— 复制粘贴！
先复制一个官方的技能包，修改目录名称为自己的。
然后修改技能说明文档 `SKILL.md` 的元数据、指令内容这些关键部分。
示例 `SKILL.md` 文件：
```markdown
---
name: company-weekly-report
description: 生成符合公司规范的项目周报，包含进度汇总、问题跟踪和下周计划
---
# 公司周报生成技能
当用户要求生成周报时，请按以下步骤执行：
## 1. 收集信息
- 询问本周完成的主要工作
- 询问遇到的问题和解决方案
- 询问下周计划
## 2. 格式规范
- 使用公司蓝色主题
- 标题使用微软雅黑加粗
- 每个模块不超过 5 个要点
## 3. 输出格式
- 默认输出 Markdown
- 如需 PPT，调用 pptx 技能
```
最后，把公司的 Logo、PPT 模板、报告样例放在子文件夹里就行了。妈妈再也不用担心我的周报了~
### 方法 2、使用 Skill Creator
其实有更简单规范的方法。
在前面安装的 example-skills 官方示例技能包里，有一个叫 `Skill Creator` 的技能，专门用来帮你创建新技能。
你只需要跟 AI 说：“帮我创建一个专门生成公司周报的技能”
接下来 AI 会问你几个问题，一步一步回答就好：
- 你希望周报包含哪些主要部分？
- 你希望周报以什么格式输出？
- 你通常会如何使用这个周报技能？
- 希望周报的语言风格是什么？
很快，一个完整的技能包就生成了，你会看到一个 `.skill` 为后缀的文件，本质上是一个 zip 压缩包。
### 技能的安装位置
创建好技能后，你可以：
1）个人全局使用：解压到个人技能目录（`~/.claude/skills/`）下，你的所有项目都能用
2）项目内使用：放到项目的 `.claude/skills/` 目录下，并且利用 Git 同步给项目组其他成员
3）分享给社区：把它开源到 GitHub，或者上传到 [Claude Skills Hub](https://www.claudeskill.site/zh/skills) 这样的社区平台，让所有用户都能用
## 八、Skills / MCP / 斜杠命令的区别
你可能会好奇：Agent Skills 和 MCP、斜杠命令有什么区别？
**MCP 就像给 AI 装上了 “手和眼睛”**，让 AI 能够连接外部工具和数据源，比如搜索网页、读取代码仓库、查询数据库。适合需要获取数据或操作外部系统的场景。
**而 Agent Skills 更像是给 AI 发了一本 “工作手册”**，把专业知识和工作流程打包起来，教 AI 在特定领域该怎么做。
至于斜杠命令，它就像是快捷键，是需要你手动输入 `/command` 命令来触发的固定操作；而 Skills 的特点是 AI 可以自动识别该用什么技能，不需要你显式调用。
其实 MCP 和 Skills 是可以结合起来的。举个例子，如果你想让 AI 帮你发周报：
- MCP 负责获取数据：从任务管理数据库拉取这周的任务列表
- Skills 负责加工数据：把获取到的原始数据整理成老板爱看的格式
一个提供食材，一个提供配方。
## 九、Agent Skills 凭什么大火？
你可能会想：等等，这不就是我们程序员玩烂的 “封装、复用、模块化、懒加载” 那一套吗？
写几个代码文件、打个包、发到网上，让其他程序员下载下来用，不是一回事儿么？
为什么 Agent Skills 能突然让整个 AI 圈为之疯狂？？？
从技术的角度来看，它并没有发明什么惊天动地的算法。在我看来，它能火主要是 2 个原因。
第一，它是 **开放标准**，封装一次技能包后就能在各种 AI 工具里复用，还能通过社区共享。
更重要的是，Skills 能立刻让 AI 的工作更专业可靠，让普通人 “无感” 地享受技术带来的价值。以前想让 AI 变聪明，你得学提示词工程、配置各种工具链。现在只需要像装 APP 一样安装技能包，AI 就立刻变专业了。一项技术的成功，不在于它有多复杂，而在于它能让普通用户不关注技术细节的情况下，感受到技术的价值。
**降低门槛，才是技术走向大众的钥匙。**
总结一下，Agent Skills 最大的优势是：
1. 可复用性：安装一次技能，以后就能直接使用，不用重复输入提示词
2. 跨工具通用：你在 Claude Code 中安装的技能，以后在 Cursor 等其他工具中也能用
3. 社区驱动：任何人都可以创建和分享技能，整个社区的智慧都能为你所用
4. 降低门槛：像装 APP 一样简单，让普通用户也能让 AI 变得更专业
## 写在最后
看到这里，相信你已经对 Agent Skills 有了全面的了解。
**Agent Skills 让 AI 能够快速学会新技能，不用每次都重复输入提示词。** 它的本质是把专业知识和工作流程封装成可复用的技能包，通过渐进式披露机制让 AI 按需加载，既提升了 AI 的专业性，又节省了上下文空间。
Agent Skills 不仅仅是个技术概念，更是一种新的工作方式。你可以把它融入到自己的日常工作中，比如把重复的任务封装成技能、把团队的最佳实践固化成技能，让 AI 真正成为你的得力助手。
建议你：
1. 先安装几个官方技能，体验一下 Agent Skills 的便利性
2. 尝试在 Cursor 等其他工具中使用社区技能
3. 把工作中重复的任务封装成自己的技能
4. 分享你的技能到社区，帮助更多人
在 Vibe Coding 时代，技术的门槛正在崩塌，而想象力的边界正在无限扩张。
让我们一起探索 Agent Skills 的更多可能性吧！
💡 想获取更多优质 Skills 资源？可以阅读《优质 AI 编程扩展推荐》中的 Agent Skills 技能类章节，里面有 Skills 安装管理工具、Skills 资源平台和必装推荐的汇总。
## 推荐资源
1）鱼皮 AI 导航网站：[AI 资源大全、最新 AI 资讯、免费 AI 教程](https://ai.codefather.cn)
2）鱼皮的 Vibe Coding 教程：[免费开源的 AI 编程零基础入门教程](https://github.com/liyupi/ai-guide)
3）编程导航学习圈：[学习路线、编程教程、实战项目、求职宝典、交流答疑](https://www.codefather.cn)
4）程序员面试八股文：[实习/校招/社招高频考点、企业真题解析](https://www.mianshiya.com)
5）程序员写简历神器：[专业模板、丰富例句、直通面试](https://www.laoyujianli.com)
6）1 对 1 模拟面试：[实习/校招/社招面试拿 Offer 必备](https://ai.mianshiya.com)